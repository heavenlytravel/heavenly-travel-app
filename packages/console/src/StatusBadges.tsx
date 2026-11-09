import {
  ASSIGN_STATE_LABELS,
  BOOKING_STATUS_LABELS,
  ITEM_STATUS_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  PAYMENT_STATE_LABELS,
  BUSINESS_STATUS_LABELS,
  VENDOR_STATUS_LABELS,
  isBookingStatus,
  isItemStatus,
  isLocationState,
  isInvoiceStatus,
  isPaymentState,
  isBusinessStatus,
  isVendorStatus,
  type AssignState,
  type BookingStatus,
  type ItemStatus,
  type LocationState,
  type PageStatus,
  type BusinessStatus,
  type InvoiceStatus,
  type PaymentState,
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

/**
 * Where a trip stands in Operation's work, on the Assign page and the
 * booking alike: to assign waits on us (grey), waiting to accept waits on
 * someone else (amber), assigned is in hand (navy, as an assigned item),
 * on the road is moving (brand blue), done is done (green).
 */
export const ASSIGN_TONES: Record<AssignState, BadgeTone> = {
  "to-assign": "neutral",
  waiting: "amber",
  assigned: "navy",
  "on-the-road": "brand",
  done: "green",
};

/** Where a trip stands in Operation's work. */
export function AssignStateBadge({ state }: { state: AssignState }) {
  return (
    <Badge dot tone={ASSIGN_TONES[state]}>
      {ASSIGN_STATE_LABELS[state]}
    </Badge>
  );
}

/**
 * A role of a trip with no vendor asked to do it, on the Assign page and
 * the booking alike: grey while there is time, red once the trip is
 * urgent (`isUrgentTrip`), as its time is.
 */
export function NotAssignedBadge({ urgent }: { urgent: boolean }) {
  return (
    <Badge dot tone={urgent ? "red" : "neutral"}>
      Not assigned
    </Badge>
  );
}

/** The guide's place on a trip booked without one: nothing to do, so grey. */
export function NoGuideBadge() {
  return <Badge>Not booked</Badge>;
}

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

/**
 * Where an invoice's money stands, worked out from its payments: owed
 * and waiting (amber), owed past its due date (red, a real problem),
 * partly in (brand blue), all in (green), nothing owed (grey), and money
 * to give back (navy).
 */
export const PAYMENT_STATE_TONES: Record<PaymentState, BadgeTone> = {
  unpaid: "amber",
  overdue: "red",
  "partially-paid": "brand",
  paid: "green",
  "nothing-due": "neutral",
  "refund-due": "navy",
};

/** An invoice's, or a booking's, money: unpaid, overdue, partly paid, paid, nothing due, refund due. */
export function PaymentStateBadge({ state }: { state: string }) {
  if (!isPaymentState(state)) return <Badge>{state}</Badge>;
  return (
    <Badge dot tone={PAYMENT_STATE_TONES[state]}>
      {PAYMENT_STATE_LABELS[state]}
    </Badge>
  );
}

/** A document's own step: a draft not numbered yet (amber), issued (brand blue), void (grey). */
export const INVOICE_STATUS_TONES: Record<InvoiceStatus, BadgeTone> = {
  draft: "amber",
  issued: "brand",
  void: "neutral",
};

export function InvoiceStatusBadge({ status }: { status: string }) {
  if (!isInvoiceStatus(status)) return <Badge>{status}</Badge>;
  return (
    <Badge dot tone={INVOICE_STATUS_TONES[status]}>
      {INVOICE_STATUS_LABELS[status]}
    </Badge>
  );
}

export const BUSINESS_STATUS_TONES: Record<BusinessStatus, BadgeTone> = {
  active: "green",
  inactive: "neutral",
};

/** An agent taking bookings (green) or not (grey); either is still billed. */
export function BusinessStatusBadge({ status }: { status: string }) {
  if (!isBusinessStatus(status)) return <Badge>{status}</Badge>;
  return (
    <Badge dot tone={BUSINESS_STATUS_TONES[status]}>
      {BUSINESS_STATUS_LABELS[status]}
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
