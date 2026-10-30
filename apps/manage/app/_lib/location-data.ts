import "server-only";
import {
  getLocation,
  getLocationOverview,
  listLocationOverviews,
  listOfferings,
  listZoneNames,
  type LocationOverview,
} from "@repo/db/server";
import { cache } from "react";
import { locationsVisible, type ConsoleScope } from "./scope";

/**
 * What the console's layout and its page both read, once per request:
 * the layout draws the menu's counts from it and the page on screen reads
 * it again. React's `cache` hands the second reader the first's promise.
 */

/** The location with its states, addresses and pages; null when there is none. */
export const locationDetails = cache((id: string) => getLocation(id));

/** The location's numbers; null when there is no such location. */
export const locationOverview = cache((id: string) => getLocationOverview(id));

/** Every location's numbers, by name: the menu's counts and the dashboard under `~`. */
export const locationOverviews = cache(() => listLocationOverviews());

/**
 * The numbers of the locations a scope holds, by name: the one location
 * under its slug, every location the person may see under `~`. The
 * dashboard's figures and Settings' list of locations.
 */
export async function scopeOverviews({
  location,
}: ConsoleScope): Promise<LocationOverview[]> {
  if (location) {
    const overview = await locationOverview(location.id);
    return overview ? [overview] : [];
  }
  const [overviews, visible] = await Promise.all([
    locationOverviews(),
    locationsVisible(),
  ]);
  const ids = new Set(visible.map((entry) => entry.id));
  return overviews.filter((overview) => ids.has(overview.id));
}

/** The location's zones by name, for the pages that list them. */
export const locationZoneNames = cache((id: string) => listZoneNames(id));

/** The classes the location offers, for the pages that list them. */
export const locationOfferings = cache((id: string) => listOfferings(id));
