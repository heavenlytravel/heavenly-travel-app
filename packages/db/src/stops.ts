import { isPlace, type Place } from "./place";
import { priceBreakdownOf } from "./pricing";

/**
 * A stop on a trip: A to C by B is still one trip. Its quote is the legs
 * priced on their own and added (A to B, then B to C); what that added
 * to the trip's quote is kept on the stop, so the trip's quote stays its
 * receipt plus its stops'. Its driver's pay is suggested from the
 * location's driver pay per extra km and stop fee, when Operation entered
 * them. Pure and browser-safe. See docs/261108-billing-and-revisions.md,
 * decisions 17 and 18.
 */

export type TripStop = {
  place: Place;
  /** How long the vehicle waits there. */
  waitMinutes: number;
  /** What the stop added to the trip's quote: the legs' sum less the quote before. */
  quoteAddSen: number;
  /** The road it added, km; null on an hourly hire, whose package covers it. */
  extraKm: number | null;
};

/** The most stops one trip takes. */
export const MAX_STOPS = 5;

/** The longest wait at a stop, in minutes. */
export const MAX_STOP_WAIT_MINUTES = 240;

function isStop(value: unknown): value is TripStop {
  if (typeof value !== "object" || value === null) return false;
  const stop = value as Record<string, unknown>;
  return (
    isPlace(stop.place) &&
    typeof stop.waitMinutes === "number" &&
    typeof stop.quoteAddSen === "number" &&
    (stop.extraKm === null || typeof stop.extraKm === "number")
  );
}

/** A trip's stored stops, read safely: anything not a stop is dropped. */
export function stopsOf(stored: unknown): TripStop[] {
  return Array.isArray(stored) ? stored.filter(isStop) : [];
}

/**
 * What the rates quote for a trip now: its receipt's total plus what each
 * stop added. The agreed price, when one is set, is beside it.
 */
export function itemQuoteSen(item: {
  priceBreakdown: unknown;
  priceTotalSen: number;
  tripDetails?: { stops?: unknown } | null;
}): number {
  const receipt = priceBreakdownOf(item.priceBreakdown);
  const base = receipt ? receipt.totalSen : item.priceTotalSen;
  return (
    base +
    stopsOf(item.tripDetails?.stops).reduce((sum, s) => sum + s.quoteAddSen, 0)
  );
}

/**
 * The driver's pay a stop suggests: the extra road at the location's pay
 * per km plus its stop fee. Null when the location has entered neither, so
 * staff type it.
 */
export function stopPaySuggestion(input: {
  extraKm: number | null;
  payPerKmSen: number | null;
  stopFeeSen: number | null;
}): number | null {
  if (input.payPerKmSen === null && input.stopFeeSen === null) return null;
  const road =
    input.payPerKmSen !== null && input.extraKm !== null
      ? Math.max(0, Math.round(input.extraKm * input.payPerKmSen))
      : 0;
  return road + (input.stopFeeSen ?? 0);
}

/** The route through a trip's places, in order: the pick-up, the stops, the drop-off. */
export function routePlaces(trip: {
  pickup: Place;
  stops: readonly Place[];
  dropoff: Place | null;
}): Place[] {
  return [trip.pickup, ...trip.stops, ...(trip.dropoff ? [trip.dropoff] : [])];
}

/**
 * Google Maps directions through every place in order, for the driver:
 * the drop-off the destination, the stops waypoints. Null for one place.
 */
export function directionsHref(
  places: readonly { lat: number; lng: number }[],
): string | null {
  if (places.length < 2) return null;
  const point = (p: { lat: number; lng: number }) => `${p.lat},${p.lng}`;
  const params = new URLSearchParams({
    api: "1",
    origin: point(places[0]!),
    destination: point(places[places.length - 1]!),
    travelmode: "driving",
  });
  const waypoints = places.slice(1, -1).map(point);
  if (waypoints.length > 0) params.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
