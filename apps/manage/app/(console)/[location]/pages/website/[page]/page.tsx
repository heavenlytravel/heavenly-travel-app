import {
  HOME_PAGE,
  SITE_PAGE_LABELS,
  checkSitePageUnpublish,
  hasBuiltInCopy,
  isSitePageKey,
  sitePageFallbackTitle,
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
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { SectionHeader } from "@repo/console/SectionHeader";
import {
  CardSkeleton,
  HeaderSkeleton,
  Streamed,
  TileGridSkeleton,
} from "@repo/console/Skeleton";
import { EditorHeader } from "../../../../../_components/page-editor/EditorHeader";
import { PageEditor } from "../../../../../_components/page-editor/PageEditor";
import type { PagePublishEntry } from "../../../../../_components/page-editor/PageHistory";
import { requireAdmin } from "../../../../../_lib/access";
import { activityHref, sitePagePublishHref } from "../../../../../_lib/routes";
import { scopeOf } from "../../../../../_lib/scope";
import {
  sitePagePreviewUrl,
  sitePagePublicUrl,
} from "../../../../../_lib/site";
import { TopChoiceControl } from "../TopChoiceControl";

/**
 * Route: /~/pages/website/[page]. The editor of one of the site's own
 * pages, as a location's page is edited: the publish bar under its title,
 * then the page's content and its SEO, and its publishes for its history.
 * A site page is public as soon as it is published; the home page stays
 * published once it is, and has its top choices under it, the location
 * cards it shows, which are saved at once. Console-wide: under a slug it
 * is not found. Marketing's and SEO's (`website.manage`).
 */
export default async function SitePageEditorPage({
  params,
}: PageProps<"/[location]/pages/website/[page]">) {
  await requireAdmin("website.manage");
  const scope = await scopeOf(params);
  const { page } = await params;
  if (scope.slug !== null || !isSitePageKey(page)) notFound();

  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <div className="grid gap-5">
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

/** The page in its editor, under its header. */
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
      <EditorHeader
        where="Website"
        title={label}
        publishes={publishes}
        allHref={activityHref(null, { area: "website" })}
        allLabel="All changes to the site's pages"
      />
      <PageEditor
        target={{ scope: "site", page }}
        kind={sitePageKindOf(page)}
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
        fallbackTitle={sitePageFallbackTitle(page)}
        unpublishedNote={
          hasBuiltInCopy(page)
            ? "The public sees the page in the words it was built with until you publish."
            : undefined
        }
      />
      {page === HOME_PAGE ? (
        <div className="mt-8 grid gap-4">
          <SectionHeader
            title="Top choices"
            badge={
              <InfoTip text="The location cards on the home page, in this order. Each shows the location's name and its main page's tagline and hero image, and opens the location's page." />
            }
            meta="Saved at once, apart from the page's draft"
          />
          <Streamed fallback={<TileGridSkeleton min="thirds" />}>
            {() => topChoices()}
          </Streamed>
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
