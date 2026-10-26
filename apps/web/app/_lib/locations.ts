import "server-only";
import {
  TOP_CHOICES_TAG,
  VEHICLE_CLASSES_TAG,
  checkLocationSlug,
  getLocationPageBody,
  getLocationPreview,
  getLocationSearch,
  getPublicLocation,
  listActiveOfferingsAt,
  cheapestCellsAt,
  listPublicLocationSlugs,
  listTopChoiceCards,
  locationTag,
  startingPriceSen,
  type LocationPageRef,
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

export const REFRESH_SECONDS = 3600;

/**
 * Whether the text could be a location's slug. Whatever follows the site's
 * first slash arrives here, so anything else is turned away before it costs
 * a cache entry or a query.
 */
export function isLocationSlug(slug: string) {
  return checkLocationSlug(slug).ok;
}

/**
 * The version of `LocationView` the cache holds. A cached answer outlives a
 * deploy, so a change to its shape bumps this, or the pages read the old
 * shape until it expires.
 */
const LOCATION_VIEW_VERSION = 2;

/** The location at the slug as the public sees it, or null. Once per request. */
export const publicLocation = cache(
  async (slug: string): Promise<LocationView | null> => {
    if (!isLocationSlug(slug)) return null;
    return unstable_cache(
      () => getPublicLocation(slug),
      ["public-location", String(LOCATION_VIEW_VERSION), slug],
      { tags: [locationTag(slug)], revalidate: REFRESH_SECONDS },
    )();
  },
);

/** The location at the slug as staff preview it: the drafts, read fresh. Once per request. */
export const locationPreview = cache(getLocationPreview);

/**
 * The text of a public post at the location, which its view leaves out:
 * only the post's own page reads it. Tagged with the location, as the view.
 */
export const publicPageBody = cache(
  (slug: string, page: LocationPageRef["page"], entry: string) =>
    unstable_cache(
      () => getLocationPageBody(slug, { page, slug: entry }, false),
      ["public-page-body", slug, page, entry],
      { tags: [locationTag(slug)], revalidate: REFRESH_SECONDS },
    )(),
);

/** The same for the staff preview: the draft's text, read fresh. */
export const previewPageBody = cache(
  (slug: string, page: LocationPageRef["page"], entry: string) =>
    getLocationPageBody(slug, { page, slug: entry }, true),
);

/**
 * The version of `LocationSearch` the cache holds. A cached answer outlives
 * a deploy, so a change to its shape bumps this, or the pages read the old
 * shape until it expires.
 */
const LOCATION_SEARCH_VERSION = 5;

/**
 * Where the search card on the location's pages starts, read off its
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

/**
 * The slugs of the locations the public sees, for the footer's links. A
 * location going live, paused or deleted refreshes the top choices' tag,
 * so the list is kept under it.
 */
export const publicLocationSlugs = unstable_cache(
  listPublicLocationSlugs,
  ["public-location-slugs"],
  { tags: [TOP_CHOICES_TAG], revalidate: REFRESH_SECONDS },
);

/** A class a location sells, as its product page lists it. */
export type VehicleClassCard = {
  id: string;
  /** The class's slug, which its page under the product is at. */
  slug: string;
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
          slug: vehicleClass.slug,
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
      ["vehicle-class-cards", "2", slug, category],
      {
        tags: [locationTag(slug), VEHICLE_CLASSES_TAG],
        revalidate: REFRESH_SECONDS,
      },
    )(),
);
