import type { Metadata } from "next";
import { LocationFrame } from "../../../../_location/LocationFrame";
import { LocationPageView } from "../../../../_location/LocationPageView";
import { previewPageAt } from "../../../../_location/routes";
import { locationMetadata } from "../../../../_location/seo";

type Props = PageProps<"/preview/[location]/[product]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: slug, product } = await params;
  const { location, page } = await previewPageAt(slug, product);
  return locationMetadata(location, page, true);
}

/**
 * Route: /preview/langkawi/car-with-driver. A product's page of a location
 * as drafted, published or not, for staff who hold `locations.manage`. The access
 * check is `previewPageAt`'s.
 */
export default async function LocationProductPreview({ params }: Props) {
  const { location: slug, product } = await params;
  const { location, page } = await previewPageAt(slug, product);
  return (
    <LocationFrame location={location} previewOf={page}>
      <LocationPageView location={location} page={page} preview />
    </LocationFrame>
  );
}
