import data from "../data/price-check.json";
import type { TripQuoteErrorCode } from "./transportation";

/**
 * The named trips of data/price-check.json, pure and browser-safe: the
 * live check prices each with real roads and fails on any difference
 * (scripts/price-check.ts), and Try a trip offers them as its examples on
 * the location's Rates tab. One list serves both. See
 * docs/261023-nearest-zone-pricing.md, "Testing".
 */

/** An end of a named trip: a Google place, or a pin for a spot with no place. */
export type PriceCheckEnd =
  | { label: string; placeId: string }
  | { label: string; lat: number; lng: number };

export type PriceCheck = {
  /** The slug of the location whose Rates tab offers it. */
  location: string;
  name: string;
  /** The class's slug: "sedan". */
  class: string;
  pickup: PriceCheckEnd;
  dropoff: PriceCheckEnd;
  /** The total in sen, or the refusal; null prints the price without checking it. */
  expected: { totalSen: number } | { refused: TripQuoteErrorCode } | null;
  /** Why the trip is on the list, or what the price was on the demo's roads. */
  note?: string;
};

export const PRICE_CHECKS = data.trips as PriceCheck[];

/** The named trips of a location, for its Try a trip. */
export function priceChecksAt(slug: string): PriceCheck[] {
  return PRICE_CHECKS.filter((check) => check.location === slug);
}
