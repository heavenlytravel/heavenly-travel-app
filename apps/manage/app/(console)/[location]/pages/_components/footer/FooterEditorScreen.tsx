import {
  CONNECT_PAGE,
  FOOTER_KEY,
  FOOTER_LABEL,
  HOME_PAGE,
  SITE_PAGE_LABELS,
  footerAppOf,
  footerEditorPath,
  isPagePublished,
  isSitePagePublic,
  isWebsitePageKey,
  type FooterKey,
} from "@repo/db";
import {
  SITE_URL,
  getFooter,
  listFooterPublishes,
  listLocationNames,
  listPublicLocationSlugs,
  listSitePageSummaries,
} from "@repo/db/server";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { EditorHeader } from "../../../../../_components/page-editor/EditorHeader";
import type { PagePublishEntry } from "../../../../../_components/page-editor/PageHistory";
import { activityHref, sitePagePublishHref } from "../../../../../_lib/routes";
import { sitePagePreviewUrl } from "../../../../../_lib/site";
import { FooterEditor } from "./FooterEditor";

/**
 * A footer's editor, among its app's pages: the publish bar under its
 * title, a card per part, and its publishes for its history. The
 * website's is on every page of the customer site, and the home page's
 * preview shows its saved draft. Connect's is on its landing page, whose
 * preview shows it; it can show the website's in place of its own. Each
 * route checks the access and the scope first. See
 * docs/261026-site-footer.md.
 */
export function FooterEditorScreen({ footerKey }: { footerKey: FooterKey }) {
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <div className="grid gap-5">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={6} />
            <CardSkeleton rows={4} />
          </div>
        </>
      }
    >
      {() => editorDetails(footerKey)}
    </Streamed>
  );
}

/** The footer in its editor, under its header. */
async function editorDetails(footerKey: FooterKey) {
  const [details, published, summaries, locations, publicSlugs] =
    await Promise.all([
      getFooter(footerKey),
      listFooterPublishes(footerKey),
      listSitePageSummaries(),
      listLocationNames(),
      listPublicLocationSlugs(),
    ]);
  // Its publishes, newest first, each opening its before and after.
  const publishes: PagePublishEntry[] = published.map((entry) => ({
    id: entry.id,
    at: entry.createdAt,
    actorName: entry.actorName,
    href: sitePagePublishHref(entry.id),
  }));
  const isPublic = new Set(publicSlugs);
  const app = footerAppOf(footerKey);

  return (
    <>
      <EditorHeader
        where={app === "connect" ? "Connect" : "Website"}
        title={FOOTER_LABEL}
        publishes={publishes}
        allHref={activityHref(null, { area: "website" })}
        allLabel="All changes to the site's pages"
      />
      <FooterEditor
        footerKey={footerKey}
        draft={details.draft}
        published={details.published}
        publishedAt={details.publishedAt}
        version={details.version}
        pages={summaries.flatMap(({ page, status }) =>
          // A footer links the customer site's pages, from Connect too.
          isWebsitePageKey(page)
            ? [
                {
                  page,
                  label: SITE_PAGE_LABELS[page],
                  published: isSitePagePublic(page, isPagePublished(status)),
                },
              ]
            : [],
        )}
        locations={locations.map((location) => ({
          slug: location.slug,
          name: location.name,
          public: isPublic.has(location.slug),
        }))}
        previewUrl={sitePagePreviewUrl(
          app === "connect" ? CONNECT_PAGE : HOME_PAGE,
        )}
        siteUrl={SITE_URL}
        websiteFooterHref={footerEditorPath(FOOTER_KEY)}
      />
    </>
  );
}
