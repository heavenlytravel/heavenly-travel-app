import { isBookingStatus, type BookingStatus } from "@repo/db";
import { listBookings } from "@repo/db/server";
import {
  BookingStatusFilter,
  emptyBookingsMessage,
} from "../../../../_components/BookingFilters";
import { BookingsTable } from "../../../../_components/BookingsTable";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { Streamed, TableSkeleton } from "../../../../_components/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { locationBookingsHref } from "../../../../_lib/routes";

/**
 * Route: /locations/[id]/bookings?status=received. The location's
 * bookings, newest first: every booking with a pickup in one of its
 * zones, priced by its rates. The same list and filters as the queue
 * across locations.
 */
export default async function LocationBookingsPage({
  params,
  searchParams,
}: PageProps<"/locations/[id]/bookings">) {
  await requireAdmin("bookings.view");
  const { id } = await params;
  const { status } = await searchParams;
  const filter = isBookingStatus(status) ? status : undefined;

  return (
    <>
      <SectionHeader
        title="Bookings"
        description="Every booking with a pickup in this location. Open one to confirm it, mark it assigned or completed, or cancel it."
      />
      <div className="mt-4">
        <BookingStatusFilter
          active={filter}
          hrefOf={(status) => locationBookingsHref(id, status)}
        />
      </div>
      <div className="mt-4">
        <Streamed
          key={filter ?? "all"}
          fallback={<TableSkeleton columns={6} />}
        >
          {() => bookingsList({ id, filter })}
        </Streamed>
      </div>
    </>
  );
}

async function bookingsList({
  id,
  filter,
}: {
  id: string;
  filter: BookingStatus | undefined;
}) {
  const bookings = await listBookings({ status: filter, locationId: id });
  return (
    <BookingsTable
      bookings={bookings}
      emptyMessage={emptyBookingsMessage(filter)}
    />
  );
}
