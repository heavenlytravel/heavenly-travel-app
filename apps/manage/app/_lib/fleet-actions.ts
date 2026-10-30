import "server-only";
import { getLocationSlug, textOf } from "@repo/db/server";
import { SCOPE_FIELD } from "./fleet-form";
import { refreshVehicleClassesAfter } from "./site";
import { revalidateLocation } from "./revalidate";
import {
  ALL,
  dashboardHref,
  driversHref,
  vehiclesHref,
  type ScopeSlug,
} from "./routes";

/**
 * What the vehicle and driver actions share: what a change refreshes and
 * where a saved record opens.
 */

/** Our vehicles or our drivers. */
export type FleetKind = "vehicles" | "drivers";

const LISTS: Record<FleetKind, (scope: ScopeSlug) => string> = {
  vehicles: vehiclesHref,
  drivers: driversHref,
};

/**
 * What a vehicle or driver change drops from the console's cache: every
 * console page, whose lists, counts and menu read the fleet. A vehicle
 * can add a model to its class and changes the models a location's
 * customers see, so the customer site's class cards refresh too.
 */
export function revalidateFleet(kind: FleetKind) {
  revalidateLocation();
  if (kind === "vehicles") refreshVehicleClassesAfter();
}

/**
 * Where a saved vehicle or driver opens: the list of every location when
 * its form was opened there (`SCOPE_FIELD`), or else the list of the
 * location it is based at, which a move changes.
 */
export async function fleetSavedHref(
  kind: FleetKind,
  formData: FormData,
  locationId: string,
): Promise<string> {
  if (textOf(formData.get(SCOPE_FIELD)) === ALL) return LISTS[kind](null);
  const slug = await getLocationSlug(locationId);
  return slug ? LISTS[kind](slug) : dashboardHref(null);
}
