import {
  checkHours,
  classAvailability,
  fitsPassengers,
  isWithinHorizon,
  localDateTimeInputs,
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
  listQuoteLocations,
  resolveDistrict,
  type DistrictWithState,
} from "./coverage";
import { Prisma } from "./generated/prisma/client";
import { modelChoiceOf } from "./offering-input";
import { listActiveOfferings, type OfferingOnSale } from "./offerings";
import type { Place } from "./place";
import {
  priceTrip,
  withModelChoice,
  type PricingBasis,
  type TripPriceBreakdown,
  type WeekendReason,
} from "./pricing";
import {
  TRIP_REACH_LIMITS,
  isInOddHours,
  weekendReason,
  type SurchargeCharge,
} from "./rates-input";
import type { VehicleClass } from "./vehicle-classes";
import { routeRateOf } from "./zone-match";
import { placeTrip, type TripRouting, type TripTrace } from "./zone-quote";
import type { NearestZone, ZoneTripMeasure } from "./zone-trip";
import {
  choosableModel,
  modelChoiceQuote,
  type ModelChoiceQuote,
} from "./model-choice";

/**
 * The transportation product, car with driver and coach charter alike: what
 * a customer asks for, what it costs, and how it becomes a booking item.
 * The pickup names the location, by the zone it falls in or its nearest
 * zone by road, and the location's offerings, zones and rates price the
 * trip: one cell of its grid, plus the road past a zone's edge
 * (./zone-quote, ./zone-trip). The category only decides which offerings
 * are priced. Everything product-specific lives here; the booking core in
 * bookings.ts only sees a `PreparedItem`. See docs/260928-coach-charter.md,
 * docs/261015-locations-as-operation-areas.md and
 * docs/261023-nearest-zone-pricing.md.
 */

export type TripRequest = {
  mode: TripMode;
  pickup: Place;
  /** Required for one-way, ignored for hourly. */
  dropoff: Place | null;
  startsAt: Date;
  /** Hourly only. */
  hours: number | null;
};

export type TripItemRequest = TripRequest & {
  vehicleClassId: string;
  /** The model the customer chose, at the class's charge; null when any will do. */
  vehicleModelId: string | null;
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

export type TripQuoteError = {
  code: TripQuoteErrorCode;
  /** For the customer. */
  message: string;
  /** Why, in Ops' words, where the customer's message does not say: for Try a trip. */
  reason?: string;
};

export type ClassQuote = {
  /** The catalogue class: its name, seats, luggage, and the models of the location's vehicles in service. */
  vehicleClass: OfferingOnSale["vehicleClass"];
  /** The location's offering of it: the rates and the rules. */
  offering: OfferingOnSale;
  /** With any model of the class; null when the grid has no price for it on this trip. */
  price: TripPriceBreakdown | null;
  /**
   * What choosing one of the models adds; null when the customer cannot
   * choose: the location sets no charge for it, or has fewer than two
   * models of the class, or the class is not offered on this trip.
   */
  modelChoice: ModelChoiceQuote | null;
  /** Whether the offering's rules accept this trip. */
  availability: ClassAvailability;
};

/** The location that priced a quote, as the screens name it, with its extra road settings. */
export type QuotedLocation = {
  id: string;
  name: string;
  slug: string;
  freeExtraKm: number;
  maxExtraKm: number;
};

/** An end of a quoted trip: its zone, and the road to it when it is outside every zone. */
export type QuotedEnd = {
  zone: string;
  nearest: Omit<NearestZone, "zoneId"> | null;
};

export type TripQuote = {
  category: TripCategory;
  /** The district the pickup is in, for the record; null at sea. */
  district: DistrictWithState | null;
  /** The location whose rates priced the trip: the one the pickup's zone is. */
  location: QuotedLocation;
  basis: PricingBasis;
  pickup: QuotedEnd;
  /** Null for hourly hire. */
  dropoff: QuotedEnd | null;
  /** What a trip with an end outside every zone measured; null otherwise. */
  zoneTrip: ZoneTripMeasure | null;
  /** The odd-hours surcharge that applies to this pickup time; null when none. */
  surcharge: SurchargeCharge | null;
  /** The weekend and holiday surcharge that applies to this pickup's day, and why; null when none. */
  weekend: { charge: SurchargeCharge; reason: WeekendReason } | null;
  classes: ClassQuote[];
};

export type TripQuoteResult =
  { ok: true; quote: TripQuote } | { ok: false; error: TripQuoteError };

/** How a quote is asked for beyond the trip. */
export type QuoteOptions = {
  now?: Date;
  /** Try a trip: the pickup's location, pinned to the tab's, public or not. */
  locationId?: string;
  /** Records every step of the quote, for Try a trip. */
  trace?: TripTrace;
  /**
   * Try a trip: no limits, so a trip can be priced to see how. Any day,
   * however far ahead, and an end as far past its zone as any location
   * may let it be. The quote's location still says its own furthest extra
   * road, so the screen can say a customer would be refused.
   */
  unlimited?: boolean;
};

const fail = (code: TripQuoteErrorCode, message: string, reason?: string) => ({
  ok: false as const,
  error: reason === undefined ? { code, message } : { code, message, reason },
});

const HOUR_MS = 60 * 60 * 1000;

/**
 * Every offering of the category at the pickup's location, priced for one
 * trip, each with its availability, or the reason the trip cannot be
 * booked at all. The options page shows the result; `prepareTripItem`
 * reuses it so a booking is never created from a trip the options page
 * would have refused. `routing` reaches the roads (@repo/places binds
 * Google's, the tests a fake).
 */
export async function quoteTrip(
  category: TripCategory,
  request: TripRequest,
  routing: TripRouting,
  { now = new Date(), locationId, trace, unlimited = false }: QuoteOptions = {},
): Promise<TripQuoteResult> {
  if (!unlimited && !isWithinHorizon(request.startsAt, now)) {
    return fail(
      "too-far",
      "That pickup is too far ahead. Choose an earlier date.",
    );
  }

  let hours: number | null = null;
  if (request.mode === "oneway") {
    if (!request.dropoff) {
      return fail("dropoff-required", "Choose a drop-off for a one-way trip.");
    }
  } else {
    hours = request.hours ?? 0;
    if (!checkHours(hours).ok) {
      return fail("hours", "Choose how many hours you need the driver for.");
    }
  }

  // The district is the record's: read alongside the locations.
  const [loaded, district] = await Promise.all([
    listQuoteLocations(locationId),
    resolveDistrict(request.pickup),
  ]);
  const locations = unlimited
    ? loaded.map((location) => ({
        ...location,
        maxExtraKm: TRIP_REACH_LIMITS.maxExtraKm.max,
      }))
    : loaded;
  const pinned = locationId
    ? (locations.find((location) => location.id === locationId) ?? null)
    : null;
  if (locationId && !pinned) {
    return fail("not-served", "That location was deleted meanwhile.");
  }
  const placed = await placeTrip(
    locations,
    {
      pickup: request.pickup,
      dropoff: request.mode === "oneway" ? request.dropoff : null,
    },
    routing,
    { pinned, trace },
  );
  if (!placed.ok) {
    return fail(placed.error.code, placed.error.message, placed.error.reason);
  }
  const { location, pickup, dropoff } = placed;
  const basis: PricingBasis =
    hours === null
      ? { mode: "oneway", distanceKm: placed.distanceKm ?? 0 }
      : { mode: "hourly", hours };

  const offerings = await listActiveOfferings(location.id, category);
  const cellOf = (vehicleClassId: string) =>
    dropoff
      ? routeRateOf(
          location.zoneRates,
          pickup.zone.id,
          dropoff.zone.id,
          vehicleClassId,
        )
      : null;
  // A one-way trip is one cell of the grid: with no cell for any class,
  // the trip has no price yet.
  if (
    dropoff &&
    offerings.length > 0 &&
    !offerings.some((offering) => cellOf(offering.vehicleClass.id))
  ) {
    return fail(
      "route-not-served",
      "We do not have a price for that trip yet. Message us on WhatsApp.",
      `the grid has no price from ${pickup.zone.name} to ${dropoff.zone.name}`,
    );
  }

  const window = location.oddHours;
  const surcharge: SurchargeCharge | null =
    window && isInOddHours(window, localMinuteOfDay(request.startsAt))
      ? window.percent !== null
        ? { percent: window.percent, flatSen: null }
        : { percent: null, flatSen: window.flatSen }
      : null;
  const weekendWhy = location.weekend
    ? weekendReason(
        location.weekend,
        localDateTimeInputs(request.startsAt).date,
      )
    : null;
  const weekend =
    location.weekend && weekendWhy
      ? {
          charge:
            location.weekend.percent !== null
              ? { percent: location.weekend.percent, flatSen: null }
              : { percent: null, flatSen: location.weekend.flatSen },
          reason: weekendWhy,
        }
      : null;

  const classes = offerings.map((offering): ClassQuote => {
    const { vehicleClass } = offering;
    const cell = cellOf(vehicleClass.id);
    if (dropoff && !cell) {
      return {
        vehicleClass,
        offering,
        price: null,
        modelChoice: null,
        availability: { ok: false, reason: "not-on-route" },
      };
    }
    const price = priceTrip({
      trip: basis,
      rates: offering,
      route:
        cell && dropoff
          ? {
              fromZone: pickup.zone.name,
              toZone: dropoff.zone.name,
              rateSen: cell.priceSen,
            }
          : null,
      zoneTrip: placed.measure,
      freeExtraKm: location.freeExtraKm,
      surcharge,
      weekend,
    });
    return {
      vehicleClass,
      offering,
      price,
      modelChoice: modelChoiceQuote(
        modelChoiceOf(offering),
        vehicleClass.models.length,
        price.subtotalSen,
      ),
      availability: classAvailability(
        offering,
        { startsAt: request.startsAt, hours },
        now,
      ),
    };
  });

  const endOf = (end: typeof pickup): QuotedEnd => ({
    zone: end.zone.name,
    nearest: end.nearest
      ? { extraKm: end.nearest.extraKm, entry: end.nearest.entry }
      : null,
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
        freeExtraKm: location.freeExtraKm,
        // The location's own, even when the quote was unlimited.
        maxExtraKm:
          loaded.find((l) => l.id === location.id)?.maxExtraKm ??
          location.maxExtraKm,
      },
      basis,
      pickup: endOf(pickup),
      dropoff: dropoff ? endOf(dropoff) : null,
      zoneTrip: placed.measure,
      surcharge,
      weekend,
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
      /** The model chosen; null when any will do. */
      vehicleModel: { id: string; name: string } | null;
      price: TripPriceBreakdown;
    }
  | { ok: false; error: TripQuoteError };

/**
 * A customer's choice, validated and priced, ready for `createBooking`. The
 * item snapshots the class's name and category, the chosen model's name,
 * the offering's cancellation cutoff, and the location that priced it, so
 * what was booked never changes when ops edits or retires the class or the
 * model or redraws a zone. A model must be one the quote lets the customer
 * choose, and the receipt charges for it.
 */
export async function prepareTripItem(
  category: TripCategory,
  request: TripItemRequest,
  routing: TripRouting,
  now: Date = new Date(),
): Promise<PrepareTripItemResult> {
  const quoted = await quoteTrip(category, request, routing, { now });
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
  const { vehicleClass, offering, modelChoice, availability } = chosen;
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
          `${vehicleClass.name} is not offered on that trip.`,
        );
    }
  }
  if (!chosen.price) {
    return fail(
      "route-not-served",
      `${vehicleClass.name} is not offered on that trip.`,
    );
  }
  if (!fitsPassengers(vehicleClass, request.passengers)) {
    return fail(
      "passengers",
      `${vehicleClass.name} seats up to ${vehicleClass.maxPassengers} passengers.`,
    );
  }
  let price = chosen.price;
  let model: { id: string; name: string } | null = null;
  if (request.vehicleModelId) {
    const found = choosableModel(
      vehicleClass.models,
      modelChoice !== null,
      request.vehicleModelId,
    );
    if (!found || !modelChoice) {
      return fail(
        "model-unavailable",
        `That model of ${vehicleClass.name} can no longer be chosen. Choose again.`,
      );
    }
    model = { id: found.id, name: found.name };
    price = withModelChoice(price, found.name, modelChoice.charge);
  }

  return {
    ok: true,
    vehicleClass,
    vehicleModel: model,
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
