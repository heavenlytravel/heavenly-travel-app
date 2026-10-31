import "server-only";
import {
  FOOTER_KEY,
  SITE_PAGES_TAG,
  defaultFooterContent,
  footerAudienceOf,
  getFooter,
  getPublishedFooter,
  getSitePage,
  listPublishedSitePages,
  visibleFooterOf,
  type FooterContent,
  type PublishedSitePage,
  type SitePageKey,
} from "@repo/db/server";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import {
  REFRESH_SECONDS,
  publicLocationSlugs,
  topChoiceCards,
} from "./locations";

/**
 * What the customer site reads of the site's own pages, cached under one
 * tag: the home page's content, the documents and the footer. The admin
 * names the tag after a publish or an unpublish. The preview reads the
 * drafts directly. See docs/261025-marketing-pages.md, "Site pages", and
 * docs/261026-site-footer.md.
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

/** The footer as published; null until its first publish. */
const publishedFooter = unstable_cache(
  () => getPublishedFooter(FOOTER_KEY),
  ["published-footer", String(SITE_PAGES_VERSION)],
  { tags: [SITE_PAGES_TAG], revalidate: REFRESH_SECONDS },
);

/** The footer the public is shown: the published one, else the default with the home page's top choices. */
export async function publicFooter(): Promise<FooterContent> {
  return (
    (await publishedFooter()) ?? defaultFooterContent(await topChoiceCards())
  );
}

/** The footer's draft, for the staff preview, read fresh. Once per request. */
export const footerDraft = cache(
  async () => (await getFooter(FOOTER_KEY)).draft,
);

/**
 * The footer as a page shows it, public or a staff preview's draft: each
 * link to a site page or a location the public cannot open left out, so
 * none leads to a 404.
 */
export async function shownFooter(preview: boolean): Promise<FooterContent> {
  const [content, pages, locations] = await Promise.all([
    preview ? footerDraft() : publicFooter(),
    publishedSitePages(),
    publicLocationSlugs(),
  ]);
  return visibleFooterOf(content, footerAudienceOf(pages, locations));
}
