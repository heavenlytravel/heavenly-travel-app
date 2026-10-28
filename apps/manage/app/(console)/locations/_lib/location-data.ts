import "server-only";
import {
  getLocation,
  getLocationIdBySlug,
  getLocationOverview,
  getLocationSlug,
  listOfferings,
  listZoneNames,
} from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { locationHref } from "../../../_lib/routes";

/**
 * What a location's layout and its tabs both read, once per request: the
 * layout draws the header from it and the tab on screen reads it again.
 * React's `cache` hands the second reader the first's promise.
 */

/**
 * The id of the location with this slug, or null: for the sidebar, which
 * shows nothing of its own for an address the page sends on or turns away.
 */
export const locationIdOf = cache((slug: string) => getLocationIdBySlug(slug));

/**
 * The location at a console address, `/locations/[slug]`: its id, which
 * the reads and the writes take, and its slug, which the links take. An
 * address from before the console used slugs, with the location's id in
 * it, goes on to the location's overview; anything else is a 404.
 */
export const locationKey = cache(async (slug: string) => {
  const id = await locationIdOf(slug);
  if (id) return { id, slug };
  const moved = await getLocationSlug(slug);
  if (moved) redirect(locationHref(moved));
  notFound();
});

/** The location with its states, addresses and pages; null when there is none. */
export const locationDetails = cache((id: string) => getLocation(id));

/** The location's numbers; null when there is no such location. */
export const locationOverview = cache((id: string) => getLocationOverview(id));

/** The location's zones by name, for the sidebar's menu and the tabs that list them. */
export const locationZoneNames = cache((id: string) => listZoneNames(id));

/** The classes the location offers, for the sidebar's menu and the tabs that list them. */
export const locationOfferings = cache((id: string) => listOfferings(id));
