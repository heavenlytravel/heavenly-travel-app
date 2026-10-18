import { isTripMode, type TripMode } from "./booking-status";
import type { SurchargeCharge } from "./rates-input";

/**
 * Instant pricing for a trip with a driver, car or coach. Pure and
 * unit-tested; the server calls it and never trusts a price from the client.
 * Money is integer sen. See docs/261015-locations-as-operation-areas.md,
 * "Zones and zone-to-zone rates".
 *
 *   one-way, on a route with a fixed rate: the rate
 *   one-way, metered: max(minimumFare, baseFare + perKm x distanceKm)
 *   hourly:  hourlyRate x hours
 *   then the odd-hours surcharge, when the pickup is in the window: a
 *   percentage of the price, or a flat amount
 */

/** The metered rates a location sells a class at, as stored on `LocationVehicleClass`. */
export type TripRates = {
  baseFareSen: number;
  perKmSen: number;
  hourlyRateSen: number;
  minimumFareSen: number;
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
  /** The grid's price for a one-way trip between two zones; null when the trip is metered. */
  route?: RouteRate | null;
  /** What the odd-hours surcharge adds, when the pickup is in the window; null otherwise. */
  surcharge?: SurchargeCharge | null;
};

/** The receipt stored on the booking item: every input and the result. */
export type TripPriceBreakdown = {
  mode: TripMode;
  rates: TripRates;
  distanceKm: number | null;
  hours: number | null;
  /** The fixed rate the price is, or null when the trip was metered. */
  route: RouteRate | null;
  /** The surcharge that was added, and its percentage when it was one; null when none applied. */
  surcharge: { percent: number | null; amountSen: number } | null;
  /** Before the surcharge. */
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
  const charge = input.surcharge ?? null;
  if (charge?.percent != null && !(charge.percent >= 0)) {
    throw new RangeError("the surcharge percent must be zero or more");
  }
  if (charge?.flatSen != null && !(charge.flatSen >= 0)) {
    throw new RangeError("the flat surcharge must be zero or more");
  }

  let subtotalSen: number;
  if (trip.mode === "oneway") {
    if (!(trip.distanceKm >= 0)) {
      throw new RangeError("distanceKm must be zero or more");
    }
    if (route) {
      if (!(route.rateSen >= 0)) {
        throw new RangeError("rateSen must be zero or more");
      }
      subtotalSen = route.rateSen;
    } else {
      const metered =
        rates.baseFareSen + Math.round(rates.perKmSen * trip.distanceKm);
      subtotalSen = Math.max(rates.minimumFareSen, metered);
    }
  } else {
    if (!(trip.hours > 0)) throw new RangeError("hours must be positive");
    if (route) throw new RangeError("an hourly hire has no route");
    subtotalSen = rates.hourlyRateSen * trip.hours;
  }

  let surcharge: TripPriceBreakdown["surcharge"] = null;
  if (charge?.percent != null && charge.percent > 0) {
    surcharge = {
      percent: charge.percent,
      amountSen: Math.round((subtotalSen * charge.percent) / 100),
    };
  } else if (charge?.flatSen != null && charge.flatSen > 0) {
    surcharge = { percent: null, amountSen: charge.flatSen };
  }

  return {
    mode: trip.mode,
    rates: {
      baseFareSen: rates.baseFareSen,
      perKmSen: rates.perKmSen,
      hourlyRateSen: rates.hourlyRateSen,
      minimumFareSen: rates.minimumFareSen,
    },
    distanceKm: trip.mode === "oneway" ? trip.distanceKm : null,
    hours: trip.mode === "hourly" ? trip.hours : null,
    route: route
      ? {
          fromZone: route.fromZone,
          toZone: route.toZone,
          rateSen: route.rateSen,
        }
      : null,
    surcharge,
    subtotalSen,
    totalSen: subtotalSen + (surcharge?.amountSen ?? 0),
    multiplier: 1,
  };
}

/**
 * The least a class can cost at a location: its minimum one-way fare, or
 * its shortest hourly hire when that is less. For "from RM 80" where no
 * trip is known yet.
 */
export function startingPriceSen(
  offering: Pick<TripRates, "minimumFareSen" | "hourlyRateSen"> & {
    minHourlyHours: number;
  },
) {
  return Math.min(
    offering.minimumFareSen,
    offering.hourlyRateSen * offering.minHourlyHours,
  );
}

function isTripRates(value: unknown): value is TripRates {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.baseFareSen === "number" &&
    typeof r.perKmSen === "number" &&
    typeof r.hourlyRateSen === "number" &&
    typeof r.minimumFareSen === "number"
  );
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

/**
 * Reads a stored `priceBreakdown` back from JSON, in the shape above or the
 * one before it (a multiplier, no route and no surcharge). Null when the
 * value is not a receipt.
 */
export function priceBreakdownOf(value: unknown): TripPriceBreakdown | null {
  if (typeof value !== "object" || value === null) return null;
  const p = value as Record<string, unknown>;
  const nullableNumber = (v: unknown) => v === null || typeof v === "number";
  if (
    !isTripMode(p.mode) ||
    !isTripRates(p.rates) ||
    !nullableNumber(p.distanceKm) ||
    !nullableNumber(p.hours) ||
    typeof p.subtotalSen !== "number" ||
    typeof p.totalSen !== "number"
  ) {
    return null;
  }
  return {
    mode: p.mode,
    rates: p.rates,
    distanceKm: p.distanceKm as number | null,
    hours: p.hours as number | null,
    route: isRouteRate(p.route) ? p.route : null,
    surcharge: isSurcharge(p.surcharge) ? p.surcharge : null,
    subtotalSen: p.subtotalSen,
    totalSen: p.totalSen,
    multiplier: typeof p.multiplier === "number" ? p.multiplier : 1,
  };
}
