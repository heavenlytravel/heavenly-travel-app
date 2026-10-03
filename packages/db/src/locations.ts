import {
  changedFields,
  getActivityEntry,
  logActivity,
  type ActivityEntry,
} from "./activity";
import type { ActivityEntityType, Actor } from "./activity-actions";
import type { Change, Created } from "./change";
import { db } from "./client";
import { listDistricts, type DistrictWithState } from "./coverage";
import type {
  Location,
  LocationAddress,
  LocationPage,
  Prisma,
} from "./generated/prisma/client";
import {
  NEW_LOCATION_STATE,
  TOP_CHOICE_CAP,
  checkAddressNames,
  checkLocationFields,
  checkLocationSlug,
  checkPageUnpublish,
  locationStateOf,
  isSlugLocked,
  stateMoveBlockers,
  type LocationFields,
  type LocationState,
  type PageStanding,
  type TopChoiceChange,
} from "./location-input";
import {
  LANDING_PAGE,
  LOCATION_PAGES,
  PAGE_LOCALE,
  checkPageComplete,
  checkPageLimits,
  isLocationPageKey,
  pageContentOf,
  pageStatusOf,
  publicCopyOf,
  samePageContent,
  type LocationPageKey,
  type PageContent,
} from "./location-page-input";
import {
  isInDistricts,
  strayAddresses,
  strayAddressesPhrase,
} from "./location-places";
import {
  previewLocationViewOf,
  publicLocationViewOf,
  topChoiceCardOf,
  type LocationView,
  type TopChoiceCard,
} from "./location-view";
import { isPlace, type Place } from "./place";

export type { Location, LocationAddress };

/**
 * Locations: the places Marketing sells as destinations, each with the
 * districts it lies in, a list of saved addresses, a landing page and one
 * page per product. The districts are ticked by Marketing and kept as codes,
 * as information: nothing ties a location to coverage. A page has a working
 * draft and, once published, a public copy; the location's state and
 * whether each page is published decide what the public sees. The row's
 * `isOn` is that: true from a publish until the page is unpublished, with
 * `published` holding the copy last published. The readers serve the Locations
 * screens and, as views (./location-view), the customer site; the writers
 * are the screens', each taking the actor and logging inside its
 * transaction, except a draft save, which is not logged. Saved addresses
 * arrive resolved: the caller asks Google, this module never does.
 * See docs/261001-locations-and-pages.md and docs/261003-location-flow.md.
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

/** The rule a refused address or a refused change of districts ends on. */
const ADDRESS_RULE =
  "A saved address has to be in one of the location's districts.";

const PAGE_CHANGED: Refusal = {
  ok: false,
  error: "This page was changed by someone else. Reload to see it.",
};

/** The districts a location names, by state then name, each with its switch. */
type WithDistricts = { districts: DistrictWithState[] };

/** A row of the Locations list. */
export type LocationSummary = Location &
  WithDistricts & {
    /** The pages that are published, in the order of `LOCATION_PAGES`. */
    pagesPublished: LocationPageKey[];
    /** The newest logged change to the location; null when none is logged. */
    changedAt: Date | null;
  };

/** A saved address with the names of the landing page's highlights that point at it. */
export type LocationAddressWithUses = LocationAddress & {
  usedBy: string[];
  /** It lies outside the location's districts: saved before the rule, or before the districts changed. */
  isStray: boolean;
};

/**
 * A location with its districts, its saved addresses in order and its
 * pages, one per key of `LOCATION_PAGES` whether or not it has been written.
 */
export type LocationWithDetails = Location &
  WithDistricts & {
    addresses: LocationAddressWithUses[];
    pages: PageStanding[];
  };

/** The copy last published, kept when the page is unpublished; null before the first publish. */
function publishedOf(page: LocationPageKey, row: LocationPage) {
  return row.published === null ? null : pageContentOf(page, row.published);
}

/** What the rules and the screens read of a page's row; a page never saved has none. */
function standingOf(
  page: LocationPageKey,
  row: LocationPage | undefined,
): PageStanding {
  return {
    page,
    status: row
      ? pageStatusOf(pageContentOf(page, row.draft), publicCopyOf(page, row))
      : "unpublished",
  };
}

/** Every page of a location, written or not, in the order of `LOCATION_PAGES`. */
function standingsOf(rows: readonly LocationPage[]): PageStanding[] {
  return LOCATION_PAGES.map((page) =>
    standingOf(
      page,
      rows.find((row) => row.page === page),
    ),
  );
}

const pagesInLocale = { where: { locale: PAGE_LOCALE } };

/** Every location, by name, with its districts, the pages it has published and its last change. */
export async function listLocations(): Promise<LocationSummary[]> {
  const [locations, districts, changes] = await Promise.all([
    db.location.findMany({
      orderBy: { name: "asc" },
      include: {
        pages: { ...pagesInLocale, select: { page: true, isOn: true } },
      },
    }),
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
  return locations.map(({ pages, ...location }) => ({
    ...location,
    districts: districts.filter((d) => location.districtCodes.includes(d.code)),
    pagesPublished: LOCATION_PAGES.filter((key) =>
      pages.some((page) => page.page === key && page.isOn),
    ),
    changedAt: changedAt.get(location.id) ?? null,
  }));
}

export async function getLocation(
  id: string,
): Promise<LocationWithDetails | null> {
  const found = await db.location.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: { position: "asc" } },
      pages: pagesInLocale,
    },
  });
  if (!found) return null;
  const { pages, addresses, ...location } = found;

  // A highlight of the landing page points at an address, in the draft, the
  // public copy or both.
  const landing = pages.find((row) => row.page === LANDING_PAGE);
  const highlights = landing
    ? [
        ...pageContentOf(LANDING_PAGE, landing.draft).highlights,
        ...(publicCopyOf(LANDING_PAGE, landing)?.highlights ?? []),
      ]
    : [];
  return {
    ...location,
    districts: await listDistricts(location.districtCodes),
    addresses: addresses.map((address) => ({
      ...address,
      usedBy: [
        ...new Set(
          highlights
            .filter((highlight) => highlight.addressId === address.id)
            .map((highlight) => highlight.name || "an unnamed highlight"),
        ),
      ],
      isStray:
        isPlace(address.place) &&
        !isInDistricts(address.place, location.districtCodes),
    })),
    pages: standingsOf(pages),
  };
}

/** A location among the home page's top choices, as the Home page screen lists them. */
export type TopChoice = Pick<Location, "id" | "name" | "tagline" | "state">;

const topChoices = {
  where: { topChoiceOrder: { not: null } },
  orderBy: [{ topChoiceOrder: "asc" }, { name: "asc" }],
} satisfies Prisma.LocationFindManyArgs;

/**
 * The top choices in their order, paused ones included: a paused top choice
 * is left off the home page and keeps its place.
 */
export function listTopChoices(): Promise<TopChoice[]> {
  return db.location.findMany({
    ...topChoices,
    select: { id: true, name: true, tagline: true, state: true },
  });
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

const forSite = {
  include: {
    addresses: { orderBy: { position: "asc" } },
    pages: pagesInLocale,
  },
} satisfies Prisma.LocationDefaultArgs;

/**
 * The location at the slug as the public sees it: null for a slug no
 * location has, and for a location that is not public. A slug no location
 * could have is refused without asking the database, since this reads
 * whatever follows the customer site's first slash.
 */
export async function getPublicLocation(
  slug: string,
): Promise<LocationView | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const location = await db.location.findUnique({
    where: { slug },
    ...forSite,
  });
  return location ? publicLocationViewOf(location) : null;
}

/** The location at the slug as staff preview it: the drafts, in any state. */
export async function getLocationPreview(
  slug: string,
): Promise<LocationView | null> {
  if (!checkLocationSlug(slug).ok) return null;
  const location = await db.location.findUnique({
    where: { slug },
    ...forSite,
  });
  return location ? previewLocationViewOf(location) : null;
}

/**
 * The home page's cards, in their order: the top choices that are live. A
 * paused one is left off and keeps its place.
 */
export async function listTopChoiceCards(): Promise<TopChoiceCard[]> {
  const locations = await db.location.findMany({
    ...topChoices,
    ...forSite,
    where: { ...topChoices.where, state: "live" satisfies LocationState },
    take: TOP_CHOICE_CAP,
  });
  return locations.flatMap((location) => {
    const view = publicLocationViewOf(location);
    return view ? [topChoiceCardOf(view)] : [];
  });
}

/** The slug the location's pages are at now; the customer site caches them by it. */
export async function getLocationSlug(id: string): Promise<string | null> {
  const location = await db.location.findUnique({
    where: { id },
    select: { slug: true },
  });
  return location?.slug ?? null;
}

/** One page of a location, as its editor opens it. */
export type LocationPageDetails = {
  location: Location & { addresses: LocationAddress[] };
  page: LocationPageKey;
  draft: PageContent;
  /** The copy the public is shown; null while the page is not published. */
  published: PageContent | null;
  /** When that copy was published; null while the page is not published. */
  publishedAt: Date | null;
  /**
   * Names the stored content. A save hands it back, and is refused when the
   * content has changed since. Null until the page is first saved.
   */
  version: string | null;
};

/** The content's version: when it last changed. Unpublishing does not move it. */
function versionOf(row: LocationPage | null) {
  return row ? row.updatedAt.toISOString() : null;
}

const pageKey = (locationId: string, page: LocationPageKey) => ({
  locationId_page_locale: { locationId, page, locale: PAGE_LOCALE },
});

export async function getLocationPage(
  locationId: string,
  page: LocationPageKey,
): Promise<LocationPageDetails | null> {
  const [location, row] = await Promise.all([
    db.location.findUnique({
      where: { id: locationId },
      include: { addresses: { orderBy: { position: "asc" } } },
    }),
    db.locationPage.findUnique({ where: pageKey(locationId, page) }),
  ]);
  if (!location) return null;
  return {
    location,
    page,
    draft: pageContentOf(page, row?.draft),
    published: row ? publicCopyOf(page, row) : null,
    publishedAt: row?.isOn ? row.publishedAt : null,
    version: versionOf(row),
  };
}

/** One publish from the location's history: the page and its content before and after. */
export type PagePublish = {
  entry: ActivityEntry;
  page: LocationPageKey;
  /** Null on the page's first publish. */
  before: PageContent | null;
  after: PageContent;
};

/** The publish a history entry of the location records, or null when the entry is not one. */
export async function getPagePublish(
  locationId: string,
  entryId: string,
): Promise<PagePublish | null> {
  const entry = await getActivityEntry(entryId);
  if (
    !entry ||
    entry.entityType !== LOCATION ||
    entry.entityId !== locationId ||
    entry.action !== "location.page.published"
  ) {
    return null;
  }
  const after = entry.after as { page?: unknown; content?: unknown } | null;
  const before = entry.before as { content?: unknown } | null;
  const page = after?.page;
  if (!isLocationPageKey(page)) return null;
  return {
    entry,
    page,
    before: before?.content ? pageContentOf(page, before.content) : null,
    after: pageContentOf(page, after?.content),
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
 * locked once the location has been live. The districts cannot change so
 * that a saved address is left outside them. Saving what is already there
 * logs nothing.
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
    const location = await tx.location.findUnique({
      where: { id },
      include: { addresses: { orderBy: { position: "asc" } } },
    });
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
    if (moved) {
      const stray = strayAddresses(location.addresses, districtCodes);
      if (stray.length > 0) {
        return {
          ok: false,
          error: `${strayAddressesPhrase(stray)}. ${ADDRESS_RULE} Remove ${
            stray.length > 1 ? "those addresses" : "that address"
          } first, or keep the district ticked.`,
        };
      }
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
 * removed, and a highlight pointing at it then reads as having no address.
 * `expected` is the ids the form was opened with, in order: when the stored
 * list is no longer that, someone else changed it and the save is refused.
 * A new address has to lie in one of the location's districts, placed by
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
    const stray = strayAddresses(
      entries.filter((entry) => "place" in entry),
      location.districtCodes,
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

/** A page write's answer: the content's new version, or why not. */
export type PageSaved = { ok: true; version: string } | Refusal;

/**
 * Writes the page's content inside the caller's transaction, when the
 * stored content is still the version the form was opened with. A highlight
 * pointing at an address the location does not hold loses the pointer.
 * `publish` also makes the content the page's public copy. Answers the
 * content as written and the row as it was, for the caller's log.
 */
async function writePageContent(
  tx: Prisma.TransactionClient,
  locationId: string,
  page: LocationPageKey,
  version: string | null,
  content: PageContent,
  publish: boolean,
): Promise<
  | Refusal
  | {
      ok: true;
      version: string;
      content: PageContent;
      was: LocationPage | null;
    }
> {
  const location = await tx.location.findUnique({
    where: { id: locationId },
    include: { addresses: { select: { id: true } } },
  });
  if (!location) return NOT_FOUND;
  const was = await tx.locationPage.findUnique({
    where: pageKey(locationId, page),
  });
  if (versionOf(was) !== version) return PAGE_CHANGED;

  const addressIds = new Set(location.addresses.map((address) => address.id));
  const clean: PageContent = {
    ...content,
    highlights: content.highlights.map((highlight) => ({
      ...highlight,
      addressId:
        highlight.addressId !== null && addressIds.has(highlight.addressId)
          ? highlight.addressId
          : null,
    })),
  };

  const now = new Date();
  const data = {
    draft: clean,
    updatedAt: now,
    ...(publish ? { published: clean, publishedAt: now, isOn: true } : {}),
  };
  // Conditional on the version read above, so two saves at once cannot both land.
  const { count } = was
    ? await tx.locationPage.updateMany({
        where: { id: was.id, updatedAt: was.updatedAt },
        data,
      })
    : await tx.locationPage.createMany({
        data: [{ locationId, page, locale: PAGE_LOCALE, ...data }],
        skipDuplicates: true,
      });
  if (count !== 1) return PAGE_CHANGED;
  return { ok: true, version: now.toISOString(), content: clean, was };
}

/**
 * Overwrites the page's working draft. Nothing changes in public, and
 * nothing is logged. Only the length limits are checked: a draft may be
 * incomplete.
 */
export async function saveLocationPageDraft(
  locationId: string,
  page: LocationPageKey,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const content = pageContentOf(page, draft);
  const check = checkPageLimits(content);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const written = await writePageContent(
      tx,
      locationId,
      page,
      version,
      content,
      false,
    );
    return written.ok ? { ok: true, version: written.version } : written;
  });
}

/**
 * Saves the content as the page's draft and makes it the page's public
 * copy, when it is complete. A published page is one the public can see,
 * once the location is live: there is no switch beside it. It works in any
 * location state. Publishing what is already public logs nothing.
 */
export async function publishLocationPage(
  actor: Actor,
  locationId: string,
  page: LocationPageKey,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const content = pageContentOf(page, draft);
  const check = checkPageComplete(page, content);
  if (!check.ok) return check;

  return db.$transaction(async (tx) => {
    const written = await writePageContent(
      tx,
      locationId,
      page,
      version,
      content,
      true,
    );
    if (!written.ok) return written;

    // The copy last published, which the diff in the history reads; a page
    // that was unpublished since is published again, and that is logged too.
    const before = written.was ? publishedOf(page, written.was) : null;
    if (
      !written.was?.isOn ||
      !before ||
      !samePageContent(before, written.content)
    ) {
      await logActivity(tx, actor, {
        action: "location.page.published",
        entityId: locationId,
        before: { page, content: before },
        after: { page, content: written.content },
      });
    }
    return { ok: true, version: written.version };
  });
}

/**
 * Unpublishes a page: the public no longer sees it, and its draft and the
 * copy last published are kept. Unpublishing a page that is not published
 * logs nothing. The content's version is left as it is, so a form open on
 * the page still saves.
 */
export async function unpublishLocationPage(
  actor: Actor,
  locationId: string,
  page: LocationPageKey,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id: locationId },
    });
    if (!location) return NOT_FOUND;
    const row = await tx.locationPage.findUnique({
      where: pageKey(locationId, page),
    });
    if (!row?.isOn) return { ok: true };

    const check = checkPageUnpublish(locationStateOf(location.state), page);
    if (!check.ok) return check;

    // Only while the content is the one read above: writing its version
    // back over a save that landed meanwhile would hide that save.
    const { count } = await tx.locationPage.updateMany({
      where: { id: row.id, updatedAt: row.updatedAt },
      data: { isOn: false, updatedAt: row.updatedAt },
    });
    if (count !== 1) {
      return { ok: false, error: "The page was just saved. Try again." };
    }
    await logActivity(tx, actor, {
      action: "location.page.updated",
      entityId: locationId,
      before: { page, isOn: true },
      after: { page, isOn: false },
    });
    return { ok: true };
  });
}

/**
 * Moves the location to another state, when its pages allow the move: a
 * draft goes live, a live one is paused, a paused one resumes. The first
 * move to `live` stamps `wentLiveAt`, which locks the slug. Moving to the
 * state it is in logs nothing.
 */
export async function moveLocationState(
  actor: Actor,
  id: string,
  to: LocationState,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const location = await tx.location.findUnique({
      where: { id },
      include: { pages: pagesInLocale },
    });
    if (!location) return NOT_FOUND;
    const from = locationStateOf(location.state);
    if (from === to) return { ok: true };

    const blockers = stateMoveBlockers(from, to, standingsOf(location.pages));
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
  return db.$transaction(async (tx) => {
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
        : { ok: false, error: "This location is not a top choice." };
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
        action: "location.updated",
        entityId: row.id,
        before: changed.before,
        after: changed.after,
      });
    }
    return { ok: true };
  });
}
