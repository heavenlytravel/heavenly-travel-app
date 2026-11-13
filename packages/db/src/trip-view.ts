import { plural } from "./names";
import { formatLocalDateTime } from "./booking-rules";
import {
  isTripCategory,
  TRIP_CATEGORY_LABELS,
  TRIP_MODE_LABELS,
  type TripMode,
} from "./booking-status";
import {
  hourlyChoiceLabel,
  hourlyReceiptOf,
  durationLabel,
  type HourlyChoice,
} from "./hourly-input";
import { formatMyr } from "./money";
import { isPlace, type Place } from "./place";
import { stopsOf } from "./stops";
import {
  CHARGE_LABELS,
  WEEKEND_REASON_LABELS,
  type TripPriceBreakdown,
} from "./pricing";

/**
 * A trip as every screen describes it, before and after booking: the
 * customer's options and success pages, My bookings and the admin console
 * all read the same rows. Browser-safe: the rows are data, each app renders
 * them in its own style.
 */
export type TripView = {
  mode: TripMode;
  pickup: Place;
  /** The places it stops at on the way, in order: A to C by B is one trip. */
  stops: Place[];
  dropoff: Place | null;
  startsAt: Date;
  /** Hourly: the hours it runs, the package's plus the extra. */
  hours: number | null;
  /** Hourly: the package and extra hours chosen; null for one-way, and on trips booked before packages. */
  hourly: HourlyChoice | null;
  distanceKm: number | null;
};

/** The shape of a booking item this module reads; both apps' queries satisfy it. */
export type TripItemLike = {
  startsAt: Date;
  /** The receipt, which names an hourly trip's package. */
  priceBreakdown?: unknown;
  tripDetails: {
    mode: string;
    pickupPlace: unknown;
    /** Its stops, as ./stops keeps them; left out by a query that does not read them. */
    stops?: unknown;
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
  const receipt =
    typeof item.priceBreakdown === "object" && item.priceBreakdown !== null
      ? hourlyReceiptOf((item.priceBreakdown as { hourly?: unknown }).hourly)
      : null;
  return {
    mode,
    pickup: details.pickupPlace,
    stops: stopsOf(details.stops).map((stop) => stop.place),
    dropoff: isPlace(details.dropoffPlace) ? details.dropoffPlace : null,
    startsAt: item.startsAt,
    hours: details.hours,
    hourly:
      mode === "hourly" && receipt
        ? { packageHours: receipt.packageHours, extraHours: receipt.extraHours }
        : null,
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

/** The trip in one line, for lists: "KLIA to Kuala Lumpur", "KLIA to Kuah by Cenang", "Penang, 4 hours" or "Penang, 4 hours, to KLIA". */
export function tripHeadline(trip: TripView) {
  const by =
    trip.stops.length > 0
      ? ` by ${trip.stops.map((stop) => stop.label).join(", ")}`
      : "";
  if (trip.hours === null || trip.mode === "oneway") {
    return trip.dropoff
      ? `${trip.pickup.label} to ${trip.dropoff.label}${by}`
      : `${trip.pickup.label}${by}`;
  }
  const hire = `${trip.pickup.label}, ${trip.hours} hours`;
  return trip.dropoff ? `${hire}, to ${trip.dropoff.label}` : hire;
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
  for (const stop of trip.stops) rows.push(["Stop", stop]);
  if (trip.dropoff) rows.push(["Drop-off", trip.dropoff]);
  rows.push(["Pick-up Time", formatLocalDateTime(trip.startsAt)]);
  if (trip.hours !== null) {
    rows.push([
      "Duration",
      trip.hourly
        ? `${trip.hours} hours, ${hourlyChoiceLabel(trip.hourly)}`
        : `${trip.hours} hours`,
    ]);
  }
  if (trip.distanceKm !== null) {
    rows.push(["Road Distance", `${trip.distanceKm.toFixed(1)} km`]);
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
  /** The tour guide's language, paid for; null or left out without one. */
  guideLanguage?: string | null;
  /** A language asked for, not on sale. */
  guideRequest?: string | null;
  flightNumber: string | null;
  notes: string | null;
}): [label: string, value: string][] {
  const rows: [string, string][] = [["Vehicle", details.vehicleClassName]];
  if (details.vehicleModelName) rows.push(["Model", details.vehicleModelName]);
  rows.push(["Passengers", String(details.passengers)]);
  if (details.childSeats > 0) {
    rows.push(["Child Seats", String(details.childSeats)]);
  }
  if (details.guideLanguage) rows.push(["Tour Guide", details.guideLanguage]);
  if (details.guideRequest) {
    rows.push(["Guide Asked For", `${details.guideRequest}, on request`]);
  }
  if (details.flightNumber) rows.push(["Flight", details.flightNumber]);
  if (details.notes) rows.push(["Notes", details.notes]);
  return rows;
}

/**
 * What a trip adds to its vehicle, for a list: "Tour guide (English)",
 * "2 child seats", the model chosen. Empty for none.
 */
export function tripAddOns(details: {
  vehicleModelName?: string | null;
  childSeats: number;
  guideLanguage?: string | null;
}): string[] {
  return [
    ...(details.guideLanguage ? [`Tour Guide (${details.guideLanguage})`] : []),
    ...(details.childSeats > 0
      ? [plural(details.childSeats, "child seat")]
      : []),
    ...(details.vehicleModelName ? [details.vehicleModelName] : []),
  ];
}

/** "2 km", or "0.78 km" to ten metres on receipts from before whole km. */
const kmLabel = (km: number) =>
  `${Number.isInteger(km) ? km : km.toFixed(2)} km`;

/**
 * The receipt behind a price, without the total: the grid's cell and the
 * extra road past a zone's edge, or the hourly package and the extra
 * hours (the hourly rate with the hours on older receipts), then
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
        `Extra Road, ${kmLabel(extra.chargedKm)} × ${formatMyr(extra.perKmSen)}`,
        formatMyr(extra.extraSen),
      ]);
    }
  } else if (price.mode === "oneway" && price.distanceKm !== null) {
    const { baseFareSen = 0, minimumFareSen = 0, perKmSen } = price.rates;
    const metered = baseFareSen + Math.round(perKmSen * price.distanceKm);
    rows.push(["Base Fare", formatMyr(baseFareSen)]);
    rows.push([
      `${formatMyr(perKmSen)} per km × ${price.distanceKm.toFixed(1)} km`,
      formatMyr(metered - baseFareSen),
    ]);
    if (metered < minimumFareSen) {
      rows.push(["Minimum Fare Applies", formatMyr(price.subtotalSen)]);
    }
  } else if (price.hourly) {
    const { hourly } = price;
    rows.push([
      hourly.includedHours === hourly.packageHours
        ? `${durationLabel(hourly.packageHours)} from ${hourly.zone}`
        : `${durationLabel(hourly.packageHours)} from ${hourly.zone}, covers ${durationLabel(hourly.includedHours)}`,
      formatMyr(hourly.packageSen),
    ]);
    if (hourly.extraHours > 0) {
      rows.push([
        `Extra Hours, ${hourly.extraHours} × ${formatMyr(hourly.extraHourSen)}`,
        formatMyr(hourly.extraSen),
      ]);
    }
    if (hourly.road && hourly.road.extraSen > 0) {
      rows.push([
        `Extra Road, ${kmLabel(hourly.road.chargedKm)} × ${formatMyr(hourly.road.perKmSen)}`,
        formatMyr(hourly.road.extraSen),
      ]);
    }
  } else if (price.hours !== null) {
    rows.push([
      `${formatMyr(price.rates.hourlyRateSen ?? 0)} per hour × ${price.hours} hours`,
      formatMyr(price.subtotalSen),
    ]);
  }
  // Items priced before rates were set per location carry a state's multiplier.
  if (price.multiplier !== 1) {
    rows.push([`Area Rate × ${price.multiplier}`, formatMyr(price.totalSen)]);
  }
  if (price.surcharge) {
    rows.push([
      price.surcharge.percent !== null
        ? `Odd Hours, +${price.surcharge.percent}%`
        : "Odd Hours",
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
  if (price.guide) {
    rows.push([
      CHARGE_LABELS.guide(price.guide.language),
      formatMyr(price.guide.amountSen),
    ]);
  }
  return rows;
}
