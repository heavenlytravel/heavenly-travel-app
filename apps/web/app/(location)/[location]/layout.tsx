import { LocationFrame } from "../../_location/LocationFrame";
import { publicLocationAt } from "../../_location/routes";

/**
 * The frame of a location's public pages: /langkawi and the product pages
 * under it. It holds the search card's state, so what was typed stays from
 * page to page. A slug the public sees no location at is a 404. See
 * docs/261001-locations-and-pages.md.
 */
export default async function LocationLayout({
  params,
  children,
}: LayoutProps<"/[location]">) {
  const location = await publicLocationAt((await params).location);
  return <LocationFrame location={location}>{children}</LocationFrame>;
}
