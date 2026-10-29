import "server-only";
import type { LocationName } from "@repo/db/server";
import { notFound } from "next/navigation";
import { cache } from "react";
import { locationNames } from "./location-names";
import { scopeSlugOf, type ScopeSlug } from "./routes";

/**
 * What a console page works on, read off its address's first segment:
 * every location the person may see (`~`, `slug` null), or one location,
 * by its slug. A slug no location has, or one the person may not see, is
 * a page not found. Read once per request: the layout draws the menu and
 * the picker from it and the page reads it again. See
 * docs/261029-manage-signature-overhaul.md, "How scope works".
 */
export type ConsoleScope = {
  slug: ScopeSlug;
  /** The location under a slug; null under `~`. */
  location: LocationName | null;
};

/**
 * The locations this person may see, by name: today every location. The
 * seam for location access: when a team is limited to its own location,
 * this narrows the set, and `~` quietly means "my locations".
 */
export const locationsVisible = cache(
  async (): Promise<readonly LocationName[]> => locationNames(),
);

/** The scope a route's `location` segment names. */
export const consoleScope = cache(
  async (segment: string): Promise<ConsoleScope> => {
    const slug = scopeSlugOf(segment);
    if (slug === null) return { slug: null, location: null };
    const location = (await locationsVisible()).find(
      (entry) => entry.slug === slug,
    );
    if (!location) notFound();
    return { slug, location };
  },
);

/** The scope of a page or a layout under `[location]`, from its `params`. */
export async function scopeOf(params: Promise<{ location: string }>) {
  return consoleScope((await params).location);
}
