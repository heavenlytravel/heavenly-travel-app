import {
  BOOKING_STATUS_LABELS,
  BOOKING_STATUSES,
  formatLocalDate,
  isBookingStatus,
  pickupInstant,
  searchTermOf,
  type BookingStatus,
} from "@repo/db";
import {
  countBookings,
  listBookings,
  type BookingFilter,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import Link from "next/link";
import { Card } from "@repo/console/Card";
import { FigureTiles, type Figure } from "@repo/console/FigureTiles";
import { PageHeader } from "@repo/console/PageHeader";
import { Streamed, TableSkeleton } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import { BOOKING_TONES } from "@repo/console/StatusBadges";
import { PickupDateFilter } from "../../../_components/BookingFilters";
import { BookingsTable } from "../../../_components/BookingsTable";
import { Pager, pageOf } from "../../../_components/Pager";
import { SearchBox } from "../../../_components/SearchBox";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  bookingsHref,
  DATE_PARAM,
  newBookingHref,
  PAGE_PARAM,
  SEARCH_PARAM,
  type BookingsListFilter,
  type ScopeSlug,
} from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import { ListToolbar } from "../../../_components/ListToolbar";

/** How many bookings a page of the list holds. */
const PAGE_SIZE = 50;

/**
 * Route: /[location]/bookings?status=received&q=…&date=2026-10-29&page=2.
 * The bookings of the scope, newest first: every location's under `~`,
 * with the column of locations, or those with a trip picking up in one
 * location under its slug. Figure tiles count each status and narrow the
 * list to it; the search and the pick-up day narrow the counts and the
 * list alike. A draft location's opens too, though its menu has no row
 * for it. Every team that sees bookings opens it; "New booking" is
 * Reservation's and Sales'.
 */
export default async function BookingsPage({
  params,
  searchParams,
}: PageProps<"/[location]/bookings">) {
  await requireAdmin("bookings.view");
  const scope = await scopeOf(params);
  const query = await searchParams;
  const status = isBookingStatus(query.status) ? query.status : undefined;
  const q = searchTermOf(query[SEARCH_PARAM]) ?? undefined;
  const day = typeof query[DATE_PARAM] === "string" ? query[DATE_PARAM] : "";
  // A pick-up day as the address names it; anything else is any day.
  const pickupOn = pickupInstant(day, "00:00") ?? undefined;
  const date = pickupOn ? day : undefined;
  const filter: BookingsListFilter = {
    status,
    q,
    date,
    page: pageOf(query[PAGE_PARAM]),
  };
  const where: BookingFilter = {
    locationId: scope.location?.id,
    search: q,
    pickupOn,
  };
  const permissions = await getPermissions();
  const narrowed = `${scope.slug ?? "~"}:${q ?? ""}:${date ?? ""}`;

  return (
    <>
      <PageHeader
        title="Bookings"
        action={
          permissions.includes("bookings.create") ? (
            <Button asChild>
              <Link href={newBookingHref(scope.slug)}>
                <PlusIcon className="size-4" />
                New booking
              </Link>
            </Button>
          ) : null
        }
      />
      <Streamed
        key={narrowed}
        fallback={
          <FigureTiles
            label="Bookings by status"
            figures={statusFigures(scope.slug, filter, null)}
          />
        }
      >
        {() => statusTiles(scope.slug, filter, where)}
      </Streamed>
      <Card flush>
        <ListToolbar>
          <SearchBox
            href={bookingsHref(scope.slug, { status, date })}
            value={q ?? ""}
            label="Search bookings"
            placeholder="Reference, name, phone or email"
          />
          <PickupDateFilter
            href={bookingsHref(scope.slug, { status, q })}
            value={date ?? ""}
          />
        </ListToolbar>
        {/* Keyed by the filters, so another filter shows the skeleton, not
            the rows of the one before. */}
        <Streamed
          key={`${narrowed}:${status ?? "all"}:${filter.page ?? 1}`}
          fallback={<TableSkeleton bare columns={scope.slug ? 5 : 6} />}
        >
          {() => bookingsPage(scope.slug, filter, where)}
        </Streamed>
      </Card>
    </>
  );
}

/**
 * The figure tiles: each status, then All, each with its count in the
 * scope, the search and the day, and the list narrowed to it; the one on
 * screen ringed, All when no status is chosen. Without counts, bones.
 */
function statusFigures(
  scope: ScopeSlug,
  filter: BookingsListFilter,
  counts: Record<BookingStatus | "all", number> | null,
): Figure[] {
  const valueOf = (key: BookingStatus | "all") =>
    counts ? counts[key] : <Bone className="h-7 w-10" />;
  const narrow = { q: filter.q, date: filter.date };
  return [
    ...BOOKING_STATUSES.map((status) => ({
      key: status,
      label: BOOKING_STATUS_LABELS[status],
      value: valueOf(status),
      tone: BOOKING_TONES[status],
      href: bookingsHref(scope, { ...narrow, status }),
      current: filter.status === status,
    })),
    {
      key: "all",
      label: "All",
      value: valueOf("all"),
      tone: "neutral" as const,
      href: bookingsHref(scope, narrow),
      current: filter.status === undefined,
    },
  ];
}

async function statusTiles(
  scope: ScopeSlug,
  filter: BookingsListFilter,
  where: BookingFilter,
) {
  const [all, ...byStatus] = await Promise.all([
    countBookings(where),
    ...BOOKING_STATUSES.map((status) => countBookings({ ...where, status })),
  ]);
  const counts = Object.fromEntries(
    BOOKING_STATUSES.map((status, index) => [status, byStatus[index]!]),
  ) as Record<BookingStatus, number>;
  return (
    <FigureTiles
      label="Bookings by status"
      figures={statusFigures(scope, filter, { ...counts, all })}
    />
  );
}

/** What the list says when its filters leave nothing: the search, the day and the status. */
function emptyMessage(filter: BookingsListFilter, pickupOn?: Date) {
  if (filter.q) return `No booking matches “${filter.q}”.`;
  const which = filter.status
    ? `${BOOKING_STATUS_LABELS[filter.status].toLowerCase()} bookings`
    : "bookings";
  if (pickupOn) return `No ${which} pick up on ${formatLocalDate(pickupOn)}.`;
  return filter.status ? `No ${which}.` : "No bookings yet.";
}

/** One page of the bookings the filters leave, with the way to the others. */
async function bookingsPage(
  scope: ScopeSlug,
  filter: BookingsListFilter,
  where: BookingFilter,
) {
  const page = filter.page ?? 1;
  const listed = { ...where, status: filter.status };
  const [bookings, total] = await Promise.all([
    listBookings(listed, { take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    countBookings(listed),
  ]);
  return (
    <>
      <BookingsTable
        bare
        bookings={bookings}
        scope={scope}
        emptyMessage={emptyMessage(filter, where.pickupOn)}
      />
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hrefOf={(next) => bookingsHref(scope, { ...filter, page: next })}
      />
    </>
  );
}
