import {
  checkHours,
  classAvailability,
  fitsPassengers,
  isWithinHorizon,
  localMinuteOfDay,
  type ClassAvailability,
} from "./booking-rules";
import {
  offersChildSeats,
  type TripCategory,
  type TripMode,
} from "./booking-status";
import type { PreparedItem } from "./bookings";
import {
  locationAt,
  resolveDistrict,
  type DistrictWithState,
} from "./coverage";
import { Prisma } from "./generated/prisma/client";
import { listActiveOfferings, type OfferingOnSale } from "./offerings";
import type { Place } from "./place";
import {
  priceTrip,
  type PricingBasis,
  type RouteRate,
  type TripPriceBreakdown,
} from "./pricing";
import {
  dropoffAllowed,
  dropoffRuleOf,
  isInOddHours,
  oddHoursOf,
  type SurchargeCharge,
} from "./rates-input";
import type { VehicleClass } from "./vehicle-classes";
import { routeRateOf, zoneAt } from "./zone-match";

/**
 * The transportation product, car with driver and coach charter alike: what
 * a customer asks for, what it costs, and how it becomes a booking item. The
 * zone the pickup falls in names the location, and the location's
 * offerings, zones and rates price the trip, wherever the drop-off is. The
 * category only
 * decides which offerings are priced. Everything product-specific lives
 * here; the booking core in bookings.ts only sees a `PreparedItem`. See
 * docs/260928-coach-charter.md and
 * docs/261015-locations-as-operation-areas.md.
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
  /** The model the customer prefers; null for no preference. */
  vehicleModelId: string | null;
  /** Whether a similar vehicle will do when the model is not free. */
  similarModelOk: boolean;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
};

export type TripQuoteErrorCode =
  | "not-served"
  | "dropoff-outside"
  | "route-not-served"
  | "too-far"
  | "dropoff-required"
  | "distance-unavailable"
  | "hours"
  | "class-unavailable"
  | "too-soon"
  | "too-few-hours"
  | "passengers"
  | "model-unavailable";

export type TripQuoteError = { code: TripQuoteErrorCode; message: string };

export type ClassQuote = {
  /** The catalogue class: its name, seats, luggage and the models the customer sees. */
  vehicleClass: OfferingOnSale["vehicleClass"];
  /** The location's offering of it: the rates and the rules. */
  offering: OfferingOnSale;
  price: TripPriceBreakdown;
  /** Whether the offering's rules accept this trip. */
  availability: ClassAvailability;
};

/** The location that priced a quote, as the screens name it. */
export type QuotedLocation = { id: string; name: string; slug: string };

export type TripQuote = {
  category: TripCategory;
  /** The district the pickup is in, for the record; null at sea. */
  district: DistrictWithState | null;
  /** The location whose rates priced the trip: the one whose zone the pickup is in. */
  location: QuotedLocation;
  basis: PricingBasis;
  /** The zone the pickup is in, by name, and the drop-off's; null outside every zone. */
  pickupZone: string;
  dropoffZone: string | null;
  /** The odd-hours surcharge that applies to this pickup time; null when none. */
  surcharge: SurchargeCharge | null;
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
 * Every offering of the category at the pickup's location, priced for one
 * trip, each with its availability, or the reason the trip cannot be
 * booked at all. The options page shows the result; `prepareTripItem`
 * reuses it so a booking is never created from a trip the options page
 * would have refused.
 */
export async function quoteTrip(
  category: TripCategory,
  request: TripRequest,
  now: Date = new Date(),
): Promise<TripQuoteResult> {
  const served = await locationAt(request.pickup);
  if (!served) {
    return fail("not-served", "We do not serve that pickup area yet.");
  }
  const { location, zone: pickupZone } = served;

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

  const [district, offerings] = await Promise.all([
    resolveDistrict(request.pickup),
    listActiveOfferings(location.id, category),
  ]);

  // The drop-off rule: where a one-way trip may end. The pickup is in a
  // zone already, whatever the rule; hourly hire has no drop-off.
  const rule = dropoffRuleOf(location);
  const dropoff = basis.mode === "oneway" ? request.dropoff : null;
  const dropoffZone = dropoff ? zoneAt(location.zones, dropoff) : null;
  if (dropoff && !dropoffAllowed(rule, dropoffZone !== null)) {
    return rule === "grid"
      ? fail(
          "route-not-served",
          `We only serve the routes on our price list from that pickup.`,
        )
      : fail(
          "dropoff-outside",
          `We only serve drop-offs within ${location.name} from that pickup.`,
        );
  }
  const cellOf = (vehicleClassId: string) =>
    dropoffZone
      ? routeRateOf(
          location.zoneRates,
          pickupZone.id,
          dropoffZone.id,
          vehicleClassId,
        )
      : null;
  // Under "grid" the route itself must be priced, for some class: a route
  // with no cell at all is not on the price list.
  if (
    dropoff &&
    rule === "grid" &&
    !offerings.some((offering) => cellOf(offering.vehicleClass.id))
  ) {
    return fail(
      "route-not-served",
      `We only serve the routes on our price list from that pickup.`,
    );
  }
  const window = oddHoursOf(location);
  const surcharge: SurchargeCharge | null =
    window && isInOddHours(window, localMinuteOfDay(request.startsAt))
      ? window.percent !== null
        ? { percent: window.percent, flatSen: null }
        : { percent: null, flatSen: window.flatSen }
      : null;

  const hours = basis.mode === "hourly" ? basis.hours : null;
  const classes = offerings.map((offering) => {
    const { vehicleClass } = offering;
    const cell = cellOf(vehicleClass.id);
    const route: RouteRate | null =
      cell && dropoffZone
        ? {
            fromZone: pickupZone.name,
            toZone: dropoffZone.name,
            rateSen: cell.priceSen,
          }
        : null;
    // Under "grid" a class with no price on the route is not offered on it.
    const availability: ClassAvailability =
      dropoff && rule === "grid" && !cell
        ? { ok: false, reason: "not-on-route" }
        : classAvailability(
            offering,
            { startsAt: request.startsAt, hours },
            now,
          );
    return {
      vehicleClass,
      offering,
      price: priceTrip({
        trip: basis,
        rates: offering,
        route,
        surcharge,
      }),
      availability,
    };
  });

  return {
    ok: true,
    quote: {
      category,
      district,
      location: {
        id: location.id,
        name: location.name,
        slug: location.slug,
      },
      basis,
      pickupZone: pickupZone.name,
      dropoffZone: dropoffZone?.name ?? null,
      surcharge,
      classes,
    },
  };
}

export type PrepareTripItemResult =
  | {
      ok: true;
      item: PreparedItem;
      /** The same values as `item`, typed for display. */
      vehicleClass: VehicleClass;
      /** The model preferred; null for none. */
      vehicleModel: { id: string; name: string } | null;
      price: TripPriceBreakdown;
    }
  | { ok: false; error: TripQuoteError };

/**
 * A customer's choice, validated and priced, ready for `createBooking`. The
 * item snapshots the class's name and category, the preferred model's
 * name, the offering's cancellation cutoff, and the location that priced
 * it, so what was booked never changes when ops edits or retires the class
 * or the model or redraws a zone. A model must be one the class shows; the
 * price is the class's either way.
 */
export async function prepareTripItem(
  category: TripCategory,
  request: TripItemRequest,
  now: Date = new Date(),
): Promise<PrepareTripItemResult> {
  const quoted = await quoteTrip(category, request, now);
  if (!quoted.ok) return quoted;
  const { district, location, basis, classes } = quoted.quote;

  const chosen = classes.find(
    (c) => c.vehicleClass.id === request.vehicleClassId,
  );
  if (!chosen) {
    return fail(
      "class-unavailable",
      "That vehicle class is no longer available.",
    );
  }
  const { vehicleClass, offering, price, availability } = chosen;
  if (!availability.ok) {
    switch (availability.reason) {
      case "too-soon":
        return fail(
          "too-soon",
          `${vehicleClass.name} needs ${availability.minLeadHours} hours notice. Choose a later time.`,
        );
      case "too-few-hours":
        return fail(
          "too-few-hours",
          `${vehicleClass.name} is hired for at least ${availability.minHourlyHours} hours.`,
        );
      case "not-on-route":
        return fail(
          "route-not-served",
          `${vehicleClass.name} is not offered on that route.`,
        );
    }
  }
  if (!fitsPassengers(vehicleClass, request.passengers)) {
    return fail(
      "passengers",
      `${vehicleClass.name} seats up to ${vehicleClass.maxPassengers} passengers.`,
    );
  }
  const model = request.vehicleModelId
    ? vehicleClass.models.find((m) => m.id === request.vehicleModelId)
    : null;
  if (model === undefined) {
    return fail(
      "model-unavailable",
      `That model of ${vehicleClass.name} is no longer offered. Choose again.`,
    );
  }

  return {
    ok: true,
    vehicleClass,
    vehicleModel: model ? { id: model.id, name: model.name } : null,
    price,
    item: {
      product: "transportation",
      startsAt: request.startsAt,
      endsAt:
        basis.mode === "hourly"
          ? new Date(request.startsAt.getTime() + basis.hours * HOUR_MS)
          : null,
      cancellationCutoffHours: offering.cancellationCutoffHours,
      districtCode: district?.code ?? null,
      locationId: location.id,
      priceTotalSen: price.totalSen,
      priceBreakdown: price,
      tripDetails: {
        vehicleClass: { connect: { id: vehicleClass.id } },
        vehicleClassName: vehicleClass.name,
        vehicleClassCategory: category,
        ...(model ? { vehicleModel: { connect: { id: model.id } } } : {}),
        vehicleModelName: model?.name ?? null,
        similarModelOk: model ? request.similarModelOk : true,
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
