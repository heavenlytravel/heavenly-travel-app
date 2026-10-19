import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { TRIP_CATEGORIES, type TripCategory } from "./booking-status";
import type { Change, Created } from "./change";
import { db } from "./client";
import { dateOfDay, dueByDate } from "./expiry";
import type { Prisma } from "./generated/prisma/client";
import { checkPhotos, samePhotos, type Photo } from "./photos-input";
import { isUniqueViolation } from "./prisma-errors";
import {
  checkVehicleFields,
  VEHICLE_DOCUMENTS,
  vehicleFieldsOf,
  type VehicleDocument,
  type VehicleFields,
  type VehicleInput,
} from "./vehicle-input";
import { modelName } from "./vehicle-model-input";
import { dropModelIfUnused, modelFor } from "./vehicle-models";

/**
 * Our vehicles, each of one model and based at one location, with the
 * expiry dates of its documents. The readers serve a location's Vehicles
 * tab and the list across locations; the writers take the actor and log
 * against the vehicle inside their transaction. A vehicle's model is
 * typed as a class, a brand and a name: the writers find it in the
 * catalogue or add it there, and clear a model it leaves unused. Its photos
 * are saved with it and replaced as a whole. A vehicle out of service keeps
 * its history; one entered by mistake is deleted. See
 * docs/261019-vehicles-and-drivers.md.
 */

const photosInOrder = {
  orderBy: { sortOrder: "asc" },
  select: { url: true, caption: true },
} satisfies Prisma.Vehicle$photosArgs;

const withModel = {
  include: {
    photos: photosInOrder,
    vehicleModel: {
      select: {
        id: true,
        vehicleClassId: true,
        brand: true,
        name: true,
        vehicleClass: {
          select: { id: true, name: true, category: true, sortOrder: true },
        },
      },
    },
    location: { select: { id: true, name: true, slug: true, state: true } },
  },
} satisfies Prisma.VehicleDefaultArgs;

/** A vehicle with its photos, its model, its class and its location. */
export type VehicleWithModel = Prisma.VehicleGetPayload<typeof withModel>;

const NOT_FOUND: Change = { ok: false, error: "Vehicle not found." };

const categoryRank = (category: string) =>
  TRIP_CATEGORIES.indexOf(category as TripCategory);

/** In service first, then car with driver first, in the classes' order, by model and plate. */
function byClassAndPlate(a: VehicleWithModel, b: VehicleWithModel) {
  const classA = a.vehicleModel.vehicleClass;
  const classB = b.vehicleModel.vehicleClass;
  return (
    Number(b.isActive) - Number(a.isActive) ||
    categoryRank(classA.category) - categoryRank(classB.category) ||
    classA.sortOrder - classB.sortOrder ||
    modelName(a.vehicleModel).localeCompare(modelName(b.vehicleModel)) ||
    a.plate.localeCompare(b.plate)
  );
}

/** What the vehicle lists narrow to: one location, the ones with a document due, or both. */
export type FleetFilter = { locationId?: string; due?: boolean };

/** Every vehicle, or those the filter leaves, in service or not; a class's alone for its page. */
export async function listVehicles(
  filter: FleetFilter & { vehicleClassId?: string } = {},
): Promise<VehicleWithModel[]> {
  const rows = await db.vehicle.findMany({
    where: {
      ...(filter.locationId ? { locationId: filter.locationId } : {}),
      ...(filter.vehicleClassId
        ? { vehicleModel: { vehicleClassId: filter.vehicleClassId } }
        : {}),
      ...(filter.due ? vehiclesDueWhere() : {}),
    },
    ...withModel,
  });
  return rows.sort(byClassAndPlate);
}

export function getVehicle(id: string): Promise<VehicleWithModel | null> {
  return db.vehicle.findUnique({ where: { id }, ...withModel });
}

/** Where a vehicle filter matches the ones in service with a document due by the warning, or expired. */
export function vehiclesDueWhere(now: Date = new Date()) {
  const dueBy = dueByDate(now);
  return {
    isActive: true,
    OR: VEHICLE_DOCUMENTS.map((key) => ({ [key]: { lte: dueBy } })),
  } satisfies Prisma.VehicleWhereInput;
}

/** The fields that name the model rather than sit on the vehicle's row. */
const MODEL_KEYS = ["vehicleClassId", "brand", "model"] as const;
type ModelKey = (typeof MODEL_KEYS)[number];

/** The fields as the vehicle's row stores them: without the model by name, the days as dates. */
function vehicleRow<F extends Partial<VehicleFields>>(
  fields: F,
): Omit<F, ModelKey | VehicleDocument> &
  Partial<Record<VehicleDocument, Date | null>> {
  const row: Record<string, unknown> = { ...fields };
  for (const key of MODEL_KEYS) delete row[key];
  for (const key of VEHICLE_DOCUMENTS) {
    const day = fields[key];
    if (day !== undefined) row[key] = dateOfDay(day);
  }
  return row as Omit<F, ModelKey | VehicleDocument> &
    Partial<Record<VehicleDocument, Date | null>>;
}

/** The photos as their rows store them, numbered in order. */
const photoRows = (photos: readonly Photo[]) =>
  photos.map((photo, i) => ({ ...photo, sortOrder: i + 1 }));

const plateTaken = (plate: string) => ({
  ok: false as const,
  error: `${plate} is in the list already.`,
});

/** The name of the location a vehicle is based at, which must exist. */
async function locationNameOf(
  tx: Prisma.TransactionClient,
  locationId: string,
) {
  const location = await tx.location.findUnique({
    where: { id: locationId },
    select: { name: true },
  });
  return location?.name ?? null;
}

const NO_LOCATION = {
  ok: false as const,
  error: "Choose where it is based again.",
};

/** A new vehicle with its photos, of the model its class, brand and name find or add. */
export async function createVehicle(
  actor: Actor,
  input: VehicleInput,
): Promise<Created> {
  const { photos, ...fields } = input;
  const check = checkVehicleFields(fields);
  if (!check.ok) return check;
  const photosCheck = checkPhotos(photos);
  if (!photosCheck.ok) return photosCheck;
  try {
    return await db.$transaction(async (tx) => {
      const locationName = await locationNameOf(tx, fields.locationId);
      if (!locationName) return NO_LOCATION;
      const model = await modelFor(tx, actor, {
        vehicleClassId: fields.vehicleClassId,
        brand: fields.brand,
        name: fields.model,
      });
      if (!model.ok) return model;
      const vehicle = await tx.vehicle.create({
        data: {
          ...vehicleRow(fields),
          vehicleModelId: model.id,
          photos: { create: photoRows(photos) },
        },
      });
      await logActivity(tx, actor, {
        action: "vehicle.created",
        entityId: vehicle.id,
        after: {
          ...fields,
          photos: photos.length,
          modelName: model.name,
          locationName,
        },
      });
      return { ok: true, id: vehicle.id };
    });
  } catch (error) {
    if (isUniqueViolation(error, "plate")) return plateTaken(fields.plate);
    throw error;
  }
}

/**
 * Changes any of the fields, and the photos as a whole. A class, brand or
 * name that finds the model the vehicle is of already changes nothing of
 * it, so "toyota" for "Toyota" is no change; another model clears the one
 * left unused. The photos are logged by how many there are. Saving what is
 * already there logs nothing.
 */
export async function updateVehicle(
  actor: Actor,
  id: string,
  patch: Partial<VehicleInput>,
): Promise<Change> {
  const { photos, ...fieldsPatch } = patch;
  const check = checkVehicleFields(fieldsPatch);
  if (!check.ok) return check;
  if (photos) {
    const photosCheck = checkPhotos(photos);
    if (!photosCheck.ok) return photosCheck;
  }
  try {
    return await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({
        where: { id },
        include: { vehicleModel: true, photos: photosInOrder },
      });
      if (!vehicle) return NOT_FOUND;
      const current = vehicleFieldsOf(vehicle);
      const changed = changedFields(current, fieldsPatch);
      const photosChanged =
        photos !== undefined && !samePhotos(vehicle.photos, photos);
      const before: Partial<VehicleFields> = changed?.before ?? {};
      const after: Partial<VehicleFields> = changed?.after ?? {};

      let model: { id: string; name: string } | null = null;
      if (MODEL_KEYS.some((key) => key in after)) {
        const found = await modelFor(tx, actor, {
          vehicleClassId: after.vehicleClassId ?? current.vehicleClassId,
          brand: after.brand ?? current.brand,
          name: after.model ?? current.model,
        });
        if (!found.ok) return found;
        if (found.id === vehicle.vehicleModelId) {
          for (const key of MODEL_KEYS) {
            delete before[key];
            delete after[key];
          }
        } else {
          model = found;
        }
      }
      if (Object.keys(after).length === 0 && !photosChanged) {
        return { ok: true };
      }

      const locationName = after.locationId
        ? await locationNameOf(tx, after.locationId)
        : null;
      if (after.locationId && !locationName) return NO_LOCATION;
      await tx.vehicle.update({
        where: { id },
        data: {
          ...vehicleRow(after),
          ...(model ? { vehicleModelId: model.id } : {}),
        },
      });
      if (photos && photosChanged) {
        await tx.vehiclePhoto.deleteMany({ where: { vehicleId: id } });
        await tx.vehiclePhoto.createMany({
          data: photoRows(photos).map((photo) => ({ ...photo, vehicleId: id })),
        });
      }
      if (model) await dropModelIfUnused(tx, actor, vehicle.vehicleModelId);
      await logActivity(tx, actor, {
        action: "vehicle.updated",
        entityId: id,
        before: {
          ...before,
          ...(photosChanged ? { photos: vehicle.photos.length } : {}),
        },
        after: {
          ...after,
          ...(photos && photosChanged ? { photos: photos.length } : {}),
          ...(model ? { modelName: model.name } : {}),
          ...(locationName ? { locationName } : {}),
        },
      });
      return { ok: true };
    });
  } catch (error) {
    if (isUniqueViolation(error, "plate") && patch.plate) {
      return plateTaken(patch.plate);
    }
    throw error;
  }
}

/**
 * Deletes a vehicle entered by mistake, with its photos, and its model when
 * it leaves it unused. One that served is taken out of service instead.
 */
export function deleteVehicle(actor: Actor, id: string): Promise<Change> {
  return db.$transaction(async (tx) => {
    const vehicle = await tx.vehicle.findUnique({ where: { id } });
    if (!vehicle) return NOT_FOUND;
    await tx.vehicle.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "vehicle.deleted",
      entityId: id,
      before: { plate: vehicle.plate },
    });
    await dropModelIfUnused(tx, actor, vehicle.vehicleModelId);
    return { ok: true };
  });
}
