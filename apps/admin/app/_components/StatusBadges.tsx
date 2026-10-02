import {
  BOOKING_STATUS_LABELS,
  ITEM_STATUS_LABELS,
  LOCATION_STATE_LABELS,
  PAGE_STATUS_LABELS,
  isBookingStatus,
  isItemStatus,
  isLocationState,
  type BookingStatus,
  type ItemStatus,
  type LocationState,
  type PageStatus,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";
import type { ComponentProps } from "react";

type Tone = NonNullable<ComponentProps<typeof Badge>["tone"]>;

const BOOKING_TONES: Record<BookingStatus, Tone> = {
  received: "amber",
  confirmed: "green",
  completed: "neutral",
  cancelled: "red",
};

const ITEM_TONES: Record<ItemStatus, Tone> = {
  received: "amber",
  confirmed: "green",
  assigned: "blue",
  completed: "neutral",
  cancelled: "red",
};

/** A booking's summary status, as stored on the booking. */
export function BookingStatusBadge({ status }: { status: string }) {
  if (!isBookingStatus(status)) return <Badge>{status}</Badge>;
  return (
    <Badge tone={BOOKING_TONES[status]}>{BOOKING_STATUS_LABELS[status]}</Badge>
  );
}

/** One item's status, which is where ops does its work. */
export function ItemStatusBadge({ status }: { status: string }) {
  if (!isItemStatus(status)) return <Badge>{status}</Badge>;
  return <Badge tone={ITEM_TONES[status]}>{ITEM_STATUS_LABELS[status]}</Badge>;
}

const LOCATION_TONES: Record<LocationState, Tone> = {
  draft: "neutral",
  preview: "blue",
  live: "green",
  paused: "amber",
};

/** What the public sees of a location: nothing yet, the pages, or the pages with a notice. */
export function LocationStateBadge({ state }: { state: string }) {
  if (!isLocationState(state)) return <Badge>{state}</Badge>;
  return (
    <Badge tone={LOCATION_TONES[state]}>{LOCATION_STATE_LABELS[state]}</Badge>
  );
}

const PAGE_TONES: Record<PageStatus, Tone> = {
  unpublished: "neutral",
  published: "green",
  changed: "amber",
};

/** Where a location's page stands between its draft and its published copy. */
export function PageStatusBadge({ status }: { status: PageStatus }) {
  return <Badge tone={PAGE_TONES[status]}>{PAGE_STATUS_LABELS[status]}</Badge>;
}
