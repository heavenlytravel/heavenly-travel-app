import {
  SITE_PAGES_PATH,
  pageEditorPath,
  pageSegmentOf,
  type ActivityEntityType,
  type BookingStatus,
  type LocationHistoryKind,
  type LocationPageKey,
  type LocationPageRef,
  type LocationState,
  type MediaFilter,
  type Permission,
  type SetupStepKey,
} from "@repo/db";

/** The console's paths, so no page spells a URL by hand. */

export const ADMINS_PATH = "/admins";

/** One admin found by their email on the Admins screen. */
export function adminHref(email: string) {
  return listHref(ADMINS_PATH, { [SEARCH_PARAM]: email });
}

/** Every account, the newest first, narrowed by a search, at a page. */
export const USERS_PATH = "/users";
export function usersHref(filter: { q?: string; page?: number } = {}) {
  return listHref(USERS_PATH, {
    [SEARCH_PARAM]: filter.q,
    [PAGE_PARAM]: pageParam(filter.page),
  });
}

export const ACTIVITY_PATH = "/activity";

/**
 * The full log, or the entries of one type of record, at the page of it
 * older than the entry with the id `before`.
 */
export function activityHref(type?: ActivityEntityType, before?: string) {
  return listHref(ACTIVITY_PATH, { type, before });
}
/** A record's history page, under the record's own page: a vehicle's, a driver's, a class's, a booking's. */
export function recordHistoryHref(recordHref: string) {
  return `${recordHref}/history`;
}

/** Where an admin lands when a screen belongs to another team. */
export const RESTRICTED_PATH = "/restricted";

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

export { SITE_PAGES_PATH };

export const MEDIA_PATH = "/media";

/** Every uploaded image, or those of one standing, at a page. */
export function mediaHref(show?: MediaFilter, page?: number) {
  return listHref(MEDIA_PATH, { show, [PAGE_PARAM]: pageParam(page) });
}

/** What a bookings list narrows to, and the page of it. */
export type BookingsListFilter = {
  status?: BookingStatus;
  q?: string;
  page?: number;
};

export const BOOKINGS_PATH = "/bookings";

/** The queue across locations, narrowed by status, location, search, or any of them, at a page. */
export function bookingsHref(
  filter: BookingsListFilter & { location?: string } = {},
) {
  return listHref(BOOKINGS_PATH, {
    status: filter.status,
    location: filter.location,
    [SEARCH_PARAM]: filter.q,
    [PAGE_PARAM]: pageParam(filter.page),
  });
}

/**
 * One booking, by id. The customer site uses the reference; ops uses the
 * id. With a location's slug, the same booking inside that location, its
 * sections in the sidebar, as the location's own lists open it.
 */
export function bookingHref(id: string, slug?: string) {
  return slug
    ? `${locationTabHref(slug, "bookings")}/${id}`
    : `${BOOKINGS_PATH}/${id}`;
}

/**
 * Operation's board: a day's trips in their columns, at one location
 * (its id) or every one. No day is today in Malaysia.
 */
export const BOARD_PATH = "/board";
export function boardHref(filter: { day?: string; location?: string } = {}) {
  return listHref(BOARD_PATH, { day: filter.day, location: filter.location });
}

/** Where the console's search asks for the records that match: bookings, vehicles, drivers, users, classes and zones. */
export const SEARCH_PATH = "/api/search";

/** Where staff enter a booking that arrived by phone, WhatsApp or email. */
export const NEW_BOOKING_PATH = `${BOOKINGS_PATH}/new`;

/** A path across locations, narrowed to one location's id when given. */
function withLocation(path: string, locationId: string | undefined) {
  return locationId
    ? `${path}?${new URLSearchParams({ location: locationId })}`
    : path;
}

/** Every location's zones on one map, or one location's. */
export const COVERAGE_PATH = "/coverage";
export function coverageHref(locationId?: string) {
  return withLocation(COVERAGE_PATH, locationId);
}

/** What every location charges, or one location. */
export const RATES_PATH = "/rates";
export function ratesHref(locationId?: string) {
  return withLocation(RATES_PATH, locationId);
}

/** What narrows a list of pages: a status, a section, a search, and across locations a location or the website. */
export type PagesFilter = {
  status?: string;
  /** In the address as `pageSegmentOf` names it: `main` for the main page. */
  section?: LocationPageKey;
  q?: string;
  location?: string;
};

/** The location filter's value on Pages for the customer site's own pages, SUPER's alone. */
export const WEBSITE_FILTER = "website";

/**
 * Every location's pages in one list, and for SUPER the site's own,
 * narrowed by location (or the website), section, status and a search.
 */
export const PAGES_PATH = "/pages";
export function pagesHref(filter: PagesFilter = {}) {
  return listHref(PAGES_PATH, {
    location: filter.location,
    section: filter.section && pageSegmentOf(filter.section),
    status: filter.status,
    [SEARCH_PARAM]: filter.q,
  });
}

/** The catalogue of vehicle classes. */
export const VEHICLE_CLASSES_PATH = "/vehicle-classes";

/** One class's page, by id; "new" for the add page. */
export function vehicleClassHref(id: string) {
  return `${VEHICLE_CLASSES_PATH}/${id}`;
}
export const NEW_VEHICLE_CLASS_PATH = vehicleClassHref("new");

/** What a list of vehicles or drivers narrows to: one location, the ones with a document due, a search, or any of them. */
export type FleetListFilter = { location?: string; due?: boolean; q?: string };

/** The value of `due` in a list's address when it shows only the documents due. */
export const DUE_PARAM = "1";

/** A list of vehicles or drivers with its filter in the address. */
function fleetListHref(path: string, filter: FleetListFilter) {
  return listHref(path, {
    location: filter.location,
    due: filter.due ? DUE_PARAM : undefined,
    [SEARCH_PARAM]: filter.q,
  });
}

/** Our vehicles across locations, narrowed by the filter; a new one, based where its form says. */
export const VEHICLES_PATH = "/vehicles";
export function vehiclesHref(filter: FleetListFilter = {}) {
  return fleetListHref(VEHICLES_PATH, filter);
}
/** A new vehicle from the list, based at the location the list is narrowed to, if any. */
export function newVehicleHref(location?: string) {
  return fleetListHref(`${VEHICLES_PATH}/new`, { location });
}

/** Every vendor, ours first, narrowed to a status or a search; one vendor's page; a new one. */
export const VENDORS_PATH = "/vendors";
export function vendorsHref(filter: { status?: string; q?: string } = {}) {
  return listHref(VENDORS_PATH, {
    status: filter.status,
    [SEARCH_PARAM]: filter.q,
  });
}
export function vendorHref(id: string) {
  return `${VENDORS_PATH}/${id}`;
}
export const NEW_VENDOR_PATH = vendorHref("new");
/** A new vehicle or driver of a vendor, from its page. */
export function newVendorVehicleHref(vendorId: string) {
  return `${VEHICLES_PATH}/new?vendor=${encodeURIComponent(vendorId)}`;
}
export function newVendorDriverHref(vendorId: string) {
  return `${DRIVERS_PATH}/new?vendor=${encodeURIComponent(vendorId)}`;
}

/** Our drivers across locations, narrowed by the filter; a new one, based where their form says. */
export const DRIVERS_PATH = "/drivers";
export function driversHref(filter: FleetListFilter = {}) {
  return fleetListHref(DRIVERS_PATH, filter);
}
/** A new driver from the list, based at the location the list is narrowed to, if any. */
export function newDriverHref(location?: string) {
  return fleetListHref(`${DRIVERS_PATH}/new`, { location });
}

/**
 * The field a vehicle or driver form posts when it was opened from the
 * list across locations: the list's address, as it was filtered. Once
 * saved, the form goes back to it rather than to a location's tab.
 */
export const FLEET_BACK_FIELD = "back";

/** The console's home: every location with its numbers. */
export const LOCATIONS_PATH = "/";

/** A location's pages live under here; the home lists them. */
const LOCATION_PATH = "/locations";

export const NEW_LOCATION_PATH = `${LOCATION_PATH}/new`;

/**
 * One location's overview, by its slug: the console's address for a
 * location is the one its public page has, /locations/langkawi.
 */
export function locationHref(slug: string) {
  return `${LOCATION_PATH}/${slug}`;
}

/** The route of every location's pages, for revalidating them all at once. */
export const LOCATION_ROUTE = "/(console)/locations/[slug]";

/** The slug of the location a path is inside, or null off a location's page (the add form included). */
export function locationSlugOf(pathname: string): string | null {
  if (!pathname.startsWith(`${LOCATION_PATH}/`)) return null;
  const slug = pathname.slice(LOCATION_PATH.length + 1).split("/")[0] ?? "";
  return slug === "" || slug === "new" ? null : decodeURIComponent(slug);
}

/** A tab of a location's page: the overview, the bookings, the vehicles, the drivers, the classes on sale, the coverage, the rates, the pages, the settings or the history. */
export type LocationTab =
  | "overview"
  | "bookings"
  | "vehicles"
  | "drivers"
  | "vehicle-classes"
  | "coverage"
  | "rates"
  | "pages"
  | "settings"
  | "history";

export type LocationTabDef = {
  key: LocationTab;
  label: string;
  permission: Permission;
  /** The setup step the tab holds, when it holds one: Settings holds the details. */
  step: SetupStepKey | null;
};

/**
 * The tabs of a location's page, in the sidebar's order: the day's work
 * (the overview, the bookings, the vehicles and drivers based there), then
 * what the location sells and where (the classes on sale, the zones, the
 * rates between them), then its pages, its settings and its history. The
 * settings are its details, its status and its deletion, on one page; the
 * sidebar opens them and the history as one section. Each tab is its own
 * route behind its own permission, as every console page is. See
 * docs/261023-console-sidebar.md.
 */
export const LOCATION_TABS: readonly LocationTabDef[] = [
  {
    key: "overview",
    label: "Overview",
    permission: "locations.view",
    step: null,
  },
  {
    key: "bookings",
    label: "Bookings",
    permission: "bookings.view",
    step: null,
  },
  {
    key: "vehicles",
    label: "Vehicles",
    permission: "fleet.manage",
    step: null,
  },
  {
    key: "drivers",
    label: "Drivers",
    permission: "fleet.manage",
    step: null,
  },
  {
    key: "vehicle-classes",
    label: "Vehicle classes",
    permission: "coverage.view",
    step: "vehicle-classes",
  },
  {
    key: "coverage",
    label: "Coverage",
    permission: "coverage.view",
    step: "coverage",
  },
  {
    key: "rates",
    label: "Rates",
    permission: "coverage.view",
    step: null,
  },
  {
    key: "pages",
    label: "Pages",
    permission: "locations.manage",
    step: "pages",
  },
  {
    key: "settings",
    label: "Settings",
    permission: "locations.view",
    step: "details",
  },
  {
    key: "history",
    label: "History",
    permission: "locations.view",
    step: null,
  },
];

/**
 * What doing each setup step asks, for the checklist's way in: the details
 * and the pages are Marketing's, the classes and the zones Operation's to
 * change and Reservation's and Sales' to read. Settings opens for every
 * admin, but only Marketing finds the details there.
 */
export const SETUP_STEP_PERMISSIONS: Record<SetupStepKey, Permission> = {
  details: "locations.manage",
  "vehicle-classes": "coverage.view",
  coverage: "coverage.view",
  pages: "locations.manage",
};

/**
 * The tabs of a location in this state, in the sidebar's order. A draft
 * takes no bookings, so it has no Bookings tab; every other tab is the
 * same in every state, so going live moves nothing. The sidebar, the
 * picker, the overview and the search read it, through
 * `locationTabsMayOpen`.
 */
export function locationTabsFor(
  state: LocationState,
): readonly LocationTabDef[] {
  return state === "draft"
    ? LOCATION_TABS.filter((tab) => tab.key !== "bookings")
    : LOCATION_TABS;
}

/** The tabs of a location in this state that an admin with these permissions may open, in order. */
export function locationTabsMayOpen(
  state: LocationState,
  permissions: readonly Permission[],
): LocationTabDef[] {
  return locationTabsFor(state).filter((tab) =>
    permissions.includes(tab.permission),
  );
}

/** The tab that holds a setup step: Settings holds the details. */
export function setupStepTab(step: SetupStepKey): LocationTabDef {
  return LOCATION_TABS.find((tab) => tab.step === step)!;
}

/** One tab of a location's page, by the location's slug. The overview is the location's own address. */
export function locationTabHref(slug: string, tab: LocationTab) {
  return tab === "overview"
    ? locationHref(slug)
    : `${locationHref(slug)}/${tab}`;
}

/** The tab a path under a location's page is on: the editor of a page is on Pages, a publish on History. */
export function locationTabOf(slug: string, pathname: string): LocationTab {
  const rest = pathname.slice(locationHref(slug).length);
  const segment = rest.split("/")[1];
  const tab = LOCATION_TABS.find((t) => t.key === segment);
  return tab?.key ?? "overview";
}

/**
 * What the console works on, as the location picker in its header names
 * it and the sidebar lists it: one location, by its slug, or every
 * location at once. See docs/261023-console-sidebar.md.
 */
export type ConsoleScope = { slug: string } | "all";

/**
 * The sections across locations that sum up a tab of each location, so
 * the picker keeps the section on screen: from Langkawi's Rates to the
 * rates of every location, from a location's Pages to the home page.
 */
const ACROSS_LOCATIONS: readonly { path: string; tab: LocationTab }[] = [
  { path: BOOKINGS_PATH, tab: "bookings" },
  { path: VEHICLES_PATH, tab: "vehicles" },
  { path: DRIVERS_PATH, tab: "drivers" },
  { path: VEHICLE_CLASSES_PATH, tab: "vehicle-classes" },
  { path: COVERAGE_PATH, tab: "coverage" },
  { path: RATES_PATH, tab: "rates" },
  { path: PAGES_PATH, tab: "pages" },
];

const acrossOf = (pathname: string) =>
  ACROSS_LOCATIONS.find(
    (entry) => pathname === entry.path || pathname.startsWith(`${entry.path}/`),
  );

/**
 * The scope a path is in: the location it is inside, or every location
 * anywhere else. A location's sidebar lists that location alone; the
 * screens of the console as a whole (the site pages, the users, the
 * admins, the activity, the media, adding a location) are listed on All
 * locations, so opening one shows that sidebar.
 */
export function scopeOfPath(pathname: string): ConsoleScope {
  const slug = locationSlugOf(pathname);
  return slug === null ? "all" : { slug };
}

/**
 * Where the picker takes the admin from this path to another scope: the
 * same section there when it has one the admin may open (Langkawi's Rates
 * to Penang's, Langkawi's Bookings to the queue across locations, back
 * again), its overview otherwise. `tabsOf` is the tabs of a location the
 * admin may open, in the location's state.
 */
export function scopeSwitchHref(
  pathname: string,
  to: ConsoleScope,
  tabsOf: (slug: string) => readonly LocationTab[],
): string {
  const slug = locationSlugOf(pathname);
  const tab: LocationTab | null =
    slug !== null
      ? locationTabOf(slug, pathname)
      : pathname === LOCATIONS_PATH
        ? "overview"
        : (acrossOf(pathname)?.tab ?? null);
  if (to === "all") {
    return (
      ACROSS_LOCATIONS.find((entry) => entry.tab === tab)?.path ??
      LOCATIONS_PATH
    );
  }
  return tab && tabsOf(to.slug).includes(tab)
    ? locationTabHref(to.slug, tab)
    : locationHref(to.slug);
}

/** The ids of the Rates tab's cards, in their order, and the link that lands on each. */
export const RATES_PARTS = {
  classes: "class-rates",
  grid: "rate-grid",
  rules: "trip-rules",
  tryTrip: "try-a-trip",
} as const;
export type RatesPart = keyof typeof RATES_PARTS;

/** Each card's name: its title, its jump under the tab's header, its line in the search. */
export const RATES_PART_LABELS: Record<RatesPart, string> = {
  classes: "Rates and rules",
  grid: "Rate grid",
  rules: "Trip rules",
  tryTrip: "Try a trip",
};

export function locationRatesPartHref(slug: string, part: RatesPart) {
  return `${locationTabHref(slug, "rates")}#${RATES_PARTS[part]}`;
}

/** The id of the saved addresses card on a location's Pages tab, and the link that lands on it. */
export const SAVED_ADDRESSES_ID = "saved-addresses";
export function locationAddressesHref(slug: string) {
  return `${locationTabHref(slug, "pages")}#${SAVED_ADDRESSES_ID}`;
}

/**
 * A location's Pages tab, every page of it, narrowed by section, status
 * and a search. Narrowed to a section, it is that section's list: its own
 * page and every page under it, where a section's row leads.
 */
export function locationPagesHref(
  slug: string,
  filter: Pick<PagesFilter, "section" | "status" | "q"> = {},
) {
  return listHref(locationTabHref(slug, "pages"), {
    section: filter.section && pageSegmentOf(filter.section),
    status: filter.status,
    [SEARCH_PARAM]: filter.q,
  });
}

/** The editor of one of the site's own pages. */
export function sitePageHref(page: string) {
  return `${SITE_PAGES_PATH}/${page}`;
}

/** What one publish of a site page put on it, by the log entry's id. */
export function sitePagePublishHref(entryId: string) {
  return `${SITE_PAGES_PATH}/history/${entryId}`;
}

/** The editor of one page of a location: its main page, a section's, or one under a section. */
export function locationPageHref(slug: string, ref: LocationPageRef) {
  return pageEditorPath(slug, ref);
}

/** A location's history, optionally narrowed to one part of it. */
export function locationHistoryHref(
  slug: string,
  kind?: LocationHistoryKind,
  before?: string,
) {
  return listHref(locationTabHref(slug, "history"), { kind, before });
}

/** What one publish in a location's history put on a page, by the log entry's id. */
export function locationPublishHref(slug: string, entryId: string) {
  return `${locationHref(slug)}/history/${entryId}`;
}

/** A location's bookings, narrowed by status, search, or both, at a page. */
export function locationBookingsHref(
  slug: string,
  filter: BookingsListFilter = {},
) {
  return listHref(locationTabHref(slug, "bookings"), {
    status: filter.status,
    [SEARCH_PARAM]: filter.q,
    [PAGE_PARAM]: pageParam(filter.page),
  });
}

/**
 * The tab a class's editor goes back to: the Vehicle classes tab, or the
 * Rates tab's rates and rules when it was opened from there. Carried as
 * `?from=` to the editor and by its form to the save.
 */
export const OFFERING_FROM_PARAM = "from";
export type OfferingFrom = "vehicle-classes" | "rates";
export function offeringFromOf(value: unknown): OfferingFrom {
  return value === "rates" ? "rates" : "vehicle-classes";
}
export function offeringBackHref(slug: string, from: OfferingFrom) {
  return from === "rates"
    ? locationRatesPartHref(slug, "classes")
    : locationTabHref(slug, "vehicle-classes");
}

/** One offering of a location: the rates it sells a class at; "new" for the add page. */
export function locationOfferingHref(
  slug: string,
  offeringId: string,
  from: OfferingFrom = "vehicle-classes",
) {
  return listHref(`${locationTabHref(slug, "vehicle-classes")}/${offeringId}`, {
    [OFFERING_FROM_PARAM]: from === "rates" ? from : undefined,
  });
}
export function newLocationOfferingHref(slug: string) {
  return locationOfferingHref(slug, "new");
}

/** A location's vehicles, narrowed to those with a document due, a search, or both. */
export function locationVehiclesHref(
  slug: string,
  filter: Omit<FleetListFilter, "location"> = {},
) {
  return fleetListHref(locationTabHref(slug, "vehicles"), filter);
}

/** A location's drivers, narrowed to those with a licence due, a search, or both. */
export function locationDriversHref(
  slug: string,
  filter: Omit<FleetListFilter, "location"> = {},
) {
  return fleetListHref(locationTabHref(slug, "drivers"), filter);
}

/** One vehicle based at a location; "new" for the add page. */
export function locationVehicleHref(slug: string, vehicleId: string) {
  return `${locationTabHref(slug, "vehicles")}/${vehicleId}`;
}

/** The parameter of the add page that names the class a new vehicle starts in. */
export const VEHICLE_CLASS_PARAM = "class";

/** The add page of a vehicle based at a location, starting in a class when given. */
export function newLocationVehicleHref(slug: string, vehicleClassId?: string) {
  const base = locationVehicleHref(slug, "new");
  return vehicleClassId
    ? `${base}?${new URLSearchParams({ [VEHICLE_CLASS_PARAM]: vehicleClassId })}`
    : base;
}

/** One driver based at a location; "new" for the add page. */
export function locationDriverHref(slug: string, driverId: string) {
  return `${locationTabHref(slug, "drivers")}/${driverId}`;
}
export function newLocationDriverHref(slug: string) {
  return locationDriverHref(slug, "new");
}

/** The editor of one zone of a location; "new" for the add page. */
export function locationZoneHref(slug: string, zoneId: string) {
  return `${locationTabHref(slug, "coverage")}/zones/${zoneId}`;
}
export function newLocationZoneHref(slug: string) {
  return locationZoneHref(slug, "new");
}

/** Where the page editor posts an image; answers the stored file. */
export const LOCATION_IMAGE_UPLOAD_PATH = "/api/uploads/location-image";

/** Where a vehicle class's form posts its picture; answers the stored file. */
export const VEHICLE_CLASS_IMAGE_UPLOAD_PATH =
  "/api/uploads/vehicle-class-image";

/** Where a vehicle's form posts each photo; answers the stored file. */
export const VEHICLE_IMAGE_UPLOAD_PATH = "/api/uploads/vehicle-image";

/** The form that amends one item of a booking: its trip, vehicle and details; inside a location with its slug. */
export function amendItemHref(
  bookingId: string,
  itemId: string,
  slug?: string,
) {
  return `${bookingHref(bookingId, slug)}/amend/${itemId}`;
}
