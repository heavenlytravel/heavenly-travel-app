import {
  SETUP_STEPS,
  SETUP_STEP_LABELS,
  type BookingStatus,
  type LocationHistoryKind,
  type LocationPageKey,
  type LocationState,
  type Permission,
  type SetupStepKey,
} from "@repo/db";

/** The console's paths, so no page spells a URL by hand. */

export const ADMINS_PATH = "/admins";

export const ACTIVITY_PATH = "/activity";

/** The full log, or the page of it older than the entry with this id. */
export function activityHref(before?: string) {
  return before ? `${ACTIVITY_PATH}?before=${before}` : ACTIVITY_PATH;
}
/** Where an admin lands when a screen belongs to another team. */
export const RESTRICTED_PATH = "/restricted";

export const BOOKINGS_PATH = "/bookings";

/** The queue across locations, optionally narrowed to one status, one location, or both. */
export function bookingsHref(
  filter: {
    status?: BookingStatus;
    location?: string;
  } = {},
) {
  const params = new URLSearchParams();
  if (filter.status) params.set("status", filter.status);
  if (filter.location) params.set("location", filter.location);
  const query = params.toString();
  return query ? `${BOOKINGS_PATH}?${query}` : BOOKINGS_PATH;
}

/**
 * One booking, by id. The customer site uses the reference; ops uses the
 * id. With a location's slug, the same booking inside that location, its
 * panel beside it, as the location's own lists open it.
 */
export function bookingHref(id: string, slug?: string) {
  return slug
    ? `${locationTabHref(slug, "bookings")}/${id}`
    : `${BOOKINGS_PATH}/${id}`;
}

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

/** The catalogue of vehicle classes. */
export const VEHICLE_CLASSES_PATH = "/vehicle-classes";

/** One class's page, by id; "new" for the add page. */
export function vehicleClassHref(id: string) {
  return `${VEHICLE_CLASSES_PATH}/${id}`;
}
export const NEW_VEHICLE_CLASS_PATH = vehicleClassHref("new");

/** One model of a class, under the class's page. */
export function vehicleModelHref(classId: string, modelId: string) {
  return `${vehicleClassHref(classId)}/models/${modelId}`;
}

/** What a list of vehicles or drivers narrows to: one location, the ones with a document due, or both. */
export type FleetListFilter = { location?: string; due?: boolean };

/** The value of `due` in a list's address when it shows only the documents due. */
export const DUE_PARAM = "1";

/** A list of vehicles or drivers with its filter in the address. */
function fleetListHref(path: string, filter: FleetListFilter) {
  const params = new URLSearchParams();
  if (filter.location) params.set("location", filter.location);
  if (filter.due) params.set("due", DUE_PARAM);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
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
 * list across locations, and its value: once saved, the form goes back
 * to that list rather than to a location's tab.
 */
export const FLEET_BACK_FIELD = "back";
export const FLEET_BACK_TO_LIST = "list";

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

/** A tab of a location's page: the overview, one of the setup steps, the rates, the bookings, the vehicles, the drivers or the history. */
export type LocationTab =
  | "overview"
  | SetupStepKey
  | "rates"
  | "bookings"
  | "vehicles"
  | "drivers"
  | "history";

export type LocationTabDef = {
  key: LocationTab;
  label: string;
  permission: Permission;
  /** The setup step the tab is, when it is one. */
  step: SetupStepKey | null;
};

/** Which team's permission each setup step's tab is behind. */
/** What opening each setup step's tab asks; changing the classes or the coverage asks `coverage.manage`. */
const STEP_PERMISSIONS: Record<SetupStepKey, Permission> = {
  details: "locations.manage",
  "vehicle-classes": "coverage.view",
  coverage: "coverage.view",
  pages: "locations.manage",
};

/**
 * The tabs of a location's page, in order: the overview, then the four
 * setup steps in the order an admin walks them, with the rates right after
 * the coverage whose zones they price, then the bookings, the vehicles and
 * drivers based there, and the history. Each is its own
 * route behind its own permission, as every console page is; the panel
 * beside the location's page lists the tabs the admin may open. See
 * docs/261015-locations-as-operation-areas.md, "Who may do what".
 */
export const LOCATION_TABS: readonly LocationTabDef[] = [
  {
    key: "overview",
    label: "Overview",
    permission: "locations.view",
    step: null,
  },
  ...SETUP_STEPS.flatMap((step): LocationTabDef[] => [
    {
      key: step,
      label: SETUP_STEP_LABELS[step],
      permission: STEP_PERMISSIONS[step],
      step,
    },
    ...(step === "coverage"
      ? [
          {
            key: "rates" as const,
            label: "Rates",
            permission: "coverage.view" as const,
            step: null,
          },
        ]
      : []),
  ]),
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
    key: "history",
    label: "History",
    permission: "locations.view",
    step: null,
  },
];

/**
 * Where a tab sits in the panel beside a location: the day's work, the
 * setup done once and rarely touched, or the panel's foot.
 */
export type LocationTabGroup = "work" | "setup" | "foot";

/** A tab as a location in one state shows it: in its group, under the name it has there. */
export type PlacedTab = LocationTabDef & { group: LocationTabGroup };

/** The day's work in its order: the day, the queue, the vehicles and drivers Operation sends, the pages Marketing keeps. */
const WORK_TABS: readonly LocationTab[] = [
  "overview",
  "bookings",
  "vehicles",
  "drivers",
  "pages",
];

/**
 * The group of a tab in a location in this state; null for a tab it does
 * not show. A draft is all setup: its overview is the checklist, then the
 * steps and the rates, and it has no Bookings tab, since a draft takes no
 * bookings. Once live or paused, the day's work comes first and the setup
 * folds away under it; the pages, a setup step while a draft, are work
 * from then on, and so are the vehicles and drivers, entered while it is
 * set up. The history is at the foot either way.
 */
function groupOf(
  tab: LocationTab,
  state: LocationState,
): LocationTabGroup | null {
  const draft = state === "draft";
  switch (tab) {
    case "history":
      return "foot";
    case "overview":
      return "work";
    case "bookings":
      return draft ? null : "work";
    case "pages":
    case "vehicles":
    case "drivers":
      return draft ? "setup" : "work";
    default:
      return "setup";
  }
}

/**
 * The tabs of a location in this state, in the panel's order: the work,
 * then the setup, then the foot. The overview of a live or paused location
 * is its day, "Today". The panel and the strip of tabs on narrow screens
 * both read this. See docs/261018-location-work-and-class-catalogue.md.
 */
export function locationTabsFor(state: LocationState): PlacedTab[] {
  const placed = LOCATION_TABS.flatMap((tab): PlacedTab[] => {
    const group = groupOf(tab.key, state);
    if (!group) return [];
    const label =
      tab.key === "overview" && state !== "draft" ? "Today" : tab.label;
    return [{ ...tab, label, group }];
  });
  const rank = (tab: PlacedTab) =>
    tab.group === "work"
      ? WORK_TABS.indexOf(tab.key)
      : tab.group === "setup"
        ? WORK_TABS.length
        : WORK_TABS.length + 1;
  // A stable sort, so the setup keeps the order the tabs are walked in.
  return placed.sort((a, b) => rank(a) - rank(b));
}

/** The tab of a setup step. */
export function setupStepTab(step: SetupStepKey): LocationTabDef {
  return LOCATION_TABS.find((tab) => tab.step === step)!;
}

/** One tab of a location's page, by the location's slug. The overview is the location's own address. */
export function locationTabHref(slug: string, tab: LocationTab) {
  return tab === "overview"
    ? locationHref(slug)
    : `${locationHref(slug)}/${tab}`;
}

/** The tab a path under a location's page is on: the editor of a page is on Pages, a publish in the history on Overview. */
export function locationTabOf(slug: string, pathname: string): LocationTab {
  const rest = pathname.slice(locationHref(slug).length);
  const segment = rest.split("/")[1];
  const tab = LOCATION_TABS.find((t) => t.key === segment);
  return tab?.key ?? "overview";
}

/** The ids of the Rates tab's three cards, and the link that lands on each. */
export const RATES_PARTS = {
  grid: "rate-grid",
  dropoffs: "dropoffs",
  oddHours: "odd-hours",
} as const;
export function locationRatesPartHref(
  slug: string,
  part: keyof typeof RATES_PARTS,
) {
  return `${locationTabHref(slug, "rates")}#${RATES_PARTS[part]}`;
}

/** The id of the saved addresses card on a location's Details tab, and the link that lands on it. */
export const SAVED_ADDRESSES_ID = "saved-addresses";
export function locationAddressesHref(slug: string) {
  return `${locationTabHref(slug, "details")}#${SAVED_ADDRESSES_ID}`;
}

/** What Marketing sets on the customer site's home page: the top choices. */
export const HOME_PAGE_PATH = "/home-page";

/** The editor of one page of a location: its landing page or a product's. */
export function locationPageHref(slug: string, page: LocationPageKey) {
  return `${locationTabHref(slug, "pages")}/${page}`;
}

/** A location's history, optionally narrowed to one part of it. */
export function locationHistoryHref(slug: string, kind?: LocationHistoryKind) {
  const base = locationTabHref(slug, "history");
  return kind ? `${base}?kind=${kind}` : base;
}

/** What one publish in a location's history put on a page, by the log entry's id. */
export function locationPublishHref(slug: string, entryId: string) {
  return `${locationHref(slug)}/history/${entryId}`;
}

/** A location's bookings, optionally narrowed to one status. */
export function locationBookingsHref(slug: string, status?: BookingStatus) {
  const base = locationTabHref(slug, "bookings");
  return status ? `${base}?status=${status}` : base;
}

/** One offering of a location: the rates it sells a class at; "new" for the add page. */
export function locationOfferingHref(slug: string, offeringId: string) {
  return `${locationTabHref(slug, "vehicle-classes")}/${offeringId}`;
}
export function newLocationOfferingHref(slug: string) {
  return locationOfferingHref(slug, "new");
}

/** A location's vehicles, or only those with a document due. */
export function locationVehiclesHref(slug: string, due?: boolean) {
  return fleetListHref(locationTabHref(slug, "vehicles"), { due });
}

/** A location's drivers, or only those with a licence due. */
export function locationDriversHref(slug: string, due?: boolean) {
  return fleetListHref(locationTabHref(slug, "drivers"), { due });
}

/** One vehicle based at a location; "new" for the add page. */
export function locationVehicleHref(slug: string, vehicleId: string) {
  return `${locationTabHref(slug, "vehicles")}/${vehicleId}`;
}
export function newLocationVehicleHref(slug: string) {
  return locationVehicleHref(slug, "new");
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

/** Where a model's form posts each photo; answers the stored file. */
export const VEHICLE_MODEL_IMAGE_UPLOAD_PATH =
  "/api/uploads/vehicle-model-image";

/** The form that amends one item of a booking: its trip, vehicle and details; inside a location with its slug. */
export function amendItemHref(
  bookingId: string,
  itemId: string,
  slug?: string,
) {
  return `${bookingHref(bookingId, slug)}/amend/${itemId}`;
}
