import { Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { scopeOf } from "../../../../_lib/scope";
import { BookingSkeleton, bookingScreen } from "./BookingScreen";
import { WARN_PARAM, warningsOf } from "./warnings";

/**
 * Route: /[location]/bookings/[id]. One booking, opened from a bookings
 * list, the dashboard, a staff email (/~/bookings/[id]) or the activity
 * log. After an amend, `?changed=class,time` says what it no longer fits
 * that stays assigned. The same booking opens under `~` and under each location a trip
 * picks up in; under another location it is not found. Every team that
 * sees bookings opens it.
 */
export default async function BookingPage({
  params,
  searchParams,
}: PageProps<"/[location]/bookings/[id]">) {
  await requireAdmin("bookings.view");
  const scope = await scopeOf(params);
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const warn = warningsOf(query[WARN_PARAM]);

  return (
    <Streamed fallback={<BookingSkeleton />}>
      {() => bookingScreen({ id, scope, warn })}
    </Streamed>
  );
}
