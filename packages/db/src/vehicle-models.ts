import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import type { Change, Created } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { isUniqueViolation } from "./prisma-errors";
import {
  checkVehicleModelFields,
  type ModelPhoto,
  type VehicleModelFields,
} from "./vehicle-model-input";

/**
 * The models of each class, "Toyota Vellfire" and "Toyota Alphard" in MPV
 * VIP, with their photos: one catalogue for every location, kept on the
 * class's page. The customer site shows a class's active models. The
 * writers take the actor and log against the class inside their
 * transaction. A booking that preferred a model deleted since keeps its
 * name. See
 * docs/261019-vehicles-and-drivers.md.
 */

const NOT_FOUND: Change = { ok: false, error: "Model not found." };

const byOrder = [
  { sortOrder: "asc" },
  { name: "asc" },
] satisfies Prisma.VehicleModelOrderByWithRelationInput[];

const photosInOrder = {
  orderBy: { sortOrder: "asc" },
  select: { url: true, caption: true },
} satisfies Prisma.VehicleModel$photosArgs;

/**
 * A class's models as the customer sees them: the active ones in order,
 * each with its photos. The offerings on sale read it.
 */
export const SHOWN_MODELS = {
  where: { isActive: true },
  orderBy: byOrder,
  select: { id: true, name: true, photos: photosInOrder },
} satisfies Prisma.VehicleClass$modelsArgs;

/** A model as the customer sees it. */
export type ShownModel = Prisma.VehicleModelGetPayload<{
  select: typeof SHOWN_MODELS.select;
}>;

const withPhotos = {
  include: { photos: photosInOrder },
} satisfies Prisma.VehicleModelDefaultArgs;

/** A model with its photos, as the catalogue lists it. */
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

const TAKEN = (name: string) => ({
  ok: false as const,
  error: `The class already has a model named ${name}.`,
});

const photoRows = (photos: readonly ModelPhoto[]) =>
  photos.map((photo, i) => ({ ...photo, sortOrder: i + 1 }));

/** Two lists of photos hold the same files, captions and order. */
const samePhotos = (a: readonly ModelPhoto[], b: readonly ModelPhoto[]) =>
  a.length === b.length &&
  a.every(
    (photo, i) => photo.url === b[i]!.url && photo.caption === b[i]!.caption,
  );

/** A new model of the class, with its photos. */
export async function createVehicleModel(
  actor: Actor,
  vehicleClassId: string,
  fields: VehicleModelFields,
): Promise<Created> {
  const check = checkVehicleModelFields(fields);
  if (!check.ok) return check;
  try {
    return await db.$transaction(async (tx) => {
      const vehicleClass = await tx.vehicleClass.findUnique({
        where: { id: vehicleClassId },
        select: { id: true },
      });
      if (!vehicleClass)
        return { ok: false, error: "Vehicle class not found." };
      const { photos, ...rest } = fields;
      const model = await tx.vehicleModel.create({
        data: {
          vehicleClassId,
          ...rest,
          photos: { create: photoRows(photos) },
        },
      });
      await logActivity(tx, actor, {
        action: "vehicle-class.model.created",
        entityId: vehicleClassId,
        after: { modelName: fields.name, photos: photos.length },
      });
      return { ok: true, id: model.id };
    });
  } catch (error) {
    if (isUniqueViolation(error, "name")) return TAKEN(fields.name);
    throw error;
  }
}

/**
 * Changes any of the model's fields. The photos are replaced as a whole,
 * and logged by how many there are. Saving what is already there logs
 * nothing.
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
          modelName: model.name,
          ...changed?.before,
          ...(photosChanged ? { photos: model.photos.length } : {}),
        },
        after: {
          modelName: changed?.after.name ?? model.name,
          ...changed?.after,
          ...(photos && photosChanged ? { photos: photos.length } : {}),
        },
      });
      return { ok: true };
    });
  } catch (error) {
    if (isUniqueViolation(error, "name") && patch.name) {
      return TAKEN(patch.name);
    }
    throw error;
  }
}

/** Deletes a model with its photos. A booking that preferred it keeps the name. */
export function deleteVehicleModel(actor: Actor, id: string): Promise<Change> {
  return db.$transaction(async (tx) => {
    const model = await tx.vehicleModel.findUnique({ where: { id } });
    if (!model) return NOT_FOUND;
    await tx.vehicleModel.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "vehicle-class.model.deleted",
      entityId: model.vehicleClassId,
      before: { modelName: model.name },
    });
    return { ok: true };
  });
}
