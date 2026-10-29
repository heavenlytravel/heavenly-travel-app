import { Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../../_lib/access";
import { scopeOf } from "../../../../../../_lib/scope";
import { AmendItemSkeleton, amendItemScreen } from "./AmendItemScreen";

/**
 * Route: /[location]/bookings/[id]/amend/[itemId]. One trip of a booking
 * in the manual booking's steps, filled in and priced again, while it is
 * received or confirmed. Opens under `~` and under any location a trip of
 * the booking picks up in. Reservation and Sales, behind
 * `bookings.manage`.
 */
export default async function AmendItemPage({
  params,
}: PageProps<"/[location]/bookings/[id]/amend/[itemId]">) {
  await requireAdmin("bookings.manage");
  const scope = await scopeOf(params);
  const { id, itemId } = await params;

  return (
    <Streamed fallback={<AmendItemSkeleton />}>
      {() => amendItemScreen({ id, itemId, scope })}
    </Streamed>
  );
}
