import "server-only";
import {
  TOP_CHOICES_TAG,
  VEHICLE_CLASSES_TAG,
  checkLocationSlug,
  getLocationPreview,
  getPublicLocation,
  listActiveVehicleClasses,
  listTopChoiceCards,
  locationTag,
  startingPriceSen,
  type LocationView,
  type TripCategory,
} from "@repo/db/server";
import { unstable_cache } from "next/cache";
import { cache } from "react";

/**
 * What the location pages and the home page read, cached. Each read is
 * tagged; the admin names the tags to `/api/revalidate` after a change, and
 * the hourly refresh catches a page up when that call did not arrive. The
 * preview reads the drafts directly and is never cached. See
 * docs/261001-locations-and-pages.md, "Keeping the pages fresh".
 */

const REFRESH_SECONDS = 3600;

/**
 * Whether the text could be a location's slug. Whatever follows the site's
 * first slash arrives here, so anything else is turned away before it costs
 * a cache entry or a query.
 */
export function isLocationSlug(slug: string) {
  return checkLocationSlug(slug).ok;
}

/** The location at the slug as the public sees it, or null. Once per request. */
export const publicLocation = cache(
  async (slug: string): Promise<LocationView | null> => {
    if (!isLocationSlug(slug)) return null;
    return unstable_cache(
      () => getPublicLocation(slug),
      ["public-location", slug],
      { tags: [locationTag(slug)], revalidate: REFRESH_SECONDS },
    )();
  },
);

/** The location at the slug as staff preview it: the drafts, read fresh. Once per request. */
export const locationPreview = cache(getLocationPreview);

/** The home page's location cards. */
export const topChoiceCards = unstable_cache(
  listTopChoiceCards,
  ["top-choice-cards"],
  { tags: [TOP_CHOICES_TAG], revalidate: REFRESH_SECONDS },
);

/** An active vehicle class as a product page lists it. */
export type VehicleClassCard = {
  id: string;
  name: string;
  description: string;
  minPassengers: number;
  maxPassengers: number;
  luggage: string;
  /** The least it can cost, in sen. */
  fromSen: number;
};

/** The active classes of a product, in their order. */
export const vehicleClassCards = unstable_cache(
  async (category: TripCategory): Promise<VehicleClassCard[]> => {
    const classes = await listActiveVehicleClasses(category);
    return classes.map((vehicleClass) => ({
      id: vehicleClass.id,
      name: vehicleClass.name,
      description: vehicleClass.description,
      minPassengers: vehicleClass.minPassengers,
      maxPassengers: vehicleClass.maxPassengers,
      luggage: vehicleClass.luggage,
      fromSen: startingPriceSen(vehicleClass),
    }));
  },
  ["vehicle-class-cards"],
  { tags: [VEHICLE_CLASSES_TAG], revalidate: REFRESH_SECONDS },
);
