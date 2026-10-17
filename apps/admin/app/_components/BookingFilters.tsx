import Link from "next/link";
import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@repo/db";

/**
 * The status filter above a bookings list, "All" first. `hrefOf` names the
 * list with the status in its address, so the queue across locations and a
 * location's own list share the row.
 */
export function BookingStatusFilter({
  active,
  hrefOf,
}: {
  active: BookingStatus | undefined;
  hrefOf: (status: BookingStatus | undefined) => string;
}) {
  return (
    <nav aria-label="Filter by status" className="flex flex-wrap gap-1">
      <FilterLink href={hrefOf(undefined)} active={active === undefined}>
        All
      </FilterLink>
      {BOOKING_STATUSES.map((status) => (
        <FilterLink
          key={status}
          href={hrefOf(status)}
          active={active === status}
        >
          {BOOKING_STATUS_LABELS[status]}
        </FilterLink>
      ))}
    </nav>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
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

/** What a list says when the filter leaves nothing. */
export function emptyBookingsMessage(filter: BookingStatus | undefined) {
  return filter
    ? `No ${BOOKING_STATUS_LABELS[filter].toLowerCase()} bookings.`
    : "No bookings yet.";
}
