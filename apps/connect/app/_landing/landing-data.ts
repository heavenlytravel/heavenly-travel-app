import "server-only";
import { cache } from "react";
import { CONNECT_PAGE, CONNECT_PAGE_COPY, type PageContent } from "@repo/db";
import { SITE_URL, getSitePage, listVendorOpenings } from "@repo/db/server";

/**
 * What the landing page shows: its words, published in the console or the
 * ones it was built with, or the draft for the staff preview; the "Open
 * now" board; and the customer site's terms for the footer. Once a
 * request: the page and its search title read it both.
 */
export const landingData = cache(async (which: "public" | "draft") => {
  const [page, openings] = await Promise.all([
    getSitePage(CONNECT_PAGE),
    listVendorOpenings(),
  ]);
  const content: PageContent =
    which === "draft" ? page.draft : (page.published ?? CONNECT_PAGE_COPY);
  return {
    content,
    openings,
    terms: {
      termsHref: `${SITE_URL}/terms`,
      privacyHref: `${SITE_URL}/privacy-policy`,
    },
  };
});
