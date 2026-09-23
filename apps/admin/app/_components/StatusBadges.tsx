import {
  BOOKING_STATUS_LABELS,
  ITEM_STATUS_LABELS,
  isBookingStatus,
  isItemStatus,
  type BookingStatus,
  type ItemStatus,
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
