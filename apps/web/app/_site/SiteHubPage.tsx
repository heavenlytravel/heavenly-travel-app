import type { HubPage } from "@repo/db/server";
import { publishedSitePage } from "../_lib/site-pages";
import { sectionDataOf } from "../_sections/data";
import { HubView } from "./HubView";
import { SiteFrame } from "./SiteFrame";

/**
 * A service's hub in its frame, for its route: /car-with-driver. Public
 * from the start, in the words it was built with until it is published.
 * Static: it reads the cached site pages and what its sections show, and
 * nothing of the request.
 */
export async function SiteHubPage({ page }: { page: HubPage }) {
  const content = (await publishedSitePage(page))?.content ?? null;
  const sections = await sectionDataOf(content, page);
  return (
    <SiteFrame>
      <HubView page={page} content={content} sections={sections} />
    </SiteFrame>
  );
}
