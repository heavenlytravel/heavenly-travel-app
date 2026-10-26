import type { SitePageKey } from "@repo/db/server";
import { Closing } from "../_home/Sections";
import { HOME_SEARCH_CARD } from "../_lib/search";
import { SiteDocumentView } from "./SiteDocumentView";
import { SiteFrame } from "./SiteFrame";
import { publishedDocumentAt } from "./routes";

/**
 * A published site document in its frame, for its route: /about-us, /terms.
 * A 404 while it is not published. Static: it reads the cached site pages
 * and nothing of the request, so the CDN keeps it until a publish refreshes
 * the `site-pages` tag.
 */
export async function SiteDocumentPage({ page }: { page: SitePageKey }) {
  const shown = await publishedDocumentAt(page);
  return (
    <SiteFrame>
      <SiteDocumentView
        page={page}
        content={shown.content}
        publishedAt={shown.publishedAt}
      />
      <Closing priceHref={HOME_SEARCH_CARD} />
    </SiteFrame>
  );
}
