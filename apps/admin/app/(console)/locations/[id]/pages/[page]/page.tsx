import Link from "next/link";
import {
  LANDING_PAGE,
  LOCATION_PAGE_LABELS,
  isLocationPageKey,
} from "@repo/db";
import { getLocationPage } from "@repo/db/server";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../../../_components/PageHeader";
import { requireAdmin } from "../../../../../_lib/access";
import { locationHref } from "../../../../../_lib/routes";
import { PageEditor } from "./PageEditor";

/**
 * Route: /locations/[id]/pages/[page]. The editor of one page of a
 * location, the landing page or a product's: its fields, its images, what
 * it still needs, "Save draft" and "Publish".
 */
export default async function LocationPageEditorPage({
  params,
}: PageProps<"/locations/[id]/pages/[page]">) {
  await requireAdmin("locations.manage");
  const { id, page } = await params;
  if (!isLocationPageKey(page)) notFound();
  const details = await getLocationPage(id, page);
  if (!details) notFound();
  const { location } = details;

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
        description={`${location.name}. Its address on the customer site is /${location.slug}${
          page === LANDING_PAGE ? "" : `/${page}`
        }.`}
      />

      <div className="mt-6">
        <PageEditor
          locationId={location.id}
          page={page}
          draft={details.draft}
          published={details.published}
          publishedAt={details.publishedAt}
          version={details.version}
          isOn={details.isOn}
          addresses={location.addresses.map(({ id, name }) => ({ id, name }))}
        />
      </div>
    </>
  );
}
