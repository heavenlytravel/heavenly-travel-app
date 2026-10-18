import {
  SETUP_STEPS,
  SETUP_STEP_LABELS,
  type BookingStatus,
  type LocationHistoryKind,
  type LocationPageKey,
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

/** One booking, by id. The customer site uses the reference; ops uses the id. */
export function bookingHref(id: string) {
  return `${BOOKINGS_PATH}/${id}`;
}

/** Where staff enter a booking that arrived by phone, WhatsApp or email. */
export const NEW_BOOKING_PATH = `${BOOKINGS_PATH}/new`;

/** The catalogue of vehicle classes. */
export const VEHICLE_CLASSES_PATH = "/vehicle-classes";

/** One class's page, by id; "new" for the add page. */
export function vehicleClassHref(id: string) {
  return `${VEHICLE_CLASSES_PATH}/${id}`;
}
export const NEW_VEHICLE_CLASS_PATH = vehicleClassHref("new");

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

/** A tab of a location's page: the overview, one of the setup steps, the rates, the bookings or the history. */
export type LocationTab =
  "overview" | SetupStepKey | "rates" | "bookings" | "history";

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
 * the coverage whose zones they price, then the bookings and the history. Each is its own
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
    key: "history",
    label: "History",
    permission: "locations.view",
    step: null,
  },
];

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

/** The editor of one zone of a location; "new" for the add page. */
export function locationZoneHref(slug: string, zoneId: string) {
  return `${locationTabHref(slug, "coverage")}/zones/${zoneId}`;
}
export function newLocationZoneHref(slug: string) {
  return locationZoneHref(slug, "new");
}

/** Where the page editor posts an image; answers the stored file. */
export const LOCATION_IMAGE_UPLOAD_PATH = "/api/uploads/location-image";

/** The form that amends one item of a booking: its trip, vehicle and details. */
export function amendItemHref(bookingId: string, itemId: string) {
  return `${bookingHref(bookingId)}/amend/${itemId}`;
}
