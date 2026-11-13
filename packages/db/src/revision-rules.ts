import { formatLocalDateTime } from "./booking-rules";
import {
  ITEM_STATUS_LABELS,
  isItemStatus,
  isTripMode,
  TRIP_MODE_LABELS,
} from "./booking-status";
import { guardFor } from "./const-enum";
import { formatMyr } from "./money";
import { isPlace } from "./place";
import { itemQuoteSen, stopsOf } from "./stops";

/**
 * A booking's revisions, pure and browser-safe: their kinds, the snapshot
 * each keeps of the booking as it stood, and the change list a customer
 * reads. ./revisions writes them. Every change to what we deliver, charge
 * or pay is one; notes, contact fixes, assigning, payments and status
 * steps are not. See docs/261108-billing-and-revisions.md, decision 14.
 */

export const REVISION_KINDS = [
  "booked",
  "change",
  "add-trip",
  "stop",
  "add-on",
  "late-charge",
  "discount",
  "correction",
  "cancel",
  "reinstate",
] as const;
export type RevisionKind = (typeof REVISION_KINDS)[number];
export const isRevisionKind = guardFor(REVISION_KINDS);
export const REVISION_KIND_LABELS: Record<RevisionKind, string> = {
  booked: "Original Booking",
  change: "Trip Changed",
  "add-trip": "Trip Added",
  stop: "Stop Added",
  "add-on": "Add-on",
  "late-charge": "Late Charge",
  discount: "Discount",
  correction: "Correction",
  cancel: "Cancelled",
  reinstate: "Reinstated",
};

/** The kinds a new price with a reason is: a discount given, or our mistake put right. */
export const PRICE_REVISION_KINDS = ["discount", "correction"] as const;
export type PriceRevisionKind = (typeof PRICE_REVISION_KINDS)[number];
export const isPriceRevisionKind = guardFor(PRICE_REVISION_KINDS);

/** The kinds a charge is: something added during or before the trip, or after it. */
export const CHARGE_REVISION_KINDS = ["add-on", "late-charge"] as const;
export type ChargeRevisionKind = (typeof CHARGE_REVISION_KINDS)[number];
export const isChargeRevisionKind = guardFor(CHARGE_REVISION_KINDS);

/**
 * What an amend no longer fits that stays assigned: the vehicle of another
 * class, or the vehicle and the driver at another time. Nothing is let go;
 * Operation changes them on Assign.
 */
export const AMEND_WARNINGS = ["class", "time"] as const;
export type AmendWarning = (typeof AMEND_WARNINGS)[number];
export const isAmendWarning = guardFor(AMEND_WARNINGS);
export const AMEND_WARNING_TEXT: Record<AmendWarning, string> = {
  class:
    "The vehicle asked for or assigned is of the old class. Change it on Assign.",
  time: "The time changed. Check on Assign that the vehicle and the driver are still free.",
};

/** The longest summary or reason a revision keeps. */
export const REVISION_TEXT_MAX = 200;

/** One trip as a revision keeps it. */
export type SnapshotTrip = {
  position: number;
  status: string;
  startsAt: string;
  heading: string;
  mode: string | null;
  vehicleClassName: string | null;
  vehicleModelName: string | null;
  pickup: string | null;
  stops: string[];
  dropoff: string | null;
  hours: number | null;
  distanceKm: number | null;
  passengers: number | null;
  guideLanguage: string | null;
  quotedSen: number;
  chargedSen: number;
  /** Why the agreed price differs from the quote; staff only. */
  agreedReason: string | null;
};

/** One charge as a revision keeps it. */
export type SnapshotCharge = {
  label: string;
  amountSen: number;
  /** The trip it is for; null for the booking. */
  position: number | null;
};

/** The booking as a revision keeps it: enough to show it read only. */
export type RevisionSnapshot = {
  status: string;
  trips: SnapshotTrip[];
  charges: SnapshotCharge[];
  quotedSen: number;
  chargedSen: number;
};

/** The booking shape a snapshot is made from: what ./revisions reads. */
export type SnapshotSource = {
  status: string;
  items: {
    id: string;
    position: number;
    status: string;
    startsAt: Date;
    priceTotalSen: number;
    priceBreakdown: unknown;
    priceOverrideReason: string | null;
    tripDetails: {
      vehicleClassCategory: string;
      vehicleClassName: string;
      vehicleModelName: string | null;
      mode: string;
      pickupPlace: unknown;
      stops: unknown;
      dropoffPlace: unknown;
      hours: number | null;
      distanceKm: number | null;
      passengers: number;
      guideLanguage: string | null;
    } | null;
  }[];
  charges: { itemId: string | null; label: string; amountSen: number }[];
};

const isLiveStatus = (status: string) => status !== "cancelled";

/**
 * What a booking charges now: its live trips' prices and every charge, a
 * cancelled trip's fee included. A cancelled booking charges its fees
 * alone.
 */
export function chargedSenOf(source: {
  items: readonly { status: string; priceTotalSen: number }[];
  charges: readonly { amountSen: number }[];
}): number {
  return (
    source.items
      .filter((i) => isLiveStatus(i.status))
      .reduce((sum, i) => sum + i.priceTotalSen, 0) +
    source.charges.reduce((sum, c) => sum + c.amountSen, 0)
  );
}

/** What the rates quote for a booking now: its live trips' quotes and the charges. */
export function quotedSenOf(source: SnapshotSource): number {
  return (
    source.items
      .filter((i) => isLiveStatus(i.status))
      .reduce((sum, i) => sum + itemQuoteSen(i), 0) +
    source.charges.reduce((sum, c) => sum + c.amountSen, 0)
  );
}

const label = (place: unknown) => (isPlace(place) ? place.label : null);

/** The booking as a revision keeps it. */
export function snapshotOf(
  source: SnapshotSource,
  headingOf: (item: SnapshotSource["items"][number]) => string,
): RevisionSnapshot {
  const positions = new Map(source.items.map((i) => [i.id, i.position]));
  return {
    status: source.status,
    trips: source.items.map((item) => {
      const d = item.tripDetails;
      return {
        position: item.position,
        status: item.status,
        startsAt: item.startsAt.toISOString(),
        heading: headingOf(item),
        mode: d?.mode ?? null,
        vehicleClassName: d?.vehicleClassName ?? null,
        vehicleModelName: d?.vehicleModelName ?? null,
        pickup: label(d?.pickupPlace),
        stops: stopsOf(d?.stops).map((s) => s.place.label),
        dropoff: label(d?.dropoffPlace),
        hours: d?.hours ?? null,
        distanceKm: d?.distanceKm ?? null,
        passengers: d?.passengers ?? null,
        guideLanguage: d?.guideLanguage ?? null,
        quotedSen: itemQuoteSen(item),
        chargedSen: item.priceTotalSen,
        agreedReason: item.priceOverrideReason,
      };
    }),
    charges: source.charges.map((c) => ({
      label: c.label,
      amountSen: c.amountSen,
      position: c.itemId ? (positions.get(c.itemId) ?? null) : null,
    })),
    quotedSen: quotedSenOf(source),
    chargedSen: chargedSenOf(source),
  };
}

/** A stored snapshot, read safely; null when it is not one. */
export function revisionSnapshotOf(stored: unknown): RevisionSnapshot | null {
  if (typeof stored !== "object" || stored === null) return null;
  const s = stored as Partial<RevisionSnapshot>;
  return Array.isArray(s.trips) &&
    Array.isArray(s.charges) &&
    typeof s.chargedSen === "number"
    ? (stored as RevisionSnapshot)
    : null;
}

/** One line of the customer's change list: when, what, by how much, the new total. Never a reason. */
export type CustomerChange = {
  at: Date;
  summary: string;
  /** What it moved the total by; 0 for none. */
  differenceSen: number;
  totalSen: number;
};

/**
 * The change list a customer reads, oldest first, from the revisions
 * after the booking was made: the date, what changed, the amount and the
 * new total. Never the reasons, or quoted against agreed.
 */
export function customerChangesOf(
  revisions: readonly {
    number: number;
    summary: string;
    chargedSen: number;
    createdAt: Date;
  }[],
): CustomerChange[] {
  const ordered = [...revisions].sort((a, b) => a.number - b.number);
  return ordered.slice(1).map((revision, index) => ({
    at: revision.createdAt,
    summary: revision.summary,
    differenceSen: revision.chargedSen - ordered[index]!.chargedSen,
    totalSen: revision.chargedSen,
  }));
}

/** A summary or a reason as typed, trimmed and cut to `REVISION_TEXT_MAX`. */
export function revisionText(typed: string): string {
  return typed.trim().replace(/\s+/g, " ").slice(0, REVISION_TEXT_MAX);
}

/* What a revision changed */

/** One thing a revision changed, for staff: "Trip 1 · Pick-up Time", what it was and what it is. */
export type RevisionDetail = {
  /** "Trip 1 · Pick-up Time"; "Charge Added"; "Trip 2 Added". */
  label: string;
  before: string | null;
  after: string | null;
};

/** The fields of a trip a revision may change, each as staff read it. */
const TRIP_FIELDS: readonly {
  label: string;
  of: (trip: SnapshotTrip) => string | null;
}[] = [
  {
    label: "Status",
    of: (t) =>
      isItemStatus(t.status) ? ITEM_STATUS_LABELS[t.status] : t.status,
  },
  {
    label: "Pick-up Time",
    of: (t) => formatLocalDateTime(new Date(t.startsAt)),
  },
  {
    label: "Service",
    of: (t) =>
      t.mode && isTripMode(t.mode) ? TRIP_MODE_LABELS[t.mode] : t.mode,
  },
  {
    label: "Vehicle",
    of: (t) =>
      [t.vehicleClassName, t.vehicleModelName].filter(Boolean).join(", ") ||
      null,
  },
  { label: "Pick-up", of: (t) => t.pickup },
  {
    label: "Stops",
    of: (t) => (t.stops.length > 0 ? t.stops.join(" → ") : null),
  },
  { label: "Drop-off", of: (t) => t.dropoff },
  { label: "Hours", of: (t) => (t.hours === null ? null : `${t.hours} h`) },
  {
    label: "Passengers",
    of: (t) => (t.passengers === null ? null : String(t.passengers)),
  },
  { label: "Tour Guide", of: (t) => t.guideLanguage },
  { label: "Price", of: (t) => formatMyr(t.chargedSen) },
  { label: "Why the Price", of: (t) => t.agreedReason },
];

const chargeKey = (c: SnapshotCharge) =>
  `${c.position ?? ""}|${c.label}|${c.amountSen}`;

const chargeText = (c: SnapshotCharge) =>
  `${c.label}${c.position !== null ? ` (Trip ${c.position})` : ""}, ${formatMyr(c.amountSen)}`;

/**
 * What a revision changed, field by field, from the revision before it:
 * each trip's status, time, vehicle, places, passengers, guide and price,
 * a trip added, and each charge added or taken off. Rev 1 changes
 * nothing: it is the booking as booked.
 */
export function revisionDetailsOf(
  before: RevisionSnapshot | null,
  after: RevisionSnapshot,
): RevisionDetail[] {
  if (!before) return [];
  const details: RevisionDetail[] = [];
  for (const trip of after.trips) {
    const was = before.trips.find((t) => t.position === trip.position);
    const name = `Trip ${trip.position}`;
    if (!was) {
      details.push({
        label: `${name} Added`,
        before: null,
        after: [
          trip.heading,
          formatLocalDateTime(new Date(trip.startsAt)),
          formatMyr(trip.chargedSen),
        ].join(" · "),
      });
      continue;
    }
    for (const field of TRIP_FIELDS) {
      const from = field.of(was);
      const to = field.of(trip);
      if (from !== to) {
        details.push({
          label: `${name} · ${field.label}`,
          before: from,
          after: to,
        });
      }
    }
  }
  const left = new Map<string, number>();
  for (const c of before.charges) {
    left.set(chargeKey(c), (left.get(chargeKey(c)) ?? 0) + 1);
  }
  for (const c of after.charges) {
    const n = left.get(chargeKey(c)) ?? 0;
    if (n > 0) left.set(chargeKey(c), n - 1);
    else
      details.push({
        label: "Charge Added",
        before: null,
        after: chargeText(c),
      });
  }
  for (const c of before.charges) {
    const n = left.get(chargeKey(c)) ?? 0;
    if (n > 0) {
      left.set(chargeKey(c), n - 1);
      details.push({
        label: "Charge Taken Off",
        before: chargeText(c),
        after: null,
      });
    }
  }
  return details;
}

/**
 * A trip's amend in the customer's words, from what it changed: "Trip 1:
 * pick-up time and vehicle changed"; "Trip 1 changed" when nothing they
 * read moved.
 */
export function amendSummaryOf(
  position: number,
  details: readonly RevisionDetail[],
): string {
  const prefix = `Trip ${position} · `;
  const fields = details
    .filter((d) => d.label.startsWith(prefix))
    .map((d) => d.label.slice(prefix.length))
    // In small letters first: a revision saved before 2026-11-13 has its
    // labels in sentence case ("Why the price").
    .map((field) => field.toLowerCase())
    .filter((field) => field !== "why the price" && field !== "status");
  if (fields.length === 0) return `Trip ${position} changed`;
  const list =
    fields.length === 1
      ? fields[0]
      : `${fields.slice(0, -1).join(", ")} and ${fields.at(-1)}`;
  return `Trip ${position}: ${list} changed`;
}
