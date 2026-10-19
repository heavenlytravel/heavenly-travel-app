import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { TRIP_CATEGORIES, type TripCategory } from "./booking-status";
import type { Change, Created } from "./change";
import { db } from "./client";
import { dateOfDay, dueByDate } from "./expiry";
import type { Prisma } from "./generated/prisma/client";
import { isUniqueViolation } from "./prisma-errors";
import {
  checkVehicleFields,
  VEHICLE_DOCUMENTS,
  vehicleFieldsOf,
  type VehicleDocument,
  type VehicleFields,
} from "./vehicle-input";

/**
 * Our vehicles, each of one model and based at one location, with the
 * expiry dates of its documents. The readers serve a location's Vehicles
 * tab and the list across locations; the writers take the actor and log
 * against the vehicle inside their transaction. A vehicle out of service
 * keeps its history; one entered by mistake is deleted. See
 * docs/261019-vehicles-and-drivers.md.
 */

const withModel = {
  include: {
    vehicleModel: {
      select: {
        id: true,
        name: true,
        vehicleClass: {
          select: { id: true, name: true, category: true, sortOrder: true },
        },
      },
    },
    location: { select: { id: true, name: true, slug: true, state: true } },
  },
} satisfies Prisma.VehicleDefaultArgs;

/** A vehicle with its model, its class and its location. */
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
    a.vehicleModel.name.localeCompare(b.vehicleModel.name) ||
    a.plate.localeCompare(b.plate)
  );
}

/** What the vehicle lists narrow to: one location, the ones with a document due, or both. */
export type FleetFilter = { locationId?: string; due?: boolean };

/** Every vehicle, or those the filter leaves, in service or not. */
export async function listVehicles(
  filter: FleetFilter = {},
): Promise<VehicleWithModel[]> {
  const rows = await db.vehicle.findMany({
    where: {
      ...(filter.locationId ? { locationId: filter.locationId } : {}),
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

/** The days among the fields as the row stores them: dates. */
function documentDates(fields: Partial<VehicleFields>) {
  const dates: Partial<Record<VehicleDocument, Date | null>> = {};
  for (const key of VEHICLE_DOCUMENTS) {
    const day = fields[key];
    if (day !== undefined) dates[key] = dateOfDay(day);
  }
  return dates;
}

const plateTaken = (plate: string) => ({
  ok: false as const,
  error: `${plate} is in the list already.`,
});

/** Checks that the model and the location a vehicle points at exist, and answers their names for the log. */
async function namesOf(
  tx: Prisma.TransactionClient,
  fields: Partial<Pick<VehicleFields, "vehicleModelId" | "locationId">>,
): Promise<
  | { ok: true; modelName?: string; locationName?: string }
  | { ok: false; error: string }
> {
  const [model, location] = await Promise.all([
    fields.vehicleModelId
      ? tx.vehicleModel.findUnique({
          where: { id: fields.vehicleModelId },
          select: { name: true },
        })
      : null,
    fields.locationId
      ? tx.location.findUnique({
          where: { id: fields.locationId },
          select: { name: true },
        })
      : null,
  ]);
  if (fields.vehicleModelId && !model) {
    return { ok: false, error: "Choose the model again." };
  }
  if (fields.locationId && !location) {
    return { ok: false, error: "Choose where it is based again." };
  }
  return { ok: true, modelName: model?.name, locationName: location?.name };
}

export async function createVehicle(
  actor: Actor,
  fields: VehicleFields,
): Promise<Created> {
  const check = checkVehicleFields(fields);
  if (!check.ok) return check;
  try {
    return await db.$transaction(async (tx) => {
      const names = await namesOf(tx, fields);
      if (!names.ok) return names;
      const vehicle = await tx.vehicle.create({
        data: { ...fields, ...documentDates(fields) },
      });
      await logActivity(tx, actor, {
        action: "vehicle.created",
        entityId: vehicle.id,
        after: {
          ...fields,
          modelName: names.modelName ?? null,
          locationName: names.locationName ?? null,
        },
      });
      return { ok: true, id: vehicle.id };
    });
  } catch (error) {
    if (isUniqueViolation(error, "plate")) return plateTaken(fields.plate);
    throw error;
  }
}

/** Changes any of the fields. Saving what is already there logs nothing. */
export async function updateVehicle(
  actor: Actor,
  id: string,
  patch: Partial<VehicleFields>,
): Promise<Change> {
  const check = checkVehicleFields(patch);
  if (!check.ok) return check;
  try {
    return await db.$transaction(async (tx) => {
      const vehicle = await tx.vehicle.findUnique({ where: { id } });
      if (!vehicle) return NOT_FOUND;
      const changed = changedFields(vehicleFieldsOf(vehicle), patch);
      if (!changed) return { ok: true };

      const names = await namesOf(tx, changed.after);
      if (!names.ok) return names;
      await tx.vehicle.update({
        where: { id },
        data: { ...changed.after, ...documentDates(changed.after) },
      });
      await logActivity(tx, actor, {
        action: "vehicle.updated",
        entityId: id,
        before: changed.before,
        after: {
          ...changed.after,
          ...(names.modelName ? { modelName: names.modelName } : {}),
          ...(names.locationName ? { locationName: names.locationName } : {}),
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

/** Deletes a vehicle entered by mistake. One that served is taken out of service instead. */
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
    return { ok: true };
  });
}
