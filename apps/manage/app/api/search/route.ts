import {
  formatLocalDate,
  formatLocalTime,
  searchTermOf,
  type Permission,
} from "@repo/db";
import {
  findBookingMatches,
  findDriverMatches,
  findUserMatches,
  findVehicleClassMatches,
  findVehicleMatches,
  findZoneMatches,
} from "@repo/db/server";
import { getPermissions } from "../../_lib/access";
import { FORBIDDEN_MESSAGE } from "@repo/console/action-state";
import { bookingLocations } from "../../_lib/booking-locations";
import {
  RECORD_KINDS,
  RECORD_KIND_PERMISSIONS,
  SEARCH_LIMIT,
  type RecordKind,
  type SearchHit,
  type SearchResponse,
} from "../../_lib/console-search";
import {
  SEARCH_PARAM,
  bookingHref,
  classHref,
  classesHref,
  coverageHref,
  customersHref,
  driverHref,
  vehicleHref,
  zoneHref,
} from "../../_lib/routes";

/** "Ahmad Fikri", or the email for an account with no name. */
const nameOf = (user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) => [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email;

/** How each kind is found: its records as lines, each to its page. */
const FINDERS: Record<
  RecordKind,
  {
    find: (
      search: string,
      permissions: readonly Permission[],
    ) => Promise<SearchHit[]>;
  }
> = {
  bookings: {
    find: async (search) =>
      (await findBookingMatches(search, SEARCH_LIMIT)).map((booking) => {
        const locations = bookingLocations(booking);
        return {
          title: booking.reference,
          status: booking.status,
          detail: `${booking.contactName} · ${formatLocalDate(booking.startsAt)}, ${formatLocalTime(booking.startsAt)}`,
          meta: locations.map((location) => location.name).join(", "),
          // Inside the location it picks up in; one across two on its own page.
          href: bookingHref(
            locations.length === 1 ? locations[0]!.slug : null,
            booking.id,
          ),
        };
      }),
  },
  vehicles: {
    find: async (search) =>
      (await findVehicleMatches(search, SEARCH_LIMIT)).map((vehicle) => ({
        title: vehicle.plate,
        detail: `${vehicle.vehicleModel.brand} ${vehicle.vehicleModel.name}${vehicle.isActive ? "" : " · Out of service"}`,
        meta: vehicle.location.name,
        href: vehicleHref(vehicle.location.slug, vehicle.id),
      })),
  },
  drivers: {
    find: async (search) =>
      (await findDriverMatches(search, SEARCH_LIMIT)).map((driver) => ({
        title: driver.name,
        detail: `${driver.phone}${driver.isActive ? "" : " · Inactive"}`,
        meta: driver.location.name,
        href: driverHref(driver.location.slug, driver.id),
      })),
  },
  users: {
    find: async (search) =>
      (await findUserMatches(search, SEARCH_LIMIT)).map((user) => ({
        title: nameOf(user),
        detail: user.email,
        meta: user.adminProfile ? "Admin" : undefined,
        href: customersHref({ q: user.email }),
      })),
  },
  "vehicle-classes": {
    // The class's own page is Operation's, to change it; the others read the catalogue.
    find: async (search, permissions) =>
      (await findVehicleClassMatches(search, SEARCH_LIMIT)).map(
        (vehicleClass) => ({
          title: vehicleClass.name,
          detail: vehicleClass.isActive ? undefined : "Turned off",
          href: permissions.includes("coverage.manage")
            ? classHref(null, vehicleClass.id)
            : classesHref(null),
        }),
      ),
  },
  zones: {
    // The zone's editor is Operation's; the others read the location's map.
    find: async (search, permissions) =>
      (await findZoneMatches(search, SEARCH_LIMIT)).map((zone) => ({
        title: zone.name,
        meta: zone.location.name,
        href: permissions.includes("coverage.manage")
          ? zoneHref(zone.location.slug, zone.id)
          : coverageHref(zone.location.slug),
      })),
  },
};

/**
 * GET /api/search?q=…: the records the console's search lists as the
 * admin types, a few of each kind they may open, across every location
 * whatever the picker is on, so a caller's booking or a plate is found
 * from anywhere. Each kind is matched as its own list matches it, or by
 * its id pasted whole, and the kinds are asked at once. Each record opens
 * inside its location, where it lives. For any admin; a kind they may not
 * open is not asked.
 */
export async function GET(request: Request) {
  const permissions = await getPermissions();
  if (permissions.length === 0) {
    return Response.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
  }
  const search = searchTermOf(
    new URL(request.url).searchParams.get(SEARCH_PARAM),
  );
  if (!search) {
    return Response.json({ groups: [] } satisfies SearchResponse);
  }
  const kinds = RECORD_KINDS.filter((kind) =>
    permissions.includes(RECORD_KIND_PERMISSIONS[kind]),
  );
  const found = await Promise.all(
    kinds.map((kind) => FINDERS[kind].find(search, permissions)),
  );
  return Response.json({
    groups: kinds
      .map((kind, index) => ({ kind, hits: found[index] ?? [] }))
      .filter((group) => group.hits.length > 0),
  } satisfies SearchResponse);
}
