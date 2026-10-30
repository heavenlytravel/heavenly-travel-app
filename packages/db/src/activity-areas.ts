import { isActivityAction, type ActivityAction } from "./activity-actions";
import { guardFor } from "./const-enum";
import type { Permission } from "./permissions";

/**
 * The activity log by area: each action belongs to one area, and each
 * area to the key that works it. An admin sees the entries of the areas
 * it holds, on the console's log and on a location's alike; SUPER holds
 * them all. A new action fails the typecheck until it is given an area.
 * Pure and browser-safe. See
 * docs/261030-sign-in-connect-onboarding-and-media.md, "Each team sees
 * its own work".
 */

/** The areas, in the order the Activity filter offers them. */
export const ACTIVITY_AREAS = [
  "bookings",
  "fleet",
  "coverage",
  "pages",
  "website",
  "details",
  "status",
  "team",
] as const;
export type ActivityArea = (typeof ACTIVITY_AREAS)[number];
export const isActivityArea = guardFor(ACTIVITY_AREAS);

export const ACTIVITY_AREA_LABELS: Record<ActivityArea, string> = {
  bookings: "Bookings",
  fleet: "Fleet",
  coverage: "Coverage and rates",
  pages: "Pages",
  website: "Website",
  details: "Details",
  status: "Status",
  team: "Team",
};

/** The key each area asks. The team's is SUPER's alone, as `admins.manage` is. */
export const ACTIVITY_AREA_PERMISSIONS: Record<ActivityArea, Permission> = {
  // Bookings, their trips and their notes.
  bookings: "bookings.view",
  // Vendors, vehicles and drivers.
  fleet: "fleet.manage",
  // Classes, coverage, zones, rates and their rules.
  coverage: "coverage.view",
  // A location's pages, their images, their publishing.
  pages: "pages.manage",
  // The website's own pages, its footer, its top choices.
  website: "website.manage",
  // A location's details and its saved addresses.
  details: "locations.manage",
  // A location added, taken live, paused, deleted.
  status: "locations.view",
  // Staff, accounts, the wall, and a customer's contact shown to a driver.
  team: "admins.manage",
};

/** The areas a location's own log can hold: its own entries' and those of the vehicles and drivers based there. */
export const LOCATION_ACTIVITY_AREAS = [
  "fleet",
  "coverage",
  "pages",
  "website",
  "details",
  "status",
] as const satisfies readonly ActivityArea[];

const AREA_OF = {
  "booking.created": "bookings",
  "booking.item.confirmed": "bookings",
  "booking.item.assigned": "bookings",
  "booking.item.completed": "bookings",
  "booking.item.cancelled": "bookings",
  "booking.cancelled": "bookings",
  "booking.item.amended": "bookings",
  "booking.item.reopened": "bookings",
  "booking.offer.sent": "bookings",
  "booking.part.accepted": "bookings",
  "booking.part.declined": "bookings",
  "booking.part.named": "bookings",
  "booking.part.released": "bookings",
  "booking.trip.reported": "bookings",
  // A customer's details shown to a driver: PDPA, SUPER's to watch.
  "booking.contact.viewed": "team",
  "booking.part.cost.changed": "bookings",
  "booking.item.priced": "bookings",
  "booking.note.added": "bookings",
  "user.created": "team",
  "admin.promoted": "team",
  "admin.updated": "team",
  "admin.revoked": "team",
  "wall.switched": "team",
  "state.updated": "coverage",
  "district.updated": "coverage",
  "vehicle-class.created": "coverage",
  "vehicle-class.updated": "coverage",
  "vehicle-class.model.created": "coverage",
  "vehicle-class.model.deleted": "coverage",
  "vehicle.created": "fleet",
  "vehicle.updated": "fleet",
  "vehicle.deleted": "fleet",
  "driver.created": "fleet",
  "driver.updated": "fleet",
  "driver.deleted": "fleet",
  "location.created": "status",
  "location.updated": "details",
  "location.top-choice.updated": "website",
  "location.addresses.updated": "details",
  "location.state.changed": "status",
  "location.page.published": "pages",
  "location.page.updated": "pages",
  "location.page.created": "pages",
  "location.page.renamed": "pages",
  "location.page.deleted": "pages",
  "location.pages.ordered": "pages",
  "site.page.published": "website",
  "site.page.updated": "website",
  "site.footer.published": "website",
  "location.deleted": "status",
  "location.offering.created": "coverage",
  "location.offering.updated": "coverage",
  "location.zone.created": "coverage",
  "location.zone.updated": "coverage",
  "location.zone.deleted": "coverage",
  "location.rates.updated": "coverage",
  "location.surcharge.updated": "coverage",
  "location.dropoff.updated": "coverage",
  "location.reach.updated": "coverage",
  // Operation sets it beside the rules: the time kept free after a job.
  "location.buffer.updated": "coverage",
  "location.weekend.updated": "coverage",
  "vendor.created": "fleet",
  "vendor.updated": "fleet",
  "vendor.approved": "fleet",
  "vendor.refused": "fleet",
  "vendor.suspended": "fleet",
  "vendor.reinstated": "fleet",
  "vendor.ours.switched": "fleet",
  "vendor.member.added": "fleet",
  "vendor.member.removed": "fleet",
  // The files a page's images were: Media is the pages' teams'.
  "media.deleted": "pages",
} as const satisfies Record<ActivityAction, ActivityArea>;

/** The area an action belongs to. */
export function activityAreaOf(action: ActivityAction): ActivityArea {
  return AREA_OF[action];
}

/** The area of an entry's action as the log holds it; null for one this code no longer knows. */
export function entryAreaOf(action: string): ActivityArea | null {
  return isActivityAction(action) ? AREA_OF[action] : null;
}

/** The key an action's entries ask, for a page that shows one entry. */
export function activityPermissionOf(action: ActivityAction): Permission {
  return ACTIVITY_AREA_PERMISSIONS[AREA_OF[action]];
}

/** The areas an admin with these permissions holds, in the filter's order. */
export function activityAreasHeld(
  permissions: readonly Permission[],
): ActivityArea[] {
  return ACTIVITY_AREAS.filter((area) =>
    permissions.includes(ACTIVITY_AREA_PERMISSIONS[area]),
  );
}

/**
 * The actions of these areas, for the log's query to ask by. Null for
 * every area, so the query asks nothing of the action and SUPER sees an
 * entry of an action this code no longer knows too.
 */
export function activityActionsIn(
  areas: readonly ActivityArea[],
): ActivityAction[] | null {
  if (ACTIVITY_AREAS.every((area) => areas.includes(area))) return null;
  return (Object.keys(AREA_OF) as ActivityAction[]).filter((action) =>
    areas.includes(AREA_OF[action]),
  );
}
