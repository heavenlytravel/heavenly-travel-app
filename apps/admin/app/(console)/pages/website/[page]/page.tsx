import Link from "next/link";
import {
  HOME_PAGE,
  SITE_PAGE_LABELS,
  checkSitePageUnpublish,
  isSitePageKey,
  sitePageKindOf,
  sitePagePath,
  type SitePageKey,
} from "@repo/db";
import {
  getSitePage,
  listSitePagePublishes,
  listTopChoiceCandidates,
  listTopChoices,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import {
  BackLinkSkeleton,
  CardSkeleton,
  HeaderSkeleton,
  Streamed,
  TileGridSkeleton,
} from "../../../../_components/Skeleton";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { PageEditor } from "../../../../_components/page-editor/PageEditor";
import type { PagePublishEntry } from "../../../../_components/page-editor/PageHistory";
import { requireAdmin } from "../../../../_lib/access";
import {
  WEBSITE_FILTER,
  activityHref,
  pagesHref,
  sitePagePublishHref,
} from "../../../../_lib/routes";
import { sitePagePreviewUrl, sitePagePublicUrl } from "../../../../_lib/site";
import { TopChoiceControl } from "../TopChoiceControl";

/**
 * Route: /pages/website/[page]. The editor of one of the site's own
 * pages, as a location's page is edited: the publish bar on top, the
 * page's content and what search engines and shared links show in two
 * tabs, and its publishes for its history. A site page is public as soon
 * as it is published; the home page stays published once it is, and has
 * its top choices under it, the location cards it shows, which are saved
 * at once. SUPER's alone (`website.manage`).
 */
export default async function SitePageEditorPage({
  params,
}: PageProps<"/pages/website/[page]">) {
  await requireAdmin("website.manage");
  const { page } = await params;
  if (!isSitePageKey(page)) notFound();

  return (
    <Streamed
      fallback={
        <>
          <BackLinkSkeleton />
          <HeaderSkeleton />
          <div className="mt-6 grid gap-6">
            <CardSkeleton rows={1} />
            <CardSkeleton rows={5} />
            <CardSkeleton rows={4} />
          </div>
        </>
      }
    >
      {() => editorDetails({ page })}
    </Streamed>
  );
}

/** The page in its editor, under a link back to the website's pages on Pages. */
async function editorDetails({ page }: { page: SitePageKey }) {
  const [details, published] = await Promise.all([
    getSitePage(page),
    listSitePagePublishes(page),
  ]);
  const label = SITE_PAGE_LABELS[page];
  // This page's publishes, newest first, each opening its before and after.
  const publishes: PagePublishEntry[] = published.map((entry) => ({
    id: entry.id,
    at: entry.createdAt,
    actorName: entry.actorName,
    href: sitePagePublishHref(entry.id),
  }));

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
      <PageEditor
        target={{ scope: "site", page }}
        kind={sitePageKindOf(page)}
        title={label}
        pageName={label}
        path={sitePagePath(page)}
        draft={details.draft}
        published={details.published}
        publishedAt={details.publishedAt}
        version={details.version}
        goesLive="This goes live at once."
        hiddenBecause={null}
        publishBlocked={null}
        canUnpublish={checkSitePageUnpublish(page).ok}
        askBeforeUnpublish
        places={null}
        previewUrl={sitePagePreviewUrl(page)}
        publicUrl={sitePagePublicUrl(page)}
        fallbackTitle={
          page === HOME_PAGE
            ? "Heavenly Travel — Travel made simple"
            : `${label} | Heavenly Travel`
        }
        publishes={publishes}
        historyHref={activityHref("site-page")}
        historyLabel="All changes to the site's pages"
      />
      {page === HOME_PAGE ? (
        <div className="mt-10">
          <SectionHeader
            title="Top choices"
            description="The location cards on the home page, in this order. Each shows the location's name and its main page's tagline and hero image, and opens the location's page. A change here is saved at once, apart from the page's draft."
          />
          <div className="mt-5">
            <Streamed fallback={<TileGridSkeleton min="thirds" />}>
              {() => topChoices()}
            </Streamed>
          </div>
        </div>
      ) : null}
    </>
  );
}

/** The top choices and the locations that could join them. */
async function topChoices() {
  const [choices, candidates] = await Promise.all([
    listTopChoices(),
    listTopChoiceCandidates(),
  ]);
  return <TopChoiceControl choices={choices} candidates={candidates} />;
}
