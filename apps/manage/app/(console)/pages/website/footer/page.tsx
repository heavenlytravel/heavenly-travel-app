import Link from "next/link";
import {
  HOME_PAGE,
  SITE_PAGE_LABELS,
  isPagePublished,
  isSitePagePublic,
} from "@repo/db";
import {
  SITE_URL,
  getFooter,
  listFooterPublishes,
  listLocationNames,
  listPublicLocationSlugs,
  listSitePageSummaries,
} from "@repo/db/server";
import {
  BackLinkSkeleton,
  CardSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import type { PagePublishEntry } from "../../../../_components/page-editor/PageHistory";
import { requireAdmin } from "../../../../_lib/access";
import {
  WEBSITE_FILTER,
  activityHref,
  pagesHref,
  sitePagePublishHref,
} from "../../../../_lib/routes";
import { sitePagePreviewUrl } from "../../../../_lib/site";
import { FooterEditor } from "./FooterEditor";

/**
 * Route: /pages/website/footer. The editor of the footer every page of the
 * customer site ends with, among the website's pages: the publish bar on
 * top, a card per part, and its publishes for its history. The home page's
 * preview shows its saved draft. SUPER's alone (`website.manage`). See
 * docs/261026-site-footer.md.
 */
export default async function FooterEditorPage() {
  await requireAdmin("website.manage");

  return (
    <Streamed
      fallback={
        <>
          <BackLinkSkeleton />
          <HeaderSkeleton />
          <div className="mt-6 grid gap-6">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={6} />
            <CardSkeleton rows={4} />
          </div>
        </>
      }
    >
      {() => editorDetails()}
    </Streamed>
  );
}

/** The footer in its editor, under a link back to the website's pages on Pages. */
async function editorDetails() {
  const [details, published, summaries, locations, publicSlugs] =
    await Promise.all([
      getFooter(),
      listFooterPublishes(),
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

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={pagesHref({ location: WEBSITE_FILTER })}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          Website pages
        </Link>
      </p>
      <FooterEditor
        draft={details.draft}
        published={details.published}
        publishedAt={details.publishedAt}
        version={details.version}
        pages={summaries.map((summary) => ({
          page: summary.page,
          label: SITE_PAGE_LABELS[summary.page],
          published: isSitePagePublic(
            summary.page,
            isPagePublished(summary.status),
          ),
        }))}
        locations={locations.map((location) => ({
          slug: location.slug,
          name: location.name,
          public: isPublic.has(location.slug),
        }))}
        previewUrl={sitePagePreviewUrl(HOME_PAGE)}
        publishes={publishes}
        historyHref={activityHref("site-page")}
        siteUrl={SITE_URL}
      />
    </>
  );
}
