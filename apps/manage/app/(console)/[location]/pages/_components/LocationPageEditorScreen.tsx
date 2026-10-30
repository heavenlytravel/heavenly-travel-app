import {
  LANDING_PAGE,
  SECTIONS,
  checkPageUnpublish,
  childrenOf,
  isChildPage,
  isEntrySlugLocked,
  isPublicState,
  locationPageFallbackTitle,
  locationPagePath,
  locationStateOf,
  pageNameOf,
  pageTitleOf,
  type LocationPageRef,
} from "@repo/db";
import { getLocationPage, listPagePublishes } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Notice } from "@repo/ui/notice";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { RecordLink } from "@repo/console/PageHeader";
import { EditorHeader } from "../../../../_components/page-editor/EditorHeader";
import type { PagePublishEntry } from "../../../../_components/page-editor/PageHistory";
import {
  activityHref,
  locationPublishHref,
  pagesHref,
} from "../../../../_lib/routes";
import { locationPreviewUrl, locationPublicUrl } from "../../../../_lib/site";
import { addressChoicesOf } from "../../../../_lib/address-choices";
import { LocationPageEditor } from "./LocationPageEditor";

/**
 * A location's page in its editor: the main page, a section's own, or one
 * under a section. Its header leads back to Pages, or to its section's
 * list there, names the location and the section over the page's name,
 * and opens its publish history. What the editor says about the public is
 * worked out here: a publish shows at once only where the location is
 * public, the section's page published and, on a class's page, the class
 * on sale. Shared by the two editor routes.
 */
export function LocationPageEditorScreen({
  id,
  pageRef,
}: {
  id: string;
  pageRef: LocationPageRef;
}) {
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
      {() => editorDetails(id, pageRef)}
    </Streamed>
  );
}

async function editorDetails(id: string, ref: LocationPageRef) {
  const [details, published] = await Promise.all([
    getLocationPage(id, ref),
    listPagePublishes(id, ref),
  ]);
  if (!details) notFound();
  const { location, kind, name, vehicleClass } = details;
  const state = locationStateOf(location.state);
  const sectionLabel =
    ref.page === LANDING_PAGE ? "" : SECTIONS[ref.page].label;
  const children = childrenOf(ref.page);
  const onSale = kind !== "class" || vehicleClass?.onSale === true;

  // Why a published page is not seen yet, if it is not.
  const hiddenBecause = !isPublicState(state)
    ? "The public sees it once the location is live."
    : isChildPage(ref) && !details.sectionPublished
      ? `The public sees it once the ${sectionLabel} page is published.`
      : !onSale
        ? `The public sees it while ${name} is on sale here.`
        : null;
  const publishBlocked = onSale
    ? null
    : vehicleClass
      ? `Put ${name} on sale here first, on Classes under Fleet: its page shows only while it is.`
      : `${name} is no longer offered here. Offer it again on Classes under Fleet first.`;
  // This page's publishes, newest first, each opening its before and after.
  const publishes: PagePublishEntry[] = published.map((entry) => ({
    id: entry.id,
    at: entry.createdAt,
    actorName: entry.actorName,
    href: locationPublishHref(location.slug, entry.id),
  }));
  const isLive = hiddenBecause === null;

  return (
    <>
      <EditorHeader
        // A page under a section links to the section's list.
        where={
          isChildPage(ref) ? (
            <>
              {location.name} ·{" "}
              {children ? (
                <RecordLink
                  href={pagesHref(location.slug, { section: ref.page })}
                >
                  {sectionLabel}
                </RecordLink>
              ) : (
                sectionLabel
              )}
            </>
          ) : (
            location.name
          )
        }
        title={pageTitleOf(ref, name)}
        publishes={publishes}
        allHref={activityHref(location.slug, { kind: "pages" })}
        allLabel="All changes to this location's pages"
      />
      <LocationPageEditor
        target={{ scope: "location", locationId: location.id, ref }}
        kind={kind}
        pageName={pageNameOf(ref, name)}
        path={locationPagePath(location.slug, ref)}
        draft={details.draft}
        published={details.published}
        publishedAt={details.publishedAt}
        version={details.version}
        goesLive={
          isLive ? `${location.name} is public: this goes live at once.` : null
        }
        hiddenBecause={hiddenBecause}
        publishBlocked={publishBlocked}
        canUnpublish={checkPageUnpublish(state, ref).ok}
        askBeforeUnpublish={isLive}
        places={{
          locationId: location.id,
          ...addressChoicesOf(location),
        }}
        previewUrl={locationPreviewUrl(location.slug, ref)}
        publicUrl={locationPublicUrl(location.slug, ref)}
        fallbackTitle={locationPageFallbackTitle(location.name, ref, name)}
        entry={
          isChildPage(ref) && children?.type === "entries"
            ? {
                locationId: location.id,
                locationSlug: location.slug,
                page: ref.page,
                slug: ref.slug,
                slugLocked: isEntrySlugLocked(details),
                one: children.one,
                isPublic: isLive && details.published !== null,
              }
            : undefined
        }
        notice={
          publishBlocked ? (
            <Notice>
              {publishBlocked} Its text is kept meanwhile
              {details.published ? ", and its public copy waits" : ""}.
            </Notice>
          ) : undefined
        }
      />
    </>
  );
}
