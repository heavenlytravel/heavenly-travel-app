import "server-only";
import {
  BOOKING_RULES,
  chargedKmOf,
  flightOfTrip,
  formatLocalDateTime,
  isAirportPlace,
  isTripCategory,
  parseFlightNumber,
  parsePriceOverride,
  parseTripOptions,
  parseTripSearch,
  PRICE_OVERRIDE_FIELDS,
  surchargeLabel,
  textOf,
  tripClashes,
  tripItemIndexes,
  tripItemParams,
  WEEKEND_REASON_LABELS,
  type PriceOverride,
  type TripCategory,
  type TripSearch,
} from "@repo/db";
import {
  prepareTripItem,
  prepareTripItems,
  quoteTrip,
  type BookingWithItems,
  type PreparedItem,
  type TripRequest,
} from "@repo/db/server";
import { resolveTrip, tripRouting } from "@repo/places/server";
import { SCOPE_FIELD } from "@repo/console/fleet-form";
import { bookingHref } from "../../../../_lib/routes";
import { CATEGORY_FIELD, FLIGHT_FIELDS, type TripQuoteView } from "./trip-form";

/**
 * The server side of the booking forms: the website's own resolving and
 * pricing, run for the trips the console posted. Both forms go through
 * here, so a booking entered or amended on the console can never differ
 * from one the site would have made for the same trips.
 */

/**
 * Where a booking opens once a form saved it: in the location the form
 * was opened in (`SCOPE_FIELD`) while one of its trips picks up there,
 * else across every location.
 */
export function savedBookingHref(
  formData: FormData,
  booking: BookingWithItems,
) {
  const posted = textOf(formData.get(SCOPE_FIELD));
  const here = booking.items.some((item) => item.location?.slug === posted);
  return bookingHref(here ? posted : null, booking.id);
}

/** Every class of the category priced for the trip, as the options page does. */
export async function quoteTripView(
  category: TripCategory,
  search: TripSearch,
): Promise<TripQuoteView> {
  const trip = await resolveTrip(search);
  if (!trip.ok) return { ok: false, error: trip.message };
  const quoted = await quoteTrip(category, trip.request, trip.routing);
  if (!quoted.ok) return { ok: false, error: quoted.error.message };

  const { request } = trip;
  const { quote } = quoted;
  const extraKmCharged = quote.zoneTrip
    ? chargedKmOf(quote.zoneTrip, quote.location.freeExtraKm)
    : 0;
  return {
    ok: true,
    category,
    pickup: request.pickup.label,
    dropoff: request.dropoff?.label ?? null,
    pickupAirport: isAirportPlace(request.pickup),
    dropoffAirport: request.dropoff ? isAirportPlace(request.dropoff) : false,
    startsAt: formatLocalDateTime(request.startsAt),
    hours: quote.basis.mode === "hourly" ? quote.basis.hours : null,
    distanceKm: quote.basis.mode === "oneway" ? quote.basis.distanceKm : null,
    district: quote.district
      ? `${quote.district.name}, ${quote.district.state.name}`
      : null,
    location: quote.location.name,
    route: quote.dropoff
      ? quote.pickup.zone === quote.dropoff.zone
        ? `Within ${quote.pickup.zone}`
        : `${quote.pickup.zone} to ${quote.dropoff.zone}`
      : null,
    extraKm: extraKmCharged || null,
    surcharge: quote.surcharge ? surchargeLabel(quote.surcharge) : null,
    weekend: quote.weekend
      ? `${WEEKEND_REASON_LABELS[quote.weekend.reason].toLowerCase()} ${surchargeLabel(quote.weekend.charge)}`
      : null,
    classes: quote.classes.map((c) => ({
      id: c.vehicleClass.id,
      name: c.vehicleClass.name,
      luggage: c.vehicleClass.luggage,
      minPassengers: c.vehicleClass.minPassengers,
      maxPassengers: c.vehicleClass.maxPassengers,
      imageUrl: c.offering.coverUrl,
      models: c.vehicleClass.models.map(({ id, name }) => ({ id, name })),
      totalSen: c.price?.totalSen ?? null,
      modelChoiceSen: c.modelChoice?.amountSen ?? null,
      availability: c.availability,
    })),
  };
}

type Refused = { ok: false; error: string };

const NO_TRIP: Refused = { ok: false, error: "Fill in the trip first." };
const NO_VEHICLE: Refused = {
  ok: false,
  error: "Choose a vehicle and the number of passengers.",
};

/** One trip as a form posts it: its category, its search, and the agreed price for it. */
type FormTrip = {
  category: TripCategory;
  search: TripSearch;
  override: PriceOverride | null;
};

/** One trip's posted fields, under their plain names, read; or why they cannot be. */
function parseFormTrip(
  params: URLSearchParams,
): { ok: true; trip: FormTrip } | Refused {
  const category = textOf(params.get(CATEGORY_FIELD));
  const search = parseTripSearch(params);
  if (!isTripCategory(category) || !search) return NO_TRIP;
  const override = parsePriceOverride({
    amount: params.get(PRICE_OVERRIDE_FIELDS.amount),
    reason: params.get(PRICE_OVERRIDE_FIELDS.reason),
  });
  if (!override.ok) return { ok: false, error: override.error };
  return { ok: true, trip: { category, search, override: override.value } };
}

export type PreparedFormItem =
  { ok: true; item: PreparedItem; override: PriceOverride | null } | Refused;

/**
 * The amend form's one item, parsed and then resolved and priced again on
 * the server: its trip as the item's fields, the vehicle and its details
 * once. Nothing from the browser is trusted; the website's rules apply,
 * with the same messages.
 */
export async function prepareFormItem(
  formData: FormData,
): Promise<PreparedFormItem> {
  const [index] = tripItemIndexes(formData);
  if (index === undefined) return NO_TRIP;
  const parsed = parseFormTrip(tripItemParams(formData, index));
  if (!parsed.ok) return parsed;
  const { category, search, override } = parsed.trip;
  const options = parseTripOptions(category, formData);
  if (!options) return NO_VEHICLE;

  const trip = await resolveTrip(search);
  if (!trip.ok) return { ok: false, error: trip.message };
  const prepared = await prepareTripItem(
    category,
    { ...trip.request, ...options },
    trip.routing,
  );
  if (!prepared.ok) return { ok: false, error: prepared.error.message };
  return { ok: true, item: prepared.item, override };
}

/**
 * A new booking's trips, in the order posted (by start), parsed and then
 * resolved and priced again on the server, as the website's booking
 * action does: one vehicle and the details once for them all, no two
 * trips at once, the arriving flight on each pick-up at an airport and the
 * departing one on each drop-off at one, the note on every trip. Each
 * item carries its own agreed price.
 */
export async function prepareFormItems(
  formData: FormData,
): Promise<{ ok: true; items: PreparedItem[] } | Refused> {
  const indexes = tripItemIndexes(formData);
  if (indexes.length === 0) return NO_TRIP;
  if (indexes.length > BOOKING_RULES.maxTripsPerBooking) {
    return {
      ok: false,
      error: `A booking takes up to ${BOOKING_RULES.maxTripsPerBooking} trips. Enter the rest as a booking of their own.`,
    };
  }
  const several = indexes.length > 1;
  const label = (n: number) => (several ? `Trip ${n + 1}: ` : "");

  const trips: FormTrip[] = [];
  for (const [n, index] of indexes.entries()) {
    const parsed = parseFormTrip(tripItemParams(formData, index));
    if (!parsed.ok) return { ok: false, error: `${label(n)}${parsed.error}` };
    trips.push(parsed.trip);
  }
  const category = trips[0]!.category;
  if (trips.some((trip) => trip.category !== category)) {
    return {
      ok: false,
      error: "One vehicle does every trip, so every trip takes its category.",
    };
  }
  const options = parseTripOptions(category, formData);
  if (!options) return NO_VEHICLE;

  const resolved = await Promise.all(
    trips.map((trip) => resolveTrip(trip.search)),
  );
  const requests: TripRequest[] = [];
  for (const [n, trip] of resolved.entries()) {
    if (!trip.ok) return { ok: false, error: `${label(n)}${trip.message}` };
    requests.push(trip.request);
  }

  // One vehicle does one trip at a time.
  const clashes = tripClashes(
    requests.map((request) => ({
      startsAt: request.startsAt,
      hours: request.mode === "hourly" ? request.hours : null,
    })),
  );
  const clashing = clashes.findIndex((found) => found !== null);
  if (clashing >= 0) {
    const clash = clashes[clashing]!;
    return {
      ok: false,
      error: `Trip ${clashing + 1} starts ${
        clash.kind === "same-time" ? "at the same time as" : "during"
      } trip ${clash.with + 1}, and one vehicle cannot do both. Change the time of one of them.`,
    };
  }

  const flights = {
    arriving: parseFlightNumber(textOf(formData.get(FLIGHT_FIELDS.arriving))),
    departing: parseFlightNumber(textOf(formData.get(FLIGHT_FIELDS.departing))),
  };
  const prepared = await prepareTripItems(
    category,
    requests.map((request) => ({
      ...request,
      ...options,
      flightNumber: flightOfTrip(request, flights),
    })),
    tripRouting,
  );
  const items: PreparedItem[] = [];
  for (const [n, result] of prepared.entries()) {
    if (!result.ok) {
      return { ok: false, error: `${label(n)}${result.error.message}` };
    }
    items.push({ ...result.item, override: trips[n]!.override });
  }
  return { ok: true, items };
}
