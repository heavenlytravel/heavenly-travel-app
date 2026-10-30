import Link from "next/link";
import {
  formatLocalTime,
  isLive,
  itemSummary,
  localDayRange,
  plural,
  todayInMalaysia,
  tripHeadline,
  tripViewOfItem,
} from "@repo/db";
import {
  listBookings,
  type BookingItemWithDetails,
  type BookingWithItems,
  type LocationOverview,
} from "@repo/db/server";
import { CARD_LINK, Card, CardTitle } from "@repo/console/Card";
import { ItemStatusBadge } from "@repo/console/StatusBadges";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
  TwoLines,
} from "@repo/console/Table";
import {
  bookingHref,
  bookingsHref,
  type ScopeSlug,
} from "../../../_lib/routes";
import { PICKUPS, sumOf, type Day } from "./day";

/** How many of today's bookings the dashboard reads for its pick-ups; the rest are a click away. */
const PICKUPS_SHOWN = 8;

/** A trip picking up today, with its booking. */
type Pickup = { booking: BookingWithItems; item: BookingItemWithDetails };

/**
 * Today's pick-ups in the scope, soonest first, a trip each: its time,
 * its booking and where, the trip and its status. A booking with two
 * trips today is on two lines.
 */
export async function todaysPickups(
  { scope, now }: Day,
  overviews: readonly LocationOverview[],
) {
  const bookings = await listBookings(
    { locationId: scope.location?.id, pickupOn: now },
    { order: "soonest", take: PICKUPS_SHOWN },
  );
  const today = localDayRange(now);
  const here = new Set(overviews.map((overview) => overview.id));
  const pickups: Pickup[] = bookings
    .flatMap((booking) =>
      booking.items
        .filter(
          (item) =>
            isLive(item) &&
            item.location !== null &&
            here.has(item.location.id) &&
            item.startsAt >= today.start &&
            item.startsAt < today.end,
        )
        .map((item) => ({ booking, item })),
    )
    .sort((a, b) => a.item.startsAt.getTime() - b.item.startsAt.getTime())
    .slice(0, PICKUPS_SHOWN);

  return (
    <PickupsCard
      scope={scope.slug}
      pickups={pickups}
      total={sumOf(overviews, PICKUPS)}
      todayHref={bookingsHref(scope.slug, { date: todayInMalaysia(now) })}
    />
  );
}

/**
 * The card of today's pick-ups: a line each, the time first, with the
 * way to every booking and, when more pick up today than it lists, to
 * all of them.
 */
function PickupsCard({
  scope,
  pickups,
  total,
  todayHref,
}: {
  scope: ScopeSlug;
  pickups: readonly Pickup[];
  /** Every trip picking up today in the scope, of which these are the first. */
  total: number;
  /** The bookings picking up today. */
  todayHref: string;
}) {
  return (
    <Card flush>
      <CardTitle
        inset
        meta={plural(total, "trip")}
        action={
          <Link href={bookingsHref(scope)} className={CARD_LINK}>
            All bookings →
          </Link>
        }
      >
        Today&apos;s pick-ups
      </CardTitle>
      <Table bare>
        <THead>
          <Th>Time</Th>
          <Th>Booking</Th>
          <Th>Trip</Th>
          <Th>Status</Th>
        </THead>
        <TBody>
          {pickups.length === 0 ? (
            <EmptyRow colSpan={4}>No pick-ups today.</EmptyRow>
          ) : (
            pickups.map(({ booking, item }) => {
              const trip = tripViewOfItem(item);
              return (
                <tr key={item.id}>
                  <Td className="font-semibold whitespace-nowrap text-ink tabular-nums">
                    {formatLocalTime(item.startsAt)}
                  </Td>
                  <Td className="whitespace-nowrap">
                    <TwoLines
                      className="min-w-max"
                      top={
                        <Link
                          href={bookingHref(scope, booking.id)}
                          className="font-semibold text-brand tabular-nums underline-offset-4 hover:underline"
                        >
                          {booking.reference}
                        </Link>
                      }
                      bottom={
                        scope === null
                          ? item.location?.name
                          : booking.contactName
                      }
                    />
                  </Td>
                  <Td>
                    <TwoLines
                      className="max-w-[22rem] min-w-48"
                      top={trip ? tripHeadline(trip) : itemSummary(item)}
                      bottom={trip ? itemSummary(item) : undefined}
                    />
                  </Td>
                  <Td>
                    <ItemStatusBadge status={item.status} />
                  </Td>
                </tr>
              );
            })
          )}
        </TBody>
      </Table>
      {total > pickups.length && pickups.length > 0 ? (
        <p className="flex flex-wrap items-center justify-between gap-2 border-t border-hairline px-5 py-3 text-caption text-muted">
          {pickups.length} of {total} shown
          <Link href={todayHref} className={CARD_LINK}>
            All of today →
          </Link>
        </p>
      ) : null}
    </Card>
  );
}
