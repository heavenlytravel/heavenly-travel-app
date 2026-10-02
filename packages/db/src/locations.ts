import { changedFields, logActivity } from "./activity";
import type { ActivityEntityType, Actor } from "./activity-actions";
import type { Change, Created } from "./change";
import { db } from "./client";
import { listDistricts, type DistrictWithState } from "./coverage";
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
 * Locations: the places Marketing sells as destinations, each with the
 * districts it lies in and a list of saved addresses. The districts are
 * ticked by Marketing and kept as codes, as information: nothing ties a
 * location to coverage. The readers serve the Locations screens; the writers
 * are the screens', each taking the actor and logging inside its
 * transaction. Saved addresses arrive resolved: the caller asks Google, this
 * module never does. See docs/261001-locations-and-pages.md.
 */

const LOCATION: ActivityEntityType = "location";

/** Why a write did not happen; fits both `Change` and `Created`. */
type Refusal = { ok: false; error: string };

const NOT_FOUND: Refusal = { ok: false, error: "Location not found." };

const UNKNOWN_DISTRICT: Refusal = {
  ok: false,
  error: "One of the districts is not known. Reload and tick them again.",
};

const ADDRESSES_CHANGED: Refusal = {
  ok: false,
  error:
    "The saved addresses were changed by someone else. Reload to see them.",
};

/** The districts a location names, by state then name, each with its switch. */
type WithDistricts = { districts: DistrictWithState[] };

/** A row of the Locations list. */
export type LocationSummary = Location &
  WithDistricts & {
    /** The newest logged change to the location; null when none is logged. */
    changedAt: Date | null;
  };

/** A location with its districts and its saved addresses in order. */
export type LocationWithDetails = Location &
  WithDistricts & { addresses: LocationAddress[] };

/** Every location, by name, with its districts and its last change. */
export async function listLocations(): Promise<LocationSummary[]> {
  const [locations, districts, changes] = await Promise.all([
    db.location.findMany({ orderBy: { name: "asc" } }),
    listDistricts(),
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
    districts: districts.filter((d) => location.districtCodes.includes(d.code)),
    changedAt: changedAt.get(location.id) ?? null,
  }));
}

export async function getLocation(
  id: string,
): Promise<LocationWithDetails | null> {
  const location = await db.location.findUnique({
    where: { id },
    include: { addresses: { orderBy: { position: "asc" } } },
  });
  if (!location) return null;
  return {
    ...location,
    districts: await listDistricts(location.districtCodes),
  };
}

/** The stored place's label, as the log names a place. */
function placeLabel(place: unknown) {
  return isPlace(place) ? place.label : "";
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

/** True when every code is a district's. The codes hold each once. */
async function districtsExist(
  tx: Prisma.TransactionClient,
  codes: readonly string[],
) {
  const known = await tx.district.count({
    where: { code: { in: [...codes] } },
  });
  return known === codes.length;
}

const sameCodes = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((code, i) => code === b[i]);

/** A new location, in `draft`. */
export async function createLocation(
  actor: Actor,
  fields: LocationFields,
): Promise<Created> {
  const check = checkLocationFields(fields);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    if (!(await districtsExist(tx, fields.districtCodes))) {
      return UNKNOWN_DISTRICT;
    }
    const taken = await slugTaken(tx, fields.slug);
    if (taken) return taken;

    const location = await tx.location.create({
      data: { ...fields, state: NEW_LOCATION_STATE },
    });
    await logActivity(tx, actor, {
      action: "location.created",
      entityId: location.id,
      after: {
        name: fields.name,
        slug: fields.slug,
        districtCodes: fields.districtCodes,
      },
    });
    return { ok: true, id: location.id };
  });
}

/**
 * Changes the name, the slug, the tagline and the districts. The slug is
 * locked once the location has been live. Saving what is already there logs
 * nothing.
 */
export async function updateLocation(
  actor: Actor,
  id: string,
  fields: LocationFields,
): Promise<Change> {
  const check = checkLocationFields(fields);
  if (!check.ok) return check;
  const { districtCodes, ...text } = fields;

  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({ where: { id } });
    if (!location) return NOT_FOUND;

    const changed = changedFields(location, text);
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

    const moved = !sameCodes(location.districtCodes, districtCodes);
    if (moved && !(await districtsExist(tx, districtCodes))) {
      return UNKNOWN_DISTRICT;
    }
    if (!changed && !moved) return { ok: true };

    await tx.location.update({
      where: { id },
      data: { ...changed?.after, ...(moved ? { districtCodes } : {}) },
    });
    await logActivity(tx, actor, {
      action: "location.updated",
      entityId: id,
      before: {
        ...changed?.before,
        ...(moved ? { districtCodes: location.districtCodes } : {}),
      },
      after: {
        ...changed?.after,
        ...(moved ? { districtCodes } : {}),
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
