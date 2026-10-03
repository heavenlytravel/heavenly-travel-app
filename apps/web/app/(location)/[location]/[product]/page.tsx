import type { Metadata } from "next";
import { LocationPageView } from "../../../_location/LocationPageView";
import { publicPageAt } from "../../../_location/routes";
import { locationMetadata } from "../../../_location/seo";

type Props = PageProps<"/[location]/[product]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: slug, product } = await params;
  const { location, page } = await publicPageAt(slug, product);
  return locationMetadata(location, page);
}

/**
 * Route: /langkawi/car-with-driver. One file for every product's page of a
 * location, as published. An unknown product is a 404; a product whose page
 * is not published sends the visitor to the location's landing page.
 */
export default async function LocationProductPage({ params }: Props) {
  const { location: slug, product } = await params;
  const route = await publicPageAt(slug, product);
  return <LocationPageView {...route} />;
}
