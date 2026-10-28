import {
  BOOKING_STATUSES,
  BOOKING_STATUS_LABELS,
  type BookingStatus,
} from "@repo/db";
import { FilterLinks } from "./FilterLinks";

const STATUS_OPTIONS = BOOKING_STATUSES.map((status) => ({
  value: status,
  label: BOOKING_STATUS_LABELS[status],
}));

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
    <FilterLinks
      label="Filter by status"
      options={STATUS_OPTIONS}
      active={active}
      hrefOf={hrefOf}
    />
  );
}

/** What a list says when its filters leave nothing: the status, and the search when there is one. */
export function emptyBookingsMessage(
  filter: BookingStatus | undefined,
  search?: string,
) {
  if (search) return `No booking matches “${search}”.`;
  return filter
    ? `No ${BOOKING_STATUS_LABELS[filter].toLowerCase()} bookings.`
    : "No bookings yet.";
}
