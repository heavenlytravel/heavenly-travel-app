import {
  classAvailability,
  fitsPassengers,
  isWithinHorizon,
  localDateTimeInputs,
  localMinuteOfDay,
  type BookingSide,
  type ClassAvailability,
} from "./booking-rules";
import {
  needsGuide,
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
import { listGuideRates } from "./guide-rates";
import { guideOffers, type GuideOffer } from "./guide-rates-input";
import {
  hourlyChargeOf,
  HOURLY_LIMITS,
  isExtraHours,
  isHourlyPackage,
  durationLabel,
  sellsHourly,
  zonePackageOf,
  type HourlyChoice,
} from "./hourly-input";
import { modelChoiceOf } from "./offering-input";
import { listActiveOfferings, type OfferingOnSale } from "./offerings";
import type { Place } from "./place";
import {
  priceTrip,
  withGuideCharge,
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
import {
  placeTrip,
  type QuoteLocation,
  type TripRouting,
  type TripTrace,
} from "./zone-quote";
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
 * (./zone-quote, ./zone-trip), or for an hourly hire, the package its
 * zone sells, plus the extra hours and the road to a pickup outside every
 * zone (./hourly-input). The category only decides which offerings
 * are priced. Everything product-specific lives here; the booking core in
 * bookings.ts only sees a `PreparedItem`. See docs/260928-coach-charter.md,
 * docs/261015-locations-as-operation-areas.md and
 * docs/261023-nearest-zone-pricing.md.
 */

export type TripRequest = {
  mode: TripMode;
  pickup: Place;
  /**
   * Required for one-way, where it is priced. An hourly hire's, when it
   * ends away from its pickup, is kept for the driver and not priced.
   */
  dropoff: Place | null;
  startsAt: Date;
  /** Hourly only: the package and the hours past it. */
  hourly: HourlyChoice | null;
};

export type TripItemRequest = TripRequest & {
  vehicleClassId: string;
  /** The model the customer chose, at the class's charge; null when any will do. */
  vehicleModelId: string | null;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  notes: string | null;
  /** The tour guide's language, one the quote's `guides` sells; null without a guide. */
  guideLanguage: string | null;
  /** Another language asked for, free, from GUIDE_LANGUAGES; null when none. */
  guideRequest: string | null;
};

export type TripQuoteErrorCode =
  | "not-served"
  | "dropoff-outside"
  | "route-not-served"
  | "too-far"
  | "dropoff-required"
  | "distance-unavailable"
  | "hours"
  | "hourly-not-served"
  | "package-not-sold"
  | "class-unavailable"
  | "too-soon"
  | "passengers"
  | "model-unavailable"
  | "guide-unavailable"
  | "guide-required";

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

/** An hourly hire as quoted: the zone it is priced from, and the hours the package covers there. */
export type QuotedHire = HourlyChoice & {
  zone: string;
  includedHours: number;
};

export type TripQuote = {
  category: TripCategory;
  /** The district the pickup is in, for the record; null at sea. */
  district: DistrictWithState | null;
  /** The location whose rates priced the trip: the one the pickup's zone is. */
  location: QuotedLocation;
  basis: PricingBasis;
  /** One-way: Google's drive, pin to pin, in whole minutes; null for hourly or when unknown. Saved on the trip for fulfilment. */
  driveMinutes: number | null;
  pickup: QuotedEnd;
  /** Null for hourly hire. */
  dropoff: QuotedEnd | null;
  /** Hourly: the zone and the hours the package covers; null for one-way. */
  hire: QuotedHire | null;
  /** What a trip with an end outside every zone measured; null otherwise. */
  zoneTrip: ZoneTripMeasure | null;
  /** The odd-hours surcharge that applies to this pickup time; null when none. */
  surcharge: SurchargeCharge | null;
  /** The weekend and holiday surcharge that applies to this pickup's day, and why; null when none. */
  weekend: { charge: SurchargeCharge; reason: WeekendReason } | null;
  classes: ClassQuote[];
  /** The tour guide languages on sale for this trip, at their price; empty when none. */
  guides: GuideOffer[];
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
  /**
   * Whose booking it is (`BookingSide`): the console's admin forms pass
   * "admin", so no notice, minimum hire, horizon or group limit refuses
   * what was agreed. The website's, by default.
   */
  side?: BookingSide;
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
  options: QuoteOptions = {},
): Promise<TripQuoteResult> {
  const [result] = await quoteAll(category, [request], routing, options);
  return result!;
}

/**
 * `quoteTrip` for every trip of a booking at once, in the same order. The
 * locations are read once and each location's offerings once, however
 * many trips there are; each trip is placed and priced as `quoteTrip`
 * prices it alone. Try a trip's trace is for one trip, so it is not
 * offered here. See docs/261027-multi-trip-booking.md.
 */
export function quoteTrips(
  category: TripCategory,
  requests: readonly TripRequest[],
  routing: TripRouting,
  options: Omit<QuoteOptions, "trace"> = {},
): Promise<TripQuoteResult[]> {
  return quoteAll(category, requests, routing, options);
}

/** What quoting reads from the database once, however many trips it prices. */
type QuoteReads = {
  /** As stored, for a quote to say its location's own furthest extra road. */
  loaded: QuoteLocation[];
  /** The ones the trips are placed among: as stored, or with every limit lifted. */
  locations: QuoteLocation[];
  /** Try a trip's location; null when none is pinned, or the pinned one was deleted. */
  pinned: QuoteLocation | null;
  /** A location's offerings of the category, read once per location. */
  offeringsAt: (locationId: string) => Promise<OfferingOnSale[]>;
  guideRatesAt: (
    locationId: string,
  ) => Promise<
    Awaited<ReturnType<typeof listGuideRates>> extends Map<string, infer R>
      ? R
      : never
  >;
};

async function readForQuotes(
  category: TripCategory,
  locationId: string | undefined,
  unlimited: boolean,
): Promise<QuoteReads> {
  const loaded = await listQuoteLocations(locationId);
  const locations = unlimited
    ? loaded.map((location) => ({
        ...location,
        maxExtraKm: TRIP_REACH_LIMITS.maxExtraKm.max,
      }))
    : loaded;
  const offerings = new Map<string, Promise<OfferingOnSale[]>>();
  const guideRates = new Map<string, ReturnType<QuoteReads["guideRatesAt"]>>();
  return {
    loaded,
    locations,
    pinned: locationId
      ? (locations.find((location) => location.id === locationId) ?? null)
      : null,
    offeringsAt(id) {
      let read = offerings.get(id);
      if (!read) {
        read = listActiveOfferings(id, category);
        offerings.set(id, read);
      }
      return read;
    },
    guideRatesAt(id) {
      let read = guideRates.get(id);
      if (!read) {
        read = listGuideRates([id]).then((lists) => lists.get(id) ?? []);
        guideRates.set(id, read);
      }
      return read;
    },
  };
}

/** The trips priced in parallel on one set of reads, taken only when a trip gets past its own checks. */
async function quoteAll(
  category: TripCategory,
  requests: readonly TripRequest[],
  routing: TripRouting,
  {
    now = new Date(),
    locationId,
    trace,
    unlimited = false,
    side = "customer",
  }: QuoteOptions,
): Promise<TripQuoteResult[]> {
  let reads: Promise<QuoteReads> | null = null;
  const readOnce = () =>
    (reads ??= readForQuotes(category, locationId, unlimited));
  return Promise.all(
    requests.map((request) =>
      quoteOne(category, request, routing, readOnce, {
        now,
        locationId,
        trace,
        unlimited,
        side,
      }),
    ),
  );
}

async function quoteOne(
  category: TripCategory,
  request: TripRequest,
  routing: TripRouting,
  readOnce: () => Promise<QuoteReads>,
  {
    now,
    locationId,
    trace,
    unlimited,
    side,
  }: Required<Pick<QuoteOptions, "now" | "unlimited" | "side">> &
    Pick<QuoteOptions, "locationId" | "trace">,
): Promise<TripQuoteResult> {
  const horizon = !unlimited && side === "customer";
  if (horizon && !isWithinHorizon(request.startsAt, now)) {
    return fail(
      "too-far",
      "That pickup is too far ahead. Choose an earlier date.",
    );
  }

  const choice = request.mode === "hourly" ? request.hourly : null;
  if (request.mode === "oneway") {
    if (!request.dropoff) {
      return fail("dropoff-required", "Choose a drop-off for a transfer.");
    }
  } else if (
    !choice ||
    !isHourlyPackage(choice.packageHours) ||
    !isExtraHours(choice.extraHours)
  ) {
    return fail("hours", "Choose how many hours you need the car.");
  } else if (side === "customer" && choice.extraHours > 0) {
    // The website sells the 4, 8 and 12-hour packages alone for now; the
    // console may still add hours past one.
    return fail("hours", "Choose 4, 8 or 12 hours.");
  }

  // The district is the record's: read alongside the locations.
  const [reads, district] = await Promise.all([
    readOnce(),
    resolveDistrict(request.pickup),
  ]);
  const { loaded, locations, pinned } = reads;
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
    {
      pinned,
      trace,
      // An hourly pickup outside every zone goes to the nearest zone that
      // sells hourly hire.
      ...(request.mode === "hourly"
        ? {
            pickupSells: (l: QuoteLocation, zoneId: string) =>
              sellsHourly(l.hourly, zoneId),
          }
        : {}),
    },
  );
  if (!placed.ok) {
    return fail(placed.error.code, placed.error.message, placed.error.reason);
  }
  const { location, pickup, dropoff } = placed;

  // An hourly hire is priced from its pickup's zone, by the package the
  // zone sells; the package's hours there set the trip's.
  let hire: QuotedHire | null = null;
  if (choice) {
    if (!sellsHourly(location.hourly, pickup.zone.id)) {
      return fail(
        "hourly-not-served",
        "We do not have hourly prices from there yet. Message us on WhatsApp.",
        `${pickup.zone.name} sells no hourly package`,
      );
    }
    const row = zonePackageOf(
      location.hourly,
      pickup.zone.id,
      choice.packageHours,
    );
    if (!row) {
      return fail(
        "package-not-sold",
        `${durationLabel(choice.packageHours)} is not offered from there. Choose another duration.`,
        `${pickup.zone.name} has no ${durationLabel(choice.packageHours)} price`,
      );
    }
    if (row.includedHours + choice.extraHours > HOURLY_LIMITS.maxTripHours) {
      return fail(
        "hours",
        `A booking by the hour runs at most ${HOURLY_LIMITS.maxTripHours} hours. Choose fewer extra hours.`,
      );
    }
    hire = {
      ...choice,
      zone: pickup.zone.name,
      includedHours: row.includedHours,
    };
  }
  const basis: PricingBasis = hire
    ? { mode: "hourly", hours: hire.includedHours + hire.extraHours }
    : { mode: "oneway", distanceKm: placed.distanceKm ?? 0 };

  const [offerings, guideRates] = await Promise.all([
    reads.offeringsAt(location.id),
    reads.guideRatesAt(location.id),
  ]);
  const hourlyOf = (vehicleClassId: string) =>
    choice
      ? hourlyChargeOf(location.hourly, pickup.zone, choice, vehicleClassId)
      : null;
  if (
    choice &&
    offerings.length > 0 &&
    !offerings.some((offering) => hourlyOf(offering.vehicleClass.id))
  ) {
    return fail(
      "hourly-not-served",
      "We do not have a price for that hire yet. Message us on WhatsApp.",
      `${pickup.zone.name} has no price for ${durationLabel(choice.packageHours)}${choice.extraHours > 0 ? " with extra hours" : ""} in any class`,
    );
  }
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
    const hourly = hourlyOf(vehicleClass.id);
    if ((dropoff && !cell) || (choice && !hourly)) {
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
      hourly,
      hourlyRoadKm: choice ? (pickup.nearest?.extraKm ?? null) : null,
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
        { startsAt: request.startsAt },
        now,
        side,
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
      driveMinutes: placed.driveMinutes,
      pickup: endOf(pickup),
      dropoff: dropoff ? endOf(dropoff) : null,
      hire,
      zoneTrip: placed.measure,
      surcharge,
      weekend,
      classes,
      guides: guideOffers(
        guideRates,
        choice ? { mode: "hourly", ...choice } : { mode: "oneway" },
      ),
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
 * choose, and the receipt charges for it. An admin's (`side`) is checked
 * as `QuoteOptions` says.
 */
export async function prepareTripItem(
  category: TripCategory,
  request: TripItemRequest,
  routing: TripRouting,
  options: PrepareOptions = {},
): Promise<PrepareTripItemResult> {
  const [prepared] = await prepareTripItems(
    category,
    [request],
    routing,
    options,
  );
  return prepared!;
}

type PrepareOptions = Pick<QuoteOptions, "now" | "side">;

/**
 * `prepareTripItem` for every trip of a booking, in the same order, on the
 * reads of one `quoteTrips`. Each trip is checked on its own: whether the
 * trips may share a vehicle is the caller's to check (./trip-plan).
 */
export async function prepareTripItems(
  category: TripCategory,
  requests: readonly TripItemRequest[],
  routing: TripRouting,
  { now, side = "customer" }: PrepareOptions = {},
): Promise<PrepareTripItemResult[]> {
  const quoted = await quoteTrips(category, requests, routing, { now, side });
  return quoted.map((result, index) =>
    result.ok ? itemOf(category, result.quote, requests[index]!, side) : result,
  );
}

/** The chosen class and model of a quoted trip, checked, as the item to store. */
function itemOf(
  category: TripCategory,
  quote: TripQuote,
  request: TripItemRequest,
  side: BookingSide,
): PrepareTripItemResult {
  const { district, location, basis, classes } = quote;

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
  if (!fitsPassengers(vehicleClass, request.passengers, side)) {
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
  if (request.guideLanguage) {
    const guide = quote.guides.find(
      (offer) => offer.language === request.guideLanguage,
    );
    if (!guide) {
      return fail(
        "guide-unavailable",
        `A tour guide speaking ${request.guideLanguage} is not offered on this trip. Choose another language.`,
      );
    }
    price = withGuideCharge(price, guide);
  } else if (
    side === "customer" &&
    needsGuide(category) &&
    quote.guides.length > 0
  ) {
    return fail(
      "guide-required",
      "A coach comes with a tour guide. Choose the language your guide speaks.",
    );
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
        // An hourly hire's drop-off is where it ends, for the driver: it
        // is not priced, the package is.
        dropoffPlace: request.dropoff ?? Prisma.DbNull,
        hours: basis.mode === "hourly" ? basis.hours : null,
        distanceKm: basis.mode === "oneway" ? basis.distanceKm : null,
        driveMinutes: basis.mode === "oneway" ? quote.driveMinutes : null,
        passengers: request.passengers,
        childSeats: offersChildSeats(category) ? request.childSeats : 0,
        guideLanguage: request.guideLanguage,
        guideRequest:
          request.guideRequest === request.guideLanguage
            ? null
            : request.guideRequest,
        flightNumber: request.flightNumber,
        notes: request.notes,
      },
    },
  };
}
