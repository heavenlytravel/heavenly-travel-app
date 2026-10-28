import "server-only";
import { revalidatePath } from "next/cache";
import { LOCATIONS_PATH, LOCATION_ROUTE } from "../../../_lib/routes";

/**
 * What every action on a location drops from the console's cache: the
 * locations' headers and every tab under them (by the route, since an
 * action knows the location's id and its address is its slug), the home's
 * rows, and the console's chrome, whose sidebar lists every location by
 * name and state. Each is read again on its next visit only.
 */
export function revalidateLocation() {
  revalidatePath(LOCATION_ROUTE, "layout");
  revalidateLocations();
}

/** The same for the console as a whole, after a location is added or deleted. */
export function revalidateLocations() {
  revalidatePath(LOCATIONS_PATH);
  revalidatePath(LOCATIONS_PATH, "layout");
}
