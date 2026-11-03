import { isTripMode, type TripMode } from "./booking-status";
import {
  hourlyReceiptOf,
  hourlyRoadCharge,
  type HourlyCharge,
  type HourlyReceipt,
} from "./hourly-input";
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
 *   hourly:  the package's price from the pickup's zone, plus the extra
 *   hours at the location's rate, plus, for a pickup outside every zone,
 *   its road to that zone past the free km at the rate per extra km
 *   (./hourly-input)
 *   then the odd-hours surcharge, when the pickup is in the window, and
 *   the weekend and holiday surcharge, when the pickup's day is one: each
 *   a percentage of the price, or a flat amount
 *   then the charge for the model the customer chose, when they chose
 *   one: a percentage of the price before the surcharge, or a flat amount
 */

/** The rates a location sells a class at, as stored on `LocationVehicleClass`. */
export type TripRates = {
  /** The rate per extra km: the road past a zone's edge. */
  perKmSen: number;
};

/**
 * The rates a receipt keeps. Receipts from before the hourly grid keep the
 * hourly rate they were priced by, and receipts from before nearest-zone
 * pricing also the base fare and the minimum fare of the metered price;
 * none written since does.
 */
export type ReceiptRates = TripRates & {
  hourlyRateSen?: number;
  baseFareSen?: number;
  minimumFareSen?: number;
};

/** What a trip is priced by: the road distance, or the hours of the hire, the package's plus the extra. */
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
  /** The hourly list's price for the class; required for hourly, none for one-way. */
  hourly?: HourlyCharge | null;
  /** Hourly: the pickup's road to its nearest zone's edge, in km, when it is outside every zone; null when inside one. */
  hourlyRoadKm?: number | null;
  /** What a one-way trip with an end outside every zone measured; null when both ends are in zones. */
  zoneTrip?: ZoneTripMeasure | null;
  /** The location's free extra road of each end, in whole km; 0 when none. */
  freeExtraKm?: number;
  /** What the odd-hours surcharge adds, when the pickup is in the window; null otherwise. */
  surcharge?: SurchargeCharge | null;
  /** What the weekend and holiday surcharge adds, and why, when the pickup's day is one; null otherwise. */
  weekend?: { charge: SurchargeCharge; reason: WeekendReason } | null;
};

/** Why the weekend and holiday surcharge applied. */
export const WEEKEND_REASONS = ["weekend", "holiday"] as const;
export type WeekendReason = (typeof WEEKEND_REASONS)[number];

/** How a receipt names the surcharge, by why it applied. */
export const WEEKEND_REASON_LABELS: Record<WeekendReason, string> = {
  weekend: "Weekend",
  holiday: "Public holiday",
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
  /** The package, the extra hours and the pickup's road the price is; null for one-way, and on hourly receipts from before the hourly grid. */
  hourly: HourlyReceipt | null;
  /**
   * The road past a zone's edge, for a trip with an end outside every
   * zone: both ends' zones, the distances and what the extra road added.
   * Null when both ends were in zones, for hourly hire, and on receipts
   * from before nearest-zone pricing.
   */
  zoneTrip: ZoneTripCharge | null;
  /** The surcharge that was added, and its percentage when it was one; null when none applied. */
  surcharge: { percent: number | null; amountSen: number } | null;
  /** The weekend and holiday surcharge that was added, and why; null when none applied, and on receipts from before it. */
  weekend: {
    reason: WeekendReason;
    percent: number | null;
    amountSen: number;
  } | null;
  /** The model the customer chose, by name, and what choosing it added; null when any model would do. */
  model: { name: string; percent: number | null; amountSen: number } | null;
  /**
   * The tour guide paid for, in their language, at the location's guide
   * rate for the trip, with no surcharge; null without one, and on
   * receipts from before guides were priced.
   */
  guide: { language: string; amountSen: number } | null;
  /** Before the surcharges, the model and the guide. */
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
  const hourlyCharge = input.hourly ?? null;
  let hourly: HourlyReceipt | null = null;
  const measure = input.zoneTrip ?? null;
  const charge = input.surcharge ?? null;
  const weekendCharge = input.weekend ?? null;
  for (const c of [charge, weekendCharge?.charge ?? null]) {
    if (c?.percent != null && !(c.percent >= 0)) {
      throw new RangeError("the surcharge percent must be zero or more");
    }
    if (c?.flatSen != null && !(c.flatSen >= 0)) {
      throw new RangeError("the flat surcharge must be zero or more");
    }
  }

  let subtotalSen: number;
  let zoneTrip: ZoneTripCharge | null = null;
  if (trip.mode === "oneway") {
    if (!(trip.distanceKm >= 0)) {
      throw new RangeError("distanceKm must be zero or more");
    }
    if (!route) throw new RangeError("a one-way trip is priced by a route");
    if (hourlyCharge) throw new RangeError("a one-way trip has no package");
    if (!(route.rateSen >= 0)) {
      throw new RangeError("rateSen must be zero or more");
    }
    zoneTrip = measure
      ? zoneTripCharge(measure, rates.perKmSen, input.freeExtraKm ?? 0)
      : null;
    subtotalSen = route.rateSen + (zoneTrip?.extraSen ?? 0);
  } else {
    if (!(trip.hours > 0)) throw new RangeError("hours must be positive");
    if (route || measure) throw new RangeError("an hourly hire has no route");
    if (!hourlyCharge) {
      throw new RangeError("an hourly hire is priced by a package");
    }
    if (hourlyCharge.includedHours + hourlyCharge.extraHours !== trip.hours) {
      throw new RangeError("hours must be the package's plus the extra");
    }
    if (!(hourlyCharge.packageSen >= 0) || !(hourlyCharge.extraHourSen >= 0)) {
      throw new RangeError("hourly prices must be zero or more");
    }
    const roadKm = input.hourlyRoadKm ?? null;
    hourly = {
      ...hourlyCharge,
      road:
        roadKm === null
          ? null
          : hourlyRoadCharge(roadKm, rates.perKmSen, input.freeExtraKm ?? 0),
    };
    subtotalSen =
      hourly.packageSen + hourly.extraSen + (hourly.road?.extraSen ?? 0);
  }

  const adds = (c: SurchargeCharge | null) =>
    c && (c.percent !== null ? c.percent : c.flatSen) > 0
      ? { percent: c.percent, amountSen: chargeAmountSen(c, subtotalSen) }
      : null;
  const surcharge: TripPriceBreakdown["surcharge"] = adds(charge);
  const weekendAdds = adds(weekendCharge?.charge ?? null);
  const weekend: TripPriceBreakdown["weekend"] =
    weekendCharge && weekendAdds
      ? { reason: weekendCharge.reason, ...weekendAdds }
      : null;

  return {
    mode: trip.mode,
    rates: { perKmSen: rates.perKmSen },
    distanceKm: trip.mode === "oneway" ? trip.distanceKm : null,
    hours: trip.mode === "hourly" ? trip.hours : null,
    route: route
      ? {
          fromZone: route.fromZone,
          toZone: route.toZone,
          rateSen: route.rateSen,
        }
      : null,
    hourly,
    zoneTrip,
    surcharge,
    weekend,
    model: null,
    guide: null,
    subtotalSen,
    totalSen:
      subtotalSen + (surcharge?.amountSen ?? 0) + (weekend?.amountSen ?? 0),
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
 * it, worked on the price before the surcharges, added to the total. A
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
 * The receipt with the tour guide: their language and price, added to the
 * total as it is, or none. A guide already on the receipt is replaced.
 */
export function withGuideCharge(
  price: TripPriceBreakdown,
  guide: { language: string; amountSen: number } | null,
): TripPriceBreakdown {
  if (guide && !(guide.amountSen >= 0)) {
    throw new RangeError("the guide's price must be zero or more");
  }
  return {
    ...price,
    guide,
    totalSen:
      price.totalSen - (price.guide?.amountSen ?? 0) + (guide?.amountSen ?? 0),
  };
}

/**
 * The least a class can cost at a location: its cheapest cell on the
 * location's grid, or its cheapest hourly package when that is less. For
 * "from RM 80" where no trip is known yet. Each is null when the location
 * prices none in the class; null when neither does.
 */
export function startingPriceSen(
  cheapestCellSen: number | null,
  cheapestPackageSen: number | null,
): number | null {
  if (cheapestCellSen === null) return cheapestPackageSen;
  if (cheapestPackageSen === null) return cheapestCellSen;
  return Math.min(cheapestCellSen, cheapestPackageSen);
}

/** The rates on a receipt: the rate per km, and the old hourly rate and metered pair where it has them. */
function receiptRatesOf(value: unknown): ReceiptRates | null {
  if (typeof value !== "object" || value === null) return null;
  const r = value as Record<string, unknown>;
  if (typeof r.perKmSen !== "number") return null;
  return {
    perKmSen: r.perKmSen,
    ...(typeof r.hourlyRateSen === "number"
      ? { hourlyRateSen: r.hourlyRateSen }
      : {}),
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

function isWeekendCharge(
  value: unknown,
): value is NonNullable<TripPriceBreakdown["weekend"]> {
  if (!isSurcharge(value)) return false;
  const reason = (value as { reason?: unknown }).reason;
  return reason === "weekend" || reason === "holiday";
}

function isModelCharge(
  value: unknown,
): value is NonNullable<TripPriceBreakdown["model"]> {
  return (
    isSurcharge(value) && typeof (value as { name?: unknown }).name === "string"
  );
}

function isGuideCharge(
  value: unknown,
): value is NonNullable<TripPriceBreakdown["guide"]> {
  if (typeof value !== "object" || value === null) return false;
  const g = value as Record<string, unknown>;
  return typeof g.language === "string" && typeof g.amountSen === "number";
}

/**
 * Reads a stored `priceBreakdown` back from JSON, in the shape above or one
 * before it (a multiplier, no route, no surcharge, no model, no zone trip,
 * no guide, a base fare and a minimum fare, no weekend surcharge, an hourly rate in
 * place of a package). Null when the value is not a receipt.
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
    hourly: hourlyReceiptOf(p.hourly),
    zoneTrip: zoneTripChargeOf(p.zoneTrip),
    surcharge: isSurcharge(p.surcharge) ? p.surcharge : null,
    weekend: isWeekendCharge(p.weekend) ? p.weekend : null,
    model: isModelCharge(p.model) ? p.model : null,
    guide: isGuideCharge(p.guide) ? p.guide : null,
    subtotalSen: p.subtotalSen,
    totalSen: p.totalSen,
    multiplier: typeof p.multiplier === "number" ? p.multiplier : 1,
  };
}
