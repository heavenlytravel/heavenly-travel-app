import { formatLocalDateTime } from "./booking-rules";
import {
  isTripCategory,
  TRIP_CATEGORY_LABELS,
  TRIP_MODE_LABELS,
  type TripMode,
} from "./booking-status";
import { formatMyr } from "./money";
import { isPlace, type Place } from "./place";
import { WEEKEND_REASON_LABELS, type TripPriceBreakdown } from "./pricing";

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

/**
 * What was booked in one line, for lists, where the heading and the vehicle
 * row of a detail page do not fit: "Coach charter, Minibus".
 */
export function itemSummary(item: {
  tripDetails: {
    vehicleClassCategory: string;
    vehicleClassName: string;
  } | null;
}) {
  const heading = itemHeading(item);
  return item.tripDetails
    ? `${heading}, ${item.tripDetails.vehicleClassName}`
    : heading;
}

/** The trip in one line, for lists: "KLIA to Kuala Lumpur" or "Penang, 4 hours". */
export function tripHeadline(trip: TripView) {
  if (trip.dropoff) return `${trip.pickup.label} to ${trip.dropoff.label}`;
  return trip.hours === null
    ? trip.pickup.label
    : `${trip.pickup.label}, ${trip.hours} hours`;
}

/**
 * Several trips in one line, for a heading: the first trip's, and how many
 * more: "KLIA to Kuala Lumpur, and 2 more trips"; null for none.
 */
export function tripsHeadline(trips: readonly TripView[]) {
  const [first] = trips;
  if (!first) return null;
  const more = trips.length - 1;
  return more === 0
    ? tripHeadline(first)
    : `${tripHeadline(first)}, and ${more} more ${more === 1 ? "trip" : "trips"}`;
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

/**
 * The rows after the trip: what was chosen on the options page. The model
 * shows only when the customer chose one; otherwise any of the class's
 * comes.
 */
export function tripDetailRows(details: {
  vehicleClassName: string;
  vehicleModelName?: string | null;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
}): [label: string, value: string][] {
  const rows: [string, string][] = [["Vehicle", details.vehicleClassName]];
  if (details.vehicleModelName) rows.push(["Model", details.vehicleModelName]);
  rows.push(["Passengers", String(details.passengers)]);
  if (details.childSeats > 0) {
    rows.push(["Child seats", String(details.childSeats)]);
  }
  if (details.flightNumber) rows.push(["Flight", details.flightNumber]);
  if (details.notes) rows.push(["Notes", details.notes]);
  return rows;
}

/** "2 km", or "0.78 km" to ten metres on receipts from before whole km. */
const kmLabel = (km: number) =>
  `${Number.isInteger(km) ? km : km.toFixed(2)} km`;

/**
 * The receipt behind a price, without the total: the grid's cell and the
 * extra road past a zone's edge, or the hourly rate with the hours, then
 * the surcharges, then the model chosen. Receipts from before nearest-zone
 * pricing that were metered show their base fare and distance. The app
 * adds the total in its own emphasis.
 */
export function priceRows(
  price: TripPriceBreakdown,
): [label: string, value: string][] {
  const rows: [string, string][] = [];
  if (price.route) {
    rows.push([
      price.route.fromZone === price.route.toZone
        ? `Within ${price.route.fromZone}`
        : `${price.route.fromZone} to ${price.route.toZone}`,
      formatMyr(price.route.rateSen),
    ]);
    const extra = price.zoneTrip;
    if (extra && extra.extraSen > 0) {
      rows.push([
        `Extra road, ${kmLabel(extra.chargedKm)} × ${formatMyr(extra.perKmSen)}`,
        formatMyr(extra.extraSen),
      ]);
    }
  } else if (price.mode === "oneway" && price.distanceKm !== null) {
    const { baseFareSen = 0, minimumFareSen = 0, perKmSen } = price.rates;
    const metered = baseFareSen + Math.round(perKmSen * price.distanceKm);
    rows.push(["Base fare", formatMyr(baseFareSen)]);
    rows.push([
      `${formatMyr(perKmSen)} per km × ${price.distanceKm.toFixed(1)} km`,
      formatMyr(metered - baseFareSen),
    ]);
    if (metered < minimumFareSen) {
      rows.push(["Minimum fare applies", formatMyr(price.subtotalSen)]);
    }
  } else if (price.hours !== null) {
    rows.push([
      `${formatMyr(price.rates.hourlyRateSen)} per hour × ${price.hours} hours`,
      formatMyr(price.subtotalSen),
    ]);
  }
  // Items priced before rates were set per location carry a state's multiplier.
  if (price.multiplier !== 1) {
    rows.push([`Area rate × ${price.multiplier}`, formatMyr(price.totalSen)]);
  }
  if (price.surcharge) {
    rows.push([
      price.surcharge.percent !== null
        ? `Odd hours, +${price.surcharge.percent}%`
        : "Odd hours",
      formatMyr(price.surcharge.amountSen),
    ]);
  }
  if (price.weekend) {
    const name = WEEKEND_REASON_LABELS[price.weekend.reason];
    rows.push([
      price.weekend.percent !== null
        ? `${name}, +${price.weekend.percent}%`
        : name,
      formatMyr(price.weekend.amountSen),
    ]);
  }
  if (price.model) {
    rows.push([
      price.model.percent !== null
        ? `${price.model.name}, chosen, +${price.model.percent}%`
        : `${price.model.name}, chosen`,
      formatMyr(price.model.amountSen),
    ]);
  }
  return rows;
}
