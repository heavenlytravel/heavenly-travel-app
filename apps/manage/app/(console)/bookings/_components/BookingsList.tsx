import { countBookings, listBookings } from "@repo/db/server";
import type { ReactNode } from "react";
import {
  BookingStatusFilter,
  emptyBookingsMessage,
} from "../../../_components/BookingFilters";
import { BookingsTable } from "../../../_components/BookingsTable";
import { Pager } from "../../../_components/Pager";
import { SearchBox } from "../../../_components/SearchBox";
import { Streamed, TableSkeleton } from "../../../_components/Skeleton";
import type { BookingsListFilter } from "../../../_lib/routes";

/** How many bookings a page of a list holds. */
const PAGE_SIZE = 50;

/**
 * A bookings list, the queue across locations or a location's own: the
 * status filter, the search by reference, name, phone or email, and the
 * bookings the filters leave, newest first, a page at a time. `hrefOf`
 * names the list with filters in its address; `locationFilter` is the
 * queue's choice of location, beside the search.
 */
export function BookingsList({
  filter,
  hrefOf,
  locationId,
  locationSlug,
  locationFilter,
}: {
  filter: BookingsListFilter;
  hrefOf: (filter: BookingsListFilter) => string;
  /** The location the list is narrowed to, by its tab or by the filter. */
  locationId?: string;
  /** Inside a location: each booking opens there, and the column of locations is left out. */
  locationSlug?: string;
  locationFilter?: ReactNode;
}) {
  const { status, q } = filter;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BookingStatusFilter
          active={status}
          hrefOf={(next) => hrefOf({ status: next, q })}
        />
        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          <SearchBox
            href={hrefOf({ status })}
            value={q ?? ""}
            label="Search bookings"
            placeholder="Reference, name, phone or email"
          />
          {locationFilter}
        </div>
      </div>
      <div className="mt-4">
        {/* Keyed by the filters, so another filter shows the skeleton, not
            the rows of the one before. */}
        <Streamed
          key={`${status ?? "all"}:${locationId ?? "all"}:${q ?? ""}:${filter.page ?? 1}`}
          fallback={<TableSkeleton columns={locationSlug ? 5 : 6} />}
        >
          {() => bookingsPage({ filter, hrefOf, locationId, locationSlug })}
        </Streamed>
      </div>
    </>
  );
}

/** One page of the bookings the filters leave, with the way to the others. */
async function bookingsPage({
  filter,
  hrefOf,
  locationId,
  locationSlug,
}: {
  filter: BookingsListFilter;
  hrefOf: (filter: BookingsListFilter) => string;
  locationId?: string;
  locationSlug?: string;
}) {
  const page = filter.page ?? 1;
  const where = { status: filter.status, locationId, search: filter.q };
  const [bookings, total] = await Promise.all([
    listBookings(where, { take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE }),
    countBookings(where),
  ]);
  return (
    <>
      <BookingsTable
        bookings={bookings}
        showLocation={!locationSlug}
        locationSlug={locationSlug}
        emptyMessage={emptyBookingsMessage(filter.status, filter.q)}
      />
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={total}
        hrefOf={(next) => hrefOf({ ...filter, page: next })}
      />
    </>
  );
}
