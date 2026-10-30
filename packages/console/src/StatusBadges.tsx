import {
  BOOKING_STATUS_LABELS,
  ITEM_STATUS_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  VENDOR_STATUS_LABELS,
  isBookingStatus,
  isItemStatus,
  isLocationState,
  isVendorStatus,
  type BookingStatus,
  type ItemStatus,
  type LocationState,
  type PageStatus,
  type VendorStatus,
} from "@repo/db";
import { Badge, type BadgeTone } from "@repo/ui/badge";

/**
 * The status chips, one colour per status, the same on every screen of
 * both apps (the customer site shows a booking's status with these too):
 * received waits (amber), confirmed is agreed (brand blue), a driver
 * assigned is in hand (navy), completed is done (green), and cancelled has
 * stepped aside (grey). Red is never a status: it is kept for a real
 * problem.
 */
export const ITEM_TONES: Record<ItemStatus, BadgeTone> = {
  received: "amber",
  confirmed: "brand",
  assigned: "navy",
  completed: "green",
  cancelled: "neutral",
};

export const BOOKING_TONES: Record<BookingStatus, BadgeTone> = {
  received: "amber",
  confirmed: "brand",
  completed: "green",
  cancelled: "neutral",
};

/** A booking's summary status, as stored on the booking. */
export function BookingStatusBadge({ status }: { status: string }) {
  if (!isBookingStatus(status)) return <Badge>{status}</Badge>;
  return (
    <Badge dot tone={BOOKING_TONES[status]}>
      {BOOKING_STATUS_LABELS[status]}
    </Badge>
  );
}

/** One item's status, which is where ops does its work. */
export function ItemStatusBadge({ status }: { status: string }) {
  if (!isItemStatus(status)) return <Badge>{status}</Badge>;
  return (
    <Badge dot tone={ITEM_TONES[status]}>
      {ITEM_STATUS_LABELS[status]}
    </Badge>
  );
}

export const LOCATION_TONES: Record<LocationState, BadgeTone> = {
  draft: "neutral",
  live: "green",
  paused: "amber",
};

/** What the public sees of a location: nothing yet, the pages, or the pages with a notice. */
export function LocationStateBadge({ state }: { state: string }) {
  if (!isLocationState(state)) return <Badge>{state}</Badge>;
  return (
    <Badge dot tone={LOCATION_TONES[state]}>
      {LOCATION_STATE_LABELS[state]}
    </Badge>
  );
}

export const PAGE_TONES: Record<PageStatus, BadgeTone> = {
  unpublished: "neutral",
  published: "green",
  changed: "amber",
};

/**
 * Where a location's page stands: not published, published, or published
 * with edits waiting in the draft. Published is what the public can see.
 */
export function PageStatusBadge({ status }: { status: PageStatus }) {
  return (
    <Badge dot tone={PAGE_TONES[status]}>
      {PAGE_STATUS_LABELS[status]}
    </Badge>
  );
}

/** A vehicle in service or out of it, a driver active or not: green or grey. */
export function ServiceBadge({
  active,
  on = "In service",
  off = "Out of service",
}: {
  active: boolean;
  on?: string;
  off?: string;
}) {
  return (
    <Badge dot tone={active ? "green" : "neutral"}>
      {active ? on : off}
    </Badge>
  );
}

export const VENDOR_TONES: Record<VendorStatus, BadgeTone> = {
  pending: "amber",
  active: "green",
  refused: "neutral",
  suspended: "red",
};

/**
 * Where a vendor stands: waiting for a SUPER's review, active, refused,
 * or suspended, a real problem while it holds work, so red.
 */
export function VendorStatusBadge({ status }: { status: string }) {
  if (!isVendorStatus(status)) return <Badge>{status}</Badge>;
  return (
    <Badge dot tone={VENDOR_TONES[status]}>
      {VENDOR_STATUS_LABELS[status]}
    </Badge>
  );
}
