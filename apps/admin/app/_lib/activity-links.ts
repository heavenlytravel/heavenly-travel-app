import {
  LOCATION_HISTORY_KIND_LABELS,
  locationHistoryKindOf,
  type ActivityEntityType,
  type Permission,
} from "@repo/db";
import type { ActivityEntry } from "@repo/db/server";
import {
  bookingHref,
  locationDriverHref,
  locationHref,
  locationPublishHref,
  locationVehicleHref,
  MEDIA_PATH,
  vehicleClassHref,
} from "./routes";

/**
 * How the log's entries read on the screens that list them, the Activity
 * screen across the console and a location's History: the record each
 * belongs to, named at the right of its line, and the page it opens.
 */

/** Each type of record by name, one and several, in the Activity filter's order. */
export const ACTIVITY_RECORD_NAMES: Record<
  ActivityEntityType,
  { one: string; many: string }
> = {
  booking: { one: "Booking", many: "Bookings" },
  location: { one: "Location", many: "Locations" },
  vehicle: { one: "Vehicle", many: "Vehicles" },
  driver: { one: "Driver", many: "Drivers" },
  "vehicle-class": { one: "Class", many: "Vehicle classes" },
  user: { one: "User", many: "Users" },
  admin: { one: "Admin", many: "Admins" },
  media: { one: "Media", many: "Media" },
  setting: { one: "Setting", many: "Settings" },
  state: { one: "State", many: "States" },
  district: { one: "District", many: "Districts" },
};

/**
 * The record an entry belongs to, in a few words: "Booking HT-7K3QZM",
 * "Vehicle VLE1234", "The wall". A location's entry names the part of it
 * that changed, "Langkawi · Coverage and rates", and on the location's own
 * history (`here`, its id) the part alone.
 */
export function activityEntryTag(
  entry: ActivityEntry,
  here?: string,
): string | null {
  if (entry.entityType === "location") {
    const kind = locationHistoryKindOf(entry.action);
    const part = kind ? LOCATION_HISTORY_KIND_LABELS[kind] : null;
    if (entry.entityId === here) return part;
    return part ? `${entry.entityLabel} · ${part}` : entry.entityLabel;
  }
  // "The wall" and "Media" say what they are.
  if (entry.entityType === "setting" || entry.entityType === "media") {
    return entry.entityLabel;
  }
  const names = ACTIVITY_RECORD_NAMES[entry.entityType as ActivityEntityType];
  return names ? `${names.one} ${entry.entityLabel}` : entry.entityLabel;
}

/**
 * The page an entry opens, for an admin with `permissions`; null when the
 * record has none, is gone, or is not theirs to open. A publish opens the
 * page as it was before and after, for Marketing; any other entry the
 * record itself: a booking, a location, a class, a vehicle or a driver
 * inside the location it is based at now. `slugs` are the locations' by
 * id. On a location's own history (`here`, its id) its entries open
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
    if (entry.action === "location.page.published" && may("locations.manage")) {
      return locationPublishHref(slug, entry.id);
    }
    return entry.entityId === here ? null : locationHref(slug);
  }
  if (entry.isDeleted) return null;
  const based = entry.recordLocationId
    ? slugs.get(entry.recordLocationId)
    : undefined;
  switch (entry.entityType) {
    case "booking":
      return may("bookings.view") ? bookingHref(entry.entityId) : null;
    case "vehicle":
      return based && may("fleet.manage")
        ? locationVehicleHref(based, entry.entityId)
        : null;
    case "driver":
      return based && may("fleet.manage")
        ? locationDriverHref(based, entry.entityId)
        : null;
    case "vehicle-class":
      return may("coverage.view") ? vehicleClassHref(entry.entityId) : null;
    case "media":
      return may("media.manage") ? MEDIA_PATH : null;
    default:
      // A user, an admin, the wall, a state or a district has no page of its own.
      return null;
  }
}
