import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import type { Change } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { isUniqueViolation } from "./prisma-errors";
import {
  checkModelName,
  checkVehicleModelFields,
  modelName,
  type ModelPhoto,
  type VehicleModelFields,
} from "./vehicle-model-input";

/**
 * The models of each class, the Toyota Vellfire and the Toyota Alphard in
 * MPV VIP, with their photos: one catalogue for every location, kept on
 * the class's page. The vehicle form adds a model the first time a vehicle
 * of it is entered, and suggests the ones there are. A location's
 * customers see the models of its vehicles in service. The writers take
 * the actor and log against the class inside their transaction. A model
 * is deleted only while no vehicle is of it; a booking that chose it keeps
 * the name. See docs/261019-vehicles-and-drivers.md.
 */

const NOT_FOUND: Change = { ok: false, error: "Model not found." };

const byOrder = [
  { sortOrder: "asc" },
  { brand: "asc" },
  { name: "asc" },
] satisfies Prisma.VehicleModelOrderByWithRelationInput[];

const photosInOrder = {
  orderBy: { sortOrder: "asc" },
  select: { url: true, caption: true },
} satisfies Prisma.VehicleModel$photosArgs;

/**
 * A class's models as one location's customers see them: the active ones
 * with a vehicle in service based there, in order, each with its photos.
 * The offerings on sale read it, then `shownModel` names each.
 */
export function modelsShownAt(location: Prisma.LocationWhereInput) {
  return {
    where: {
      isActive: true,
      vehicles: { some: { isActive: true, location } },
    },
    orderBy: byOrder,
    select: { id: true, brand: true, name: true, photos: photosInOrder },
  } satisfies Prisma.VehicleClass$modelsArgs;
}

/** A model as the customer sees it: "Toyota Alphard", and its photos in order. */
export type ShownModel = {
  id: string;
  name: string;
  photos: { url: string; caption: string }[];
};

/** A row `modelsShownAt` read, named as the customer sees it. */
export function shownModel(row: {
  id: string;
  brand: string;
  name: string;
  photos: { url: string; caption: string }[];
}): ShownModel {
  return { id: row.id, name: modelName(row), photos: row.photos };
}

const withPhotos = {
  include: {
    photos: photosInOrder,
    _count: { select: { vehicles: true } },
  },
} satisfies Prisma.VehicleModelDefaultArgs;

/** A model with its photos and how many vehicles are of it, as the catalogue lists it. */
export type CatalogueModel = Prisma.VehicleModelGetPayload<typeof withPhotos>;

/** Every model of the class, active or not, in order. */
export function listModelsOfClass(
  vehicleClassId: string,
): Promise<CatalogueModel[]> {
  return db.vehicleModel.findMany({
    where: { vehicleClassId },
    orderBy: byOrder,
    ...withPhotos,
  });
}

export function getVehicleModel(id: string): Promise<CatalogueModel | null> {
  return db.vehicleModel.findUnique({ where: { id }, ...withPhotos });
}

/** A model as the vehicle form suggests it: its class, its brand and its name. */
export type ModelSuggestion = {
  vehicleClassId: string;
  brand: string;
  name: string;
};

/** Every model in the catalogue by brand and name: what the vehicle form suggests as it is typed. */
export function listModelSuggestions(): Promise<ModelSuggestion[]> {
  return db.vehicleModel.findMany({
    select: { vehicleClassId: true, brand: true, name: true },
    orderBy: [{ brand: "asc" }, { name: "asc" }],
  });
}

/** The model of a class with this brand and name, however its letters are cased. */
function findModel(
  tx: Prisma.TransactionClient,
  wanted: { vehicleClassId: string; brand: string; name: string },
  notId?: string,
) {
  return tx.vehicleModel.findFirst({
    where: {
      vehicleClassId: wanted.vehicleClassId,
      brand: { equals: wanted.brand, mode: "insensitive" },
      name: { equals: wanted.name, mode: "insensitive" },
      ...(notId ? { id: { not: notId } } : {}),
    },
    select: { id: true, brand: true, name: true },
  });
}

/**
 * The model of the class with this brand and name, as the vehicle form
 * names it: the one there is, however it was cased, or a new one at the
 * end of the class's order, with no photos, logged against the class.
 * Inside the vehicle writer's transaction.
 */
export async function modelFor(
  tx: Prisma.TransactionClient,
  actor: Actor,
  wanted: { vehicleClassId: string; brand: string; name: string },
): Promise<
  { ok: true; id: string; name: string } | { ok: false; error: string }
> {
  const check = checkModelName(wanted);
  if (!check.ok) return check;
  const found = await findModel(tx, wanted);
  if (found) return { ok: true, id: found.id, name: modelName(found) };

  const { vehicleClassId, brand, name } = wanted;
  const vehicleClass = await tx.vehicleClass.findUnique({
    where: { id: vehicleClassId },
    select: { id: true },
  });
  if (!vehicleClass) return { ok: false, error: "Choose the class again." };
  const last = await tx.vehicleModel.aggregate({
    where: { vehicleClassId },
    _max: { sortOrder: true },
  });
  const model = await tx.vehicleModel.create({
    data: {
      vehicleClassId,
      brand,
      name,
      sortOrder: (last._max.sortOrder ?? 0) + 1,
    },
  });
  await logActivity(tx, actor, {
    action: "vehicle-class.model.created",
    entityId: vehicleClassId,
    after: { modelName: modelName(model), photos: 0 },
  });
  return { ok: true, id: model.id, name: modelName(model) };
}

const TAKEN = (name: string) => ({
  ok: false as const,
  error: `The class has the ${name} already.`,
});

const photoRows = (photos: readonly ModelPhoto[]) =>
  photos.map((photo, i) => ({ ...photo, sortOrder: i + 1 }));

/** Two lists of photos hold the same files, captions and order. */
const samePhotos = (a: readonly ModelPhoto[], b: readonly ModelPhoto[]) =>
  a.length === b.length &&
  a.every(
    (photo, i) => photo.url === b[i]!.url && photo.caption === b[i]!.caption,
  );

/**
 * Changes any of the model's fields. A new brand or name the class has
 * already, however it is cased, is refused. The photos are replaced as a
 * whole, and logged by how many there are. Saving what is already there
 * logs nothing.
 */
export async function updateVehicleModel(
  actor: Actor,
  id: string,
  patch: Partial<VehicleModelFields>,
): Promise<Change> {
  const check = checkVehicleModelFields(patch);
  if (!check.ok) return check;
  try {
    return await db.$transaction(async (tx) => {
      const model = await tx.vehicleModel.findUnique({
        where: { id },
        include: { photos: photosInOrder },
      });
      if (!model) return NOT_FOUND;

      const { photos, ...scalars } = patch;
      const changed = changedFields(model, scalars);
      const photosChanged =
        photos !== undefined && !samePhotos(model.photos, photos);
      if (!changed && !photosChanged) return { ok: true };

      const named = {
        vehicleClassId: model.vehicleClassId,
        brand: changed?.after.brand ?? model.brand,
        name: changed?.after.name ?? model.name,
      };
      if (changed && ("brand" in changed.after || "name" in changed.after)) {
        if (await findModel(tx, named, id)) return TAKEN(modelName(named));
      }
      if (changed) {
        await tx.vehicleModel.update({ where: { id }, data: changed.after });
      }
      if (photos && photosChanged) {
        await tx.vehicleModelPhoto.deleteMany({
          where: { vehicleModelId: id },
        });
        await tx.vehicleModelPhoto.createMany({
          data: photoRows(photos).map((photo) => ({
            ...photo,
            vehicleModelId: id,
          })),
        });
      }
      await logActivity(tx, actor, {
        action: "vehicle-class.model.updated",
        entityId: model.vehicleClassId,
        before: {
          modelName: modelName(model),
          ...changed?.before,
          ...(photosChanged ? { photos: model.photos.length } : {}),
        },
        after: {
          modelName: modelName(named),
          ...changed?.after,
          ...(photos && photosChanged ? { photos: photos.length } : {}),
        },
      });
      return { ok: true };
    });
  } catch (error) {
    if (isUniqueViolation(error, "name") && (patch.brand || patch.name)) {
      return TAKEN(
        modelName({ brand: patch.brand ?? "", name: patch.name ?? "" }),
      );
    }
    throw error;
  }
}

/** Deletes a model no vehicle is of, with its photos. A booking that chose it keeps the name. */
export function deleteVehicleModel(actor: Actor, id: string): Promise<Change> {
  return db.$transaction(async (tx) => {
    const model = await tx.vehicleModel.findUnique({
      where: { id },
      include: { _count: { select: { vehicles: true } } },
    });
    if (!model) return NOT_FOUND;
    const name = modelName(model);
    if (model._count.vehicles > 0) {
      return {
        ok: false,
        error: `${model._count.vehicles === 1 ? "A vehicle is" : `${model._count.vehicles} vehicles are`} a ${name}. Switch it off instead.`,
      };
    }
    await tx.vehicleModel.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "vehicle-class.model.deleted",
      entityId: model.vehicleClassId,
      before: { modelName: name },
    });
    return { ok: true };
  });
}
