import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import { checkDeleteConfirmed, type DeleteConfirmation } from "./delete-impact";
import type {
  Location,
  LocationAddress,
  Prisma,
  State,
} from "./generated/prisma/client";
import {
  NEW_LOCATION_STATE,
  TOP_CHOICE_CAP,
  checkAddressNames,
  checkLocationFields,
  locationStateOf,
  isSlugLocked,
  locationDeleteImpact,
  stateMoveBlockers,
  type LocationFields,
  type LocationState,
  type OperationStanding,
  type TopChoiceChange,
} from "./location-input";
import {
  LANDING_PAGE,
  isLocationPageRef,
  pageKindOf,
  type PlaceSection,
} from "./location-page-input";
import {
  checkNewEntry,
  createLocationEntry,
  pagesForStandings,
  standingsOf,
  type PageSummary,
} from "./location-pages";
import {
  isInStates,
  strayAddresses,
  strayAddressesPhrase,
} from "./location-places";
import { andList, plural } from "./names";
import {
  PAGE_LOCALE,
  pageContentOf,
  publicCopyOf,
  type PageContent,
  type PageImage,
} from "./page-content";
import { isPlace, type Place } from "./place";
import { routesIntoLocation } from "./zones";
import { checkSafetyBuffer } from "./fulfilment-rules";

export type { Location, LocationAddress };

/**
 * Locations: the operation areas, each a name, a slug and the states it
 * lies in, with a list of saved addresses, a landing page and one page per
 * product. What it serves is its zones (./zones), drawn within those
 * states on its Coverage tab. A page has a working draft and, once published, a
 * public copy; the location's state and whether each page is published
 * decide what the public sees. The row's `isOn` is that: true from a
 * publish until the page is unpublished, with `published` holding the copy
 * last published. The readers serve the Locations screens and, as views
 * (./location-view), the customer site; the writers are the screens', each
 * taking the actor and logging inside its transaction, except a draft save,
 * which is not logged. Saved addresses arrive resolved: the caller asks
 * Google, this module never does. The classes a location sells are
 * ./offerings, its zones and rates ./zones. See
 * docs/261001-locations-and-pages.md, docs/261003-location-flow.md and
 * docs/261015-locations-as-operation-areas.md.
 */

const NOT_FOUND = refuse(
  "This location was deleted meanwhile. Go back to Locations.",
);

const UNKNOWN_STATE = refuse(
  "One of the states is not known. Reload and tick them again.",
  "states",
);

/** A location's states as every reader includes them: by name. */
const withStates = {
  states: { orderBy: { name: "asc" } },
} satisfies Prisma.LocationInclude;

/** The codes of a location's states, sorted, as the log records them. */
const codesOf = (states: readonly { code: string }[]) =>
  states.map((state) => state.code).sort();

const ADDRESSES_CHANGED: Refusal = {
  ok: false,
  error:
    "The saved addresses were changed by someone else. Reload to see them.",
};

/** The rule a refused address or a refused change of states ends on. */
const ADDRESS_RULE =
  "A saved address has to be in one of the location's states.";

/** The states a location lies in, by name. */
type WithStates = { states: State[] };

/** A location as a list names it. */
export type LocationName = Pick<Location, "id" | "name" | "slug" | "state">;

/** Every location, by name, for a filter or a picker. */
export function listLocationNames(): Promise<LocationName[]> {
  return db.location.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, state: true },
  });
}

/** A saved address with the names of the pages whose "Take me here" goes to it. */
export type LocationAddressWithUses = LocationAddress & {
  usedBy: string[];
  /** It lies outside the location's states: saved before the rule, or before the states changed. */
  isStray: boolean;
};

/**
 * A location with its states, its saved addresses in order and its pages,
 * written or not, in their order (`standingsOf`).
 */
export type LocationWithDetails = Location &
  WithStates & {
    addresses: LocationAddressWithUses[];
    pages: PageSummary[];
  };

export async function getLocation(
  id: string,
): Promise<LocationWithDetails | null> {
  const found = await db.location.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { position: "asc" } },
      ...pagesForStandings,
      ...withStates,
    },
  });
  if (!found) return null;
  const { pages, offerings, addresses, ...location } = found;
  const stateCodes = codesOf(location.states);

  // A place, an attraction or a hotel points at an address, in its draft,
  // its public copy or both.
  const pointers = pages.flatMap((row) => {
    const ref = { page: row.page, slug: row.slug };
    if (!isLocationPageRef(ref) || pageKindOf(ref) !== "place") return [];
    const draft = pageContentOf("place", row.draft);
    const name = draft.heroHeadline || row.slug;
    return [draft, publicCopyOf("place", row)]
      .filter((content): content is PageContent => content !== null)
      .map((content) => ({ addressId: content.addressId, name }));
  });
  return {
    ...location,
    addresses: addresses.map((address) => ({
      ...address,
      usedBy: [
        ...new Set(
          pointers
            .filter((pointer) => pointer.addressId === address.id)
            .map((pointer) => pointer.name),
        ),
      ],
      isStray: isPlace(address.place) && !isInStates(address.place, stateCodes),
    })),
    pages: standingsOf(pages, offerings),
  };
}

/** A location among the home page's top choices, as the Home page screen lists them. */
export type TopChoice = Pick<Location, "id" | "name" | "slug" | "state"> & {
  /** Its main page's hero image, which its card on the home page shows. */
  heroImage: PageImage | null;
};

const topChoices = {
  where: { topChoiceOrder: { not: null } },
  orderBy: [{ topChoiceOrder: "asc" }, { name: "asc" }],
} satisfies Prisma.LocationFindManyArgs;

/**
 * The top choices in their order, paused ones included: a paused top choice
 * is left off the home page and keeps its place.
 */
export async function listTopChoices(): Promise<TopChoice[]> {
  const locations = await db.location.findMany({
    ...topChoices,
    select: {
      id: true,
      name: true,
      slug: true,
      state: true,
      pages: {
        where: { locale: PAGE_LOCALE, page: LANDING_PAGE, slug: "" },
      },
    },
  });
  return locations.map(({ pages, ...location }) => ({
    ...location,
    heroImage:
      standingsOf(pages, []).find((page) => page.page === LANDING_PAGE)
        ?.heroImage ?? null,
  }));
}

/** A location that can be added to the top choices. */
export type TopChoiceCandidate = Pick<Location, "id" | "name">;

/** The live locations that are not top choices yet, by name. */
export function listTopChoiceCandidates(): Promise<TopChoiceCandidate[]> {
  return db.location.findMany({
    where: { state: "live" satisfies LocationState, topChoiceOrder: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** The location at a slug, by its id; null when no location has it. The console's address for a location is its slug. */
export async function getLocationIdBySlug(
  slug: string,
): Promise<string | null> {
  const location = await db.location.findUnique({
    where: { slug },
    select: { id: true },
  });
  return location?.id ?? null;
}

/** The slug the location's pages are at now; the customer site caches them by it. */
export async function getLocationSlug(id: string): Promise<string | null> {
  const location = await db.location.findUnique({
    where: { id },
    select: { slug: true },
  });
  return location?.slug ?? null;
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
  return refuse(
    `Another location already uses /${slug}. Choose another slug.`,
    "slug",
  );
}

const sameCodes = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((code, i) => code === b[i]);

/** Why the states cannot be the location's: one is not known. The codes hold each once, sorted. */
async function statesRefusal(
  tx: Prisma.TransactionClient,
  codes: readonly string[],
): Promise<Refusal | null> {
  const known = await tx.state.count({ where: { code: { in: [...codes] } } });
  return known === codes.length ? null : UNKNOWN_STATE;
}

/** The states as a write connects them. */
const stateRefs = (codes: readonly string[]) => codes.map((code) => ({ code }));

/** A new location, in `draft`, in the states ticked. */
export async function createLocation(
  actor: Actor,
  fields: LocationFields,
): Promise<Created> {
  const check = checkLocationFields(fields);
  if (!check.ok) return check;
  const { stateCodes, ...text } = fields;

  return db.$transaction(async (tx) => {
    const refusal = await statesRefusal(tx, stateCodes);
    if (refusal) return refusal;
    const taken = await slugTaken(tx, fields.slug);
    if (taken) return taken;

    const location = await tx.location.create({
      data: {
        ...text,
        state: NEW_LOCATION_STATE,
        states: { connect: stateRefs(stateCodes) },
      },
    });
    await logActivity(tx, actor, {
      action: "location.created",
      entityId: location.id,
      after: { name: fields.name, slug: fields.slug, stateCodes },
    });
    return { ok: true, id: location.id };
  });
}

/**
 * Sets the minutes a location keeps a vehicle or a driver free after a
 * job, on top of the drive to the next; 0 turns it off. Roads differ by
 * place, not by vendor. Saving what is already there logs nothing. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Clashes and timing".
 */
export async function setSafetyBuffer(
  actor: Actor,
  id: string,
  minutes: number,
): Promise<Change> {
  const check = checkSafetyBuffer(minutes);
  if (!check.ok) return check;
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      select: { safetyBufferMinutes: true },
    });
    if (!location) return NOT_FOUND;
    if (location.safetyBufferMinutes === minutes) return { ok: true };
    await tx.location.update({
      where: { id },
      data: { safetyBufferMinutes: minutes },
    });
    await logActivity(tx, actor, {
      action: "location.buffer.updated",
      entityId: id,
      before: { safetyBufferMinutes: location.safetyBufferMinutes },
      after: { safetyBufferMinutes: minutes },
    });
    return { ok: true };
  });
}

/**
 * Changes the name, the slug and the states. The slug is locked once the
 * location has been live. The states cannot change so that a saved
 * address is left outside them. Saving what is already there logs nothing.
 */
export async function updateLocation(
  actor: Actor,
  id: string,
  fields: LocationFields,
): Promise<Change> {
  const check = checkLocationFields(fields);
  if (!check.ok) return check;
  const { stateCodes, ...text } = fields;

  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      include: {
        addresses: { orderBy: { position: "asc" } },
        states: { select: { code: true } },
      },
    });
    if (!location) return NOT_FOUND;
    const was = codesOf(location.states);

    const changed = changedFields(location, text);
    if (changed?.after.slug !== undefined) {
      if (isSlugLocked(location)) {
        return refuse(
          "The slug is locked once a location has been live. Put the slug back as it was.",
          "slug",
        );
      }
      const taken = await slugTaken(tx, fields.slug, id);
      if (taken) return taken;
    }

    const moved = !sameCodes(was, stateCodes);
    if (moved) {
      const refusal = await statesRefusal(tx, stateCodes);
      if (refusal) return refusal;
      const stray = strayAddresses(location.addresses, stateCodes);
      if (stray.length > 0) {
        return refuse(
          `${strayAddressesPhrase(stray)}. ${ADDRESS_RULE} Remove ${
            stray.length > 1 ? "those addresses" : "that address"
          } first, or keep the state ticked.`,
          "states",
        );
      }
    }
    if (!changed && !moved) return { ok: true };

    await tx.location.update({
      where: { id },
      data: {
        ...changed?.after,
        ...(moved ? { states: { set: stateRefs(stateCodes) } } : {}),
      },
    });
    await logActivity(tx, actor, {
      action: "location.updated",
      entityId: id,
      before: {
        ...changed?.before,
        ...(moved ? { stateCodes: was } : {}),
      },
      after: {
        ...changed?.after,
        ...(moved ? { stateCodes } : {}),
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
 * Whether a place may become one of the location's saved addresses, asked
 * the moment it is picked: null when it lies in one of the location's
 * states, else the sentence that says where it lies. `setLocationAddresses`
 * asks again on save.
 */
export async function savedAddressRefusal(
  locationId: string,
  name: string,
  place: Place,
): Promise<string | null> {
  const location = await db.location.findUnique({
    where: { id: locationId },
    select: { states: { select: { code: true } } },
  });
  if (!location) return NOT_FOUND.error;
  const stray = strayAddresses([{ name, place }], codesOf(location.states));
  return stray.length === 0
    ? null
    : `${strayAddressesPhrase(stray)}. ${ADDRESS_RULE}`;
}

/**
 * Replaces the location's saved addresses with the list, in its order. A
 * kept address keeps its id, which a place's page may point at; one left out
 * is removed, and a page pointing at it then reads as having no address.
 * `expected` is the ids the form was opened with, in order: when the stored
 * list is no longer that, someone else changed it and the save is refused.
 * A new address has to lie in one of the location's states, placed by
 * its coordinates; every one that does not is named in the refusal. Saving
 * what is already there logs nothing.
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
      include: {
        addresses: { orderBy: { position: "asc" } },
        states: { select: { code: true } },
      },
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
    const stray = strayAddresses(
      entries.filter((entry) => "place" in entry),
      codesOf(location.states),
    );
    if (stray.length > 0) {
      return {
        ok: false,
        error: `${strayAddressesPhrase(stray)}. ${ADDRESS_RULE}`,
      };
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

/**
 * Adds one saved address at the end of the location's list, saved at once:
 * from the Saved addresses list, and from a page's editor or its Add
 * dialog when the address a place needs is not saved yet. It is
 * `setLocationAddresses` over the list as it is plus the new one, so the
 * same checks apply: a name unique in the list, within the limit, and a
 * place in one of the location's states. With `page`, the address is a
 * popular place, an attraction or a hotel: a draft page of that type is
 * added too, named as the address and pointing at it, its slug checked
 * before anything is written. Answers the new address's id.
 */
export async function addLocationAddress(
  actor: Actor,
  locationId: string,
  address: { place: Place; name: string },
  page?: { page: PlaceSection; slug: string },
): Promise<Created> {
  if (page) {
    const refused = await checkNewEntry(locationId, page.page, {
      title: address.name,
      slug: page.slug,
    });
    if (refused) return refused;
  }
  const current = await db.locationAddress.findMany({
    where: { locationId },
    orderBy: { position: "asc" },
    select: { id: true, name: true, place: true },
  });
  if (
    current.some(
      (saved) =>
        isPlace(saved.place) && saved.place.placeId === address.place.placeId,
    )
  ) {
    return refuse(`${address.name} is saved already.`, "place");
  }
  const result = await setLocationAddresses(
    actor,
    locationId,
    current.map((saved) => saved.id),
    [...current.map(({ id, name }) => ({ id, name })), address],
  );
  if (!result.ok) return result;
  const added = await db.locationAddress.findFirst({
    where: { locationId, name: address.name },
    select: { id: true },
  });
  if (!added) return NOT_FOUND;
  if (page) {
    const created = await createLocationEntry(actor, locationId, page.page, {
      title: address.name,
      slug: page.slug,
      addressId: added.id,
    });
    if (!created.ok) return created;
  }
  return { ok: true, id: added.id };
}

/**
 * A delete's answer: the slug the location had, for the customer site's
 * refresh, and the other locations whose routes to its zones went with
 * it, by id, whose pages change too; or why not.
 */
export type LocationDeleted =
  { ok: true; slug: string; alsoChanged: string[] } | Refusal;

/**
 * Deletes a location, with its pages, its saved addresses, its offerings,
 * its zones and their rates, and other locations' routes to its zones
 * (`routesIntoLocation`), such as Kuala Lumpur's to Selangor's KLIA, once
 * the admin confirmed what that takes as it stands
 * (`locationDeleteImpact`, ./delete-impact): one that priced a route to it
 * since the location's settings were read is refused, to be read first. A top
 * choice leaves the home page first, so the places after it close up.
 * What the location was is logged, in the other locations' history too,
 * and its earlier entries stay in the log under the name it had. The
 * images its pages uploaded stay in storage until the Media screen
 * deletes them; its bookings keep their receipts and lose the pointer.
 * One with vehicles or drivers based at it is refused until they move.
 */
export async function deleteLocation(
  actor: Actor,
  id: string,
  confirmation: DeleteConfirmation,
): Promise<LocationDeleted> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      include: {
        states: { select: { code: true } },
        _count: { select: { vehicles: true, drivers: true } },
      },
    });
    if (!location) return NOT_FOUND;
    // Its zones held until the delete ends: a route priced to one meanwhile
    // waits, then finds it gone, rather than going unannounced.
    await tx.$executeRaw`SELECT id FROM "Zone" WHERE "locationId" = ${id} FOR UPDATE`;
    const routesIn = await routesIntoLocation(id, tx);
    // Our vehicles and drivers are not the location's to take with it.
    const based = [
      location._count.vehicles > 0
        ? plural(location._count.vehicles, "vehicle")
        : null,
      location._count.drivers > 0
        ? plural(location._count.drivers, "driver")
        : null,
    ].filter((part) => part !== null);
    if (based.length > 0) {
      const one = location._count.vehicles + location._count.drivers === 1;
      return {
        ok: false,
        error: `${andList(based)} ${one ? "is" : "are"} based here. Move ${one ? "it" : "them"} to another location first.`,
      };
    }
    const confirmed = checkDeleteConfirmed(
      locationDeleteImpact(location, routesIn),
      confirmation,
    );
    if (!confirmed.ok) return confirmed;

    const left = await changeTopChoiceIn(tx, actor, id, "remove");
    if (!left.ok) return left;
    // Its pages, saved addresses, offerings, zones and rates go with it, by
    // the schema's cascade, other locations' routes to its zones too; the
    // states stay, with the link rows gone.
    await tx.location.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "location.deleted",
      entityId: id,
      before: {
        name: location.name,
        slug: location.slug,
        stateCodes: codesOf(location.states),
        state: locationStateOf(location.state),
        ...(routesIn.length > 0
          ? { routesFrom: routesIn.map((entry) => entry.name) }
          : {}),
      },
      // Their routes to its zones went too: the entry is in their history.
      locationIds: routesIn.map((entry) => entry.locationId),
    });
    return {
      ok: true,
      slug: location.slug,
      alsoChanged: routesIn.map((entry) => entry.locationId),
    };
  });
}

/** What the rules on a location's state read of its operation, inside a transaction. */
export async function operationStandingOf(
  tx: Prisma.TransactionClient,
  locationId: string,
): Promise<OperationStanding> {
  const [states, classesOnSale, zones, routes] = await Promise.all([
    tx.state.findMany({
      where: { locations: { some: { id: locationId } } },
      select: { name: true },
      orderBy: { name: "asc" },
    }),
    tx.locationVehicleClass.count({
      where: { locationId, isActive: true, vehicleClass: { isActive: true } },
    }),
    tx.zone.count({ where: { locationId } }),
    tx.zoneRate.findMany({
      where: { locationId },
      select: { fromZoneId: true, toZoneId: true },
      distinct: ["fromZoneId", "toZoneId"],
    }),
  ]);
  return {
    stateNames: states.map((state) => state.name),
    classesOnSale,
    zones,
    routesPriced: routes.length,
  };
}

/**
 * Moves the location to another state, when its pages and its operation
 * allow the move: a draft goes live, a live one is paused, a paused one
 * resumes. The first move to `live` stamps `wentLiveAt`, which locks the
 * slug. Moving to the state it is in logs nothing.
 */
export async function moveLocationState(
  actor: Actor,
  id: string,
  to: LocationState,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      include: pagesForStandings,
    });
    if (!location) return NOT_FOUND;
    const from = locationStateOf(location.state);
    if (from === to) return { ok: true };

    const blockers = stateMoveBlockers(
      from,
      to,
      standingsOf(location.pages, location.offerings),
      await operationStandingOf(tx, id),
    );
    if (blockers.length > 0) {
      return { ok: false, error: `${blockers.join(". ")}.` };
    }

    await tx.location.update({
      where: { id },
      data: {
        state: to,
        ...(to === "live" && !location.wentLiveAt
          ? { wentLiveAt: new Date() }
          : {}),
      },
    });
    await logActivity(tx, actor, {
      action: "location.state.changed",
      entityId: id,
      before: { state: from },
      after: { state: to },
    });
    return { ok: true };
  });
}

/**
 * Adds the location to the home page's top choices, at the end, removes it,
 * or moves it one place up or down. The places are kept as 1, 2, 3 with no
 * gaps, so every location whose place changes is updated and logged. Only a
 * live location is added; a paused one keeps the place it has.
 */
export async function changeTopChoice(
  actor: Actor,
  id: string,
  change: TopChoiceChange,
): Promise<Change> {
  return db.$transaction((tx) => changeTopChoiceIn(tx, actor, id, change));
}

/** `changeTopChoice` inside the caller's transaction: a delete takes its location off the home page with it. */
async function changeTopChoiceIn(
  tx: Prisma.TransactionClient,
  actor: Actor,
  id: string,
  change: TopChoiceChange,
): Promise<Change> {
  const location = await tx.location.findUnique({ where: { id } });
  if (!location) return NOT_FOUND;
  const current = await tx.location.findMany(topChoices);
  const ids = current.map((choice) => choice.id);
  const index = ids.indexOf(id);

  if (change === "add") {
    if (index >= 0) return { ok: true };
    if (locationStateOf(location.state) !== "live") {
      return {
        ok: false,
        error: "Only a live location can be made a top choice.",
      };
    }
    if (ids.length >= TOP_CHOICE_CAP) {
      return {
        ok: false,
        error: `The home page shows at most ${TOP_CHOICE_CAP} top choices. Remove one first.`,
      };
    }
    ids.push(id);
  } else if (index < 0) {
    // Removing what is not there is done; moving it is a stale screen.
    return change === "remove"
      ? { ok: true }
      : refuse("This location is no longer a top choice. Reload to see them.");
  } else if (change === "remove") {
    ids.splice(index, 1);
  } else {
    const other = index + (change === "up" ? -1 : 1);
    if (other < 0 || other >= ids.length) return { ok: true };
    ids.splice(index, 1);
    ids.splice(other, 0, id);
  }

  for (const row of index < 0 ? [...current, location] : current) {
    const place = ids.indexOf(row.id);
    const changed = changedFields(row, {
      topChoiceOrder: place < 0 ? null : place + 1,
    });
    if (!changed) continue;
    await tx.location.update({ where: { id: row.id }, data: changed.after });
    await logActivity(tx, actor, {
      action: "location.top-choice.updated",
      entityId: row.id,
      before: changed.before,
      after: changed.after,
    });
  }
  return { ok: true };
}
