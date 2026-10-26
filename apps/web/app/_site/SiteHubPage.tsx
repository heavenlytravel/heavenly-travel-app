import type { HubPage } from "@repo/db/server";
import { serviceLocationCards } from "../_lib/locations";
import { publishedSitePage } from "../_lib/site-pages";
import { HubView } from "./HubView";
import { SiteFrame } from "./SiteFrame";

/**
 * A service's hub in its frame, for its route: /car-with-driver. Public
 * from the start, in the words it was built with until it is published.
 * Static: it reads the cached site pages and locations and nothing of the
 * request.
 */
export async function SiteHubPage({ page }: { page: HubPage }) {
  const [shown, locations] = await Promise.all([
    publishedSitePage(page),
    serviceLocationCards(page),
  ]);
  return (
    <SiteFrame>
      <HubView
        page={page}
        content={shown?.content ?? null}
        locations={locations}
      />
    </SiteFrame>
  );
}
