import {
  ADMIN_URL,
  HOME_PAGE,
  SITE_PAGE_LABELS,
  isHubPage,
  listSitePageSummaries,
  sitePageEditorPath,
  sitePagePreviewPath,
  type SitePageKey,
} from "@repo/db/server";
import { serviceLocationCards, topChoiceCards } from "../_lib/locations";
import { footerDraft, publishedSitePages } from "../_lib/site-pages";
import { HomeView } from "./HomeView";
import { HubView, hubCards } from "./HubView";
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
  const pages = await listSitePageSummaries();
  // Where the page stands, its editor, and the way to every site page.
  const preview = {
    name: SITE_PAGE_LABELS[page],
    standing: shown.status,
    editHref: `${ADMIN_URL}${sitePageEditorPath(page)}`,
    title: "Site pages",
    searchLabel: "Find a site page",
    groups: pages.map(({ page: other, status }) => ({
      href: sitePagePreviewPath(other),
      name: SITE_PAGE_LABELS[other],
      standing: status,
      current: other === page,
      children: [],
    })),
  };
  if (page === HOME_PAGE) {
    return (
      <SiteFrame overlay preview={preview}>
        <HomeView
          content={shown.draft}
          services={hubCards(await publishedSitePages())}
          choices={await topChoiceCards()}
          preview
        />
      </SiteFrame>
    );
  }
  if (isHubPage(page)) {
    return (
      <SiteFrame preview={preview}>
        <HubView
          page={page}
          content={shown.draft}
          locations={await serviceLocationCards(page)}
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
