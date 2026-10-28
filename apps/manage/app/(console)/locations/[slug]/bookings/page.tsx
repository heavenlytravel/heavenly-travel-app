import { isBookingStatus, searchTermOf } from "@repo/db";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { pageOf } from "../../../../_components/Pager";
import { requireAdmin } from "../../../../_lib/access";
import {
  locationBookingsHref,
  PAGE_PARAM,
  SEARCH_PARAM,
} from "../../../../_lib/routes";
import { BookingsList } from "../../../bookings/_components/BookingsList";
import { locationKey } from "../../_lib/location-data";

/**
 * Route: /locations/[slug]/bookings?status=received&q=…&page=2. The
 * location's bookings, newest first: every booking with a pickup in one
 * of its zones, priced by its rates. The same list, filters and search as
 * the queue across locations; a booking opens inside the location.
 */
export default async function LocationBookingsPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/bookings">) {
  await requireAdmin("bookings.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const query = await searchParams;
  const status = isBookingStatus(query.status) ? query.status : undefined;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  const page = pageOf(query[PAGE_PARAM]);

  return (
    <>
      <SectionHeader
        title="Bookings"
        description="Every booking with a pickup in this location. Open one to confirm it, mark it assigned or completed, or cancel it."
      />
      <div className="mt-4">
        <BookingsList
          filter={{ status, q, page }}
          hrefOf={(filter) => locationBookingsHref(slug, filter)}
          locationId={id}
          locationSlug={slug}
        />
      </div>
    </>
  );
}
