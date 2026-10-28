import Link from "next/link";
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
import {
  BackLinkSkeleton,
  CardSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import type { PagePublishEntry } from "../../../_components/page-editor/PageHistory";
import {
  locationHistoryHref,
  locationPublishHref,
  locationPagesHref,
} from "../../../_lib/routes";
import { locationPreviewUrl, locationPublicUrl } from "../../../_lib/site";
import { addressChoicesOf } from "../_lib/address-choices";
import { LocationPageEditor } from "./LocationPageEditor";

/**
 * A location's page in its editor, under a link back to the Pages tab, or
 * to its section's list there: the main page, a section's own, or one
 * under a section. What the editor says
 * about the public is worked out here: a publish shows at once only where
 * the location is public, the section's page published and, on a class's
 * page, the class on sale. Shared by the two editor routes.
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
      ? `Put ${name} on sale here first, on the Vehicle classes tab: its page shows only while it is.`
      : `${name} is no longer offered here. Offer it again on the Vehicle classes tab first.`;
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
      <p className="mb-4 text-sm">
        {/* Back to the section's list where it has one, else to all pages. */}
        <Link
          href={locationPagesHref(location.slug, {
            section: children ? ref.page : undefined,
          })}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          {children ? sectionLabel : "All pages"}
        </Link>
      </p>
      <LocationPageEditor
        target={{ scope: "location", locationId: location.id, ref }}
        kind={kind}
        title={pageTitleOf(ref, name)}
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
        publishes={publishes}
        historyHref={locationHistoryHref(location.slug, "pages")}
        historyLabel="All changes to this location's pages"
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
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {publishBlocked} Its text is kept meanwhile
              {details.published ? ", and its public copy waits" : ""}.
            </p>
          ) : undefined
        }
      />
    </>
  );
}
