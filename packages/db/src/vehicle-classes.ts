import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { TRIP_CATEGORIES, type TripCategory } from "./booking-status";
import type { Change, Created } from "./change";
import { db } from "./client";
import type { VehicleClass } from "./generated/prisma/client";
import { slugify } from "./slug";
import {
  checkVehicleClassFields,
  type VehicleClassFields,
} from "./vehicle-class-input";

export type { VehicleClass };

/**
 * The classes of vehicle the site sells, with their rates and rules. The
 * readers serve the website and the Vehicle classes screen; the writers are
 * the screen's, each taking the actor and logging inside its transaction.
 * Classes are never deleted, only turned off; a booking keeps its snapshot.
 * See docs/260930-ops-screens.md.
 */

const NOT_FOUND: Change = { ok: false, error: "Vehicle class not found." };

export function listActiveVehicleClasses(
  category: TripCategory,
): Promise<VehicleClass[]> {
  return db.vehicleClass.findMany({
    where: { category, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

const categoryRank = (category: string) =>
  TRIP_CATEGORIES.indexOf(category as TripCategory);

/** Every class, active or not: car with driver first, then by sort order and name. */
export async function listVehicleClasses(): Promise<VehicleClass[]> {
  const rows = await db.vehicleClass.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.sort(
    (a, b) => categoryRank(a.category) - categoryRank(b.category),
  );
}

export function getVehicleClass(id: string): Promise<VehicleClass | null> {
  return db.vehicleClass.findUnique({ where: { id } });
}

/** A new class, its slug from its name. */
export async function createVehicleClass(
  actor: Actor,
  fields: VehicleClassFields,
): Promise<Created> {
  const check = checkVehicleClassFields(fields);
  if (!check.ok) return check;
  const slug = slugify(fields.name);
  if (!slug)
    return { ok: false, error: "Enter a name with a letter or digit." };

  return db.$transaction(async (tx) => {
    const taken = await tx.vehicleClass.findUnique({ where: { slug } });
    if (taken) {
      return {
        ok: false,
        error: `${taken.name} already has the slug ${slug}.`,
      };
    }
    const vehicleClass = await tx.vehicleClass.create({
      data: { slug, ...fields },
    });
    await logActivity(tx, actor, {
      action: "vehicle-class.created",
      entityId: vehicleClass.id,
      after: { slug, ...fields },
    });
    return { ok: true, id: vehicleClass.id };
  });
}

/**
 * Changes any of the editable fields. The slug and the category's snapshot
 * on old bookings stay as they are. Saving what is already there logs
 * nothing.
 */
export async function updateVehicleClass(
  actor: Actor,
  id: string,
  patch: Partial<VehicleClassFields>,
): Promise<Change> {
  const check = checkVehicleClassFields(patch);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const vehicleClass = await tx.vehicleClass.findUnique({ where: { id } });
    if (!vehicleClass) return NOT_FOUND;

    const changed = changedFields(vehicleClass, patch);
    if (!changed) return { ok: true };

    await tx.vehicleClass.update({ where: { id }, data: changed.after });
    await logActivity(tx, actor, {
      action: "vehicle-class.updated",
      entityId: id,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}
