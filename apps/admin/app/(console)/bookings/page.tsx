import Link from "next/link";
import { isBookingStatus, type BookingStatus } from "@repo/db";
import { listBookings, listLocationNames } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import {
  BookingStatusFilter,
  emptyBookingsMessage,
} from "../../_components/BookingFilters";
import { BookingsTable } from "../../_components/BookingsTable";
import { PageHeader } from "../../_components/PageHeader";
import { Streamed, TableSkeleton } from "../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { bookingsHref, NEW_BOOKING_PATH } from "../../_lib/routes";
import { LocationFilter } from "./LocationFilter";

/**
 * Route: /bookings?status=received&location=…. The queue across locations,
 * newest first, narrowed by status, by location, or both. A location's own
 * list is its Bookings tab.
 */
export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  await requireAdmin("bookings.view");
  const { status, location } = await searchParams;
  const filter = isBookingStatus(status) ? status : undefined;
  const locationId =
    typeof location === "string" && location ? location : undefined;
  const [permissions, locations] = await Promise.all([
    getPermissions(),
    listLocationNames(),
  ]);

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking, made on the site or entered here. Open one to confirm it, mark it assigned or completed, or cancel it."
        action={
          permissions.includes("bookings.create") ? (
            <Button asChild>
              <Link href={NEW_BOOKING_PATH}>New booking</Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <BookingStatusFilter
          active={filter}
          hrefOf={(status) => bookingsHref({ status, location: locationId })}
        />
        <LocationFilter
          locations={locations}
          value={locationId ?? ""}
          status={filter}
        />
      </div>

      <div className="mt-4">
        {/* Keyed by the filter, so another filter shows the skeleton, not
            the rows of the one before. */}
        <Streamed
          key={`${filter ?? "all"}:${locationId ?? "all"}`}
          fallback={<TableSkeleton columns={7} />}
        >
          {() => bookingsList({ filter, locationId })}
        </Streamed>
      </div>
    </>
  );
}

/** The bookings the filters leave, newest first. */
async function bookingsList({
  filter,
  locationId,
}: {
  filter: BookingStatus | undefined;
  locationId: string | undefined;
}) {
  const bookings = await listBookings({ status: filter, locationId });
  return (
    <BookingsTable
      bookings={bookings}
      showLocation
      emptyMessage={emptyBookingsMessage(filter)}
    />
  );
}
