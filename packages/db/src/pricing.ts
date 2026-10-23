import type { OfferingRules } from "./booking-rules";
import { isTripMode, type TripMode } from "./booking-status";
import type { SurchargeCharge } from "./rates-input";
import {
  zoneTripCharge,
  zoneTripChargeOf,
  type ZoneTripCharge,
  type ZoneTripMeasure,
} from "./zone-trip";

/**
 * Instant pricing for a trip with a driver, car or coach. Pure and
 * unit-tested; the server calls it and never trusts a price from the client.
 * Money is integer sen. See docs/261023-nearest-zone-pricing.md.
 *
 *   one-way: the grid's cell for the two zones, plus the extra road at
 *   the rate per extra km when an end is outside every zone and the trip
 *   is longer than the grid trip (./zone-trip)
 *   hourly:  hourlyRate x hours
 *   then the odd-hours surcharge, when the pickup is in the window: a
 *   percentage of the price, or a flat amount
 *   then the charge for the model the customer chose, when they chose
 *   one: a percentage of the price before the surcharge, or a flat amount
 */

/** The rates a location sells a class at, as stored on `LocationVehicleClass`. */
export type TripRates = {
  /** The rate per extra km: the road past a zone's edge. */
  perKmSen: number;
  hourlyRateSen: number;
};

/**
 * The rates a receipt keeps. Receipts from before nearest-zone pricing
 * also keep the base fare and the minimum fare of the metered price they
 * may have been priced by; none written since does.
 */
export type ReceiptRates = TripRates & {
  baseFareSen?: number;
  minimumFareSen?: number;
};

/** What a trip is priced by: the road distance, or the hours of the hire. */
export type PricingBasis =
  { mode: "oneway"; distanceKm: number } | { mode: "hourly"; hours: number };

/** A fixed price from the location's rate grid, named by its two zones. */
export type RouteRate = {
  fromZone: string;
  toZone: string;
  rateSen: number;
};

export type TripPriceInput = {
  trip: PricingBasis;
  rates: TripRates;
  /** The grid's cell for a one-way trip's two zones; required for one-way, none for hourly. */
  route?: RouteRate | null;
  /** What a one-way trip with an end outside every zone measured; null when both ends are in zones. */
  zoneTrip?: ZoneTripMeasure | null;
  /** What the odd-hours surcharge adds, when the pickup is in the window; null otherwise. */
  surcharge?: SurchargeCharge | null;
};

/** The receipt stored on the booking item: every input and the result. */
export type TripPriceBreakdown = {
  mode: TripMode;
  rates: ReceiptRates;
  /** One-way: the full road distance, pin to pin. */
  distanceKm: number | null;
  hours: number | null;
  /** The grid's cell the price is; null for hourly hire, and on receipts that were metered. */
  route: RouteRate | null;
  /**
   * The road past a zone's edge, for a trip with an end outside every
   * zone: both ends' zones, the distances and what the extra road added.
   * Null when both ends were in zones, for hourly hire, and on receipts
   * from before nearest-zone pricing.
   */
  zoneTrip: ZoneTripCharge | null;
  /** The surcharge that was added, and its percentage when it was one; null when none applied. */
  surcharge: { percent: number | null; amountSen: number } | null;
  /** The model the customer chose, by name, and what choosing it added; null when any model would do. */
  model: { name: string; percent: number | null; amountSen: number } | null;
  /** Before the surcharge and the model. */
  subtotalSen: number;
  totalSen: number;
  /**
   * The state's multiplier, on items priced before rates were set per
   * location (docs/261015-locations-as-operation-areas.md). 1 since.
   */
  multiplier: number;
};

export function priceTrip(input: TripPriceInput): TripPriceBreakdown {
  const { trip, rates } = input;
  const route = input.route ?? null;
  const measure = input.zoneTrip ?? null;
  const charge = input.surcharge ?? null;
  if (charge?.percent != null && !(charge.percent >= 0)) {
    throw new RangeError("the surcharge percent must be zero or more");
  }
  if (charge?.flatSen != null && !(charge.flatSen >= 0)) {
    throw new RangeError("the flat surcharge must be zero or more");
  }

  let subtotalSen: number;
  let zoneTrip: ZoneTripCharge | null = null;
  if (trip.mode === "oneway") {
    if (!(trip.distanceKm >= 0)) {
      throw new RangeError("distanceKm must be zero or more");
    }
    if (!route) throw new RangeError("a one-way trip is priced by a route");
    if (!(route.rateSen >= 0)) {
      throw new RangeError("rateSen must be zero or more");
    }
    zoneTrip = measure ? zoneTripCharge(measure, rates.perKmSen) : null;
    subtotalSen = route.rateSen + (zoneTrip?.extraSen ?? 0);
  } else {
    if (!(trip.hours > 0)) throw new RangeError("hours must be positive");
    if (route || measure) throw new RangeError("an hourly hire has no route");
    subtotalSen = rates.hourlyRateSen * trip.hours;
  }

  const surcharge: TripPriceBreakdown["surcharge"] =
    charge && (charge.percent !== null ? charge.percent : charge.flatSen) > 0
      ? {
          percent: charge.percent,
          amountSen: chargeAmountSen(charge, subtotalSen),
        }
      : null;

  return {
    mode: trip.mode,
    rates: { perKmSen: rates.perKmSen, hourlyRateSen: rates.hourlyRateSen },
    distanceKm: trip.mode === "oneway" ? trip.distanceKm : null,
    hours: trip.mode === "hourly" ? trip.hours : null,
    route: route
      ? {
          fromZone: route.fromZone,
          toZone: route.toZone,
          rateSen: route.rateSen,
        }
      : null,
    zoneTrip,
    surcharge,
    model: null,
    subtotalSen,
    totalSen: subtotalSen + (surcharge?.amountSen ?? 0),
    multiplier: 1,
  };
}

/** What a charge adds to a price: its percentage of it, to the nearest sen, or its flat amount. */
export function chargeAmountSen(charge: SurchargeCharge, priceSen: number) {
  return charge.percent !== null
    ? Math.round((priceSen * charge.percent) / 100)
    : charge.flatSen;
}

/**
 * The receipt with the model the customer chose: the charge for choosing
 * it, worked on the price before the surcharge, added to the total. A
 * model already on the receipt is replaced.
 */
export function withModelChoice(
  price: TripPriceBreakdown,
  modelName: string,
  charge: SurchargeCharge,
): TripPriceBreakdown {
  if (!((charge.percent !== null ? charge.percent : charge.flatSen) >= 0)) {
    throw new RangeError("the model charge must be zero or more");
  }
  const amountSen = chargeAmountSen(charge, price.subtotalSen);
  return {
    ...price,
    model: { name: modelName, percent: charge.percent, amountSen },
    totalSen: price.totalSen - (price.model?.amountSen ?? 0) + amountSen,
  };
}

/**
 * The least a class can cost at a location: its cheapest cell on the
 * location's grid, or its shortest hourly hire when that is less. For
 * "from RM 80" where no trip is known yet. `cheapestCellSen` is null when
 * the grid prices no route for the class.
 */
export function startingPriceSen(
  offering: Pick<TripRates, "hourlyRateSen"> &
    Pick<OfferingRules, "minHourlyHours">,
  cheapestCellSen: number | null,
) {
  const hourly = offering.hourlyRateSen * offering.minHourlyHours;
  return cheapestCellSen === null ? hourly : Math.min(cheapestCellSen, hourly);
}

/** The rates on a receipt: the two kept since, and the old metered pair where it has them. */
function receiptRatesOf(value: unknown): ReceiptRates | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.perKmSen !== "number" || typeof r.hourlyRateSen !== "number") {
    return null;
  }
  return {
    perKmSen: r.perKmSen,
    hourlyRateSen: r.hourlyRateSen,
    ...(typeof r.baseFareSen === "number"
      ? { baseFareSen: r.baseFareSen }
      : {}),
    ...(typeof r.minimumFareSen === "number"
      ? { minimumFareSen: r.minimumFareSen }
      : {}),
  };
}

function isRouteRate(value: unknown): value is RouteRate {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.fromZone === "string" &&
    typeof r.toZone === "string" &&
    typeof r.rateSen === "number"
  );
}

function isSurcharge(
  value: unknown,
): value is NonNullable<TripPriceBreakdown["surcharge"]> {
  if (typeof value !== "object" || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    (typeof s.percent === "number" || s.percent === null) &&
    typeof s.amountSen === "number"
  );
}

function isModelCharge(
  value: unknown,
): value is NonNullable<TripPriceBreakdown["model"]> {
  return (
    isSurcharge(value) && typeof (value as { name?: unknown }).name === "string"
  );
}

/**
 * Reads a stored `priceBreakdown` back from JSON, in the shape above or one
 * before it (a multiplier, no route, no surcharge, no model, no zone trip,
 * a base fare and a minimum fare). Null when the value is not a receipt.
 */
export function priceBreakdownOf(value: unknown): TripPriceBreakdown | null {
  if (typeof value !== "object" || value === null) return null;
  const p = value as Record<string, unknown>;
  const nullableNumber = (v: unknown) => v === null || typeof v === "number";
  const rates = receiptRatesOf(p.rates);
  if (
    !isTripMode(p.mode) ||
    !rates ||
    !nullableNumber(p.distanceKm) ||
    !nullableNumber(p.hours) ||
    typeof p.subtotalSen !== "number" ||
    typeof p.totalSen !== "number"
  ) {
    return null;
  }
  return {
    mode: p.mode,
    rates,
    distanceKm: p.distanceKm as number | null,
    hours: p.hours as number | null,
    route: isRouteRate(p.route) ? p.route : null,
    zoneTrip: zoneTripChargeOf(p.zoneTrip),
    surcharge: isSurcharge(p.surcharge) ? p.surcharge : null,
    model: isModelCharge(p.model) ? p.model : null,
    subtotalSen: p.subtotalSen,
    totalSen: p.totalSen,
    multiplier: typeof p.multiplier === "number" ? p.multiplier : 1,
  };
}
