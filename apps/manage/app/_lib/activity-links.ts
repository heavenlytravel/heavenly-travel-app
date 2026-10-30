import {
  ACTIVITY_AREA_LABELS,
  entryAreaOf,
  type ActivityEntityType,
  type Permission,
} from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";
import {
  bookingHref,
  classHref,
  dashboardHref,
  driverHref,
  locationPublishHref,
  mediaHref,
  sitePageHref,
  sitePagePublishHref,
  vehicleHref,
  vendorHref,
} from "./routes";

/**
 * How the log's entries read on the Activity screen, the console's log
 * under `~` and a location's own under its slug: the record each
 * belongs to, named at the right of its line, and the page it opens.
 */

/** Each type of record by name, as an entry's tag names it. */
const ACTIVITY_RECORD_NAMES: Record<ActivityEntityType, string> = {
  booking: "Booking",
  location: "Location",
  vehicle: "Vehicle",
  driver: "Driver",
  vendor: "Vendor",
  "vehicle-class": "Class",
  user: "User",
  admin: "Admin",
  "site-page": "Site page",
  media: "Media",
  setting: "Setting",
  state: "State",
  district: "District",
};

/**
 * The record an entry belongs to, in a few words: "Booking HT-7K3QZM",
 * "Vehicle VLE1234", "The wall". A location's entry names the area of
 * its change, "Langkawi · Coverage and rates", and on the location's own
 * history (`here`, its id) the area alone.
 */
export function activityEntryTag(
  entry: ActivityEntry,
  here?: string,
): string | null {
  if (entry.entityType === "location") {
    const area = entryAreaOf(entry.action);
    const part = area ? ACTIVITY_AREA_LABELS[area] : null;
    if (entry.entityId === here) return part;
    return part ? `${entry.entityLabel} · ${part}` : entry.entityLabel;
  }
  // "The wall" and "Media" say what they are.
  if (entry.entityType === "setting" || entry.entityType === "media") {
    return entry.entityLabel;
  }
  const name = ACTIVITY_RECORD_NAMES[entry.entityType as ActivityEntityType];
  return name ? `${name} ${entry.entityLabel}` : entry.entityLabel;
}

/**
 * The page an entry opens, for an admin with `permissions`; null when the
 * record has none, is gone, or is not theirs to open. A publish opens the
 * page as it was before and after, for Marketing, and a site page's other
 * entries its editor; any other entry the record itself: a booking, a
 * location's dashboard, a class, a vehicle or a driver at the location it
 * is based at now. `slugs` are the slugs of the locations the person may
 * see, by id. On a location's own history (`here`, its id) its entries open
 * nothing more, but a publish.
 */
export function activityEntryHref(
  entry: ActivityEntry,
  {
    slugs,
    permissions,
    here,
  }: {
    slugs: ReadonlyMap<string, string>;
    permissions: readonly Permission[];
    here?: string;
  },
): string | null {
  const may = (permission: Permission) => permissions.includes(permission);
  if (entry.entityType === "location") {
    const slug = slugs.get(entry.entityId);
    if (!slug) return null;
    if (entry.action === "location.page.published" && may("pages.manage")) {
      return locationPublishHref(slug, entry.id);
    }
    return entry.entityId === here ? null : dashboardHref(slug);
  }
  if (entry.isDeleted) return null;
  const based = entry.recordLocationId
    ? slugs.get(entry.recordLocationId)
    : undefined;
  switch (entry.entityType) {
    case "booking":
      return may("bookings.view") ? bookingHref(null, entry.entityId) : null;
    case "vehicle":
      return based && may("fleet.manage")
        ? vehicleHref(based, entry.entityId)
        : null;
    case "driver":
      return based && may("fleet.manage")
        ? driverHref(based, entry.entityId)
        : null;
    case "vendor":
      return may("fleet.manage") ? vendorHref(null, entry.entityId) : null;
    case "vehicle-class":
      return may("coverage.view") ? classHref(null, entry.entityId) : null;
    case "media":
      return may("media.manage") ? mediaHref() : null;
    case "site-page":
      // A publish opens the page or the footer before and after; any other entry, its editor.
      if (!may("website.manage")) return null;
      return entry.action === "site.page.published" ||
        entry.action === "site.footer.published"
        ? sitePagePublishHref(entry.id)
        : sitePageHref(entry.entityId);
    default:
      // A user, an admin, the wall, a state or a district has no page of its own.
      return null;
  }
}
