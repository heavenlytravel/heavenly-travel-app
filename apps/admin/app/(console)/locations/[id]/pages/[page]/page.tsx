import Link from "next/link";
import {
  LOCATION_PAGE_LABELS,
  isLocationPageKey,
  locationPagePath,
  locationStateOf,
  type LocationPageKey,
} from "@repo/db";
import { getLocationPage } from "@repo/db/server";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../../_components/PageHeader";
import {
  BackLinkSkeleton,
  CardSkeleton,
  DetailSkeleton,
  HeaderSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationHref } from "../../../../../_lib/routes";
import { PreviewLink } from "../../../_components/PreviewLink";
import { PageEditor } from "./PageEditor";

/**
 * Route: /locations/[id]/pages/[page]. The editor of one page of a
 * location, the landing page or a product's: its fields, its images, what
 * it still needs, "Save draft", "Publish" and "Unpublish". "Preview" opens
 * the saved draft on the customer site.
 */
export default async function LocationPageEditorPage({
  params,
}: PageProps<"/locations/[id]/pages/[page]">) {
  await requireAdmin("locations.manage");
  const { id, page } = await params;
  if (!isLocationPageKey(page)) notFound();

  return (
    <Streamed
      fallback={
        <>
          <BackLinkSkeleton />
          <HeaderSkeleton />
          <DetailSkeleton
            main={
              <>
                <CardSkeleton rows={3} />
                <CardSkeleton rows={5} />
                <CardSkeleton rows={4} />
              </>
            }
            side={<CardSkeleton rows={4} />}
          />
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
  const details = await getLocationPage(id, page);
  if (!details) notFound();
  const { location } = details;
  const state = locationStateOf(location.state);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationHref(location.id)}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          {location.name}
        </Link>
      </p>
      <PageHeader
        title={`${LOCATION_PAGE_LABELS[page]} page`}
        description={`${location.name}. Its address on the customer site is ${locationPagePath(location.slug, page)}.`}
        action={<PreviewLink slug={location.slug} page={page} />}
      />

      <div className="mt-6">
        <PageEditor
          locationId={location.id}
          locationState={state}
          page={page}
          draft={details.draft}
          published={details.published}
          publishedAt={details.publishedAt}
          version={details.version}
          addresses={location.addresses.map(({ id, name }) => ({ id, name }))}
        />
      </div>
    </>
  );
}
