import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import type { TripCategory } from "./booking-status";
import { refuse, type Change, type Created } from "./change";
import { db } from "./client";
import type {
  LocationVehicleClass,
  Prisma,
  VehicleClass,
} from "./generated/prisma/client";
import {
  byCategory,
  byClassOrder,
  checkOfferingFields,
  type OfferingFields,
} from "./offering-input";
import { slugify } from "./slug";
import {
  checkVehicleClassFields,
  type VehicleClassFields,
} from "./vehicle-class-input";
import { shownModel, type ShownModel } from "./models-shown";
import { modelsShownAt } from "./vehicle-models";

export type { LocationVehicleClass };

/**
 * Offerings: the classes a location sells, each at the location's own
 * rates and under its own rules. The catalogue class (./vehicle-classes)
 * carries what the vehicle is, its seats, its luggage and its picture; the
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

/** The offering's class with the models of the location's vehicles in service. */
const withModelsAt = (location: Prisma.LocationWhereInput) =>
  ({
    include: { vehicleClass: { include: { models: modelsShownAt(location) } } },
  }) satisfies Prisma.LocationVehicleClassDefaultArgs;

type OfferingWithModelRows = Prisma.LocationVehicleClassGetPayload<
  ReturnType<typeof withModelsAt>
>;

/** An offering on sale, its class with the models of the location's vehicles in service. */
export type OfferingOnSale = Omit<OfferingWithModelRows, "vehicleClass"> & {
  vehicleClass: VehicleClass & { models: ShownModel[] };
};

/** Offerings as they are read, their models named, in the location's order. */
function onSale(rows: OfferingWithModelRows[]): OfferingOnSale[] {
  return rows
    .map(
      ({
        vehicleClass: { models: modelRows, ...vehicleClass },
        ...offering
      }) => ({
        ...offering,
        vehicleClass: { ...vehicleClass, models: modelRows.map(shownModel) },
      }),
    )
    .sort(byClassOrder);
}

const NOT_FOUND: Change = refuse(
  "This class was taken off this location meanwhile. Go back to the list.",
);

/** Every offering of the location, on sale or not, in its order (`byClassOrder`). */
export async function listOfferings(locationId: string): Promise<Offering[]> {
  const rows = await db.locationVehicleClass.findMany({
    where: { locationId },
    ...withClass,
  });
  return rows.sort(byClassOrder);
}

/**
 * The offerings the location sells in the category right now: on sale, of
 * an active class, in the location's order, each class with the models of
 * the location's vehicles in service. What the options page prices.
 */
export async function listActiveOfferings(
  locationId: string,
  category: TripCategory,
): Promise<OfferingOnSale[]> {
  const rows = await db.locationVehicleClass.findMany({
    where: {
      locationId,
      isActive: true,
      vehicleClass: { category, isActive: true },
    },
    ...withModelsAt({ id: locationId }),
  });
  return onSale(rows);
}

/** The same, for the customer site, which knows the location by its slug. */
export async function listActiveOfferingsAt(
  slug: string,
  category: TripCategory,
): Promise<OfferingOnSale[]> {
  const rows = await db.locationVehicleClass.findMany({
    where: {
      location: { slug },
      isActive: true,
      vehicleClass: { category, isActive: true },
    },
    ...withModelsAt({ slug }),
  });
  return onSale(rows);
}

/**
 * Each class's cheapest cell on the location's grid, by the class's id:
 * the routes between its own zones, and its routes out when trips across
 * locations are on. A class the grid prices no route for is not in it.
 * For "from RM" (`startingPriceSen`).
 */
export async function cheapestCellsAt(
  slug: string,
): Promise<Map<string, number>> {
  const rows = await db.zoneRate.groupBy({
    by: ["vehicleClassId"],
    where: {
      location: { slug },
      OR: [
        { toZone: { location: { slug } } },
        { location: { crossLocation: true } },
      ],
    },
    _min: { priceSen: true },
  });
  return minByClass(rows);
}

/**
 * Each class's cheapest hourly package at the location, by the class's
 * id, from any of its zones. A class with no package priced is not in it.
 * For "from RM" (`startingPriceSen`).
 */
export async function cheapestPackagesAt(
  slug: string,
): Promise<Map<string, number>> {
  const rows = await db.hourlyRate.groupBy({
    by: ["vehicleClassId"],
    where: { package: { zone: { location: { slug } } } },
    _min: { priceSen: true },
  });
  return minByClass(rows);
}

function minByClass(
  rows: { vehicleClassId: string; _min: { priceSen: number | null } }[],
) {
  return new Map(
    rows.flatMap((row) =>
      row._min.priceSen === null
        ? []
        : [[row.vehicleClassId, row._min.priceSen] as const],
    ),
  );
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
  return rows.sort(byCategory);
}

/** What "Add class" picks: a catalogue class by id, or a new one with its fields. */
export type OfferingClassChoice =
  { vehicleClassId: string } | { newClass: VehicleClassFields };

/**
 * Starts selling a class at the location, at the rates and under the rules
 * given, last in its category's order once the location has one. A new
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
    if (!location) {
      return refuse(
        "This location was deleted meanwhile. Go back to Locations.",
      );
    }

    let vehicleClass: VehicleClass;
    if ("vehicleClassId" in choice) {
      const found = await tx.vehicleClass.findUnique({
        where: { id: choice.vehicleClassId },
      });
      if (!found) {
        return refuse(
          "That class was just deleted. Choose the class again.",
          "vehicleClassId",
        );
      }
      vehicleClass = found;
    } else {
      const slug = slugify(choice.newClass.name);
      if (!slug) {
        return refuse("Enter a name with a letter or digit.", "name");
      }
      const taken = await tx.vehicleClass.findUnique({ where: { slug } });
      if (taken) {
        return refuse(
          `${taken.name} is in the catalogue already. Choose it from the catalogue instead.`,
          "name",
        );
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
      return refuse(
        `${vehicleClass.name} is already offered here. Edit its rates instead.`,
        "vehicleClassId",
      );
    }
    // Once the location has ordered its list, a new class goes last in it;
    // before, it takes the catalogue's place like the rest.
    const last = await tx.locationVehicleClass.aggregate({
      where: { locationId, vehicleClass: { category: vehicleClass.category } },
      _max: { sortOrder: true },
    });
    const ordered = last._max.sortOrder ?? 0;
    const offering = await tx.locationVehicleClass.create({
      data: {
        locationId,
        vehicleClassId: vehicleClass.id,
        ...fields,
        sortOrder: ordered > 0 ? ordered + 1 : 0,
      },
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
    // A patch of one charge column meets the other as stored: checked
    // together, so an offering never charges both a share and an amount.
    const charge = checkOfferingFields({
      modelChoicePercent:
        "modelChoicePercent" in patch
          ? patch.modelChoicePercent
          : offering.modelChoicePercent,
      modelChoiceFlatSen:
        "modelChoiceFlatSen" in patch
          ? patch.modelChoiceFlatSen
          : offering.modelChoiceFlatSen,
    });
    if (!charge.ok) return charge;

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

/**
 * Moves a class one place earlier or later among its category's at the
 * location, the order its customers meet them in. The category's places
 * are written again as 1, 2, 3 with no gaps, from the order on screen,
 * and the order logged.
 */
export async function moveOffering(
  actor: Actor,
  id: string,
  by: -1 | 1,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const offering = await tx.locationVehicleClass.findUnique({
      where: { id },
      ...withClass,
    });
    if (!offering) return NOT_FOUND;
    const rows = (
      await tx.locationVehicleClass.findMany({
        where: {
          locationId: offering.locationId,
          vehicleClass: { category: offering.vehicleClass.category },
        },
        ...withClass,
      })
    ).sort(byClassOrder);
    const before = rows.map((row) => row.vehicleClass.name);
    const index = rows.findIndex((row) => row.id === id);
    const other = index + by;
    if (other < 0 || other >= rows.length) return { ok: true };
    const after = [...rows];
    after.splice(index, 1);
    after.splice(other, 0, offering);
    for (const [place, row] of after.entries()) {
      if (row.sortOrder === place + 1) continue;
      await tx.locationVehicleClass.update({
        where: { id: row.id },
        data: { sortOrder: place + 1 },
      });
    }
    await logActivity(tx, actor, {
      action: "location.offerings.ordered",
      entityId: offering.locationId,
      before: { order: before },
      after: {
        order: after.map((row) => row.vehicleClass.name),
        moved: offering.vehicleClass.name,
      },
    });
    return { ok: true };
  });
}
