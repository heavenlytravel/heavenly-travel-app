import {
  isLocationPageRef,
  isSitePageKey,
  type LocationPageRef,
  type SitePageKey,
} from "@repo/db";

/**
 * The page an editor writes: one of a location's, by the location's id and
 * the page's section and slug, or one of the site's own. The editor hands
 * it to its actions as it is; they check it again, since an action is
 * reachable by direct POST. Browser-safe.
 */
export type PageTarget =
  | { scope: "location"; locationId: string; ref: LocationPageRef }
  | { scope: "site"; page: SitePageKey };

/** The target a request names, or null when it names none. */
export function pageTargetOf(value: unknown): PageTarget | null {
  if (typeof value !== "object" || value === null) return null;
  const target = value as Record<string, unknown>;
  if (target.scope === "site") {
    return isSitePageKey(target.page)
      ? { scope: "site", page: target.page }
      : null;
  }
  if (target.scope !== "location" || typeof target.locationId !== "string") {
    return null;
  }
  const ref = target.ref as Record<string, unknown> | null;
  if (typeof ref !== "object" || ref === null) return null;
  const read = { page: ref.page, slug: ref.slug };
  return isLocationPageRef(read)
    ? { scope: "location", locationId: target.locationId, ref: read }
    : null;
}
