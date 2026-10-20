import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { PHOTO_LIMITS, type Photo } from "./photos-input";
import { checkModelName, modelName } from "./vehicle-model-input";

/**
 * The models of each class, the Toyota Vellfire and the Toyota Alphard in
 * MPV VIP: one catalogue for every location, named by brand and name. The
 * vehicle form adds a model the first time a vehicle of it is entered, and
 * suggests the ones there are; a model no vehicle and no booking is of any
 * more goes. A location's customers see the models of its vehicles in
 * service, in those vehicles' photos. Changes are logged against the class,
 * inside the vehicle writer's transaction. See
 * docs/261019-vehicles-and-drivers.md.
 */

const byName = [
  { brand: "asc" },
  { name: "asc" },
] satisfies Prisma.VehicleModelOrderByWithRelationInput[];

const photosInOrder = {
  orderBy: { sortOrder: "asc" },
  select: { url: true, caption: true },
} satisfies Prisma.Vehicle$photosArgs;

/**
 * A class's models as one location's customers see them: those with a
 * vehicle in service based there, by name, each with those vehicles, the
 * first entered first, with when each was entered and its photos. The
 * offerings read it, then `shownModel` names each and `classCoverOf`
 * finds the class's picture.
 */
export function modelsShownAt(location: Prisma.LocationWhereInput) {
  const there = { isActive: true, location } satisfies Prisma.VehicleWhereInput;
  return {
    where: { vehicles: { some: there } },
    orderBy: byName,
    select: {
      id: true,
      brand: true,
      name: true,
      vehicles: {
        where: there,
        orderBy: { createdAt: "asc" },
        select: { createdAt: true, photos: photosInOrder },
      },
    },
  } satisfies Prisma.VehicleClass$modelsArgs;
}

/** A model as the customer sees it: "Toyota Alphard", and the photos of its vehicles there. */
export type ShownModel = { id: string; name: string; photos: Photo[] };

/**
 * A row `modelsShownAt` read, named as the customer sees it, with its
 * vehicles' photos one after another: each vehicle's in its order, the
 * first 12 of them.
 */
export function shownModel(row: {
  id: string;
  brand: string;
  name: string;
  vehicles: { photos: Photo[] }[];
}): ShownModel {
  return {
    id: row.id,
    name: modelName(row),
    photos: row.vehicles
      .flatMap((vehicle) => vehicle.photos)
      .slice(0, PHOTO_LIMITS.photos),
  };
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
    orderBy: byName,
  });
}

/**
 * The model of the class with this brand and name, as the vehicle form
 * names it: the one there is, however it was cased, or a new one, logged
 * against the class. Inside the vehicle writer's transaction.
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
  const { vehicleClassId, brand, name } = wanted;
  const found = await tx.vehicleModel.findFirst({
    where: {
      vehicleClassId,
      brand: { equals: brand, mode: "insensitive" },
      name: { equals: name, mode: "insensitive" },
    },
    select: { id: true, brand: true, name: true },
  });
  if (found) return { ok: true, id: found.id, name: modelName(found) };

  const vehicleClass = await tx.vehicleClass.findUnique({
    where: { id: vehicleClassId },
    select: { id: true },
  });
  if (!vehicleClass) return { ok: false, error: "Choose the class again." };
  const model = await tx.vehicleModel.create({
    data: { vehicleClassId, brand, name },
  });
  await logActivity(tx, actor, {
    action: "vehicle-class.model.created",
    entityId: vehicleClassId,
    after: { modelName: modelName(model) },
  });
  return { ok: true, id: model.id, name: modelName(model) };
}

/**
 * Deletes a model once no vehicle is of it and no booking chose it, so a
 * model typed wrong and corrected leaves no suggestion behind. A model the
 * catalogue started with stays until a vehicle has been of it. Inside the
 * vehicle writer's transaction, after the vehicle left the model.
 */
export async function dropModelIfUnused(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
) {
  const model = await tx.vehicleModel.findUnique({
    where: { id },
    include: { _count: { select: { vehicles: true, tripItems: true } } },
  });
  if (!model || model._count.vehicles > 0 || model._count.tripItems > 0) {
    return;
  }
  await tx.vehicleModel.delete({ where: { id } });
  await logActivity(tx, actor, {
    action: "vehicle-class.model.deleted",
    entityId: model.vehicleClassId,
    before: { modelName: modelName(model) },
  });
}
