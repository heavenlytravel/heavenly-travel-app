import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import type { PageKind } from "./page-content";

/**
 * The pages of the whole site, pure and browser-safe: the home page's
 * content, about us, contact us and the legal pages. Each is one row of
 * `SitePage`, written in the same editor as a location's pages and with the
 * same content (./page-content); they differ in kind. A new site page is a
 * code change: a key here, and its route and its preview's route on the
 * customer site; its address joins the reserved slugs. See
 * docs/261025-marketing-pages.md, "Site pages".
 */

export const HOME_PAGE = "home";

export const SITE_PAGES = [
  HOME_PAGE,
  "about-us",
  "contact-us",
  "terms",
  "privacy-policy",
  "refund-policy",
] as const;
export type SitePageKey = (typeof SITE_PAGES)[number];
export const isSitePageKey = guardFor(SITE_PAGES);

export const SITE_PAGE_LABELS: Record<SitePageKey, string> = {
  home: "Home page",
  "about-us": "About us",
  "contact-us": "Contact us",
  terms: "Terms and conditions",
  "privacy-policy": "Privacy policy",
  "refund-policy": "Cancellation and refunds",
};

/** The site's name, after a page's own title in a browser tab and a search result. */
export const SITE_NAME = "Heavenly Travel";

/**
 * A site page's title while its meta title is empty, on the site and in
 * the editor's search preview alike: the home page's as the site has long
 * had it, a document's its name before the site's, "About us | Heavenly
 * Travel".
 */
export function sitePageFallbackTitle(page: SitePageKey): string {
  return page === HOME_PAGE
    ? `${SITE_NAME} — Travel made simple`
    : `${SITE_PAGE_LABELS[page]} | ${SITE_NAME}`;
}

/** The home page holds its own sections; every other site page is a document. */
export function sitePageKindOf(page: SitePageKey): PageKind {
  return page === HOME_PAGE ? "home" : "document";
}

/** Where a site page is on the customer site: /, /about-us. */
export function sitePagePath(page: SitePageKey) {
  return page === HOME_PAGE ? "/" : `/${page}`;
}

/**
 * The top-level addresses the site pages take, which no location's slug
 * may: not their public pages, nor their previews under /preview.
 */
export const SITE_PAGE_PATHS: readonly string[] = SITE_PAGES.filter(
  (page) => page !== HOME_PAGE,
);

/**
 * Where the console keeps the site pages, under its Pages: their editors
 * at /pages/website/about-us, the home page's with its top choices. Staff
 * alone see these addresses.
 */
export const SITE_PAGES_PATH = "/pages/website";

/** Where a site page is edited in the console; the customer site's preview links it as Edit. */
export function sitePageEditorPath(page: SitePageKey) {
  return `${SITE_PAGES_PATH}/${page}`;
}

/**
 * Where staff preview a site page's draft: /preview and its address, as a
 * location's page is previewed. /preview/about-us, and /preview for the
 * home page.
 */
export function sitePagePreviewPath(page: SitePageKey) {
  return page === HOME_PAGE ? "/preview" : `/preview${sitePagePath(page)}`;
}

/** The site pages the footer links, in its order, when they are published. */
export const FOOTER_SITE_PAGES: readonly SitePageKey[] = [
  "about-us",
  "contact-us",
  "terms",
  "privacy-policy",
  "refund-policy",
];

/**
 * Whether a site page can be unpublished. The home page stays published
 * once it is: unpublished, it would fall back to the text it had before
 * Marketing wrote it, which is no one's choice.
 */
export function checkSitePageUnpublish(page: SitePageKey): Change {
  return page === HOME_PAGE
    ? refuse(
        "The home page stays published once it is. Publish a change instead.",
      )
    : { ok: true };
}
