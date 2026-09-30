import "server-only";
import {
  formatLocalDateTime,
  isTripCategory,
  parsePriceOverride,
  parseTripOptions,
  parseTripSearch,
  PRICE_OVERRIDE_FIELDS,
  textOf,
  unavailableReason,
  type PriceOverride,
  type TripCategory,
  type TripSearch,
} from "@repo/db";
import { prepareTripItem, quoteTrip, type PreparedItem } from "@repo/db/server";
import { resolveTrip } from "@repo/places/server";
import { CATEGORY_FIELD, type TripQuoteView } from "./trip-form";

/**
 * The server side of the item editor: the website's own resolving and
 * pricing, run for a trip the console posted. Both forms go through here,
 * so a booking entered or amended on the console can never differ from
 * one the site would have made for the same trip.
 */

/** Every class of the category priced for the trip, as the options page does. */
export async function quoteTripView(
  category: TripCategory,
  search: TripSearch,
): Promise<TripQuoteView> {
  const trip = await resolveTrip(search);
  if (!trip.ok) return { ok: false, error: trip.message };
  const quoted = await quoteTrip(category, trip.request);
  if (!quoted.ok) return { ok: false, error: quoted.error.message };

  const { request } = trip;
  const { quote } = quoted;
  return {
    ok: true,
    category,
    pickup: request.pickup.label,
    dropoff: request.dropoff?.label ?? null,
    startsAt: formatLocalDateTime(request.startsAt),
    hours: quote.basis.mode === "hourly" ? quote.basis.hours : null,
    distanceKm: quote.basis.mode === "oneway" ? quote.basis.distanceKm : null,
    district: `${quote.district.name}, ${quote.district.state.name}`,
    multiplier: quote.district.state.multiplier,
    classes: quote.classes.map((c) => ({
      id: c.vehicleClass.id,
      name: c.vehicleClass.name,
      description: c.vehicleClass.description,
      luggage: c.vehicleClass.luggage,
      minPassengers: c.vehicleClass.minPassengers,
      maxPassengers: c.vehicleClass.maxPassengers,
      totalSen: c.price.totalSen,
      unavailable: unavailableReason(c.availability),
    })),
  };
}

export type PreparedFormItem =
  | { ok: true; item: PreparedItem; override: PriceOverride | null }
  | { ok: false; error: string };

/**
 * One item's posted fields, under their plain names, parsed and then
 * resolved and priced again on the server: nothing from the browser is
 * trusted. The same rules as the website apply, with the same messages.
 */
export async function prepareFormItem(
  params: URLSearchParams,
): Promise<PreparedFormItem> {
  const category = textOf(params.get(CATEGORY_FIELD));
  const search = parseTripSearch(params);
  if (!isTripCategory(category) || !search) {
    return { ok: false, error: "Fill in the trip and get prices first." };
  }
  const options = parseTripOptions(category, params);
  if (!options) {
    return {
      ok: false,
      error: "Choose a vehicle and the number of passengers.",
    };
  }
  const override = parsePriceOverride({
    amount: params.get(PRICE_OVERRIDE_FIELDS.amount),
    reason: params.get(PRICE_OVERRIDE_FIELDS.reason),
  });
  if (!override.ok) return override;

  const trip = await resolveTrip(search);
  if (!trip.ok) return { ok: false, error: trip.message };
  const prepared = await prepareTripItem(category, {
    ...trip.request,
    ...options,
  });
  if (!prepared.ok) return { ok: false, error: prepared.error.message };
  return { ok: true, item: prepared.item, override: override.value };
}
