import { isCarMode, type CarMode } from "./booking-status";

/**
 * Instant pricing for a car with driver. Pure and unit-tested; the server
 * calls it and never trusts a price from the client. Money is integer sen.
 * See docs/car-with-driver.md, "Pricing".
 *
 *   one-way: max(minimumFare, baseFare + perKm x distanceKm) x multiplier
 *   hourly:  hourlyRate x hours x multiplier
 */

/** The rates of a vehicle class, as stored on `VehicleClass`. */
export type CarRates = {
  baseFareSen: number;
  perKmSen: number;
  hourlyRateSen: number;
  minimumFareSen: number;
};

export type CarTrip =
  { mode: "oneway"; distanceKm: number } | { mode: "hourly"; hours: number };

export type CarPriceInput = {
  trip: CarTrip;
  rates: CarRates;
  /** The pickup zone's multiplier; 1 means no change. */
  multiplier: number;
};

/** The receipt stored on the booking item: every input and the result. */
export type CarPriceBreakdown = {
  mode: CarMode;
  rates: CarRates;
  multiplier: number;
  distanceKm: number | null;
  hours: number | null;
  /** Before the multiplier. */
  subtotalSen: number;
  totalSen: number;
};

export function priceCarTrip(input: CarPriceInput): CarPriceBreakdown {
  const { trip, rates, multiplier } = input;
  if (!(multiplier > 0)) throw new RangeError("multiplier must be positive");

  let subtotalSen: number;
  if (trip.mode === "oneway") {
    if (!(trip.distanceKm >= 0)) {
      throw new RangeError("distanceKm must be zero or more");
    }
    const metered =
      rates.baseFareSen + Math.round(rates.perKmSen * trip.distanceKm);
    subtotalSen = Math.max(rates.minimumFareSen, metered);
  } else {
    if (!(trip.hours > 0)) throw new RangeError("hours must be positive");
    subtotalSen = rates.hourlyRateSen * trip.hours;
  }

  return {
    mode: trip.mode,
    rates: {
      baseFareSen: rates.baseFareSen,
      perKmSen: rates.perKmSen,
      hourlyRateSen: rates.hourlyRateSen,
      minimumFareSen: rates.minimumFareSen,
    },
    multiplier,
    distanceKm: trip.mode === "oneway" ? trip.distanceKm : null,
    hours: trip.mode === "hourly" ? trip.hours : null,
    subtotalSen,
    totalSen: Math.round(subtotalSen * multiplier),
  };
}

function isCarRates(value: unknown): value is CarRates {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.baseFareSen === "number" &&
    typeof r.perKmSen === "number" &&
    typeof r.hourlyRateSen === "number" &&
    typeof r.minimumFareSen === "number"
  );
}

/** Reads a stored `priceBreakdown` back from JSON. */
export function isCarPriceBreakdown(
  value: unknown,
): value is CarPriceBreakdown {
  if (typeof value !== "object" || value === null) return false;
  const p = value as Record<string, unknown>;
  const nullableNumber = (v: unknown) => v === null || typeof v === "number";
  return (
    isCarMode(p.mode) &&
    isCarRates(p.rates) &&
    typeof p.multiplier === "number" &&
    nullableNumber(p.distanceKm) &&
    nullableNumber(p.hours) &&
    typeof p.subtotalSen === "number" &&
    typeof p.totalSen === "number"
  );
}
