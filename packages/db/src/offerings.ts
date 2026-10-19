import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { TRIP_CATEGORIES, type TripCategory } from "./booking-status";
import type { Change, Created } from "./change";
import { db } from "./client";
import type {
  LocationVehicleClass,
  Prisma,
  VehicleClass,
} from "./generated/prisma/client";
import { checkOfferingFields, type OfferingFields } from "./offering-input";
import { slugify } from "./slug";
import {
  checkVehicleClassFields,
  type VehicleClassFields,
} from "./vehicle-class-input";

export type { LocationVehicleClass };

/**
 * Offerings: the classes a location sells, each at the location's own
 * rates and under its own rules. The catalogue class (./vehicle-classes)
 * carries what the vehicle is, its seats and its luggage; the
 * offering carries the rates, the three rules and whether the class is on
 * sale there. The readers serve the location's Vehicle classes tab and the
 * customer site; the writers are the tab's, each taking the actor and
 * logging against the location inside its transaction. See
 * docs/261015-locations-as-operation-areas.md, "Vehicle classes", and
 * docs/261018-location-work-and-class-catalogue.md.
 */

const withClass = {
  include: { vehicleClass: true },
} satisfies Prisma.LocationVehicleClassDefaultArgs;

/** An offering with its catalogue class. */
export type Offering = Prisma.LocationVehicleClassGetPayload<typeof withClass>;

const NOT_FOUND: Change = { ok: false, error: "Offering not found." };

const categoryRank = (category: string) =>
  TRIP_CATEGORIES.indexOf(category as TripCategory);

const byClassOrder = (a: Offering, b: Offering) =>
  categoryRank(a.vehicleClass.category) -
    categoryRank(b.vehicleClass.category) ||
  a.vehicleClass.sortOrder - b.vehicleClass.sortOrder ||
  a.vehicleClass.name.localeCompare(b.vehicleClass.name);

/** Every offering of the location, on sale or not: car with driver first, then by the class's order. */
export async function listOfferings(locationId: string): Promise<Offering[]> {
  const rows = await db.locationVehicleClass.findMany({
    where: { locationId },
    ...withClass,
  });
  return rows.sort(byClassOrder);
}

/**
 * The offerings the location sells in the category right now: on sale, of
 * an active class, in the class's order. What the options page prices.
 */
export async function listActiveOfferings(
  locationId: string,
  category: TripCategory,
): Promise<Offering[]> {
  const rows = await db.locationVehicleClass.findMany({
    where: {
      locationId,
      isActive: true,
      vehicleClass: { category, isActive: true },
    },
    ...withClass,
  });
  return rows.sort(byClassOrder);
}

/** The same, for the customer site, which knows the location by its slug. */
export async function listActiveOfferingsAt(
  slug: string,
  category: TripCategory,
): Promise<Offering[]> {
  const rows = await db.locationVehicleClass.findMany({
    where: {
      location: { slug },
      isActive: true,
      vehicleClass: { category, isActive: true },
    },
    ...withClass,
  });
  return rows.sort(byClassOrder);
}

export function getOffering(id: string): Promise<Offering | null> {
  return db.locationVehicleClass.findUnique({ where: { id }, ...withClass });
}

/** The catalogue classes the location does not offer yet, for "Add class". */
export async function listClassesNotOffered(
  locationId: string,
): Promise<VehicleClass[]> {
  const rows = await db.vehicleClass.findMany({
    where: { offerings: { none: { locationId } } },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.sort(
    (a, b) => categoryRank(a.category) - categoryRank(b.category),
  );
}

/** What "Add class" picks: a catalogue class by id, or a new one with its fields. */
export type OfferingClassChoice =
  { vehicleClassId: string } | { newClass: VehicleClassFields };

/**
 * Starts selling a class at the location, at the rates and under the rules
 * given. A new
 * catalogue class is created first, with its slug from its name, and
 * logged against itself as the Vehicle classes screen would. A class the
 * location already offers is refused.
 */
export async function createOffering(
  actor: Actor,
  locationId: string,
  choice: OfferingClassChoice,
  fields: OfferingFields,
): Promise<Created> {
  const check = checkOfferingFields(fields);
  if (!check.ok) return check;
  if ("newClass" in choice) {
    const classCheck = checkVehicleClassFields(choice.newClass);
    if (!classCheck.ok) return classCheck;
  }

  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: { id: true },
    });
    if (!location) return { ok: false, error: "Location not found." };

    let vehicleClass: VehicleClass;
    if ("vehicleClassId" in choice) {
      const found = await tx.vehicleClass.findUnique({
        where: { id: choice.vehicleClassId },
      });
      if (!found) return { ok: false, error: "Vehicle class not found." };
      vehicleClass = found;
    } else {
      const slug = slugify(choice.newClass.name);
      if (!slug) {
        return { ok: false, error: "Enter a name with a letter or digit." };
      }
      const taken = await tx.vehicleClass.findUnique({ where: { slug } });
      if (taken) {
        return {
          ok: false,
          error: `${taken.name} already has the slug ${slug}. Pick it from the catalogue instead.`,
        };
      }
      vehicleClass = await tx.vehicleClass.create({
        data: { slug, ...choice.newClass },
      });
      await logActivity(tx, actor, {
        action: "vehicle-class.created",
        entityId: vehicleClass.id,
        after: { slug, ...choice.newClass },
      });
    }

    const already = await tx.locationVehicleClass.findUnique({
      where: {
        locationId_vehicleClassId: {
          locationId,
          vehicleClassId: vehicleClass.id,
        },
      },
    });
    if (already) {
      return {
        ok: false,
        error: `${vehicleClass.name} is already offered here. Edit its rates instead.`,
      };
    }
    const offering = await tx.locationVehicleClass.create({
      data: { locationId, vehicleClassId: vehicleClass.id, ...fields },
    });
    await logActivity(tx, actor, {
      action: "location.offering.created",
      entityId: locationId,
      after: { vehicleClassName: vehicleClass.name, ...fields },
    });
    return { ok: true, id: offering.id };
  });
}

/**
 * Changes the rates, the rules or the switch of an offering. A change
 * applies to new quotes at once; a booking keeps its receipt and its
 * cancellation cutoff. Saving what is already
 * there logs nothing.
 */
export async function updateOffering(
  actor: Actor,
  id: string,
  patch: Partial<OfferingFields>,
): Promise<Change> {
  const check = checkOfferingFields(patch);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const offering = await tx.locationVehicleClass.findUnique({
      where: { id },
      ...withClass,
    });
    if (!offering) return NOT_FOUND;

    const changed = changedFields(offering, patch);
    if (!changed) return { ok: true };

    await tx.locationVehicleClass.update({
      where: { id },
      data: changed.after,
    });
    await logActivity(tx, actor, {
      action: "location.offering.updated",
      entityId: offering.locationId,
      before: {
        vehicleClassName: offering.vehicleClass.name,
        ...changed.before,
      },
      after: { vehicleClassName: offering.vehicleClass.name, ...changed.after },
    });
    return { ok: true };
  });
}
