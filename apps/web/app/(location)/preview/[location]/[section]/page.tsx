import type { Metadata } from "next";
import { LocationFrame } from "../../../../_location/LocationFrame";
import { LocationPageView } from "../../../../_location/LocationPageView";
import { previewPageAt } from "../../../../_location/routes";
import { locationMetadata } from "../../../../_location/seo";

type Props = PageProps<"/preview/[location]/[section]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: slug, section } = await params;
  const { location, page } = await previewPageAt(slug, section);
  return locationMetadata(location, page, true);
}

/**
 * Route: /preview/langkawi/car-with-driver. A section's own page of a
 * location as drafted, published or not, for staff who hold
 * `pages.manage`. The access check is `previewPageAt`'s.
 */
export default async function LocationSectionPreview({ params }: Props) {
  const { location: slug, section } = await params;
  const route = await previewPageAt(slug, section);
  return (
    <LocationFrame location={route.location} previewOf={route.page}>
      <LocationPageView {...route} preview />
    </LocationFrame>
  );
}
