import { Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../../../_lib/access";
import {
  AmendItemSkeleton,
  amendItemScreen,
} from "../../../../../../bookings/[id]/amend/[itemId]/AmendItemScreen";
import { locationKey } from "../../../../../_lib/location-data";

/**
 * Route: /locations/[slug]/bookings/[id]/amend/[itemId]. The editor of
 * /bookings/[id]/amend/[itemId] inside the location the booking picks up
 * in, so amending it from the location's lists never leaves the location.
 * Reservation and Sales, behind `bookings.manage`.
 */
export default async function LocationAmendItemPage({
  params,
}: PageProps<"/locations/[slug]/bookings/[id]/amend/[itemId]">) {
  await requireAdmin("bookings.manage");
  const { slug, id: bookingId, itemId } = await params;
  const { id } = await locationKey(slug);

  return (
    <Streamed fallback={<AmendItemSkeleton />}>
      {() => amendItemScreen({ id: bookingId, itemId, place: { id, slug } })}
    </Streamed>
  );
}
