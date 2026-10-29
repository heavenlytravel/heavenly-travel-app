import {
  ALL_LOCATIONS_SEGMENT,
  SITE_PAGES_PATH,
  pageEditorPath,
  pageSegmentOf,
  type ActivityEntityType,
  type BookingStatus,
  type LocationHistoryKind,
  type LocationPageKey,
  type LocationPageRef,
  type MediaFilter,
  type TripCategory,
} from "@repo/db";

/**
 * The console's paths, so no page spells a URL by hand. Every console
 * address starts with the location: `~` for every location the person
 * may see, a slug for that location alone. One route file serves both, so
 * a screen exists once: /~/bookings and /langkawi/bookings. See
 * docs/261029-manage-signature-overhaul.md, "Addresses".
 */

/**
 * The scope a console address is in: a location's slug, or null for
 * every location (`~`).
 */
export type ScopeSlug = string | null;

/** The first segment of an address that means every location. */
export const ALL = ALL_LOCATIONS_SEGMENT;

/** The scope a route's first segment names: null for `~`. */
export function scopeSlugOf(segment: string): ScopeSlug {
  const decoded = decodeURIComponent(segment);
  return decoded === ALL ? null : decoded;
}

/** A path in a scope: `/~/fleet/vehicles`, `/langkawi/bookings/abc`. Empty parts are left out. */
export function consolePath(scope: ScopeSlug, ...parts: readonly string[]) {
  return ["", scope ?? ALL, ...parts.filter(Boolean)].join("/");
}

/** The field of a list's address its search box fills. */
export const SEARCH_PARAM = "q";

/** The field of a list's address naming its page, from 1; the first is left out. */
export const PAGE_PARAM = "page";

/** A list's address with its filters, those empty left out. */
function listHref(path: string, filter: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** The page as the address names it: none for the first. */
const pageParam = (page?: number) =>
  page && page > 1 ? String(page) : undefined;

/** Where an admin lands when a screen belongs to another team. */
export const RESTRICTED_PATH = "/restricted";

/** Where the console's search asks for the records that match: bookings, vehicles, drivers, users, classes and zones. */
export const SEARCH_PATH = "/api/search";

/** Where the page editor posts an image; answers the stored file. */
export const LOCATION_IMAGE_UPLOAD_PATH = "/api/uploads/location-image";

/** Where a vehicle class's form posts its picture; answers the stored file. */
export const VEHICLE_CLASS_IMAGE_UPLOAD_PATH =
  "/api/uploads/vehicle-class-image";

/** Where a vehicle's form posts each photo; answers the stored file. */
export const VEHICLE_IMAGE_UPLOAD_PATH = "/api/uploads/vehicle-image";

/** The route every console page is under, for dropping them all from the cache at once. */
export const CONSOLE_ROUTE = "/(console)/[location]";

/** A record's history page, under the record's own page: a vehicle's, a driver's, a class's, a booking's. */
export function recordHistoryHref(recordHref: string) {
  return `${recordHref}/history`;
}

/** The dashboard: every location's day under `~`, one location's under its slug. */
export function dashboardHref(scope: ScopeSlug) {
  return consolePath(scope);
}

/* Bookings */

/** What a bookings list narrows to, and the page of it. */
export type BookingsListFilter = {
  status?: BookingStatus;
  q?: string;
  /** A pick-up day, "2026-10-29". */
  date?: string;
  page?: number;
};

/** The field of a bookings list's address naming its pick-up day. */
export const DATE_PARAM = "date";

/** The bookings of the scope, newest first, narrowed by status, search and pick-up day, at a page. */
export function bookingsHref(
  scope: ScopeSlug,
  filter: BookingsListFilter = {},
) {
  return listHref(consolePath(scope, "bookings"), {
    status: filter.status,
    [SEARCH_PARAM]: filter.q,
    [DATE_PARAM]: filter.date,
    [PAGE_PARAM]: pageParam(filter.page),
  });
}

/** One booking, by id: the customer site uses the reference; ops uses the id. */
export function bookingHref(scope: ScopeSlug, id: string) {
  return consolePath(scope, "bookings", id);
}

/** Where staff enter a booking that arrived by phone, WhatsApp or email; under a slug, that location already chosen. */
export function newBookingHref(scope: ScopeSlug) {
  return consolePath(scope, "bookings", "new");
}

/** The form that amends one item of a booking: its trip, vehicle and details. */
export function amendItemHref(
  scope: ScopeSlug,
  bookingId: string,
  itemId: string,
) {
  return `${bookingHref(scope, bookingId)}/amend/${itemId}`;
}

/* Fleet */

/** What a list of vehicles or drivers narrows to: the ones with a document due, a search, or both. */
export type FleetListFilter = { due?: boolean; q?: string };

/** The value of `due` in a list's address when it shows only the documents due. */
export const DUE_PARAM = "1";

function fleetListHref(path: string, filter: FleetListFilter) {
  return listHref(path, {
    due: filter.due ? DUE_PARAM : undefined,
    [SEARCH_PARAM]: filter.q,
  });
}

/** Our vehicles in the scope, narrowed by the filter. */
export function vehiclesHref(scope: ScopeSlug, filter: FleetListFilter = {}) {
  return fleetListHref(consolePath(scope, "fleet", "vehicles"), filter);
}

/** One vehicle, by id. */
export function vehicleHref(scope: ScopeSlug, id: string) {
  return consolePath(scope, "fleet", "vehicles", id);
}

/** The parameter of the add page that names the class a new vehicle starts in. */
export const VEHICLE_CLASS_PARAM = "class";

/** A new vehicle; under a slug, based there; starting in a class when given. */
export function newVehicleHref(scope: ScopeSlug, vehicleClassId?: string) {
  return listHref(consolePath(scope, "fleet", "vehicles", "new"), {
    [VEHICLE_CLASS_PARAM]: vehicleClassId,
  });
}

/** Our drivers in the scope, narrowed by the filter. */
export function driversHref(scope: ScopeSlug, filter: FleetListFilter = {}) {
  return fleetListHref(consolePath(scope, "fleet", "drivers"), filter);
}

/** One driver, by id. */
export function driverHref(scope: ScopeSlug, id: string) {
  return consolePath(scope, "fleet", "drivers", id);
}

/** A new driver; under a slug, based there. */
export function newDriverHref(scope: ScopeSlug) {
  return consolePath(scope, "fleet", "drivers", "new");
}

/**
 * The classes: the catalogue under `~`, what is on sale under a
 * location.
 */
export function classesHref(scope: ScopeSlug) {
  return consolePath(scope, "fleet", "classes");
}

/**
 * Where a class's editor goes back to: the classes, or Rates' class rates
 * when it was opened from there. Carried as `?from=` to a location's
 * offering editor and by its form to the save.
 */
export const OFFERING_FROM_PARAM = "from";
export type OfferingFrom = "classes" | "rates";
export function offeringFromOf(value: unknown): OfferingFrom {
  return value === "rates" ? "rates" : "classes";
}
export function offeringBackHref(slug: string, from: OfferingFrom) {
  return from === "rates" ? ratesHref(slug, "classes") : classesHref(slug);
}

/**
 * One class: under `~` a class of the catalogue, by its id; under a slug
 * the class on sale there, by the offering's id. "new" for the add page.
 */
export function classHref(
  scope: ScopeSlug,
  id: string,
  from: OfferingFrom = "classes",
) {
  return listHref(consolePath(scope, "fleet", "classes", id), {
    [OFFERING_FROM_PARAM]:
      scope !== null && from === "rates" ? from : undefined,
  });
}
export function newClassHref(scope: ScopeSlug) {
  return classHref(scope, "new");
}

/* Selling */

/** The zones: every location's on one map under `~`, one location's to change under its slug. */
export function coverageHref(scope: ScopeSlug) {
  return consolePath(scope, "coverage");
}

/** The editor of one zone of a location; "new" for the add page. */
export function zoneHref(slug: string, zoneId: string) {
  return consolePath(slug, "coverage", "zones", zoneId);
}
export function newZoneHref(slug: string) {
  return zoneHref(slug, "new");
}

/** Rates' pages, in their reading order, each its own address. */
export const RATES_PAGES = ["classes", "grid", "rules", "try"] as const;
export type RatesPage = (typeof RATES_PAGES)[number];

/** Each of Rates' pages by its name: in the menu, its title, the search. */
export const RATES_PAGE_LABELS: Record<RatesPage, string> = {
  classes: "Classes and hourly",
  grid: "Rate grid",
  rules: "Trip rules",
  try: "Try a trip",
};

/** One of Rates' pages. */
export function ratesHref(scope: ScopeSlug, page: RatesPage = "classes") {
  return consolePath(scope, "rates", page);
}

/** The field of the rate grid's address naming the category its columns narrow to. */
export const CATEGORY_PARAM = "category";

/** The rate grid, its columns narrowed to the classes of one category, or every class on sale. */
export function rateGridHref(scope: ScopeSlug, category?: TripCategory) {
  return listHref(ratesHref(scope, "grid"), { [CATEGORY_PARAM]: category });
}

/* Website */

/** What narrows a list of pages: a status, a section, a search. */
export type PagesFilter = {
  status?: string;
  /** In the address as `pageSegmentOf` names it: `main` for the main page. */
  section?: LocationPageKey;
  q?: string;
};

/**
 * The pages: the website's and every location's under `~`, one
 * location's under its slug, narrowed by status, section and a search.
 * Narrowed to a section, it is that section's list: its own page and
 * every page under it.
 */
export function pagesHref(scope: ScopeSlug, filter: PagesFilter = {}) {
  return listHref(consolePath(scope, "pages"), {
    section: filter.section && pageSegmentOf(filter.section),
    status: filter.status,
    [SEARCH_PARAM]: filter.q,
  });
}

/** The id of the saved addresses card on a location's Pages, and the link that lands on it. */
export const SAVED_ADDRESSES_ID = "saved-addresses";
export function savedAddressesHref(slug: string) {
  return `${pagesHref(slug)}#${SAVED_ADDRESSES_ID}`;
}

/** The editor of one page of a location: its main page, a section's, or one under a section. */
export function locationPageHref(slug: string, ref: LocationPageRef) {
  return pageEditorPath(slug, ref);
}

export { SITE_PAGES_PATH };

/** The editor of one of the site's own pages. */
export function sitePageHref(page: string) {
  return `${SITE_PAGES_PATH}/${page}`;
}

/** What one publish of a site page put on it, by the log entry's id. */
export function sitePagePublishHref(entryId: string) {
  return `${SITE_PAGES_PATH}/history/${entryId}`;
}

/** Every uploaded image, or those of one standing, at a page. Console-wide. */
export function mediaHref(show?: MediaFilter, page?: number) {
  return listHref(consolePath(null, "media"), {
    show,
    [PAGE_PARAM]: pageParam(page),
  });
}

/* Admin */

/** The staff: every admin, narrowed by a search. Console-wide. */
export function staffHref(q?: string) {
  return listHref(consolePath(null, "team"), { [SEARCH_PARAM]: q });
}

/** Every customer account, the newest first, narrowed by a search, at a page. Console-wide. */
export function customersHref(filter: { q?: string; page?: number } = {}) {
  return listHref(consolePath(null, "team", "customers"), {
    [SEARCH_PARAM]: filter.q,
    [PAGE_PARAM]: pageParam(filter.page),
  });
}

/**
 * The activity: under `~` the full log or the entries of one type of
 * record; under a slug the location's own history, or one part of it.
 * At the page of it older than the entry with the id `before`.
 */
export function activityHref(
  scope: ScopeSlug,
  filter: {
    type?: ActivityEntityType;
    kind?: LocationHistoryKind;
    before?: string;
  } = {},
) {
  return listHref(consolePath(scope, "activity"), {
    type: scope === null ? filter.type : undefined,
    kind: scope === null ? undefined : filter.kind,
    before: filter.before,
  });
}

/** What one publish in a location's history put on a page, by the log entry's id. */
export function locationPublishHref(slug: string, entryId: string) {
  return consolePath(slug, "activity", entryId);
}

/** The settings: the list of locations under `~`, one location's details, state and deletion under its slug. */
export function settingsHref(scope: ScopeSlug) {
  return consolePath(scope, "settings");
}

/** Where Marketing adds a location. */
export const NEW_LOCATION_PATH = consolePath(null, "settings", "new");
