import { guardFor } from "./const-enum";
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
] as const;
export type RevisionKind = (typeof REVISION_KINDS)[number];
export const isRevisionKind = guardFor(REVISION_KINDS);
export const REVISION_KIND_LABELS: Record<RevisionKind, string> = {
  booked: "Booked",
  change: "Trip changed",
  "add-trip": "Trip added",
  stop: "Stop added",
  "add-on": "Add-on",
  "late-charge": "Late charge",
  discount: "Discount",
  correction: "Correction",
  cancel: "Cancelled",
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
