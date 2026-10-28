import { Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { AmendItemSkeleton, amendItemScreen } from "./AmendItemScreen";

/**
 * Route: /bookings/[id]/amend/[itemId]. One item of a booking in the
 * manual booking's editor, filled in and priced again, while it is
 * received or confirmed. Reservation and Sales, behind `bookings.manage`.
 * Inside a location the same editor is at
 * /locations/[slug]/bookings/[id]/amend/[itemId].
 */
export default async function AmendItemPage({
  params,
}: PageProps<"/bookings/[id]/amend/[itemId]">) {
  await requireAdmin("bookings.manage");
  const { id, itemId } = await params;

  return (
    <Streamed fallback={<AmendItemSkeleton />}>
      {() => amendItemScreen({ id, itemId, place: null })}
    </Streamed>
  );
}
