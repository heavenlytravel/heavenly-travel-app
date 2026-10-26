import type { Metadata } from "next";
import { LocationFrame } from "../../../_location/LocationFrame";
import { LocationPageView } from "../../../_location/LocationPageView";
import { previewPageAt } from "../../../_location/routes";
import { locationMetadata } from "../../../_location/seo";

type Props = PageProps<"/preview/[location]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, page } = await previewPageAt((await params).location);
  return locationMetadata(location, page, true);
}

/**
 * Route: /preview/langkawi. A location's main page as drafted, for staff
 * who hold `locations.manage`: the public page's components over the working
 * draft, in any state. The access check is `previewPageAt`'s. There is no
 * layout here, so the check runs in the page.
 */
export default async function LocationLandingPreview({ params }: Props) {
  const route = await previewPageAt((await params).location);
  return (
    <LocationFrame location={route.location} previewOf={route.page}>
      <LocationPageView {...route} preview />
    </LocationFrame>
  );
}
