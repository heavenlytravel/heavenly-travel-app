import "server-only";
import { getLocationSlug, textOf } from "@repo/db/server";
import { FLEET_BACK_FIELD } from "@repo/console/fleet-form";
import { revalidatePath } from "next/cache";
import { revalidateLocation } from "../(console)/locations/_lib/revalidate";
import {
  DRIVERS_PATH,
  LOCATIONS_PATH,
  VEHICLE_CLASSES_PATH,
  VEHICLES_PATH,
  locationTabHref,
} from "./routes";
import { refreshVehicleClassesAfter } from "./site";

/**
 * What the vehicle and driver actions share: what a change refreshes and
 * where a saved record opens. Both lists are a location's tab and a list
 * across locations.
 */

/** Our vehicles or our drivers. */
export type FleetKind = "vehicles" | "drivers";

const LIST_PATHS: Record<FleetKind, string> = {
  vehicles: VEHICLES_PATH,
  drivers: DRIVERS_PATH,
};

/**
 * What a vehicle or driver change drops from the console's cache: the
 * locations' tabs and the list across locations. A vehicle can add a
 * model to its class and changes the models a location's customers see,
 * so the catalogue and the customer site's class cards refresh too.
 */
export function revalidateFleet(kind: FleetKind) {
  revalidateLocation();
  revalidatePath(LIST_PATHS[kind]);
  if (kind === "vehicles") {
    revalidatePath(VEHICLE_CLASSES_PATH, "layout");
    refreshVehicleClassesAfter();
  }
}

/**
 * Where a saved vehicle or driver opens: the list across locations it was
 * added from, as it was filtered, which the form posts under
 * `FLEET_BACK_FIELD`; or else the tab of the location it is based at,
 * which a move changes.
 */
export async function fleetSavedHref(
  kind: FleetKind,
  formData: FormData,
  locationId: string,
): Promise<string> {
  const list = LIST_PATHS[kind];
  const back = textOf(formData.get(FLEET_BACK_FIELD));
  if (back === list || back.startsWith(`${list}?`)) return back;
  const slug = await getLocationSlug(locationId);
  return slug ? locationTabHref(slug, kind) : LOCATIONS_PATH;
}
