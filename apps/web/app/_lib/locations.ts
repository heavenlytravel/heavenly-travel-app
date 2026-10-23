import "server-only";
import {
  TOP_CHOICES_TAG,
  VEHICLE_CLASSES_TAG,
  checkLocationSlug,
  getLocationPreview,
  getLocationSearch,
  getPublicLocation,
  listActiveOfferingsAt,
  cheapestCellsAt,
  listTopChoiceCards,
  locationTag,
  startingPriceSen,
  type LocationSearch,
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

/**
 * The version of `LocationSearch` the cache holds. A cached answer outlives
 * a deploy, so a change to its shape bumps this, or the pages read the old
 * shape until it expires.
 */
const LOCATION_SEARCH_VERSION = 3;

/**
 * What the search card on the location's pages keeps to, read off its
 * zones and where its trips may go. Tagged with the location, which the admin
 * refreshes after a change to either. Once per request.
 */
export const publicLocationSearch = cache(
  async (slug: string): Promise<LocationSearch | null> => {
    if (!isLocationSlug(slug)) return null;
    return unstable_cache(
      () => getLocationSearch(slug),
      ["public-location-search", String(LOCATION_SEARCH_VERSION), slug],
      { tags: [locationTag(slug)], revalidate: REFRESH_SECONDS },
    )();
  },
);

/** The same for the staff preview, read fresh. */
export const locationSearchPreview = cache(getLocationSearch);

/** The home page's location cards. */
export const topChoiceCards = unstable_cache(
  listTopChoiceCards,
  ["top-choice-cards"],
  { tags: [TOP_CHOICES_TAG], revalidate: REFRESH_SECONDS },
);

/** A class a location sells, as its product page lists it. */
export type VehicleClassCard = {
  id: string;
  name: string;
  description: string;
  minPassengers: number;
  maxPassengers: number;
  luggage: string;
  /** Its picture at the location: a photo of a vehicle there, or the catalogue's; null for none. */
  imageUrl: string | null;
  /** The models of the location's vehicles in service, by name, with their photos. */
  models: {
    id: string;
    name: string;
    photos: { url: string; caption: string }[];
  }[];
  /** The least it can cost there, in sen. */
  fromSen: number;
};

/**
 * The classes a location sells in a product, in their order, at the
 * location's rates, each with its models. Tagged with the location, which the admin refreshes
 * after a change to what it sells, and with the catalogue, which it
 * refreshes after a change to a class.
 */
export const vehicleClassCards = cache(
  (slug: string, category: TripCategory): Promise<VehicleClassCard[]> =>
    unstable_cache(
      async () => {
        const [offerings, cheapest] = await Promise.all([
          listActiveOfferingsAt(slug, category),
          cheapestCellsAt(slug),
        ]);
        return offerings.map(({ vehicleClass, ...offering }) => ({
          id: vehicleClass.id,
          name: vehicleClass.name,
          description: vehicleClass.description,
          minPassengers: vehicleClass.minPassengers,
          maxPassengers: vehicleClass.maxPassengers,
          luggage: vehicleClass.luggage,
          imageUrl: offering.coverUrl,
          models: vehicleClass.models,
          fromSen: startingPriceSen(
            offering,
            cheapest.get(vehicleClass.id) ?? null,
          ),
        }));
      },
      ["vehicle-class-cards", slug, category],
      {
        tags: [locationTag(slug), VEHICLE_CLASSES_TAG],
        revalidate: REFRESH_SECONDS,
      },
    )(),
);
