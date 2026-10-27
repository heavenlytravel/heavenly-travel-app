import {
  BOOKING_STATUS_LABELS,
  isBookingStatus,
  isItemStatus,
  ITEM_STATUS_LABELS,
  type BookingStatus,
  type ItemStatus,
} from "@repo/db";

const TONES: Record<BookingStatus, string> = {
  received: "bg-[#fff4d6] text-[#7a5a00]",
  confirmed: "bg-emerald-50 text-emerald-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-[#fbe9e7] text-[#b3261e]",
};

const ITEM_TONES: Record<ItemStatus, string> = {
  ...TONES,
  assigned: "bg-brand-tint text-brand",
};

const pill =
  "inline-flex items-center rounded-full px-3 py-1 text-[0.8rem] font-bold tracking-wide uppercase";

/** A booking's status as a pill, in the booking pages' palette. */
export function StatusBadge({ status }: { status: string }) {
  const known = isBookingStatus(status);
  return (
    <span className={`${pill} ${known ? TONES[status] : TONES.completed}`}>
      {known ? BOOKING_STATUS_LABELS[status] : status}
    </span>
  );
}

/** One trip's status, in the same palette, for a booking of several. */
export function ItemStatusBadge({ status }: { status: string }) {
  const known = isItemStatus(status);
  return (
    <span className={`${pill} ${known ? ITEM_TONES[status] : TONES.completed}`}>
      {known ? ITEM_STATUS_LABELS[status] : status}
    </span>
  );
}
