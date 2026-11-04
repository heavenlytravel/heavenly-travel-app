import {
  byStart,
  choosableModel,
  classFit,
  clashesOf,
  fitsPassengers,
  formatMyr,
  guideEntries,
  storedGuideChoice,
  hireEndOf,
  hourlyChoiceOf,
  HOURLY_PACKAGES,
  isTripCategory,
  localDateTimeInputs,
  NO_GUIDE,
  namedHours,
  offersChildSeats,
  parsePriceOverride,
  parseRinggit,
  plural,
  PRICE_OVERRIDE_FIELDS,
  TRIP_CATEGORY_LABELS,
  TRIP_OPTION_FIELDS,
  TRIP_PARAM,
  tripItemField,
  tripViewOfItem,
  unavailableReason,
  type BookingSide,
  type ClassAvailability,
  type ClassFit,
  type GuideChoice,
  type GuideOffer,
  type TripCategory,
  type TripMode,
  CHARGE_LABELS,
  fareSenOf,
  type ClassCharges,
} from "@repo/db";
import type { BookingItemWithDetails } from "@repo/db/server";

/**
 * What the booking forms and their actions agree on. Both hold items, each
 * a trip with its own vehicle, group and details (`ItemDraft`): a new
 * booking any number, the amend form one. A new booking's trips may share
 * one vehicle (`SAME_VEHICLE_FIELD`, on to start with): then trip 1's
 * category, class, model and group are every trip's, judged for them all
 * (`classFit`), and no trip may start while another is going
 * (`clashesOf`); off, each trip is its own, a sedan, then a coach, at
 * once if need be. The website's checks apply, without its limits
 * (`ADMIN_SIDE`). The input names are `TRIP_PARAM` and `TRIP_OPTION_FIELDS`
 * in @repo/db, the same names the website's URLs carry; a new booking
 * posts each item's under `tripItemField` with its number, the amend form
 * its vehicle and details once. The agreed price's are
 * `PRICE_OVERRIDE_FIELDS`. Browser-safe. See
 * docs/261027-multi-trip-booking.md.
 */

/**
 * An admin enters what was already agreed, often by phone and sometimes
 * after the trip: the website's notice, horizon and group limits do not
 * refuse it, and the pickup may be past.
 */
export const ADMIN_SIDE = "admin" satisfies BookingSide;

export const CATEGORY_FIELD = "category";

/** A new booking's switch: one vehicle does every trip. Posted "on" when it does. */
export const SAME_VEHICLE_FIELD = "sameVehicle";

/** A new booking's old invoice number, when the old system invoiced it already (HT1223); empty for the next. */
export const OLD_INVOICE_FIELD = "oldInvoiceNumber";
/** The agent the booking came through; empty for a customer of ours. */
export const AGENT_FIELD = "agentId";

export const CONTACT_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
} as const;

/** One class as priced for the trip, its total `ClassCharges`, with any model. Plain data, sent to the browser. */
export type ClassQuoteView = ClassCharges & {
  id: string;
  name: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  /** The catalogue's picture of it; null for none. */
  imageUrl: string | null;
  /** The models of the location's vehicles in service, in order. */
  models: { id: string; name: string }[];
  /** What choosing one of the models adds to this trip; null when the customer cannot choose one here. */
  modelChoiceSen: number | null;
  /** Whether the class's rules take the trip, and why not. */
  availability: ClassAvailability;
};

/** What the item editor's prices answer: the trip as resolved and every class priced. */
export type TripQuoteView =
  | {
      ok: true;
      category: TripCategory;
      pickup: string;
      dropoff: string | null;
      /** Whether the pick-up, or the drop-off, is an airport: where a flight helps the driver. */
      pickupAirport: boolean;
      dropoffAirport: boolean;
      /** As people read it: "Sat, 3 Oct 2026, 09:30". */
      startsAt: string;
      /** Hourly: the hours the hire runs, the duration's from its zone plus the extra; null for one-way. */
      hours: number | null;
      /** Hourly: "4 hours + 3 extra hours from Kuah Town"; null for one-way. */
      hire: string | null;
      distanceKm: number | null;
      /** "Petaling, Selangor", for the record; null at sea. */
      district: string | null;
      /** The location whose rates price the trip: the one whose zone the pickup is in. */
      location: string;
      /** The grid's cell the trip is priced by, "Langkawi Airport to Cenang"; null for hourly hire. */
      route: string | null;
      /** The km of road past a zone's edge the trip is charged; null when none. */
      extraKm: number | null;
      /** The odd-hours surcharge that applies, "+20%" or "+RM 30.00"; null for none. */
      surcharge: string | null;
      /** The weekend and holiday surcharge that applies, "weekend +20%"; null for none. */
      weekend: string | null;
      classes: ClassQuoteView[];
      /** The tour guide languages on sale for the trip, at their price there. */
      guides: GuideOffer[];
    }
  | { ok: false; error: string };

export type PricedTrip = Extract<TripQuoteView, { ok: true }>;

/** A place field: what was typed, and the id once picked from the list. */
export type PlaceValue = { text: string; id?: string };

export type TripValues = {
  category: TripCategory;
  mode: TripMode;
  pickup: PlaceValue;
  dropoff: PlaceValue;
  date: string;
  time: string;
  /** Hourly: the package, "4", "8" or "12". */
  packageHours: string;
  /** Hourly: the hours past the package, "0" for none. */
  extraHours: string;
};

/** One trip of a booking form, each value as its input shows it: the trip, its prices and the price agreed for it. */
export type TripDraft = {
  /** Keeps the trip's card while the list is put in order. */
  id: string;
  trip: TripValues;
  /** The priced list for the trip as it stands; null once the trip changed. */
  quote: PricedTrip | null;
  quoteError: string | null;
  agreedPrice: string;
  priceReason: string;
};

/** An item's vehicle: its class, the model chosen, and the group. */
export type VehicleDraft = {
  vehicleClassId: string | null;
  /** The model the customer chose, at the class's charge; null when any will do. */
  vehicleModelId: string | null;
  passengers: string;
};

/** What the driver needs on one item, and its tour guide. */
export type ItemDetails = {
  flightNumber: string;
  childSeats: string;
  notes: string;
  guide: GuideChoice;
};

let lastTripId = 0;

/** A blank trip in the category, for the first trip of a new booking and each one added. */
export function newTripDraft(
  category: TripCategory = "car-with-driver",
): TripDraft {
  lastTripId += 1;
  return {
    id: `trip-${lastTripId}`,
    trip: {
      category,
      mode: "oneway",
      pickup: { text: "" },
      dropoff: { text: "" },
      date: "",
      time: "",
      packageHours: String(HOURLY_PACKAGES[0]),
      extraHours: "0",
    },
    quote: null,
    quoteError: null,
    agreedPrice: "",
    priceReason: "",
  };
}

export const EMPTY_VEHICLE: VehicleDraft = {
  vehicleClassId: null,
  vehicleModelId: null,
  passengers: "1",
};

export const EMPTY_DETAILS: ItemDetails = {
  flightNumber: "",
  childSeats: "0",
  notes: "",
  guide: NO_GUIDE,
};

/** One item of a booking form: its trip, its vehicle and its details. */
export type ItemDraft = {
  trip: TripDraft;
  vehicle: VehicleDraft;
  details: ItemDetails;
};

/**
 * A new booking's next item, blank but for what the one before it chose
 * and the next trip most likely keeps: the category, the vehicle and the
 * group, the child seats and the guide. The first item starts blank.
 */
export function newItemDraft(after?: ItemDraft): ItemDraft {
  return {
    trip: newTripDraft(after?.trip.trip.category),
    vehicle: after ? { ...after.vehicle } : EMPTY_VEHICLE,
    details: after
      ? {
          ...EMPTY_DETAILS,
          childSeats: after.details.childSeats,
          guide: after.details.guide,
        }
      : EMPTY_DETAILS,
  };
}

/**
 * A stored item as the amend form starts from it, with its trip priced
 * again so the class list shows at once. The class stays chosen when the
 * priced list still offers it, and the model when it can still be chosen.
 * Null for an item that is not a trip.
 */
export function amendDraftOf(
  item: BookingItemWithDetails,
  quote: TripQuoteView,
): ItemDraft | null {
  const trip = tripViewOfItem(item);
  const details = item.tripDetails;
  if (!trip || !details || !isTripCategory(details.vehicleClassCategory)) {
    return null;
  }
  const { date, time } = localDateTimeInputs(trip.startsAt);
  const hourly = hourlyChoiceOf(trip);
  const priced = quote.ok ? quote : null;
  const vehicleClass = priced?.classes.find(
    (c) => c.id === details.vehicleClassId,
  );
  const model = vehicleClass
    ? choosableModel(
        vehicleClass.models,
        vehicleClass.modelChoiceSen !== null,
        details.vehicleModelId,
      )
    : null;
  return {
    trip: {
      id: item.id,
      trip: {
        category: details.vehicleClassCategory,
        mode: trip.mode,
        pickup: { text: trip.pickup.label, id: trip.pickup.placeId },
        dropoff: trip.dropoff
          ? { text: trip.dropoff.label, id: trip.dropoff.placeId }
          : { text: "" },
        date,
        time,
        packageHours: String(hourly.packageHours),
        extraHours: String(hourly.extraHours),
      },
      quote: priced,
      quoteError: quote.ok ? null : quote.error,
      agreedPrice: "",
      priceReason: "",
    },
    vehicle: {
      vehicleClassId: vehicleClass ? details.vehicleClassId : null,
      vehicleModelId: model?.id ?? null,
      passengers: String(details.passengers),
    },
    details: {
      flightNumber: details.flightNumber ?? "",
      childSeats: String(details.childSeats),
      notes: details.notes ?? "",
      guide: storedGuideChoice(details),
    },
  };
}

/** The first thing missing from the trip before it can be priced; null once it can be. */
export function tripIssue(trip: TripValues): string | null {
  if (!trip.pickup.id) {
    return trip.pickup.text
      ? "Choose the pick-up from the list."
      : "Enter a pick-up place.";
  }
  if (trip.mode === "oneway" && !trip.dropoff.id) {
    return trip.dropoff.text
      ? "Choose the drop-off from the list."
      : "Enter a drop-off place.";
  }
  if (!trip.date) return "Choose a date.";
  if (!trip.time) return "Choose a pick-up time.";
  return null;
}

/** The trip under the names the parser reads, as the quote and the form post it. */
export function tripInput(trip: TripValues): Record<string, string> {
  const input: Record<string, string> = {
    [CATEGORY_FIELD]: trip.category,
    [TRIP_PARAM.mode]: trip.mode,
    [TRIP_PARAM.pickup]: trip.pickup.id ?? "",
    [TRIP_PARAM.date]: trip.date,
    [TRIP_PARAM.time]: trip.time,
  };
  if (trip.mode === "oneway") input[TRIP_PARAM.dropoff] = trip.dropoff.id ?? "";
  else {
    input[TRIP_PARAM.packageHours] = trip.packageHours;
    input[TRIP_PARAM.extraHours] = trip.extraHours;
  }
  return input;
}

/** "Klang Valley rates · Petaling, Selangor · grid KLIA to Cenang · 4 hours from Kuah Town · extra road 1 km · 55.2 km by road · odd hours +50% · weekend +20%" */
export function quoteSummary(quote: PricedTrip) {
  const parts = [`${quote.location} rates`];
  if (quote.district) parts.push(quote.district);
  if (quote.route) parts.push(`grid ${quote.route}`);
  if (quote.extraKm !== null) {
    parts.push(`extra road ${quote.extraKm} km`);
  }
  if (quote.distanceKm !== null) {
    parts.push(`${quote.distanceKm.toFixed(1)} km by road`);
  }
  if (quote.hire !== null) parts.push(quote.hire);
  if (quote.hours !== null) parts.push(`${quote.hours} hours`);
  if (quote.surcharge !== null) parts.push(`odd hours ${quote.surcharge}`);
  if (quote.weekend !== null) parts.push(quote.weekend);
  return parts.join(" · ");
}

/** The items in the order they are numbered and booked in: by their trip's start. */
export function itemsByStart(items: readonly ItemDraft[]): ItemDraft[] {
  return byStart(
    items.map((item) => ({
      date: item.trip.trip.date,
      time: item.trip.trip.time,
      item,
    })),
  ).map((entry) => entry.item);
}

/** A trip that starts while another of the booking is going: a few words for its folded line, and what to do, at its day and time. */
export type TripClashNote = { label: string; note: string };

/**
 * Each trip that starts while another of the booking is going, by its id,
 * for trips one vehicle does: it does one at a time (`clashesOf`). The
 * trips are numbered as the list stands.
 */
export function clashNotes(
  trips: readonly TripDraft[],
): Map<string, TripClashNote> {
  const typed = trips.map((draft) => ({
    id: draft.id,
    mode: draft.trip.mode,
    date: draft.trip.date,
    time: draft.trip.time,
    // Priced, the hours its duration covers from its zone; until then, by name.
    hours:
      draft.trip.mode !== "hourly"
        ? null
        : (draft.quote?.hours ??
          namedHours({
            packageHours: Number(draft.trip.packageHours),
            extraHours: Number(draft.trip.extraHours),
          })),
  }));
  const notes = new Map<string, TripClashNote>();
  for (const [id, clash] of clashesOf(typed)) {
    const other = clash.with;
    const number = trips.findIndex((draft) => draft.id === other.id) + 1;
    notes.set(
      id,
      clash.kind === "during-hire"
        ? {
            label: `Starts during trip ${number}`,
            note: `Trip ${number} is a ${other.hours}-hour hire until ${hireEndOf(other)}, and this trip starts during it. One vehicle cannot do both: start this trip after the hire, or turn off "Same vehicle for every trip" and give each its own.`,
          }
        : {
            label: `Same time as trip ${number}`,
            note: `Trip ${number} starts at the same time. One vehicle cannot do both: change the time, or turn off "Same vehicle for every trip" and give each its own.`,
          },
    );
  }
  return notes;
}

/** A class as the vehicle step offers it for every trip of the booking together. */
export type VehicleOption = {
  id: string;
  name: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  imageUrl: string | null;
  /** The models the customer may choose in on every trip; empty where choosing is not offered. */
  models: { id: string; name: string }[];
  /** Its price for every trip together, with any model; null while a trip has no price for it. */
  totalSen: number | null;
  /** What choosing a model adds over every trip; null where it cannot be chosen. */
  modelChoiceSen: number | null;
  /** Why it cannot do the trips for the group; null when it can. */
  unavailable: string | null;
};

/** Why one class cannot do a booking's trips, as its card says it: "Needs 24 hours notice for trip 2". */
function unfitReason(
  fit: Exclude<ClassFit, { ok: true }>,
  several: boolean,
): string {
  if (fit.reason === "seats") return "Does not fit the group";
  const trip = several ? ` for trip ${fit.trip + 1}` : "";
  if (
    fit.reason === "not-offered" ||
    fit.availability.reason === "not-on-route"
  ) {
    return several ? `Not offered${trip}` : "Not offered on this trip";
  }
  return `${unavailableReason(fit.availability)}${trip}`;
}

const sumOf = (values: readonly (number | null)[]) =>
  values.every((value) => value !== null)
    ? values.reduce<number>((sum, value) => sum + value, 0)
    : null;

/**
 * Every class the trips' prices offer, in the order the first trip that
 * sells it lists it, each judged for every trip at once with the group:
 * one vehicle does them all (`classFit`). Its models are those it may be
 * chosen in on every trip, at the sum of each trip's charge. Empty until
 * every trip is priced.
 */
export function vehicleOptions(
  trips: readonly TripDraft[],
  passengers: number,
): VehicleOption[] {
  const quotes = trips.map((draft) => draft.quote);
  if (quotes.length === 0 || quotes.some((quote) => quote === null)) return [];
  const priced = quotes as PricedTrip[];
  const first = new Map<string, ClassQuoteView>();
  for (const quote of priced) {
    for (const c of quote.classes) if (!first.has(c.id)) first.set(c.id, c);
  }
  return [...first.values()].map((c) => {
    const onTrips = priced.map(
      (quote) => quote.classes.find((entry) => entry.id === c.id) ?? null,
    );
    const everywhere = onTrips.every((entry) => entry !== null);
    const fit = classFit(
      c,
      priced.map((quote) => quote.classes),
      passengers,
      ADMIN_SIDE,
    );
    const models = everywhere
      ? c.models.filter((model) =>
          onTrips.every((entry) =>
            entry!.models.some((other) => other.id === model.id),
          ),
        )
      : [];
    const charge = everywhere
      ? sumOf(onTrips.map((entry) => entry!.modelChoiceSen))
      : null;
    return {
      id: c.id,
      name: c.name,
      luggage: c.luggage,
      minPassengers: c.minPassengers,
      maxPassengers: c.maxPassengers,
      imageUrl: c.imageUrl,
      models: charge === null ? [] : models,
      totalSen: everywhere
        ? sumOf(onTrips.map((entry) => entry!.totalSen))
        : null,
      modelChoiceSen: models.length > 0 ? charge : null,
      unavailable: !fit.ok
        ? unfitReason(fit, priced.length > 1)
        : fitsPassengers(c, passengers, ADMIN_SIDE)
          ? null
          : "Does not fit the group",
    };
  });
}

/** The vehicle chosen, while it can do every trip for the group: its class, and the model chosen when one is. */
export type ChosenVehicle = {
  option: VehicleOption;
  model: { id: string; name: string } | null;
};

export function chosenVehicle(
  trips: readonly TripDraft[],
  vehicle: VehicleDraft,
): ChosenVehicle | null {
  const option = vehicleOptions(trips, Number(vehicle.passengers)).find(
    (entry) =>
      entry.id === vehicle.vehicleClassId && entry.unavailable === null,
  );
  if (!option) return null;
  return {
    option,
    model: choosableModel(
      option.models,
      option.modelChoiceSen !== null,
      vehicle.vehicleModelId,
    ),
  };
}

/**
 * The vehicle an item is done by, while it can: the one every trip shares,
 * when they do (`shared`), which must do them all for its group; else the
 * item's own, for its own trip.
 */
export function itemVehicle(
  items: readonly ItemDraft[],
  index: number,
  shared: VehicleDraft | null,
): { vehicle: VehicleDraft; chosen: ChosenVehicle | null } {
  const vehicle = shared ?? items[index]!.vehicle;
  const trips = shared ? items.map((item) => item.trip) : [items[index]!.trip];
  return { vehicle, chosen: chosenVehicle(trips, vehicle) };
}

/** One charge of a trip's quote: what it is, a word on it, and its amount. */
export type PriceLine = {
  label: string;
  note: string | null;
  amountSen: number;
};

/**
 * What one trip's quote in the vehicle chosen is made of, a line each:
 * the class's fare, with the grid's cell or the hire and any road past a
 * zone's edge; the model chosen; the odd-hours, weekend and public holiday
 * surcharges; and the tour guide in the language chosen, when on sale for
 * the trip. Empty before a vehicle is chosen, or while the class has no
 * price for the trip.
 */
export function tripPriceLines(
  draft: TripDraft,
  chosen: ChosenVehicle | null,
  guideLanguage: string | null,
): PriceLine[] {
  const quote = draft.quote;
  const priced = chosen
    ? quote?.classes.find((c) => c.id === chosen.option.id)
    : null;
  if (!quote || !chosen || !priced || priced.totalSen === null) return [];
  const guide = quote.guides.find((offer) => offer.language === guideLanguage);
  const fareNote = [
    quote.route ?? quote.hire,
    quote.extraKm ? `${quote.extraKm} km past the zone` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const lines: (PriceLine | null)[] = [
    {
      label: chosen.option.name,
      note: fareNote || null,
      amountSen: fareSenOf({ ...priced, totalSen: priced.totalSen }),
    },
    chosen.model && priced.modelChoiceSen !== null
      ? {
          label: `${chosen.model.name} chosen`,
          note: null,
          amountSen: priced.modelChoiceSen,
        }
      : null,
    priced.oddHoursSen > 0
      ? {
          label: CHARGE_LABELS.oddHours,
          note: quote.surcharge,
          amountSen: priced.oddHoursSen,
        }
      : null,
    priced.weekend
      ? {
          label: CHARGE_LABELS.weekend(priced.weekend.reason),
          note: null,
          amountSen: priced.weekend.amountSen,
        }
      : null,
    guide
      ? {
          label: CHARGE_LABELS.guide(guide.language),
          note: null,
          amountSen: guide.amountSen,
        }
      : null,
  ];
  return lines.filter((line) => line !== null);
}

/** What one trip costs in the vehicle chosen, its lines together (`tripPriceLines`); null before a vehicle is. */
export function tripQuotedSen(
  draft: TripDraft,
  chosen: ChosenVehicle | null,
  guideLanguage: string | null,
): number | null {
  const lines = tripPriceLines(draft, chosen, guideLanguage);
  return lines.length > 0
    ? lines.reduce((sum, line) => sum + line.amountSen, 0)
    : null;
}

/** What a trip is charged: its agreed price once one is typed, else the quote; null before a vehicle is chosen. */
export function tripTotalSen(
  draft: TripDraft,
  chosen: ChosenVehicle | null,
  canPrice: boolean,
  guideLanguage: string | null,
): number | null {
  const quoted = tripQuotedSen(draft, chosen, guideLanguage);
  if (quoted === null) return null;
  return (canPrice ? parseRinggit(draft.agreedPrice) : null) ?? quoted;
}

/** What every item comes to together, each in its own vehicle; null while one has no price. */
export function bookingTotalSen(
  items: readonly ItemDraft[],
  shared: VehicleDraft | null,
  canPrice: boolean,
): number | null {
  return sumOf(
    items.map((item, index) =>
      tripTotalSen(
        item.trip,
        itemVehicle(items, index, shared).chosen,
        canPrice,
        item.details.guide.language,
      ),
    ),
  );
}

/** The trip as a folded step reads: "Car with driver · KLIA to Pavilion · Sat, 24 Oct 2026, 14:30". */
export function tripLine(draft: TripDraft): string {
  const { quote, trip } = draft;
  if (!quote) return tripIssue(trip) ?? "Not priced yet";
  return [
    TRIP_CATEGORY_LABELS[quote.category],
    placesLine(quote),
    quote.startsAt,
  ].join(" · ");
}

/** Where a priced trip goes: "KLIA to Pavilion", or "Pavilion, 4 hours". */
export function placesLine(quote: PricedTrip): string {
  return quote.dropoff
    ? `${quote.pickup} to ${quote.dropoff}`
    : `${quote.pickup}, ${quote.hours} hours`;
}

/**
 * The vehicle as a folded step reads: "MPV VIP · Toyota Alphard chosen · 4
 * passengers · RM 140.00", for the trips it does; without the price beside
 * a total that shows it.
 */
export function vehicleLine(
  trips: readonly TripDraft[],
  vehicle: VehicleDraft,
  { price = true }: { price?: boolean } = {},
): string {
  const chosen = chosenVehicle(trips, vehicle);
  if (!chosen) {
    if (trips.every((draft) => draft.quote)) return "Not chosen yet";
    return trips.length > 1 ? "Price every trip first" : "Price the trip first";
  }
  const quoted = sumOf(
    trips.map((draft) => tripQuotedSen(draft, chosen, null)),
  );
  return [
    chosen.option.name,
    chosen.model ? `${chosen.model.name} chosen` : null,
    plural(Number(vehicle.passengers), "passenger"),
    price && quoted !== null ? formatMyr(quoted) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Which flight a new booking's trip asks for, as its field says it: the
 * arriving one at an airport pick-up, the departing one at an airport
 * drop-off; null, and none is kept, for a trip at no airport.
 */
export function flightLabelOf(quote: PricedTrip | null): string | null {
  if (quote?.pickupAirport) return "Arriving flight";
  if (quote?.dropoffAirport) return "Departing flight";
  return null;
}

/** The details as a folded step reads: "Flight MH 1234 · 1 child seat · English tour guide · Korean asked · notes for the driver". */
export function detailsLine(details: ItemDetails): string {
  const parts: string[] = [];
  if (details.flightNumber.trim()) {
    parts.push(`Flight ${details.flightNumber.trim().toUpperCase()}`);
  }
  const seats = Number(details.childSeats);
  if (seats > 0) parts.push(plural(seats, "child seat"));
  const { language, request } = details.guide;
  if (language) parts.push(`${language} tour guide`);
  if (request) parts.push(`${request} guide asked`);
  if (details.notes.trim()) parts.push("notes for the driver");
  return parts.length > 0
    ? parts.join(" · ")
    : "No flight, child seats, tour guide or notes";
}

/** Why the agreed price cannot be saved as entered; null when it can, or when there is none. */
export function agreedPriceIssue(draft: {
  agreedPrice: string;
  priceReason: string;
}): string | null {
  const parsed = parsePriceOverride({
    amount: draft.agreedPrice,
    reason: draft.priceReason,
  });
  return parsed.ok ? null : parsed.error;
}

/* What the forms post, as the actions read it. */

/** Fields under `tripItemField` with the item's number. */
function underItem(
  number: number,
  fields: Record<string, string> | readonly [string, string][],
): [string, string][] {
  const pairs = Array.isArray(fields) ? fields : Object.entries(fields);
  return pairs.map(([name, value]) => [tripItemField(number, name), value]);
}

/**
 * One trip under `tripItemField` with its number: its category and
 * search, and the agreed price for an admin who may set one
 * (`bookings.create`).
 */
export function tripFields(
  number: number,
  draft: TripDraft,
  canPrice: boolean,
): [string, string][] {
  const fields = tripInput(draft.trip);
  if (canPrice) {
    fields[PRICE_OVERRIDE_FIELDS.amount] = draft.agreedPrice;
    fields[PRICE_OVERRIDE_FIELDS.reason] = draft.priceReason;
  }
  return underItem(number, fields);
}

/**
 * A new booking's item under `tripItemField` with its number: its trip,
 * the vehicle it is done by (`itemVehicle`), and its details, its flight
 * only at an airport.
 */
export function itemFields(
  number: number,
  items: readonly ItemDraft[],
  index: number,
  shared: VehicleDraft | null,
): [string, string][] {
  const item = items[index]!;
  const { vehicle, chosen } = itemVehicle(items, index, shared);
  const details =
    flightLabelOf(item.trip.quote) === null
      ? { ...item.details, flightNumber: "" }
      : item.details;
  return [
    ...tripFields(number, item.trip, true),
    ...underItem(number, vehicleFields(chosen, vehicle)),
    ...underItem(number, detailsFields(details, item.trip.trip.category)),
  ];
}

/** An item's vehicle: the class and the model while they can be chosen, and the group. */
export function vehicleFields(
  chosen: ChosenVehicle | null,
  vehicle: VehicleDraft,
): Record<string, string> {
  return {
    [TRIP_OPTION_FIELDS.vehicleClass]: chosen?.option.id ?? "",
    [TRIP_OPTION_FIELDS.vehicleModel]: chosen?.model?.id ?? "",
    [TRIP_OPTION_FIELDS.passengers]: vehicle.passengers,
  };
}

/** An item's details: its flight, child seats where the category has them, the note, and the tour guide's language and one asked for. */
export function detailsFields(
  details: ItemDetails,
  category: TripCategory,
): [string, string][] {
  const fields: Record<string, string> = {
    [TRIP_OPTION_FIELDS.flightNumber]: details.flightNumber,
  };
  if (offersChildSeats(category)) {
    fields[TRIP_OPTION_FIELDS.childSeats] = details.childSeats;
  }
  fields[TRIP_OPTION_FIELDS.notes] = details.notes;
  return [...Object.entries(fields), ...guideEntries(details.guide)];
}
