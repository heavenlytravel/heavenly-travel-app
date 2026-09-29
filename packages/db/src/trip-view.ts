import { formatLocalDateTime } from "./booking-rules";
import {
  isTripCategory,
  TRIP_CATEGORY_LABELS,
  TRIP_MODE_LABELS,
  type TripMode,
} from "./booking-status";
import { formatMyr } from "./money";
import { isPlace, type Place } from "./place";
import type { TripPriceBreakdown } from "./pricing";

/**
 * A trip as every screen describes it, before and after booking: the
 * customer's options and success pages, My bookings and the admin console
 * all read the same rows. Browser-safe: the rows are data, each app renders
 * them in its own style.
 */
export type TripView = {
  mode: TripMode;
  pickup: Place;
  dropoff: Place | null;
  startsAt: Date;
  hours: number | null;
  distanceKm: number | null;
};

/** The shape of a booking item this module reads; both apps' queries satisfy it. */
export type TripItemLike = {
  startsAt: Date;
  tripDetails: {
    mode: string;
    pickupPlace: unknown;
    dropoffPlace: unknown;
    hours: number | null;
    distanceKm: number | null;
  } | null;
};

/** The trip stored on a transportation item, or null for another product. */
export function tripViewOfItem(item: TripItemLike): TripView | null {
  const details = item.tripDetails;
  if (!details || !isPlace(details.pickupPlace)) return null;
  const mode = details.mode === "hourly" ? "hourly" : "oneway";
  return {
    mode,
    pickup: details.pickupPlace,
    dropoff: isPlace(details.dropoffPlace) ? details.dropoffPlace : null,
    startsAt: item.startsAt,
    hours: details.hours,
    distanceKm: details.distanceKm,
  };
}

/**
 * What an item is, as its heading on every screen and email: "Car with
 * driver" or "Coach charter", from the category snapshot on the booking. A
 * booking is a receipt, so the class is never read for it.
 */
export function itemHeading(item: {
  tripDetails: { vehicleClassCategory: string } | null;
}) {
  const category = item.tripDetails?.vehicleClassCategory;
  return isTripCategory(category)
    ? TRIP_CATEGORY_LABELS[category]
    : "Transportation";
}

/** The trip in one line, for lists: "KLIA to Kuala Lumpur" or "Penang, 4 hours". */
export function tripHeadline(trip: TripView) {
  if (trip.dropoff) return `${trip.pickup.label} to ${trip.dropoff.label}`;
  return trip.hours === null
    ? trip.pickup.label
    : `${trip.pickup.label}, ${trip.hours} hours`;
}

/** A label and its value; a place value lets the app show the address too. */
export type DetailRow = [label: string, value: string | Place];

/** The trip itself: mode, places, time, duration or distance. */
export function tripRows(trip: TripView): DetailRow[] {
  const rows: DetailRow[] = [
    ["Trip", TRIP_MODE_LABELS[trip.mode]],
    ["Pick-up", trip.pickup],
  ];
  if (trip.dropoff) rows.push(["Drop-off", trip.dropoff]);
  rows.push(["Pick-up time", formatLocalDateTime(trip.startsAt)]);
  if (trip.hours !== null) rows.push(["Duration", `${trip.hours} hours`]);
  if (trip.distanceKm !== null) {
    rows.push(["Road distance", `${trip.distanceKm.toFixed(1)} km`]);
  }
  return rows;
}

/** The rows after the trip: what was chosen on the options page. */
export function tripDetailRows(details: {
  vehicleClassName: string;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
}): [label: string, value: string][] {
  const rows: [string, string][] = [
    ["Vehicle", details.vehicleClassName],
    ["Passengers", String(details.passengers)],
  ];
  if (details.childSeats > 0) {
    rows.push(["Child seats", String(details.childSeats)]);
  }
  if (details.flightNumber) rows.push(["Flight", details.flightNumber]);
  if (details.notes) rows.push(["Notes", details.notes]);
  return rows;
}

/**
 * The receipt behind a price, without the total: the rates used, the
 * distance or hours, the multiplier. The app adds the total in its own
 * emphasis.
 */
export function priceRows(
  price: TripPriceBreakdown,
): [label: string, value: string][] {
  const rows: [string, string][] = [];
  if (price.mode === "oneway" && price.distanceKm !== null) {
    const metered =
      price.rates.baseFareSen +
      Math.round(price.rates.perKmSen * price.distanceKm);
    rows.push(["Base fare", formatMyr(price.rates.baseFareSen)]);
    rows.push([
      `${formatMyr(price.rates.perKmSen)} per km × ${price.distanceKm.toFixed(1)} km`,
      formatMyr(metered - price.rates.baseFareSen),
    ]);
    if (metered < price.rates.minimumFareSen) {
      rows.push(["Minimum fare applies", formatMyr(price.subtotalSen)]);
    }
  } else if (price.hours !== null) {
    rows.push([
      `${formatMyr(price.rates.hourlyRateSen)} per hour × ${price.hours} hours`,
      formatMyr(price.subtotalSen),
    ]);
  }
  if (price.multiplier !== 1) {
    rows.push([`Area rate × ${price.multiplier}`, formatMyr(price.totalSen)]);
  }
  return rows;
}
