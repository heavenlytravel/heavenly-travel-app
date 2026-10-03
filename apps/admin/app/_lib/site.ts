import "server-only";
import {
  REVALIDATE_PATH,
  SITE_URL,
  TOP_CHOICES_TAG,
  VEHICLE_CLASSES_TAG,
  getLocationSlug,
  locationPreviewPath,
  locationTag,
  type LocationPageKey,
} from "@repo/db/server";
import { after } from "next/server";

/**
 * The console's dealings with the customer site, a separate deployment at
 * `SITE_URL`: the address of a location's staff preview there, and the call
 * that refreshes its cached pages after a change here. See
 * docs/261001-locations-and-pages.md, "Keeping the pages fresh".
 */

/** Where staff preview a page of a location on the customer site. */
export function locationPreviewUrl(slug: string, page?: LocationPageKey) {
  return SITE_URL + locationPreviewPath(slug, page);
}

/** How long the refresh may take before it is given up. */
const REFRESH_TIMEOUT_MS = 5000;

/**
 * Asks the customer site to drop what it cached under the tags. It never
 * throws: when the call fails the change is still saved, and the customer
 * site's hourly refresh catches the pages up.
 */
async function refreshSite(tags: string[]) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.warn(
      "[site] REVALIDATE_SECRET is not set; the customer site catches up within the hour",
    );
    return;
  }
  try {
    const response = await fetch(SITE_URL + REVALIDATE_PATH, {
      method: "POST",
      headers: {
        authorization: `Bearer ${secret}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(REFRESH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(
        `[site] refreshing ${tags.join(", ")} answered ${response.status}`,
      );
    }
  } catch (error) {
    console.error(`[site] refreshing ${tags.join(", ")} failed:`, error);
  }
}

/**
 * Refreshes a location's pages on the customer site once the action has
 * answered, and the home page's cards with them: a card shows the
 * location's name, tagline and hero image, and leaves when it is paused.
 */
export function refreshLocationAfter(locationId: string) {
  after(async () => {
    const slug = await getLocationSlug(locationId);
    await refreshSite([...(slug ? [locationTag(slug)] : []), TOP_CHOICES_TAG]);
  });
}

/** Refreshes the home page's cards alone: their order changed. */
export function refreshTopChoicesAfter() {
  after(() => refreshSite([TOP_CHOICES_TAG]));
}

/** Refreshes the vehicle classes the product pages list. */
export function refreshVehicleClassesAfter() {
  after(() => refreshSite([VEHICLE_CLASSES_TAG]));
}
