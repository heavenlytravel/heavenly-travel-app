import Link from "next/link";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  isBookingStatus,
  type BookingStatus,
} from "@repo/db";
import { listBookings } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { BookingsTable } from "../../_components/BookingsTable";
import { PageHeader } from "../../_components/PageHeader";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { bookingsHref, NEW_BOOKING_PATH } from "../../_lib/routes";

/** Route: /bookings?status=received. Every booking, newest first. */
export default async function BookingsPage({
  searchParams,
}: PageProps<"/bookings">) {
  await requireAdmin("bookings.view");
  const { status } = await searchParams;
  const filter = isBookingStatus(status) ? status : undefined;
  const [bookings, permissions] = await Promise.all([
    listBookings({ status: filter }),
    getPermissions(),
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
