import { Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";
import { AssignSkeleton, assignScreen } from "./AssignScreen";

/**
 * Route: /[location]/bookings/[id]/assign. Who does each confirmed trip of
 * a booking: its vehicle and its driver, the same for every trip or
 * chosen per trip. Opens under `~` and under any location a trip of the
 * booking picks up in. Operation's, behind `bookings.fulfil`.
 */
export default async function AssignPage({
  params,
}: PageProps<"/[location]/bookings/[id]/assign">) {
  await requireAdmin("bookings.fulfil");
  const scope = await scopeOf(params);
  const { id } = await params;

  return (
    <Streamed fallback={<AssignSkeleton />}>
      {() => assignScreen({ id, scope })}
    </Streamed>
  );
}
