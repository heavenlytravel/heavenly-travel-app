import "server-only";
import {
  BOOKING_RULES,
  chargedKmOf,
  flagOf,
  formatLocalDateTime,
  hourlyChoiceLabel,
  isAirportPlace,
  isTripCategory,
  parsePriceOverride,
  parseTripOptions,
  parseTripSearch,
  PRICE_OVERRIDE_FIELDS,
  surchargeLabel,
  textOf,
  itemTiming,
  firstClashSentence,
  tripItemIndexes,
  tripItemParams,
  WEEKEND_REASON_LABELS,
  type PriceOverride,
  type TripCategory,
  type TripOptions,
  type TripSearch,
} from "@repo/db";
import {
  prepareTripItem,
  quoteTrip,
  type BookingWithItems,
  type PreparedItem,
} from "@repo/db/server";
import { resolveTrip } from "@repo/places/server";
import { SCOPE_FIELD } from "@repo/console/fleet-form";
import { bookingHref } from "../../../../_lib/routes";
import {
  ADMIN_SIDE,
  CATEGORY_FIELD,
  SAME_VEHICLE_FIELD,
  type TripQuoteView,
} from "./trip-form";

/**
 * The server side of the booking forms: the website's own resolving and
 * pricing, run for the trips the console posted. Both forms go through
 * here, so a booking entered or amended on the console is priced as the
 * site would price the same trips. Only the website's limits are lifted
 * (`ADMIN_SIDE`): an admin enters what was agreed.
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
  const quoted = await quoteTrip(category, trip.request, trip.routing, {
    side: ADMIN_SIDE,
  });
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
    hire: quote.hire
      ? `${hourlyChoiceLabel(quote.hire)} from ${quote.hire.zone}`
      : null,
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
      oddHoursSen: c.price?.surcharge?.amountSen ?? 0,
      weekend: c.price?.weekend
        ? {
            reason: c.price.weekend.reason,
            amountSen: c.price.weekend.amountSen,
          }
        : null,
      availability: c.availability,
    })),
    guides: quote.guides,
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
 * once. Nothing from the browser is trusted; the website's checks apply
 * with the same messages, but not its limits (`ADMIN_SIDE`).
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
    { side: ADMIN_SIDE },
  );
  if (!prepared.ok) return { ok: false, error: prepared.error.message };
  return { ok: true, item: prepared.item, override };
}

/** The vehicle one vehicle doing every trip takes, the same on each: refused when a trip's differs. */
function sameVehicleOf(
  categories: readonly TripCategory[],
  options: readonly TripOptions[],
): boolean {
  const [first] = options;
  return (
    categories.every((category) => category === categories[0]) &&
    options.every(
      (option) =>
        option.vehicleClassId === first!.vehicleClassId &&
        option.vehicleModelId === first!.vehicleModelId &&
        option.passengers === first!.passengers,
    )
  );
}

/**
 * A new booking's items, in the order posted (by start), parsed and then
 * resolved and priced again on the server, as the website's booking
 * action does: each trip with its own category, vehicle, group, flight,
 * child seats, note and tour guide, and its own agreed price. With one
 * vehicle for every trip (`SAME_VEHICLE_FIELD`), every item must name the
 * same, and no two trips may run at once; without, trips on their own
 * vehicles may.
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

  const trips: (FormTrip & { options: TripOptions })[] = [];
  for (const [n, index] of indexes.entries()) {
    const params = tripItemParams(formData, index);
    const parsed = parseFormTrip(params);
    if (!parsed.ok) return { ok: false, error: `${label(n)}${parsed.error}` };
    const options = parseTripOptions(parsed.trip.category, params);
    if (!options) return { ok: false, error: `${label(n)}${NO_VEHICLE.error}` };
    trips.push({ ...parsed.trip, options });
  }
  const shared = flagOf(formData.get(SAME_VEHICLE_FIELD));
  if (
    shared &&
    !sameVehicleOf(
      trips.map((trip) => trip.category),
      trips.map((trip) => trip.options),
    )
  ) {
    return {
      ok: false,
      error:
        "One vehicle does every trip, so every trip takes its category, class and group. Reload the page.",
    };
  }

  const prepared = await Promise.all(
    trips.map(async (trip) => {
      const resolved = await resolveTrip(trip.search);
      if (!resolved.ok) return { ok: false as const, error: resolved.message };
      const result = await prepareTripItem(
        trip.category,
        { ...resolved.request, ...trip.options },
        resolved.routing,
        { side: ADMIN_SIDE },
      );
      return result.ok
        ? { ok: true as const, item: result.item }
        : { ok: false as const, error: result.error.message };
    }),
  );
  const items: PreparedItem[] = [];
  for (const [n, result] of prepared.entries()) {
    if (!result.ok) return { ok: false, error: `${label(n)}${result.error}` };
    items.push({ ...result.item, override: trips[n]!.override });
  }

  // One vehicle does one trip at a time: an hourly hire runs the hours its
  // duration covers from its pickup's zone, known once it is priced. Trips
  // on vehicles of their own may run together.
  const clash = shared ? firstClashSentence(items.map(itemTiming)) : null;
  if (clash) {
    return {
      ok: false,
      error: `${clash} Change the time of one of them, or give each its own vehicle.`,
    };
  }
  return { ok: true, items };
}
