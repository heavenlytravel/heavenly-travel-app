import "server-only";
import { cache } from "react";
import { CONNECT_PAGE, CONNECT_PAGE_COPY, type PageContent } from "@repo/db";
import {
  SITE_URL,
  getConnectFooter,
  getSitePage,
  listVendorOpenings,
} from "@repo/db/server";

/**
 * What the landing page shows: its words, published in the console or the
 * ones it was built with, or the draft for the staff preview; the "Open
 * now" board; and the footer, Connect's own or the website's, as
 * published or, for the preview, as drafted, with the customer site's
 * address its links and marks are on. Once a request: the page and its
 * search title read it both.
 */
export const landingData = cache(async (which: "public" | "draft") => {
  const [page, openings, footer] = await Promise.all([
    getSitePage(CONNECT_PAGE),
    listVendorOpenings(),
    getConnectFooter(which === "draft"),
  ]);
  const content: PageContent =
    which === "draft" ? page.draft : (page.published ?? CONNECT_PAGE_COPY);
  return {
    content,
    openings,
    footer: { content: footer, siteUrl: SITE_URL },
  };
});
