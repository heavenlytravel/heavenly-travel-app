import {
  checkHours,
  classAvailability,
  fitsPassengers,
  isWithinHorizon,
  type ClassAvailability,
} from "./booking-rules";
import {
  offersChildSeats,
  type TripCategory,
  type TripMode,
} from "./booking-status";
import type { PreparedItem } from "./bookings";
import { Prisma } from "./generated/prisma/client";
import type { Place } from "./place";
import {
  priceTrip,
  type PricingBasis,
  type TripPriceBreakdown,
} from "./pricing";
import { listActiveVehicleClasses, type VehicleClass } from "./vehicle-classes";
import { resolveZone, type Zone } from "./zones";

/**
 * The transportation product, car with driver and coach charter alike: what
 * a customer asks for, what it costs, and how it becomes a booking item. The
 * category only decides which vehicle classes are offered. Everything
 * product-specific lives here; the booking core in bookings.ts only sees a
 * `PreparedItem`. See docs/260928-coach-charter.md.
 */

export type TripRequest = {
  mode: TripMode;
  pickup: Place;
  /** Required for one-way, ignored for hourly. */
  dropoff: Place | null;
  startsAt: Date;
  /** Hourly only. */
  hours: number | null;
  /** One-way only; null when the places provider cannot route. */
  distanceKm: number | null;
};

export type TripItemRequest = TripRequest & {
  vehicleClassId: string;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
};

export type TripQuoteErrorCode =
  | "not-served"
  | "too-far"
  | "dropoff-required"
  | "distance-unavailable"
  | "hours"
  | "class-unavailable"
  | "too-soon"
  | "too-few-hours"
  | "passengers";

export type TripQuoteError = { code: TripQuoteErrorCode; message: string };

export type ClassQuote = {
  vehicleClass: VehicleClass;
  price: TripPriceBreakdown;
  /** Whether the class's own rules accept this trip. */
  availability: ClassAvailability;
};

export type TripQuote = {
  category: TripCategory;
  zone: Zone;
  basis: PricingBasis;
  classes: ClassQuote[];
};

export type TripQuoteResult =
  { ok: true; quote: TripQuote } | { ok: false; error: TripQuoteError };

const fail = (code: TripQuoteErrorCode, message: string) => ({
  ok: false as const,
  error: { code, message },
});

const HOUR_MS = 60 * 60 * 1000;

/**
 * Every active class in the category priced for one trip, each with its
 * availability, or the reason the trip cannot be booked at all. The options
 * page shows the result; `prepareTripItem` reuses it so a booking is never
 * created from a trip the options page would have refused.
 */
export async function quoteTrip(
  category: TripCategory,
  request: TripRequest,
  now: Date = new Date(),
): Promise<TripQuoteResult> {
  const zone = (await resolveZone(request.pickup))?.zone;
  if (!zone || !zone.isActive) {
    return fail("not-served", "We do not serve that pickup area yet.");
  }

  if (!isWithinHorizon(request.startsAt, now)) {
    return fail(
      "too-far",
      "That pickup is too far ahead. Choose an earlier date.",
    );
  }

  let basis: PricingBasis;
  if (request.mode === "oneway") {
    if (!request.dropoff) {
      return fail("dropoff-required", "Choose a drop-off for a one-way trip.");
    }
    if (request.distanceKm === null) {
      return fail(
        "distance-unavailable",
        "We cannot price that route right now. Try again later.",
      );
    }
    basis = { mode: "oneway", distanceKm: request.distanceKm };
  } else {
    const hours = request.hours ?? 0;
    if (!checkHours(hours).ok) {
      return fail("hours", "Choose how many hours you need the driver for.");
    }
    basis = { mode: "hourly", hours };
  }

  const hours = basis.mode === "hourly" ? basis.hours : null;
  const classes = (await listActiveVehicleClasses(category)).map(
    (vehicleClass) => ({
      vehicleClass,
      price: priceTrip({
        trip: basis,
        rates: vehicleClass,
        multiplier: zone.multiplier,
      }),
      availability: classAvailability(
        vehicleClass,
        { startsAt: request.startsAt, hours },
        now,
      ),
    }),
  );

  return { ok: true, quote: { category, zone, basis, classes } };
}

export type PrepareTripItemResult =
  | {
      ok: true;
      item: PreparedItem;
      /** The same values as `item`, typed for display. */
      vehicleClass: VehicleClass;
      price: TripPriceBreakdown;
    }
  | { ok: false; error: TripQuoteError };

/**
 * A customer's choice, validated and priced, ready for `createBooking`. The
 * item snapshots the class's name, category and cancellation cutoff, so what
 * was booked never changes when ops edits or retires the class.
 */
export async function prepareTripItem(
  category: TripCategory,
  request: TripItemRequest,
  now: Date = new Date(),
): Promise<PrepareTripItemResult> {
  const quoted = await quoteTrip(category, request, now);
  if (!quoted.ok) return quoted;
  const { zone, basis, classes } = quoted.quote;

  const chosen = classes.find(
    (c) => c.vehicleClass.id === request.vehicleClassId,
  );
  if (!chosen) {
    return fail(
      "class-unavailable",
      "That vehicle class is no longer available.",
    );
  }
  const { vehicleClass, price, availability } = chosen;
  if (!availability.ok) {
    return availability.reason === "too-soon"
      ? fail(
          "too-soon",
          `${vehicleClass.name} needs ${availability.minLeadHours} hours notice. Choose a later time.`,
        )
      : fail(
          "too-few-hours",
          `${vehicleClass.name} is hired for at least ${availability.minHourlyHours} hours.`,
        );
  }
  if (!fitsPassengers(vehicleClass, request.passengers)) {
    return fail(
      "passengers",
      `${vehicleClass.name} seats up to ${vehicleClass.maxPassengers} passengers.`,
    );
  }

  return {
    ok: true,
    vehicleClass,
    price,
    item: {
      product: "transportation",
      startsAt: request.startsAt,
      endsAt:
        basis.mode === "hourly"
          ? new Date(request.startsAt.getTime() + basis.hours * HOUR_MS)
          : null,
      cancellationCutoffHours: vehicleClass.cancellationCutoffHours,
      zoneId: zone.id,
      priceTotalSen: price.totalSen,
      priceBreakdown: price,
      tripDetails: {
        vehicleClass: { connect: { id: vehicleClass.id } },
        vehicleClassName: vehicleClass.name,
        vehicleClassCategory: category,
        mode: basis.mode,
        pickupPlace: request.pickup,
        dropoffPlace:
          basis.mode === "oneway" && request.dropoff
            ? request.dropoff
            : Prisma.DbNull,
        hours: basis.mode === "hourly" ? basis.hours : null,
        distanceKm: basis.mode === "oneway" ? basis.distanceKm : null,
        passengers: request.passengers,
        childSeats: offersChildSeats(category) ? request.childSeats : 0,
        flightNumber: request.flightNumber,
        notes: request.notes,
      },
    },
  };
}
