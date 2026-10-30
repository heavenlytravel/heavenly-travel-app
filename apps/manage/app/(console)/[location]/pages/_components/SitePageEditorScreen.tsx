import {
  HOME_PAGE,
  SITE_PAGE_LABELS,
  checkSitePageUnpublish,
  hasBuiltInCopy,
  sitePageAppOf,
  sitePageFallbackTitle,
  sitePageKindOf,
  type SitePageKey,
} from "@repo/db";
import {
  getSitePage,
  listSitePagePublishes,
  listTopChoiceCandidates,
  listTopChoices,
} from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { SectionHeader } from "@repo/console/SectionHeader";
import {
  CardSkeleton,
  HeaderSkeleton,
  Streamed,
  TileGridSkeleton,
} from "@repo/console/Skeleton";
import { EditorHeader } from "../../../../_components/page-editor/EditorHeader";
import { PageEditor } from "../../../../_components/page-editor/PageEditor";
import type { PagePublishEntry } from "../../../../_components/page-editor/PageHistory";
import { activityHref, sitePagePublishHref } from "../../../../_lib/routes";
import {
  sitePagePreviewUrl,
  sitePagePublicUrl,
  sitePageShownPath,
} from "../../../../_lib/site";
import { TopChoiceControl } from "../website/TopChoiceControl";

/**
 * The editor of one of the site's own pages, as a location's page is
 * edited: the publish bar under its title, then the page's content and its
 * SEO, and its publishes for its history. The website's pages open it
 * under /~/pages/website, Connect's under /~/pages/connect; each route
 * checks the access first.
 */
export function SitePageEditorScreen({ page }: { page: SitePageKey }) {
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
        where={sitePageAppOf(page) === "connect" ? "Connect" : "Website"}
        title={label}
        publishes={publishes}
        allHref={activityHref(null, { area: "website" })}
        allLabel="All changes to the site's pages"
      />
      <PageEditor
        target={{ scope: "site", page }}
        kind={sitePageKindOf(page)}
        pageName={label}
        path={sitePageShownPath(page)}
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
