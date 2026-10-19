"use client";

import {
  BOOKING_RULES,
  formatMyr,
  HOURLY_OPTIONS,
  largestGroup,
  offersChildSeats,
  seatsLabel,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  TRIP_MAX_CHILD_SEATS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  TRIP_MODE_LABELS,
  TRIP_MODES,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { DateTimeField } from "@repo/ui/date-field";
import {
  Checkbox,
  Field,
  Input,
  inputClassName,
  Textarea,
} from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import Image from "next/image";
import { useId } from "react";
import {
  chosenClass,
  chosenModel,
  detailsLine,
  isChoosable,
  quoteSummary,
  tripIssue,
  tripLine,
  vehicleLine,
  type ClassQuoteView,
  type ItemDraft,
} from "../_lib/trip-form";
import { Choices } from "./Choices";
import { Step, StepFoot } from "./Step";
import { useTripQuote } from "./use-trip-quote";

/** The steps of one item, in order. A new booking puts its customer before them. */
export const ITEM_STEPS = ["trip", "vehicle", "details"] as const;
export type ItemStep = (typeof ITEM_STEPS)[number];

/** Whether each step of an item has what it needs. The details are optional. */
export function itemStepsDone(draft: ItemDraft): Record<ItemStep, boolean> {
  const vehicle = chosenClass(draft) !== null;
  return { trip: draft.quote !== null, vehicle, details: vehicle };
}

/**
 * The three steps of a booking's item, in the order staff take a call:
 * the trip, priced by itself once it is complete; the vehicle, with the
 * passengers that decide which classes fit; then the details, which are
 * optional. Which step is open is the form's: "Continue" asks it for the
 * next. Its inputs have no names: the form posts the item through
 * `ItemHiddenFields`, so a folded step still posts what it holds.
 */
export function ItemSteps({
  first,
  draft,
  onChange,
  open,
  onOpen,
  hasGoogle,
  categoryLocked = false,
}: {
  /** The number of the trip step: 1, or 2 after the customer. */
  first: number;
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  /** The step open now; null when every step is folded. */
  open: string | null;
  onOpen: (step: ItemStep | null) => void;
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
  /** Amending: the category is shown, not chosen. */
  categoryLocked?: boolean;
}) {
  const done = itemStepsDone(draft);
  return (
    <>
      <Step
        number={first}
        title="Trip"
        done={done.trip}
        summary={tripLine(draft)}
        open={open === "trip"}
        onOpen={() => onOpen("trip")}
      >
        <TripFields
          draft={draft}
          onChange={onChange}
          hasGoogle={hasGoogle}
          categoryLocked={categoryLocked}
        />
        <StepFoot
          disabled={!done.trip}
          missing={
            done.trip
              ? null
              : draft.quoteError
                ? null
                : (tripIssue(draft.trip) ?? "Pricing the trip…")
          }
          onNext={() => onOpen("vehicle")}
        />
      </Step>
      <Step
        number={first + 1}
        title="Vehicle"
        done={done.vehicle}
        summary={vehicleLine(draft)}
        open={open === "vehicle"}
        onOpen={() => onOpen("vehicle")}
      >
        <VehicleFields draft={draft} onChange={onChange} />
        <StepFoot
          disabled={!done.vehicle}
          missing={
            done.vehicle
              ? null
              : draft.quote
                ? "Choose a vehicle that fits the group."
                : "Fill in the trip first."
          }
          onNext={() => onOpen("details")}
        />
      </Step>
      <Step
        number={first + 2}
        title="Details"
        optional
        done={done.details}
        summary={detailsLine(draft)}
        open={open === "details"}
        onOpen={() => onOpen("details")}
      >
        <DetailsFields draft={draft} onChange={onChange} />
        <StepFoot
          label="Done"
          disabled={false}
          missing={null}
          onNext={() => onOpen(null)}
        />
      </Step>
    </>
  );
}

function TripFields({
  draft,
  onChange,
  hasGoogle,
  categoryLocked,
}: {
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
  hasGoogle: boolean;
  categoryLocked: boolean;
}) {
  const ids = useId();
  const { trip, quote } = draft;
  const { quoting, changeTrip, retry } = useTripQuote(draft, onChange);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-neutral-800">Category</span>
          {categoryLocked ? (
            <span className="flex h-9 items-center text-sm text-neutral-700">
              {TRIP_CATEGORY_LABELS[trip.category]}
            </span>
          ) : (
            <Choices
              label="Category"
              value={trip.category}
              options={TRIP_CATEGORIES.map((category) => ({
                value: category,
                label: TRIP_CATEGORY_LABELS[category],
              }))}
              onChange={(category) => changeTrip({ category })}
            />
          )}
        </div>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-neutral-800">Trip</span>
          <Choices
            label="Trip"
            value={trip.mode}
            options={TRIP_MODES.map((mode) => ({
              value: mode,
              label: TRIP_MODE_LABELS[mode],
            }))}
            onChange={(mode) => changeTrip({ mode })}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
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
            onChange={(text, id) => changeTrip({ pickup: { text, id } })}
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
              onChange={(text, id) => changeTrip({ dropoff: { text, id } })}
            />
          </div>
        ) : (
          <Field label="Hours">
            <Select
              value={trip.hours}
              onValueChange={(hours) => changeTrip({ hours })}
              options={HOURLY_OPTIONS.map((h) => ({
                value: String(h),
                label: `${h} hours`,
              }))}
            />
          </Field>
        )}
        <Field label="Pick-up date and time">
          <DateTimeField
            title="Pick-up date and time"
            value={{ date: trip.date, time: trip.time }}
            onChange={({ date, time }) => changeTrip({ date, time })}
            timeZone={BOOKING_RULES.timeZone}
          />
        </Field>
      </div>

      {!hasGoogle ? (
        <p className="text-xs text-amber-800">
          Google is not set up on this server, so the list offers the districts
          themselves and one-way trips cannot be priced.
        </p>
      ) : null}

      <div aria-live="polite" className="min-h-5 text-sm">
        {quoting ? (
          <p className="text-neutral-500">Pricing the trip…</p>
        ) : draft.quoteError ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-red-700">
            {draft.quoteError}
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          </p>
        ) : quote ? (
          <p className="text-neutral-600">
            <span className="font-medium text-emerald-700">Priced.</span>{" "}
            {quoteSummary(quote)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function VehicleFields({
  draft,
  onChange,
}: {
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
}) {
  const { quote } = draft;
  if (!quote) {
    return (
      <p className="text-sm text-neutral-500">
        Fill in the trip: the vehicles show here with their prices.
      </p>
    );
  }
  const passengers = Number(draft.passengers);
  const maxPassengers = largestGroup(quote.classes);

  return (
    <div className="grid gap-5">
      <Field
        label="Passengers"
        hint={`The largest vehicle here seats ${maxPassengers}.`}
        className="max-w-48"
      >
        <NumberField
          min={1}
          max={maxPassengers}
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

      {quote.classes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          This location sells no class of this category. Put one on sale on its
          Vehicle classes tab first.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Vehicle" className="grid gap-2">
          {quote.classes.map((c) => {
            const ok = isChoosable(c, passengers);
            const on = draft.vehicleClassId === c.id && ok;
            return (
              <button
                key={c.id}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={!ok}
                onClick={() =>
                  onChange(
                    c.id === draft.vehicleClassId
                      ? { vehicleClassId: c.id }
                      : {
                          vehicleClassId: c.id,
                          vehicleModelId: null,
                          similarModelOk: true,
                        },
                  )
                }
                className={cx(
                  "grid grid-cols-[4.5rem_1fr_auto] items-center gap-4 rounded-lg border p-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-50",
                  on
                    ? "border-neutral-900 bg-neutral-50 ring-1 ring-neutral-900"
                    : "border-neutral-200 hover:border-neutral-400",
                )}
              >
                <span className="relative aspect-[3/2] overflow-hidden rounded-md bg-neutral-100">
                  {c.imageUrl ? (
                    <Image
                      src={c.imageUrl}
                      alt=""
                      fill
                      sizes="72px"
                      className="object-contain"
                    />
                  ) : null}
                </span>
                <span className="grid min-w-0 gap-0.5">
                  <span className="font-medium text-neutral-900">{c.name}</span>
                  <span className="text-xs text-neutral-500">
                    {seatsLabel(c)} · {c.luggage}
                    {c.unavailable
                      ? ` · ${c.unavailable}`
                      : !ok
                        ? " · does not fit the group"
                        : ""}
                  </span>
                </span>
                <span className="font-semibold text-neutral-900 tabular-nums">
                  {formatMyr(c.totalSen)}
                </span>
              </button>
            );
          })}
        </div>
      )}
      <ModelFields draft={draft} onChange={onChange} />
    </div>
  );
}

/** "No preference" among a class's models; never a model's id. */
const NO_MODEL = "none";

/**
 * The model the customer prefers, once a class with two models or more is
 * chosen: none by default, and with one, whether a similar vehicle will
 * do. The price is the class's either way.
 */
function ModelFields({
  draft,
  onChange,
}: {
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
}) {
  const chosen: ClassQuoteView | null = chosenClass(draft);
  if (!chosen || chosen.models.length < 2) return null;
  const model = chosenModel(draft);
  return (
    <div className="grid gap-3 border-t border-neutral-100 pt-4">
      <div>
        <p className="mb-1.5 text-sm font-medium text-neutral-800">
          Model the customer prefers
        </p>
        <Choices
          label="Model the customer prefers"
          size="sm"
          value={draft.vehicleModelId ?? NO_MODEL}
          options={[
            { value: NO_MODEL, label: "No preference" },
            ...chosen.models.map((m) => ({ value: m.id, label: m.name })),
          ]}
          onChange={(value) =>
            onChange({
              vehicleModelId: value === NO_MODEL ? null : value,
              similarModelOk: true,
            })
          }
        />
      </div>
      {model ? (
        <div className="grid gap-1">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={draft.similarModelOk}
              onChange={(e) => onChange({ similarModelOk: e.target.checked })}
            />
            A similar vehicle is fine if the {model.name} is not free
          </label>
          {draft.similarModelOk ? null : (
            <p className="text-xs text-amber-700">
              The customer is asked before another vehicle is sent.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

function DetailsFields({
  draft,
  onChange,
}: {
  draft: ItemDraft;
  onChange: (patch: Partial<ItemDraft>) => void;
}) {
  const childSeats = draft.quote
    ? offersChildSeats(draft.quote.category)
    : offersChildSeats(draft.trip.category);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Flight number">
        <Input
          maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
          placeholder="MH 1234"
          autoComplete="off"
          className="uppercase"
          value={draft.flightNumber}
          onChange={(e) => onChange({ flightNumber: e.target.value })}
        />
      </Field>
      {childSeats ? (
        <Field label="Child seats">
          <Select
            value={draft.childSeats}
            onValueChange={(next) => onChange({ childSeats: next })}
            options={Array.from(
              { length: TRIP_MAX_CHILD_SEATS + 1 },
              (_, n) => ({
                value: String(n),
                label: n === 0 ? "None" : String(n),
              }),
            )}
          />
        </Field>
      ) : null}
      <Field
        label="Notes for the driver"
        hint="The customer sees these on their booking."
        className="sm:col-span-2"
      >
        <Textarea
          maxLength={TRIP_MAX_NOTES_LENGTH}
          rows={3}
          placeholder="Meeting point, extra stops, anything the driver should know"
          value={draft.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </Field>
    </div>
  );
}
