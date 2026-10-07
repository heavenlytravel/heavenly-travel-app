import type { Metadata } from "next";
import { LocationPageView } from "../../_location/LocationPageView";
import { publicPageAt } from "../../_location/routes";
import { locationMetadata } from "../../_location/seo";

type Props = PageProps<"/[location]">;

/**
 * No slug is known at build time, so the build reads no database. Having
 * this export makes the page static: each slug is rendered on its first
 * visit and kept at the CDN under the tags of what it read, until the
 * admin refreshes them or the hour passes. So nothing on this route may
 * read the request on the server (`cookies()`, `headers()`, `auth()`): that
 * would make it dynamic again. See docs/261007-location-pages-static.md.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { location, page } = await publicPageAt((await params).location);
  return locationMetadata(location, page);
}

/** Route: /langkawi. A location's landing page, as published. */
export default async function LocationLandingPage({ params }: Props) {
  const route = await publicPageAt((await params).location);
  return <LocationPageView {...route} />;
}
