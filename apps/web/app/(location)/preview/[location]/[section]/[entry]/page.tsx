import type { Metadata } from "next";
import { LocationFrame } from "../../../../../_location/LocationFrame";
import { LocationPageView } from "../../../../../_location/LocationPageView";
import { previewPageAt } from "../../../../../_location/routes";
import { locationMetadata } from "../../../../../_location/seo";

type Props = PageProps<"/preview/[location]/[section]/[entry]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: slug, section, entry } = await params;
  const { location, page } = await previewPageAt(slug, section, entry);
  return locationMetadata(location, page, true);
}

/**
 * Route: /preview/langkawi/popular-places/eagle-square. A page under a
 * section as drafted, published or not, for staff who hold
 * `pages.manage`. The access check is `previewPageAt`'s.
 */
export default async function LocationEntryPreview({ params }: Props) {
  const { location: slug, section, entry } = await params;
  const route = await previewPageAt(slug, section, entry);
  return (
    <LocationFrame location={route.location} previewOf={route.page}>
      <LocationPageView {...route} preview />
    </LocationFrame>
  );
}
