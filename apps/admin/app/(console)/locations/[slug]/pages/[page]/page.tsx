import Link from "next/link";
import {
  isLocationPageKey,
  locationPagePath,
  locationStateOf,
  pageTitleOf,
  type LocationPageKey,
} from "@repo/db";
import { getLocationPage, listActivityForMany } from "@repo/db/server";
import { notFound } from "next/navigation";
import {
  BackLinkSkeleton,
  HeaderSkeleton,
  CardSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import {
  locationHistoryHref,
  locationPublishHref,
  locationTabHref,
} from "../../../../../_lib/routes";
import {
  locationPreviewUrl,
  locationPublicUrl,
} from "../../../../../_lib/site";
import { locationKey } from "../../../_lib/location-data";
import { PageEditor } from "./PageEditor";
import type { PagePublishEntry } from "./PageHistory";

/**
 * Route: /locations/[slug]/pages/[page]. The editor of one page of a
 * location, its main page or a product's: the publish bar on top, the
 * page's content and what search engines and shared links show in two
 * tabs, and the page's publishes for its history.
 */
export default async function LocationPageEditorPage({
  params,
}: PageProps<"/locations/[slug]/pages/[page]">) {
  await requireAdmin("locations.manage");
  const { slug, page } = await params;
  const { id } = await locationKey(slug);
  if (!isLocationPageKey(page)) notFound();

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
      {() => pageEditorDetails({ id, page })}
    </Streamed>
  );
}

/** The page in its editor, under the location it belongs to. */
async function pageEditorDetails({
  id,
  page,
}: {
  id: string;
  page: LocationPageKey;
}) {
  const [details, history] = await Promise.all([
    getLocationPage(id, page),
    listActivityForMany([{ entityType: "location", entityId: id }]),
  ]);
  if (!details) notFound();
  const { location } = details;
  const state = locationStateOf(location.state);
  // This page's publishes, newest first, each with its before and after.
  const publishes: PagePublishEntry[] = history
    .filter(
      (entry) =>
        entry.action === "location.page.published" &&
        (entry.after as { page?: unknown } | null)?.page === page,
    )
    .reverse()
    .map((entry) => ({
      id: entry.id,
      at: entry.createdAt,
      actorName: entry.actorName,
      href: locationPublishHref(location.slug, entry.id),
    }));

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationTabHref(location.slug, "pages")}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All pages
        </Link>
      </p>
      <PageEditor
        title={pageTitleOf(page)}
        path={locationPagePath(location.slug, page)}
        locationId={location.id}
        locationSlug={location.slug}
        locationName={location.name}
        locationState={state}
        page={page}
        draft={details.draft}
        published={details.published}
        publishedAt={details.publishedAt}
        version={details.version}
        addresses={location.addresses.map(({ id, name }) => ({ id, name }))}
        previewUrl={locationPreviewUrl(location.slug, page)}
        publicUrl={locationPublicUrl(location.slug, page)}
        publishes={publishes}
        historyHref={locationHistoryHref(location.slug, "pages")}
      />
    </>
  );
}
