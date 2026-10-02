import { changedFields, logActivity } from "./activity";
import type { ActivityEntityType, Actor } from "./activity-actions";
import type { Change, Created } from "./change";
import { db } from "./client";
import { districtCodeAt } from "./district-index";
import type {
  Location,
  LocationAddress,
  Prisma,
} from "./generated/prisma/client";
import {
  NEW_LOCATION_STATE,
  checkAddressNames,
  checkLocationFields,
  isSlugLocked,
  type LocationFields,
} from "./location-input";
import { isPlace, type Place } from "./place";

export type { Location, LocationAddress };

/**
 * Locations: the places Marketing sells as destinations, each a pin in one
 * district with a list of saved addresses. The readers serve the Locations
 * screens; the writers are the screens', each taking the actor and logging
 * inside its transaction. A location's place and its saved addresses arrive
 * resolved: the caller asks Google, this module never does. See
 * docs/261001-locations-and-pages.md.
 */

const LOCATION: ActivityEntityType = "location";

/** Why a write did not happen; fits both `Change` and `Created`. */
type Refusal = { ok: false; error: string };

const NOT_FOUND: Refusal = { ok: false, error: "Location not found." };

const NO_DISTRICT: Refusal = {
  ok: false,
  error:
    "That place is in no district: at sea, or outside Malaysia. Pick another.",
};

const ADDRESSES_CHANGED: Refusal = {
  ok: false,
  error:
    "The saved addresses were changed by someone else. Reload to see them.",
};

const withDistrict = {
  include: { district: { include: { state: true } } },
} satisfies Prisma.LocationDefaultArgs;

const withDetails = {
  include: {
    ...withDistrict.include,
    addresses: { orderBy: { position: "asc" } },
  },
} satisfies Prisma.LocationDefaultArgs;

/** A location with its district, that district's state and its saved addresses in order. */
export type LocationWithDetails = Prisma.LocationGetPayload<typeof withDetails>;

/** A row of the Locations list. */
export type LocationSummary = Prisma.LocationGetPayload<typeof withDistrict> & {
  /** The newest logged change to the location; null when none is logged. */
  changedAt: Date | null;
};

/** Every location, by name, with its district and its last change. */
export async function listLocations(): Promise<LocationSummary[]> {
  const [locations, changes] = await Promise.all([
    db.location.findMany({ ...withDistrict, orderBy: { name: "asc" } }),
    db.activityLog.groupBy({
      by: ["entityId"],
      where: { entityType: LOCATION },
      _max: { createdAt: true },
    }),
  ]);
  const changedAt = new Map(
    changes.map((row) => [row.entityId, row._max.createdAt]),
  );
  return locations.map((location) => ({
    ...location,
    changedAt: changedAt.get(location.id) ?? null,
  }));
}

export function getLocation(id: string): Promise<LocationWithDetails | null> {
  return db.location.findUnique({ where: { id }, ...withDetails });
}

/** The stored place's label, as the log names a place. */
function placeLabel(place: unknown) {
  return isPlace(place) ? place.label : "";
}

function placeIdOf(place: unknown) {
  return isPlace(place) ? place.placeId : null;
}

/** Why the slug cannot be taken, when another location holds it. */
async function slugTaken(
  tx: Prisma.TransactionClient,
  slug: string,
  exceptId?: string,
): Promise<Refusal | null> {
  const taken = await tx.location.findUnique({ where: { slug } });
  if (!taken || taken.id === exceptId) return null;
  return {
    ok: false,
    error: `Another location already uses /${slug}. Choose another slug.`,
  };
}

/**
 * A new location, in `draft`. Its district is where the place's coordinates
 * fall; a place in no district is refused.
 */
export async function createLocation(
  actor: Actor,
  fields: LocationFields,
  place: Place,
): Promise<Created> {
  const check = checkLocationFields(fields);
  if (!check.ok) return check;
  const districtCode = districtCodeAt(place.lat, place.lng);
  if (!districtCode) return NO_DISTRICT;

  return db.$transaction(async (tx) => {
    const district = await tx.district.findUnique({
      where: { code: districtCode },
    });
    if (!district) return NO_DISTRICT;
    const taken = await slugTaken(tx, fields.slug);
    if (taken) return taken;

    const location = await tx.location.create({
      data: { ...fields, place, districtCode, state: NEW_LOCATION_STATE },
    });
    await logActivity(tx, actor, {
      action: "location.created",
      entityId: location.id,
      after: { name: fields.name, slug: fields.slug, district: district.name },
    });
    return { ok: true, id: location.id };
  });
}

/**
 * Changes the name, the slug and the tagline, and the place when one is
 * given: a new place moves the pin and the district with it. The slug is
 * locked once the location has been live. Saving what is already there logs
 * nothing.
 */
export async function updateLocation(
  actor: Actor,
  id: string,
  fields: LocationFields,
  place?: Place,
): Promise<Change> {
  const check = checkLocationFields(fields);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({ where: { id } });
    if (!location) return NOT_FOUND;

    const changed = changedFields(location, fields);
    if (changed?.after.slug !== undefined) {
      if (isSlugLocked(location)) {
        return {
          ok: false,
          error: "The slug is locked once a location has been live.",
        };
      }
      const taken = await slugTaken(tx, fields.slug, id);
      if (taken) return taken;
    }

    const moved =
      place && place.placeId !== placeIdOf(location.place) ? place : null;
    const districtCode = moved ? districtCodeAt(moved.lat, moved.lng) : null;
    if (moved) {
      const district = districtCode
        ? await tx.district.findUnique({ where: { code: districtCode } })
        : null;
      if (!district) return NO_DISTRICT;
    }
    if (!changed && !moved) return { ok: true };

    await tx.location.update({
      where: { id },
      data: {
        ...changed?.after,
        ...(moved && districtCode ? { place: moved, districtCode } : {}),
      },
    });
    await logActivity(tx, actor, {
      action: "location.updated",
      entityId: id,
      before: {
        ...changed?.before,
        ...(moved
          ? {
              place: placeLabel(location.place),
              districtCode: location.districtCode,
            }
          : {}),
      },
      after: {
        ...changed?.after,
        ...(moved ? { place: moved.label, districtCode } : {}),
      },
    });
    return { ok: true };
  });
}

/**
 * One row of the list `setLocationAddresses` writes: an address the location
 * already holds, by its id, or a new one with its resolved place.
 */
export type AddressWrite =
  { id: string; name: string } | { place: Place; name: string };

/** A saved address as the log keeps it. */
function loggedAddress(address: { id: string; name: string; place: unknown }) {
  return {
    id: address.id,
    name: address.name,
    place: placeLabel(address.place),
  };
}

/**
 * Replaces the location's saved addresses with the list, in its order. A
 * kept address keeps its id, which a highlight may point at; one left out is
 * removed. `expected` is the ids the form was opened with, in order: when
 * the stored list is no longer that, someone else changed it and the save is
 * refused. Saving what is already there logs nothing.
 */
export async function setLocationAddresses(
  actor: Actor,
  locationId: string,
  expected: readonly string[],
  entries: readonly AddressWrite[],
): Promise<Change> {
  const check = checkAddressNames(entries.map((entry) => entry.name));
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      include: { addresses: { orderBy: { position: "asc" } } },
    });
    if (!location) return NOT_FOUND;

    const current = location.addresses;
    const currentIds = current.map((address) => address.id);
    if (
      currentIds.length !== expected.length ||
      currentIds.some((id, i) => id !== expected[i])
    ) {
      return ADDRESSES_CHANGED;
    }
    const byId = new Map(current.map((address) => [address.id, address]));
    const keptIds = new Set<string>();
    for (const entry of entries) {
      if (!("id" in entry)) continue;
      if (!byId.has(entry.id) || keptIds.has(entry.id)) {
        return ADDRESSES_CHANGED;
      }
      keptIds.add(entry.id);
    }

    const same =
      entries.length === current.length &&
      entries.every(
        (entry, i) =>
          "id" in entry &&
          entry.id === current[i]?.id &&
          entry.name === current[i]?.name,
      );
    if (same) return { ok: true };

    await tx.locationAddress.deleteMany({
      where: { locationId, id: { notIn: [...keptIds] } },
    });
    const after: ReturnType<typeof loggedAddress>[] = [];
    for (const [position, entry] of entries.entries()) {
      const address =
        "id" in entry
          ? await tx.locationAddress.update({
              where: { id: entry.id },
              data: { name: entry.name, position },
            })
          : await tx.locationAddress.create({
              data: {
                locationId,
                name: entry.name,
                place: entry.place,
                position,
              },
            });
      after.push(loggedAddress(address));
    }
    await logActivity(tx, actor, {
      action: "location.addresses.updated",
      entityId: locationId,
      before: { addresses: current.map(loggedAddress) },
      after: { addresses: after },
    });
    return { ok: true };
  });
}
