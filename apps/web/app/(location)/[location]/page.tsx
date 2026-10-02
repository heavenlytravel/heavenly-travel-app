import type { Metadata } from "next";
import { LocationPageView } from "../../_location/LocationPageView";
import { publicPageAt } from "../../_location/routes";
import { locationMetadata } from "../../_location/seo";

type Props = PageProps<"/[location]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, page } = await publicPageAt((await params).location);
  return locationMetadata(location, page);
}

/** Route: /langkawi. A location's landing page, as published. */
export default async function LocationLandingPage({ params }: Props) {
  const route = await publicPageAt((await params).location);
  return <LocationPageView {...route} />;
}
