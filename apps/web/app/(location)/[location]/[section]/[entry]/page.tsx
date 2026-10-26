import type { Metadata } from "next";
import { LocationPageView } from "../../../../_location/LocationPageView";
import { publicPageAt } from "../../../../_location/routes";
import { locationMetadata } from "../../../../_location/seo";

type Props = PageProps<"/[location]/[section]/[entry]">;

/** Static, rendered on demand, as the main page; see the note there. */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location: slug, section, entry } = await params;
  const { location, page } = await publicPageAt(slug, section, entry);
  return locationMetadata(location, page);
}

/**
 * Route: /langkawi/car-with-driver/sedan, /langkawi/popular-places/eagle-square.
 * A page under a section, as published: a class's, or one Marketing added.
 * A class's page that is not public sends the visitor to its section's
 * page; any other address no public page has is a 404.
 */
export default async function LocationEntryPage({ params }: Props) {
  const { location: slug, section, entry } = await params;
  const route = await publicPageAt(slug, section, entry);
  return <LocationPageView {...route} />;
}
