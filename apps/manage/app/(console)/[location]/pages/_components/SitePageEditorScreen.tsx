import {
  HOME_PAGE,
  PAGE_KIND_RULES,
  SITE_PAGES,
  SITE_PAGE_LABELS,
  checkSitePageUnpublish,
  hasBuiltInCopy,
  isHubPage,
  isPagePublished,
  isSitePagePublic,
  isWebsitePageKey,
  sitePageAppOf,
  sitePageFallbackTitle,
  sitePageKindOf,
  type SitePageKey,
} from "@repo/db";
import {
  getSitePage,
  listBlogPostSummaries,
  listClassOptions,
  listLocationNames,
  listPublicLocationSlugs,
  listSitePagePublishes,
  listSitePageSummaries,
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
import type { SectionData } from "../../../../_components/page-editor/sections/data";
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
  const [details, published, sectionData] = await Promise.all([
    getSitePage(page),
    listSitePagePublishes(page),
    PAGE_KIND_RULES[sitePageKindOf(page)].sections
      ? sectionDataOf(page)
      : undefined,
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
        sectionData={sectionData}
        unpublishedNote={
          hasBuiltInCopy(page)
            ? "The public sees the page in the words it was built with until you publish."
            : undefined
        }
      />
      {page === HOME_PAGE ? (
        <div className="mt-8 grid gap-4">
          <SectionHeader
            title="Top Choices"
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

/**
 * What a page's sections pick from: where a service card may lead, each
 * marked where the public cannot open it; the class catalogue, a hub's
 * own service's alone; and the other pages with sections, from their
 * saved drafts, for "Copy From…".
 */
async function sectionDataOf(page: SitePageKey): Promise<SectionData> {
  const otherPages = SITE_PAGES.filter(
    (other) =>
      other !== page && PAGE_KIND_RULES[sitePageKindOf(other)].sections,
  );
  const [summaries, locations, publicSlugs, posts, classes, others] =
    await Promise.all([
      listSitePageSummaries(),
      listLocationNames(),
      listPublicLocationSlugs(),
      listBlogPostSummaries(),
      listClassOptions(),
      Promise.all(otherPages.map((other) => getSitePage(other))),
    ]);
  const isPublic = new Set(publicSlugs);
  return {
    choices: {
      pages: summaries.flatMap(({ page: key, status }) =>
        isWebsitePageKey(key)
          ? [
              {
                page: key,
                label: SITE_PAGE_LABELS[key],
                published: isSitePagePublic(key, isPagePublished(status)),
              },
            ]
          : [],
      ),
      locations: locations.map((location) => ({
        slug: location.slug,
        name: location.name,
        public: isPublic.has(location.slug),
      })),
      posts: posts.map((post) => ({
        slug: post.slug,
        title: post.title,
        published: isPagePublished(post.status),
      })),
    },
    classes,
    classCategory: isHubPage(page) ? page : null,
    others: others.map((other) => ({
      label: SITE_PAGE_LABELS[other.page],
      sections: other.draft.sections,
    })),
  };
}

/** The top choices and the locations that could join them. */
async function topChoices() {
  const [choices, candidates] = await Promise.all([
    listTopChoices(),
    listTopChoiceCandidates(),
  ]);
  return <TopChoiceControl choices={choices} candidates={candidates} />;
}
