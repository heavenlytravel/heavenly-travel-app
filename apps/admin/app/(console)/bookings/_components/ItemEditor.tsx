"use client";

import {
  formatMyr,
  HOURLY_OPTIONS,
  isTripCategory,
  isTripMode,
  largestGroup,
  offersChildSeats,
  PRICE_OVERRIDE_FIELDS,
  PRICE_OVERRIDE_REASON_MAX_LENGTH,
  ringgitInputValue,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  TRIP_MAX_CHILD_SEATS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  TRIP_MODE_LABELS,
  TRIP_MODES,
  TRIP_OPTION_FIELDS,
  TRIP_PARAM,
  tripItemField,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input, inputClassName, Select } from "@repo/ui/field";
import { PlaceInput } from "@repo/ui/place-input";
import { useId, useTransition } from "react";
import { Card, CardTitle } from "../../../_components/Card";
import { quoteTripAction } from "../_lib/quote-action";
import {
  CATEGORY_FIELD,
  isChoosable,
  type ItemDraft,
  type PricedTrip,
  type TripValues,
} from "../_lib/trip-form";

/** The first thing missing from the trip, before the server is asked. */
function tripIssue(trip: TripValues): string | null {
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

/** The trip under the names the parser reads, as "Get prices" sends it. */
function tripInput(trip: TripValues): Record<string, string> {
  return {
    [CATEGORY_FIELD]: trip.category,
    [TRIP_PARAM.mode]: trip.mode,
    [TRIP_PARAM.pickup]: trip.pickup.id ?? "",
    [TRIP_PARAM.dropoff]: trip.dropoff.id ?? "",
    [TRIP_PARAM.date]: trip.date,
    [TRIP_PARAM.time]: trip.time,
    [TRIP_PARAM.hours]: trip.hours,
  };
}

/** "Petaling, Selangor · 55.2 km by road · area rate ×1.2" */
function quoteSummary(quote: PricedTrip) {
  const parts = [quote.district];
  if (quote.distanceKm !== null) {
    parts.push(`${quote.distanceKm.toFixed(1)} km by road`);
  }
  if (quote.hours !== null) parts.push(`${quote.hours} hours`);
  if (quote.multiplier !== 1) parts.push(`area rate ×${quote.multiplier}`);
  return parts.join(" · ");
}

/**
 * One vehicle of a booking, in the order staff take a call: the trip, then
 * "Get prices", then the vehicle, the details and an optional agreed
 * price. Its inputs carry the website's parameter names under the item's
 * index, so the create and amend actions parse them with the website's
 * parser and price the trip again; nothing from the browser is trusted. A
 * changed trip clears the prices, because they no longer apply. The state
 * is the caller's, so a form can hold several.
 */
export function ItemEditor({
  index,
  draft,
  onChange,
  hasGoogle,
  categoryLocked = false,
  canPrice,
  priceNote,
  heading,
}: {
  /** The item's place in the form, for its input names. */
  index: number;
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
  /** Amending: the category is shown, not chosen. */
  categoryLocked?: boolean;
  /** Whether the agreed price fields are shown (`bookings.create`). */
  canPrice: boolean;
  /** Under the agreed price, what saving does to the override in force. */
  priceNote?: string;
  /** "Vehicle 2" with a Remove button, when the form carries several. */
  heading?: { title: string; onRemove: (() => void) | null };
}) {
  const ids = useId();
  const [quoting, startQuote] = useTransition();
  const name = (field: string) => tripItemField(index, field);
  const { trip, quote } = draft;

  function setTrip(patch: Partial<TripValues>) {
    onChange({
      trip: { ...trip, ...patch },
      quote: null,
      vehicleClassId: null,
    });
  }

  function getPrices() {
    const issue = tripIssue(trip);
    if (issue) {
      onChange({ quoteError: issue });
      return;
    }
    startQuote(async () => {
      const result = await quoteTripAction(tripInput(trip));
      onChange(
        result.ok
          ? { quote: result, quoteError: null }
          : { quote: null, quoteError: result.error },
      );
    });
  }

  const passengers = Number(draft.passengers);
  const maxPassengers = quote ? largestGroup(quote.classes) : 1;

  return (
    <fieldset className="grid gap-6">
      {heading ? (
        <legend className="mb-2 flex w-full items-center justify-between gap-3">
          <span className="text-sm font-semibold tracking-tight">
            {heading.title}
          </span>
          {heading.onRemove ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={heading.onRemove}
            >
              Remove
            </Button>
          ) : null}
        </legend>
      ) : null}

      {categoryLocked ? (
        <input
          type="hidden"
          name={name(CATEGORY_FIELD)}
          value={trip.category}
        />
      ) : null}
      <input
        type="hidden"
        name={name(TRIP_PARAM.pickup)}
        value={trip.pickup.id ?? ""}
      />
      {trip.mode === "oneway" ? (
        <input
          type="hidden"
          name={name(TRIP_PARAM.dropoff)}
          value={trip.dropoff.id ?? ""}
        />
      ) : null}

      <Card>
        <CardTitle description="Places come from the same list the website offers. Prices include the driver and fuel.">
          Trip
        </CardTitle>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            {categoryLocked ? (
              <Input
                value={TRIP_CATEGORY_LABELS[trip.category]}
                readOnly
                disabled
              />
            ) : (
              <Select
                name={name(CATEGORY_FIELD)}
                value={trip.category}
                onChange={(e) => {
                  if (isTripCategory(e.target.value)) {
                    setTrip({ category: e.target.value });
                  }
                }}
              >
                {TRIP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {TRIP_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Trip">
            <Select
              name={name(TRIP_PARAM.mode)}
              value={trip.mode}
              onChange={(e) => {
                if (isTripMode(e.target.value))
                  setTrip({ mode: e.target.value });
              }}
            >
              {TRIP_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {TRIP_MODE_LABELS[mode]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-1.5">
            <label
              htmlFor={`${ids}-pickup`}
              className="text-sm font-medium text-neutral-800"
            >
              Pick-up
            </label>
            <PlaceInput
              id={`${ids}-pickup`}
              value={trip.pickup.text}
              placeId={trip.pickup.id}
              placeholder="Airport, hotel or address"
              className={inputClassName}
              onChange={(text, id) => setTrip({ pickup: { text, id } })}
            />
          </div>
          {trip.mode === "oneway" ? (
            <div className="grid gap-1.5">
              <label
                htmlFor={`${ids}-dropoff`}
                className="text-sm font-medium text-neutral-800"
              >
                Drop-off
              </label>
              <PlaceInput
                id={`${ids}-dropoff`}
                value={trip.dropoff.text}
                placeId={trip.dropoff.id}
                placeholder="Where they are going"
                className={inputClassName}
                onChange={(text, id) => setTrip({ dropoff: { text, id } })}
              />
            </div>
          ) : (
            <Field label="Hours">
              <Select
                name={name(TRIP_PARAM.hours)}
                value={trip.hours}
                onChange={(e) => setTrip({ hours: e.target.value })}
              >
                {HOURLY_OPTIONS.map((h) => (
                  <option key={h} value={h}>
                    {h} hours
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Field label="Date">
            <Input
              name={name(TRIP_PARAM.date)}
              type="date"
              required
              value={trip.date}
              onChange={(e) => setTrip({ date: e.target.value })}
            />
          </Field>
          <Field label="Pick-up time">
            <Input
              name={name(TRIP_PARAM.time)}
              type="time"
              required
              value={trip.time}
              onChange={(e) => setTrip({ time: e.target.value })}
            />
          </Field>
        </div>
        {!hasGoogle ? (
          <p className="mt-3 text-xs text-amber-800">
            Google is not set up on this server, so the list offers the
            districts themselves and one-way trips cannot be priced.
          </p>
        ) : null}
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant={quote ? "secondary" : "primary"}
            disabled={quoting}
            onClick={getPrices}
          >
            {quoting ? "Pricing…" : quote ? "Get prices again" : "Get prices"}
          </Button>
          {draft.quoteError ? (
            <p aria-live="polite" className="text-sm text-red-700">
              {draft.quoteError}
            </p>
          ) : quote ? (
            <p aria-live="polite" className="text-sm text-neutral-600">
              {quote.pickup}
              {quote.dropoff ? ` to ${quote.dropoff}` : ""}, {quote.startsAt}.
            </p>
          ) : null}
        </div>
      </Card>

      {quote ? (
        <>
          <Card>
            <CardTitle description={quoteSummary(quote)}>Vehicle</CardTitle>
            {quote.classes.length === 0 ? (
              <p className="text-sm text-neutral-500">
                No active class in this category. Turn one on under Vehicle
                classes first.
              </p>
            ) : (
              <div className="grid gap-2">
                {quote.classes.map((c) => {
                  const ok = isChoosable(c, passengers);
                  const on = draft.vehicleClassId === c.id && ok;
                  return (
                    <label
                      key={c.id}
                      className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
                        on
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200"
                      } ${ok ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}
                    >
                      <input
                        type="radio"
                        name={name(TRIP_OPTION_FIELDS.vehicleClass)}
                        value={c.id}
                        checked={on}
                        disabled={!ok}
                        required
                        onChange={() => onChange({ vehicleClassId: c.id })}
                        className="mt-0.5 size-4 accent-neutral-900"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                          <span className="font-medium">{c.name}</span>
                          <span className="font-medium tabular-nums">
                            {formatMyr(c.totalSen)}
                          </span>
                        </span>
                        <span className="text-neutral-600">
                          {c.description}
                        </span>
                        <span className="text-xs text-neutral-500">
                          {c.minPassengers === 1
                            ? `Up to ${c.maxPassengers} passengers`
                            : `${c.minPassengers} to ${c.maxPassengers} passengers`}
                          {" · "}
                          {c.luggage}
                          {c.unavailable
                            ? ` · ${c.unavailable}`
                            : !ok
                              ? " · Does not fit the group"
                              : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </Card>

          <Card>
            <CardTitle>Details</CardTitle>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Passengers"
                hint={`Up to ${maxPassengers} in this category.`}
              >
                <Input
                  name={name(TRIP_OPTION_FIELDS.passengers)}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={maxPassengers}
                  required
                  value={draft.passengers}
                  onChange={(e) =>
                    onChange({
                      passengers:
                        Number(e.target.value) > maxPassengers
                          ? String(maxPassengers)
                          : e.target.value,
                    })
                  }
                />
              </Field>
              {offersChildSeats(quote.category) ? (
                <Field label="Child seats">
                  <Select
                    name={name(TRIP_OPTION_FIELDS.childSeats)}
                    value={draft.childSeats}
                    onChange={(e) => onChange({ childSeats: e.target.value })}
                  >
                    {Array.from(
                      { length: TRIP_MAX_CHILD_SEATS + 1 },
                      (_, n) => (
                        <option key={n} value={n}>
                          {n === 0 ? "None" : n}
                        </option>
                      ),
                    )}
                  </Select>
                </Field>
              ) : null}
              <Field label="Flight number" hint="Optional.">
                <Input
                  name={name(TRIP_OPTION_FIELDS.flightNumber)}
                  maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
                  placeholder="MH 1234"
                  autoComplete="off"
                  className="uppercase"
                  value={draft.flightNumber}
                  onChange={(e) => onChange({ flightNumber: e.target.value })}
                />
              </Field>
              <Field
                label="Notes for the driver"
                hint="Optional. The customer sees these on their booking."
                className="sm:col-span-2"
              >
                <textarea
                  name={name(TRIP_OPTION_FIELDS.notes)}
                  maxLength={TRIP_MAX_NOTES_LENGTH}
                  rows={2}
                  placeholder="Meeting point, extra stops, anything the driver should know"
                  className={`${inputClassName} h-auto py-2`}
                  value={draft.notes}
                  onChange={(e) => onChange({ notes: e.target.value })}
                />
              </Field>
            </div>
          </Card>

          {canPrice ? (
            <Card>
              <CardTitle description="Leave both blank to charge the quoted price. The quoted price stays on the receipt next to the agreed one.">
                Agreed price
              </CardTitle>
              <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
                <Field label="Agreed price (RM)">
                  <Input
                    name={name(PRICE_OVERRIDE_FIELDS.amount)}
                    inputMode="decimal"
                    autoComplete="off"
                    placeholder={quotedPlaceholder(draft)}
                    value={draft.agreedPrice}
                    onChange={(e) => onChange({ agreedPrice: e.target.value })}
                  />
                </Field>
                <Field label="Reason">
                  <Input
                    name={name(PRICE_OVERRIDE_FIELDS.reason)}
                    maxLength={PRICE_OVERRIDE_REASON_MAX_LENGTH}
                    autoComplete="off"
                    placeholder="Agreed on the phone, corporate rate, goodwill"
                    value={draft.priceReason}
                    onChange={(e) => onChange({ priceReason: e.target.value })}
                  />
                </Field>
              </div>
              {priceNote ? (
                <p className="mt-3 text-xs text-amber-800">{priceNote}</p>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}
    </fieldset>
  );
}

/** The quoted total of the chosen class, as the agreed price's placeholder. */
function quotedPlaceholder(draft: ItemDraft): string {
  const chosen = draft.quote?.classes.find(
    (c) => c.id === draft.vehicleClassId,
  );
  return chosen ? ringgitInputValue(chosen.totalSen) : "";
}
