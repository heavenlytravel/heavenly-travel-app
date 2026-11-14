import { blogPostPath } from "./blog-input";
import { isTripMode, type TripMode } from "./booking-status";
import { guardFor } from "./const-enum";
import { locationPagePath } from "./location-page-input";
import { lineOf, recordOf } from "./page-text";
import {
  WEBSITE_PAGES,
  isHubPage,
  isSitePagePublic,
  isWebsitePageKey,
  sitePagePath,
  type HubPage,
  type SitePageKey,
  type WebsitePageKey,
} from "./site-page-input";

/**
 * Where a link the console sets on the customer site goes, pure and
 * browser-safe: one of the site's pages, a location's main page, a blog
 * post, a service's search card set to a kind of trip, or any address.
 * The footer's links take the first three kinds (./footer-content), a
 * service card on the home page the kinds that lead to a page of ours
 * (./page-sections). A link is picked, so it leads where it says; the
 * pages it leads to are checked as the site is drawn, and one that is not
 * public is left out.
 */

export const SITE_LINK_KINDS = [
  "page",
  "location",
  "post",
  "search",
  "url",
] as const;
export type SiteLinkKind = (typeof SITE_LINK_KINDS)[number];
export const isSiteLinkKind = guardFor(SITE_LINK_KINDS);

export const SITE_LINK_KIND_LABELS: Record<SiteLinkKind, string> = {
  page: "Site Page",
  location: "Location",
  post: "Blog Post",
  search: "Search Card",
  url: "Web Address",
};

export type SiteLinkTarget =
  | { kind: "page"; page: WebsitePageKey }
  | { kind: "location"; slug: string }
  | { kind: "post"; slug: string }
  /** A service's hub, its search card set to the kind of trip. */
  | { kind: "search"; service: HubPage; mode: TripMode }
  | { kind: "url"; url: string };

/** A target of one of the kinds. */
export type SiteLinkTargetOf<K extends SiteLinkKind> = Extract<
  SiteLinkTarget,
  { kind: K }
>;

/**
 * The id of the search card on a page, the end of an address that scrolls
 * to it: /car-with-driver#booking.
 */
export const SEARCH_CARD_ANCHOR = "booking";

/** The address's query key that sets the search card's kind of trip: ?trip=hourly. */
export const SEARCH_TRIP_PARAM = "trip";

/** The kind of trip an address asks the search card for, or null for none or one unknown. */
export function searchTripOf(value: unknown): TripMode | null {
  return isTripMode(value) ? value : null;
}

/** The target an empty link of the kind starts as; a web address keeps the one `raw` holds. */
function emptyTarget(
  kind: SiteLinkKind,
  raw: Record<string, unknown> = {},
): SiteLinkTarget {
  switch (kind) {
    case "page":
      return { kind, page: "about-us" };
    case "location":
    case "post":
      return { kind, slug: "" };
    case "search":
      return { kind, service: "car-with-driver", mode: "oneway" };
    case "url":
      return { kind, url: lineOf(raw.url) };
  }
}

/**
 * The target a stored or submitted value holds, of one of `kinds`; one of
 * the last kind, empty, for anything else, so a damaged link reads as one
 * to set again.
 */
export function siteLinkTargetOf<K extends SiteLinkKind>(
  value: unknown,
  kinds: readonly K[],
): SiteLinkTargetOf<K> {
  const raw = recordOf(value);
  const allowed = (kind: SiteLinkKind) =>
    (kinds as readonly SiteLinkKind[]).includes(kind);
  const read = (): SiteLinkTarget | null => {
    if (!isSiteLinkKind(raw.kind) || !allowed(raw.kind)) return null;
    switch (raw.kind) {
      case "page":
        return isWebsitePageKey(raw.page)
          ? { kind: "page", page: raw.page }
          : null;
      case "location":
      case "post":
        return { kind: raw.kind, slug: lineOf(raw.slug) };
      case "search":
        return isHubPage(raw.service) && isTripMode(raw.mode)
          ? { kind: "search", service: raw.service, mode: raw.mode }
          : null;
      case "url":
        return { kind: "url", url: lineOf(raw.url) };
    }
  };
  return (read() ??
    emptyTarget(kinds[kinds.length - 1]!, raw)) as SiteLinkTargetOf<K>;
}

/** Whether the text is an address a browser opens: http or https. */
export function isWebUrl(text: string) {
  if (!URL.canParse(text)) return false;
  const { protocol } = new URL(text);
  return protocol === "https:" || protocol === "http:";
}

/**
 * Whether a link's address is one it may hold: a web address, a path on
 * the site ("/booking"), or an email or phone link.
 */
export function isSiteUrl(text: string) {
  // A path on the site; never "//host" or "/\host", which browsers open as another site.
  if (/^\/(?![/\\])[^\s\\]*$/.test(text)) return true;
  if (/^(mailto|tel):\S+$/.test(text)) return true;
  return isWebUrl(text);
}

/** Where a search card link goes: the service's hub, its card set to the kind of trip. */
export function searchCardPath(service: HubPage, mode: TripMode) {
  return `${sitePagePath(service)}?${SEARCH_TRIP_PARAM}=${mode}#${SEARCH_CARD_ANCHOR}`;
}

/** Where a link goes on the site, or the address it holds. */
export function siteLinkHref(target: SiteLinkTarget) {
  switch (target.kind) {
    case "page":
      return sitePagePath(target.page);
    case "location":
      return locationPagePath(target.slug);
    case "post":
      return blogPostPath(target.slug);
    case "search":
      return searchCardPath(target.service, target.mode);
    case "url":
      return target.url;
  }
}

/** Whether a link leaves the site, and so opens in a new tab. */
export function isExternalSiteLink(target: SiteLinkTarget) {
  return target.kind === "url" && isWebUrl(target.url);
}

/**
 * What the public may open, which decides the links it is shown: the
 * site pages, the locations and the blog posts that are public. A search
 * card link always is: the hubs are public from the start.
 */
export type SiteLinkAudience = {
  pages: ReadonlySet<WebsitePageKey>;
  locations: ReadonlySet<string>;
  posts: ReadonlySet<string>;
};

/**
 * What the public may open, from the site pages that are published, by
 * key, the locations it sees and the blog posts published, by slug.
 */
export function siteLinkAudienceOf(
  published: Partial<Record<SitePageKey, unknown>>,
  locations: readonly string[],
  posts: readonly string[],
): SiteLinkAudience {
  return {
    pages: new Set(
      WEBSITE_PAGES.filter((page) => isSitePagePublic(page, page in published)),
    ),
    locations: new Set(locations),
    posts: new Set(posts),
  };
}

/** Whether the public can open where the link goes. */
export function isSiteLinkShown(
  target: SiteLinkTarget,
  shown: SiteLinkAudience,
) {
  switch (target.kind) {
    case "page":
      return shown.pages.has(target.page);
    case "location":
      return shown.locations.has(target.slug);
    case "post":
      return shown.posts.has(target.slug);
    case "search":
    case "url":
      return true;
  }
}
