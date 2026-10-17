import "server-only";
import { getLocation, getLocationOverview } from "@repo/db/server";
import { cache } from "react";

/**
 * What a location's layout and its tabs both read, once per request: the
 * layout draws the header from it and the tab on screen reads it again.
 * React's `cache` hands the second reader the first's promise.
 */

/** The location with its states, addresses and pages; null when there is none. */
export const locationDetails = cache((id: string) => getLocation(id));

/** The location's numbers; null when there is no such location. */
export const locationOverview = cache((id: string) => getLocationOverview(id));
