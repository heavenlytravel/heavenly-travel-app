import type { Metadata } from "next";
import { LocationPageView } from "../../../_location/LocationPageView";
import { publicPageAt } from "../../../_location/routes";
import { locationMetadata } from "../../../_location/seo";

type Props = PageProps<"/[location]/[section]">;

/** Static, rendered on demand, as the main page; see the note there. */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: slug, section } = await params;
  const { location, page } = await publicPageAt(slug, section);
  return locationMetadata(location, page);
}

/**
 * Route: /langkawi/car-with-driver, /langkawi/blog. One file for every
 * section's own page of a location, as published. An unknown section is a
 * 404; a section whose page is not published sends the visitor to the
 * location's main page.
 */
export default async function LocationSectionPage({ params }: Props) {
  const { location: slug, section } = await params;
  const route = await publicPageAt(slug, section);
  return <LocationPageView {...route} />;
}
