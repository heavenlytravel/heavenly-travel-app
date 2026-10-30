import {
  FOOTER_LABEL,
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
import { notFound } from "next/navigation";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { EditorHeader } from "../../../../../_components/page-editor/EditorHeader";
import type { PagePublishEntry } from "../../../../../_components/page-editor/PageHistory";
import { requireAdmin } from "../../../../../_lib/access";
import { activityHref, sitePagePublishHref } from "../../../../../_lib/routes";
import { scopeOf } from "../../../../../_lib/scope";
import { sitePagePreviewUrl } from "../../../../../_lib/site";
import { FooterEditor } from "./FooterEditor";

/**
 * Route: /~/pages/website/footer. The editor of the footer every page of
 * the customer site ends with, among the website's pages: the publish bar
 * under its title, a card per part, and its publishes for its history.
 * The home page's preview shows its saved draft. Console-wide: under a
 * slug it is not found. Marketing's and SEO's (`website.manage`). See
 * docs/261026-site-footer.md.
 */
export default async function FooterEditorPage({
  params,
}: PageProps<"/[location]/pages/website/footer">) {
  await requireAdmin("website.manage");
  if ((await scopeOf(params)).slug !== null) notFound();

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
      {() => editorDetails()}
    </Streamed>
  );
}

/** The footer in its editor, under its header. */
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
      <EditorHeader
        where="Website"
        title={FOOTER_LABEL}
        publishes={publishes}
        allHref={activityHref(null, { area: "website" })}
        allLabel="All changes to the site's pages"
      />
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
        siteUrl={SITE_URL}
      />
    </>
  );
}
