import { checkHours, checkPickupWindow } from "./booking-rules";
import type { CarMode } from "./booking-status";
import type { PreparedItem } from "./bookings";
import { Prisma } from "./generated/prisma/client";
import type { Place } from "./place";
import { priceCarTrip, type CarPriceBreakdown, type CarTrip } from "./pricing";
import {
  fitsPassengers,
  listActiveVehicleClasses,
  type VehicleClass,
} from "./vehicle-classes";
import { resolveZone, type Zone } from "./zones";

/**
 * The car-with-driver product: what a customer asks for, what it costs, and
 * how it becomes a booking item. Everything product-specific lives here; the
 * booking core in bookings.ts only sees a `PreparedItem`.
 */

export type CarTripRequest = {
  mode: CarMode;
  pickup: Place;
  /** Required for one-way, ignored for hourly. */
  dropoff: Place | null;
  startsAt: Date;
  /** Hourly only. */
  hours: number | null;
  /** One-way only; null when the places provider cannot route. */
  distanceKm: number | null;
};

export type CarItemRequest = CarTripRequest & {
  vehicleClassId: string;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
};

export type CarQuoteErrorCode =
  | "not-served"
  | "too-soon"
  | "too-far"
  | "dropoff-required"
  | "distance-unavailable"
  | "hours"
  | "class-unavailable"
  | "passengers";

export type CarQuoteError = { code: CarQuoteErrorCode; message: string };

export type ClassQuote = {
  vehicleClass: VehicleClass;
  price: CarPriceBreakdown;
};

export type CarQuote = {
  zone: Zone;
  trip: CarTrip;
  classes: ClassQuote[];
};

export type CarQuoteResult =
  { ok: true; quote: CarQuote } | { ok: false; error: CarQuoteError };

const fail = (code: CarQuoteErrorCode, message: string): CarQuoteResult => ({
  ok: false,
  error: { code, message },
});

/**
 * Every active class priced for one trip, or the reason the trip cannot be
 * booked. The options page shows the result; `prepareCarItem` reuses it so a
 * booking is never created from a trip the options page would have refused.
 */
export async function quoteCarTrip(
  request: CarTripRequest,
  now: Date = new Date(),
): Promise<CarQuoteResult> {
  const zone = await resolveZone(request.pickup);
  if (!zone || !zone.isActive) {
    return fail("not-served", "We do not serve that pickup area yet.");
  }

  const window = checkPickupWindow(request.startsAt, zone, now);
  if (!window.ok) {
    return window.reason === "too-soon"
      ? fail("too-soon", "That pickup is too soon. Choose a later time.")
      : fail(
          "too-far",
          "That pickup is too far ahead. Choose an earlier date.",
        );
  }

  let trip: CarTrip;
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
    trip = { mode: "oneway", distanceKm: request.distanceKm };
  } else {
    const hours = request.hours ?? 0;
    if (!checkHours(hours).ok) {
      return fail("hours", "Choose how many hours you need the driver for.");
    }
    trip = { mode: "hourly", hours };
  }

  const classes = (await listActiveVehicleClasses()).map((vehicleClass) => ({
    vehicleClass,
    price: priceCarTrip({
      trip,
      rates: vehicleClass,
      multiplier: zone.multiplier,
    }),
  }));

  return { ok: true, quote: { zone, trip, classes } };
}

export type PrepareCarItemResult =
  | {
      ok: true;
      item: PreparedItem;
      /** The same values as `item`, typed for display. */
      vehicleClass: VehicleClass;
      price: CarPriceBreakdown;
    }
  | { ok: false; error: CarQuoteError };

/** A customer's choice, validated and priced, ready for `createBooking`. */
export async function prepareCarItem(
  request: CarItemRequest,
  now: Date = new Date(),
): Promise<PrepareCarItemResult> {
  const quoted = await quoteCarTrip(request, now);
  if (!quoted.ok) return quoted;
  const { zone, trip, classes } = quoted.quote;

  const chosen = classes.find(
    (c) => c.vehicleClass.id === request.vehicleClassId,
  );
  if (!chosen) {
    return {
      ok: false,
      error: {
        code: "class-unavailable",
        message: "That vehicle class is no longer available.",
      },
    };
  }
  if (!fitsPassengers(chosen.vehicleClass, request.passengers)) {
    return {
      ok: false,
      error: {
        code: "passengers",
        message: `${chosen.vehicleClass.name} seats ${chosen.vehicleClass.minPassengers} to ${chosen.vehicleClass.maxPassengers} passengers.`,
      },
    };
  }

  return {
    ok: true,
    vehicleClass: chosen.vehicleClass,
    price: chosen.price,
    item: {
      product: "car-with-driver",
      startsAt: request.startsAt,
      zoneId: zone.id,
      priceTotalSen: chosen.price.totalSen,
      priceBreakdown: chosen.price,
      carDetails: {
        vehicleClass: { connect: { id: chosen.vehicleClass.id } },
        vehicleClassName: chosen.vehicleClass.name,
        mode: trip.mode,
        pickupPlace: request.pickup,
        dropoffPlace:
          trip.mode === "oneway" && request.dropoff
            ? request.dropoff
            : Prisma.DbNull,
        hours: trip.mode === "hourly" ? trip.hours : null,
        distanceKm: trip.mode === "oneway" ? trip.distanceKm : null,
        passengers: request.passengers,
        childSeats: request.childSeats,
        flightNumber: request.flightNumber,
        notes: request.notes,
      },
    },
  };
}
