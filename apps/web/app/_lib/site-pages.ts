import "server-only";
import {
  FOOTER_SITE_PAGES,
  SITE_PAGES_TAG,
  SITE_PAGE_LABELS,
  getSitePage,
  listPublishedSitePages,
  sitePagePath,
  type PublishedSitePage,
  type SitePageKey,
} from "@repo/db/server";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { REFRESH_SECONDS } from "./locations";

/**
 * What the customer site reads of the site's own pages, cached under one
 * tag: the home page's content, the documents and the footer's links. The
 * admin names the tag after a publish or an unpublish. The preview reads
 * the drafts directly. See docs/261025-marketing-pages.md, "Site pages".
 */

/** The version of what the cache holds; a change to its shape bumps it. */
const SITE_PAGES_VERSION = 1;

/** The site pages that are published, by key. */
export const publishedSitePages = unstable_cache(
  listPublishedSitePages,
  ["published-site-pages", String(SITE_PAGES_VERSION)],
  { tags: [SITE_PAGES_TAG], revalidate: REFRESH_SECONDS },
);

/** One published site page; null while it is not published. */
export async function publishedSitePage(
  page: SitePageKey,
): Promise<PublishedSitePage | null> {
  return (await publishedSitePages())[page] ?? null;
}

/** A site page's draft, for the staff preview, read fresh. Once per request. */
export const sitePageDraft = cache(getSitePage);

/** The company's pages the footer links: those published, in its order. */
export async function footerLinks() {
  const pages = await publishedSitePages();
  return FOOTER_SITE_PAGES.filter((page) => pages[page]).map((page) => ({
    href: sitePagePath(page),
    label: SITE_PAGE_LABELS[page],
  }));
}
