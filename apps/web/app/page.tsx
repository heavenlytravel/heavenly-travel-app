/**
 * Heavenly Travel — home page
 * Route: /
 * The home page's content is Marketing's, from the published home page;
 * until that is first published it shows what it was designed with. The
 * location cards are Marketing's top choices and open their pages. Its
 * pieces live in ./_site and ./_home. Static: it reads the cached site
 * pages and top choices, and nothing of the request. Above the
 * destinations, the services each open their hub.
 */

import type { Metadata } from "next";
import {
  HOME_PAGE,
  sitePageFallbackTitle,
  sitePagePath,
} from "@repo/db/server";
import { topChoiceCards } from "./_lib/locations";
import { pageMetadata } from "./_lib/seo";
import { publishedSitePages } from "./_lib/site-pages";
import { HOME_DEFAULTS, HomeView } from "./_site/HomeView";
import { hubCards } from "./_site/HubView";
import { SiteFrame } from "./_site/SiteFrame";

export async function generateMetadata(): Promise<Metadata> {
  const home = (await publishedSitePages())[HOME_PAGE];
  if (!home) {
    return {
      title: sitePageFallbackTitle(HOME_PAGE),
      description: HOME_DEFAULTS.description,
    };
  }
  return pageMetadata(home.content, {
    path: sitePagePath(HOME_PAGE),
    fallbackTitle: sitePageFallbackTitle(HOME_PAGE),
  });
}

export default async function Page() {
  const [pages, choices] = await Promise.all([
    publishedSitePages(),
    topChoiceCards(),
  ]);
  return (
    <SiteFrame overlay>
      <HomeView
        content={pages[HOME_PAGE]?.content ?? null}
        services={hubCards(pages)}
        choices={choices}
      />
    </SiteFrame>
  );
}
