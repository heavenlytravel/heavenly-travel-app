import {
  HOME_PAGE,
  listSitePageSummaries,
  type SitePageKey,
} from "@repo/db/server";
import { topChoiceCards } from "../_lib/locations";
import { footerDraft } from "../_lib/site-pages";
import { HomeView } from "./HomeView";
import { SiteDocumentView } from "./SiteDocumentView";
import { SiteFrame } from "./SiteFrame";
import { previewSitePageAt } from "./routes";

/**
 * A site page as drafted, published or not, for its preview route: at
 * /preview and the page's address, /preview/about-us, and /preview for the
 * home page. For staff who hold `website.manage`: the public page's
 * components over the draft, marking each empty part, the footer's draft,
 * and the preview bar, which reads where every site page stands. The access check is
 * `previewSitePageAt`'s; there is no layout, so it runs here, before
 * anything else is read.
 */
export async function SitePagePreview({ page }: { page: SitePageKey }) {
  const shown = await previewSitePageAt(page);
  const preview = {
    page,
    status: shown.status,
    pages: await listSitePageSummaries(),
  };
  if (page === HOME_PAGE) {
    return (
      <SiteFrame overlay preview={preview}>
        <HomeView
          content={shown.draft}
          choices={await topChoiceCards()}
          preview
        />
      </SiteFrame>
    );
  }
  return (
    <SiteFrame preview={preview}>
      <SiteDocumentView
        page={page}
        content={shown.draft}
        publishedAt={null}
        footer={await footerDraft()}
        preview
      />
    </SiteFrame>
  );
}
