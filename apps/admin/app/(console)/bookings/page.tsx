import Link from "next/link";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  isBookingStatus,
  type BookingStatus,
} from "@repo/db";
import { listBookings } from "@repo/db/server";
import { BookingsTable } from "../../_components/BookingsTable";
import { PageHeader } from "../../_components/PageHeader";
import { requireAdmin } from "../../_lib/access";
import { bookingsHref } from "../../_lib/routes";

/** Route: /bookings?status=received. Every booking, newest first. */
export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = isBookingStatus(status) ? status : undefined;
  const bookings = await listBookings({ status: filter });

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Every booking made on the site. Open one to confirm it, mark it assigned or completed, or cancel it."
      />

      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-1">
        <FilterLink status={undefined} active={filter === undefined}>
          All
        </FilterLink>
        {BOOKING_STATUSES.map((s) => (
          <FilterLink key={s} status={s} active={filter === s}>
            {BOOKING_STATUS_LABELS[s]}
          </FilterLink>
        ))}
      </nav>

      <div className="mt-4">
        <BookingsTable
          bookings={bookings}
          emptyMessage={
            filter
              ? `No ${BOOKING_STATUS_LABELS[filter].toLowerCase()} bookings.`
              : "No bookings yet."
          }
        />
      </div>
    </>
  );
}

function FilterLink({
  status,
  active,
  children,
}: {
  status: BookingStatus | undefined;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={bookingsHref(status)}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
      }`}
    >
      {children}
    </Link>
  );
}
