import "server-only";
import { revalidatePath } from "next/cache";
import { LOCATIONS_PATH, locationHref } from "../../../_lib/routes";

/**
 * What every action on a location drops from the console's cache: the
 * location's header and every tab under it, the home's row for it, and the
 * console's chrome, whose sidebar lists every location by name and state.
 */
export function revalidateLocation(id: string) {
  revalidatePath(locationHref(id), "layout");
  revalidateLocations();
}

/** The same for the console as a whole, after a location is added or deleted. */
export function revalidateLocations() {
  revalidatePath(LOCATIONS_PATH);
  revalidatePath(LOCATIONS_PATH, "layout");
}
