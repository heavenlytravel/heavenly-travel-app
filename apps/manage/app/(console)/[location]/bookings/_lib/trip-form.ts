import {
  byStart,
  choosableModel,
  classFit,
  clashesOf,
  fitsPassengers,
  formatMyr,
  hireEndOf,
  HOURLY_OPTIONS,
  isTripCategory,
  localDateTimeInputs,
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
  type ClassAvailability,
  type ClassFit,
  type TripCategory,
  type TripMode,
} from "@repo/db";
import type { BookingItemWithDetails } from "@repo/db/server";

/**
 * What the booking forms and their actions agree on. A new booking holds
 * any number of trips, done by one vehicle chosen once for them all, with
 * the flights, child seats and a note asked once; the amend form holds one
 * item: its trip, its vehicle and its own details. The rules a list of
 * trips is checked by are the website's (`tripClashes`, `classFit` in
 * @repo/db). The trip's input names are `TRIP_PARAM` and
 * `TRIP_OPTION_FIELDS` in @repo/db, the same names the website's URLs
 * carry: each trip under `tripItemField` with its number, the vehicle and
 * the details once; the agreed price's are `PRICE_OVERRIDE_FIELDS`. Only
 * the category, the flights and the customer block are these forms' own.
 * Browser-safe. See docs/261027-multi-trip-booking.md.
 */

export const CATEGORY_FIELD = "category";

export const CONTACT_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
} as const;

/** The flights a new booking asks once, for its trips at an airport. */
export const FLIGHT_FIELDS = {
  arriving: "arrivingFlight",
  departing: "departingFlight",
} as const;

/** One class as priced for the trip. Plain data, sent to the browser. */
export type ClassQuoteView = {
  id: string;
  name: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  /** Its picture at the location: a photo of a vehicle there, or the catalogue's; null for none. */
  imageUrl: string | null;
  /** The models of the location's vehicles in service, in order. */
  models: { id: string; name: string }[];
  /** With any model of the class; null when it is not offered on this trip. */
  totalSen: number | null;
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
      /** As people read it: "Sat, 3 Oct 2026, 9:30 AM". */
      startsAt: string;
      hours: number | null;
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
  hours: string;
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

/** The vehicle that does every trip: its class, the model chosen, and the group. */
export type VehicleDraft = {
  vehicleClassId: string | null;
  /** The model the customer chose, at the class's charge; null when any will do. */
  vehicleModelId: string | null;
  passengers: string;
};

/** What the driver needs on one item, as the amend form edits it. */
export type ItemDetails = {
  flightNumber: string;
  childSeats: string;
  notes: string;
};

/** What the drivers need, asked once for a new booking and copied onto the trips it is for. */
export type BookingDetails = {
  arrivingFlight: string;
  departingFlight: string;
  childSeats: string;
  notes: string;
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
      hours: String(HOURLY_OPTIONS[0]),
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

export const EMPTY_BOOKING_DETAILS: BookingDetails = {
  arrivingFlight: "",
  departingFlight: "",
  childSeats: "0",
  notes: "",
};

/** One item of a booking as the amend form starts from it. */
export type AmendDraft = {
  trip: TripDraft;
  vehicle: VehicleDraft;
  details: ItemDetails;
};

/**
 * A stored item as the amend form starts from it, with its trip priced
 * again so the class list shows at once. The class stays chosen when the
 * priced list still offers it, and the model when it can still be chosen.
 * Null for an item that is not a trip.
 */
export function amendDraftOf(
  item: BookingItemWithDetails,
  quote: TripQuoteView,
): AmendDraft | null {
  const trip = tripViewOfItem(item);
  const details = item.tripDetails;
  if (!trip || !details || !isTripCategory(details.vehicleClassCategory)) {
    return null;
  }
  const { date, time } = localDateTimeInputs(trip.startsAt);
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
        hours: String(trip.hours ?? HOURLY_OPTIONS[0]),
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
  else input[TRIP_PARAM.hours] = trip.hours;
  return input;
}

/** "Klang Valley rates · Petaling, Selangor · grid KLIA to Cenang · extra road 1 km · 55.2 km by road · odd hours +50% · weekend +20%" */
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
  if (quote.hours !== null) parts.push(`${quote.hours} hours`);
  if (quote.surcharge !== null) parts.push(`odd hours ${quote.surcharge}`);
  if (quote.weekend !== null) parts.push(quote.weekend);
  return parts.join(" · ");
}

/** The trips in the order they are numbered and booked in: by start. */
export function tripsByStart(trips: readonly TripDraft[]): TripDraft[] {
  return byStart(
    trips.map((draft) => ({
      date: draft.trip.date,
      time: draft.trip.time,
      draft,
    })),
  ).map((entry) => entry.draft);
}

/** A trip that starts while another of the booking is going: a few words for its folded line, and what to do, at its day and time. */
export type TripClashNote = { label: string; note: string };

/**
 * Each trip that starts while another of the booking is going, by its id:
 * one vehicle does one trip at a time (`clashesOf`). The trips are
 * numbered as the list stands.
 */
export function clashNotes(
  trips: readonly TripDraft[],
): Map<string, TripClashNote> {
  const typed = trips.map((draft) => ({
    id: draft.id,
    mode: draft.trip.mode,
    date: draft.trip.date,
    time: draft.trip.time,
    hours: draft.trip.mode === "hourly" ? Number(draft.trip.hours) : null,
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
            note: `Trip ${number} is a ${other.hours}-hour hire until ${hireEndOf(other)}, and this trip starts during it. One vehicle cannot do both: start this trip after the hire, or leave it to the hire's driver.`,
          }
        : {
            label: `Same time as trip ${number}`,
            note: `Trip ${number} starts at the same time. One vehicle cannot do both: change the time, or enter the second vehicle as a booking of its own.`,
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
        : fitsPassengers(c, passengers)
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

/** What one trip costs in the vehicle chosen: the class's price on it, and its charge for the model chosen; null before a vehicle is. */
export function tripQuotedSen(
  draft: TripDraft,
  chosen: ChosenVehicle | null,
): number | null {
  const priced = chosen
    ? draft.quote?.classes.find((c) => c.id === chosen.option.id)
    : null;
  if (!priced || priced.totalSen === null) return null;
  return chosen?.model
    ? priced.totalSen + (priced.modelChoiceSen ?? 0)
    : priced.totalSen;
}

/** What a trip is charged: its agreed price once one is typed, else the quote; null before a vehicle is chosen. */
export function tripTotalSen(
  draft: TripDraft,
  chosen: ChosenVehicle | null,
  canPrice: boolean,
): number | null {
  const quoted = tripQuotedSen(draft, chosen);
  if (quoted === null) return null;
  return (canPrice ? parseRinggit(draft.agreedPrice) : null) ?? quoted;
}

/** What every trip comes to together; null while one has no price. */
export function bookingTotalSen(
  trips: readonly TripDraft[],
  chosen: ChosenVehicle | null,
  canPrice: boolean,
): number | null {
  return sumOf(trips.map((draft) => tripTotalSen(draft, chosen, canPrice)));
}

/** The trip as a folded step reads: "Car with driver · KLIA to Pavilion · Sat, 24 Oct 2026, 2:30 PM". */
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
 * passengers · RM 140.00"; without the price beside a total that shows it.
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
  const quoted = sumOf(trips.map((draft) => tripQuotedSen(draft, chosen)));
  return [
    chosen.option.name,
    chosen.model ? `${chosen.model.name} chosen` : null,
    plural(Number(vehicle.passengers), "passenger"),
    price && quoted !== null ? formatMyr(quoted) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** The details as a folded step reads: "Arriving MH 1234 · 1 child seat · notes for the driver". */
export function detailsLine(details: ItemDetails | BookingDetails): string {
  const parts: string[] = [];
  const flight = (label: string, value: string) => {
    if (value.trim()) parts.push(`${label} ${value.trim().toUpperCase()}`);
  };
  if ("flightNumber" in details) {
    flight("Flight", details.flightNumber);
  } else {
    flight("Arriving", details.arrivingFlight);
    flight("Departing", details.departingFlight);
  }
  const seats = Number(details.childSeats);
  if (seats > 0) parts.push(plural(seats, "child seat"));
  if (details.notes.trim()) parts.push("notes for the driver");
  return parts.length > 0
    ? parts.join(" · ")
    : "No flight, child seats or notes";
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

/**
 * One trip under `tripItemField` with its number: its category and
 * search, and the agreed price for an admin who may set one
 * (`bookings.create`).
 */
export function tripFields(
  number: number,
  draft: TripDraft,
  canPrice: boolean,
): Record<string, string> {
  const fields = tripInput(draft.trip);
  if (canPrice) {
    fields[PRICE_OVERRIDE_FIELDS.amount] = draft.agreedPrice;
    fields[PRICE_OVERRIDE_FIELDS.reason] = draft.priceReason;
  }
  return Object.fromEntries(
    Object.entries(fields).map(([name, value]) => [
      tripItemField(number, name),
      value,
    ]),
  );
}

/** The vehicle, once for every trip: the class and the model while they can be chosen, and the group. */
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

/** The details, once: an amended item's flight, or a new booking's two flights, then child seats where the category has them, and the note. */
export function detailsFields(
  details: ItemDetails | BookingDetails,
  category: TripCategory,
): Record<string, string> {
  const fields: Record<string, string> =
    "flightNumber" in details
      ? { [TRIP_OPTION_FIELDS.flightNumber]: details.flightNumber }
      : {
          [FLIGHT_FIELDS.arriving]: details.arrivingFlight,
          [FLIGHT_FIELDS.departing]: details.departingFlight,
        };
  if (offersChildSeats(category)) {
    fields[TRIP_OPTION_FIELDS.childSeats] = details.childSeats;
  }
  fields[TRIP_OPTION_FIELDS.notes] = details.notes;
  return fields;
}
