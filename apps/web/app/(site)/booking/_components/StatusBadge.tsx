import {
  BOOKING_STATUS_LABELS,
  isBookingStatus,
  type BookingStatus,
} from "@repo/db";

const TONES: Record<BookingStatus, string> = {
  received: "bg-[#fff4d6] text-[#7a5a00]",
  confirmed: "bg-emerald-50 text-emerald-800",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-[#fbe9e7] text-[#b3261e]",
};

/** A booking's status as a pill, in the booking pages' palette. */
export function StatusBadge({ status }: { status: string }) {
  const known = isBookingStatus(status);
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-[0.8rem] font-bold tracking-wide uppercase ${
        known ? TONES[status] : TONES.completed
      }`}
    >
      {known ? BOOKING_STATUS_LABELS[status] : status}
    </span>
  );
}
