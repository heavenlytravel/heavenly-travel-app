import { isTripEventKind, TRIP_EVENT_LABELS } from "@repo/db";

/**
 * One colour per state, the same on every Connect screen: amber waits for
 * someone's yes, brand blue is booked and coming, azure is under way (and
 * pulses), green is done, red went wrong.
 */
export type Tone = "amber" | "brand" | "azure" | "green" | "red" | "slate";

export type TripState = { label: string; tone: Tone; live: boolean };

/**
 * Where a trip stands, read from its status and the driver's last tap:
 * "Driver to accept", "Booked", "Arrived at pickup", "Done".
 */
export function tripStateOf(trip: {
  status: string;
  accepted: boolean;
  events: readonly { kind: string }[];
}): TripState {
  if (trip.status === "cancelled") {
    return { label: "Cancelled", tone: "red", live: false };
  }
  const last = trip.events.at(-1);
  const kind = last && isTripEventKind(last.kind) ? last.kind : null;
  if (kind === "no-show") return { label: "No-show", tone: "red", live: false };
  if (trip.status === "completed" || kind === "dropped-off") {
    return { label: "Done", tone: "green", live: false };
  }
  if (kind === "problem") {
    return { label: "Problem reported", tone: "red", live: true };
  }
  if (kind)
    return { label: TRIP_EVENT_LABELS[kind], tone: "azure", live: true };
  if (!trip.accepted) return { label: "To accept", tone: "amber", live: false };
  return { label: "Booked", tone: "brand", live: false };
}
