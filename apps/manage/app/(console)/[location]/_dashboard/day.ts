import type { Permission } from "@repo/db";
import type { LocationOverview } from "@repo/db/server";
import type { ConsoleScope } from "../../../_lib/scope";

/**
 * What the dashboard's parts read the day by: the scope, what the admin
 * may do and the moment, and the numbers they sum over the scope's
 * locations.
 */

/** What the dashboard reads the day in: the scope, what the admin may do, and the moment. */
export type Day = {
  scope: ConsoleScope;
  permissions: readonly Permission[];
  now: Date;
};

/** Whether the admin with these permissions holds one. */
export const mayIn =
  (permissions: readonly Permission[]) => (permission: Permission) =>
    permissions.includes(permission);

/** A number of each location's that the dashboard sums. */
export type Count = (overview: LocationOverview) => number;

/** Trips picking up today. */
export const PICKUPS: Count = (overview) => overview.pickupsToday;
/** Bookings received, waiting to be confirmed. */
export const RECEIVED: Count = (overview) => overview.awaitingConfirmation;
/** Confirmed trips ahead with no driver yet. */
export const AWAITING_DRIVER: Count = (overview) => overview.awaitingDriver;
/** Vehicles in service with a document due or expired. */
export const VEHICLES_DUE: Count = (overview) => overview.vehiclesDue;
/** Active drivers with a licence due or expired. */
export const DRIVERS_DUE: Count = (overview) => overview.driversDue;
/** Both, the band's "Documents due". */
export const DOCUMENTS: Count = (overview) =>
  VEHICLES_DUE(overview) + DRIVERS_DUE(overview);

/** A number summed over the locations. */
export const sumOf = (overviews: readonly LocationOverview[], count: Count) =>
  overviews.reduce((sum, overview) => sum + count(overview), 0);

/**
 * A figure by location, for the line under it while the scope holds
 * several: "Langkawi 10 · Penang 4", the locations with none left out.
 * Nothing under one location, or where none has any.
 */
export function splitOf(overviews: readonly LocationOverview[], count: Count) {
  if (overviews.length < 2) return undefined;
  const parts = overviews
    .filter((overview) => count(overview) > 0)
    .map((overview) => `${overview.name} ${count(overview)}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}
