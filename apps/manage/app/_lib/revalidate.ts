import "server-only";
import { revalidatePath } from "next/cache";
import { CONSOLE_ROUTE } from "./routes";

/**
 * What every action on a location drops from the console's cache: every
 * console page in every scope (by the route, since an action knows the
 * location's id and its address is its slug), with the console's chrome,
 * whose menu counts what waits and whose picker lists every location by
 * name and state. Each is read again on its next visit only.
 */
export function revalidateLocation() {
  revalidatePath(CONSOLE_ROUTE, "layout");
}

/** The same for the console as a whole, after a location is added or deleted. */
export const revalidateLocations = revalidateLocation;
