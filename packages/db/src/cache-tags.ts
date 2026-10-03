/**
 * The tags the customer site caches what it reads under. The admin names
 * the same tags when it asks the customer site to refresh, so both apps
 * read them from here. Browser-safe. See
 * docs/261001-locations-and-pages.md, "Keeping the pages fresh".
 */

/** The home page's top choices. */
export const TOP_CHOICES_TAG = "top-choices";

/** The active vehicle classes a product page lists. */
export const VEHICLE_CLASSES_TAG = "vehicle-classes";

/** One location's pages, by the slug they are read at. */
export function locationTag(slug: string) {
  return `location:${slug}`;
}

/** The most tags one refresh names: no change touches more than a few. */
const MAX_TAGS = 20;
/** The cache refuses a longer tag. */
const MAX_TAG_LENGTH = 256;

/** The tags a refresh request names, or null when it is not a short list of tags. */
export function cacheTagsOf(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const tags = value as unknown[];
  if (tags.length === 0 || tags.length > MAX_TAGS) return null;
  return tags.every(
    (tag): tag is string =>
      typeof tag === "string" && tag !== "" && tag.length <= MAX_TAG_LENGTH,
  )
    ? tags
    : null;
}

/** The customer site's route the admin posts the tags to. */
export const REVALIDATE_PATH = "/api/revalidate";
