"use client";

import {
  BOOKING_RULES,
  formatMyr,
  HOURLY_OPTIONS,
  largestGroup,
  seatsLabel,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  TRIP_MODE_LABELS,
  TRIP_MODES,
  type BBox,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { DateTimeField } from "@repo/ui/date-field";
import { Field, inputClassName } from "@repo/ui/field";
import { CheckIcon } from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import Image from "next/image";
import { useId, type ReactNode } from "react";
import { FormError } from "@repo/ui/form-error";
import { radioKeys } from "../../../../_lib/radio-keys";
import {
  chosenVehicle,
  quoteSummary,
  tripIssue,
  tripLine,
  vehicleLine,
  vehicleOptions,
  type ChosenVehicle,
  type TripClashNote,
  type TripDraft,
  type VehicleDraft,
} from "../_lib/trip-form";
import { Choices } from "../../../../_components/Choices";
import { Step, StepFoot } from "./Step";
import { useTripQuote } from "./use-trip-quote";

/** Whether a trip has what it needs: priced, and starting while no other trip of the booking is going. */
function tripDone(draft: TripDraft, clash: TripClashNote | null) {
  return draft.quote !== null && clash === null;
}

/**
 * One trip's step, in the order staff take a call: the category and the
 * kind of trip, the places, the day and time, priced by itself once it is
 * complete. Its inputs have no names: the form posts the trip through its
 * hidden fields, so a folded step still posts what it holds. Which step is
 * open is the form's: "Continue" asks it for the next.
 */
export function TripStep({
  number,
  title,
  draft,
  onChange,
  open,
  onOpen,
  onNext,
  hasGoogle,
  categoryLocked = false,
  near,
  clash = null,
  aside,
}: {
  number: number;
  /** "Trip 2 · Car with driver". */
  title: string;
  draft: TripDraft;
  onChange: (patch: Partial<TripDraft>) => void;
  open: boolean;
  onOpen: () => void;
  onNext: () => void;
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
  /** The category is shown, not chosen: amending, or a booking of several trips, which share one vehicle. */
  categoryLocked?: boolean;
  /** The box whose places the place fields suggest first: the location's area, in a location. */
  near?: BBox;
  /** The trip starts while another of the booking is going. */
  clash?: TripClashNote | null;
  /** Beside the step's "Continue": "Remove trip". */
  aside?: ReactNode;
}) {
  const done = tripDone(draft, clash);
  return (
    <Step
      number={number}
      title={title}
      done={done}
      summary={
        clash ? (
          <span className="text-danger">{clash.label}</span>
        ) : (
          tripLine(draft)
        )
      }
      open={open}
      onOpen={onOpen}
    >
      <TripFields
        draft={draft}
        onChange={onChange}
        hasGoogle={hasGoogle}
        categoryLocked={categoryLocked}
        near={near}
        clash={clash}
      />
      <StepFoot
        disabled={!done}
        missing={
          done || draft.quoteError || clash
            ? null
            : (tripIssue(draft.trip) ?? "Pricing the trip…")
        }
        onNext={onNext}
        aside={aside}
      />
    </Step>
  );
}

function TripFields({
  draft,
  onChange,
  hasGoogle,
  categoryLocked,
  near,
  clash,
}: {
  draft: TripDraft;
  onChange: (patch: Partial<TripDraft>) => void;
  hasGoogle: boolean;
  categoryLocked: boolean;
  near?: BBox;
  clash: TripClashNote | null;
}) {
  const ids = useId();
  const { trip, quote } = draft;
  const { quoting, changeTrip, retry } = useTripQuote(draft, onChange);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap gap-x-8 gap-y-4">
        <div className="grid gap-1.5">
          <span className="text-sm font-medium text-body">Category</span>
          {categoryLocked ? (
            <span className="flex h-9 items-center text-sm text-body">
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
          <span className="text-sm font-medium text-body">Trip</span>
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
            className="text-sm font-medium text-body"
          >
            Pick-up
          </label>
          <PlaceInput
            id={`${ids}-pickup`}
            value={trip.pickup.text}
            placeId={trip.pickup.id}
            placeholder="Airport, hotel or address"
            near={near}
            className={inputClassName}
            onChange={(text, id) => changeTrip({ pickup: { text, id } })}
          />
        </div>
        {trip.mode === "oneway" ? (
          <div className="grid gap-1.5">
            <label
              htmlFor={`${ids}-dropoff`}
              className="text-sm font-medium text-body"
            >
              Drop-off
            </label>
            <PlaceInput
              id={`${ids}-dropoff`}
              value={trip.dropoff.text}
              placeId={trip.dropoff.id}
              placeholder="Where they are going"
              near={near}
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
        <div className="grid gap-1.5">
          <Field label="Pick-up date and time">
            <DateTimeField
              title="Pick-up date and time"
              value={{ date: trip.date, time: trip.time }}
              onChange={({ date, time }) => changeTrip({ date, time })}
              timeZone={BOOKING_RULES.timeZone}
            />
          </Field>
          <FormError error={clash?.note} />
        </div>
      </div>

      {!hasGoogle ? (
        <p className="text-xs text-warning">
          Google is not set up on this server, so the list offers the districts
          themselves and one-way trips cannot be priced.
        </p>
      ) : null}

      <div aria-live="polite" className="min-h-5 text-sm">
        {quoting ? (
          <p className="text-muted">Pricing the trip…</p>
        ) : draft.quoteError ? (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-danger">
            {draft.quoteError}
            <Button variant="secondary" size="sm" onClick={retry}>
              Try again
            </Button>
          </p>
        ) : quote ? (
          <p className="text-muted">
            <span className="font-semibold text-success">Priced.</span>{" "}
            {quoteSummary(quote)}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The vehicle's step: the group, then every class the trips' prices
 * offer, each judged for every trip at once, since one vehicle does them
 * all, and the model when the class lets the customer choose one. What is
 * chosen is posted through the form's hidden fields.
 */
export function VehicleStep({
  number,
  trips,
  vehicle,
  onChange,
  open,
  onOpen,
  onNext,
}: {
  number: number;
  trips: readonly TripDraft[];
  vehicle: VehicleDraft;
  onChange: (patch: Partial<VehicleDraft>) => void;
  open: boolean;
  onOpen: () => void;
  onNext: () => void;
}) {
  const chosen = chosenVehicle(trips, vehicle);
  const priced = trips.every((draft) => draft.quote !== null);
  const several = trips.length > 1;
  return (
    <Step
      number={number}
      title="Vehicle"
      hint={several ? "One vehicle for every trip" : undefined}
      done={chosen !== null}
      summary={vehicleLine(trips, vehicle)}
      open={open}
      onOpen={onOpen}
    >
      <VehicleFields
        trips={trips}
        vehicle={vehicle}
        chosen={chosen}
        onChange={onChange}
      />
      <StepFoot
        disabled={chosen === null}
        missing={
          chosen
            ? null
            : priced
              ? "Choose a vehicle that fits the group."
              : several
                ? "Fill in every trip first."
                : "Fill in the trip first."
        }
        onNext={onNext}
      />
    </Step>
  );
}

function VehicleFields({
  trips,
  vehicle,
  chosen,
  onChange,
}: {
  trips: readonly TripDraft[];
  vehicle: VehicleDraft;
  chosen: ChosenVehicle | null;
  onChange: (patch: Partial<VehicleDraft>) => void;
}) {
  const passengers = Number(vehicle.passengers);
  const options = vehicleOptions(trips, passengers);
  if (!trips.every((draft) => draft.quote !== null)) {
    return (
      <p className="text-sm text-muted">
        {trips.length > 1
          ? "Fill in every trip: the vehicles that can do them all show here with their prices."
          : "Fill in the trip: the vehicles show here with their prices."}
      </p>
    );
  }
  const maxPassengers = largestGroup(options);
  const chooseClass = (id: string) =>
    onChange(
      id === vehicle.vehicleClassId
        ? { vehicleClassId: id }
        : { vehicleClassId: id, vehicleModelId: null },
    );
  const keys = radioKeys({
    count: options.length,
    chosen: options.findIndex((option) => option.id === chosen?.option.id),
    canTake: (index) => options[index]!.unavailable === null,
    choose: (index) => chooseClass(options[index]!.id),
  });

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
          value={vehicle.passengers}
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

      {options.length === 0 ? (
        <p className="text-sm text-muted">
          This location sells no class of this category. Put one on sale on its
          Classes page first.
        </p>
      ) : (
        <div
          role="radiogroup"
          aria-label="Vehicle"
          onKeyDown={keys.onKeyDown}
          className="grid grid-cols-[repeat(auto-fill,minmax(min(11rem,100%),1fr))] gap-3"
        >
          {options.map((option, index) => {
            const ok = option.unavailable === null;
            const on = chosen?.option.id === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={on}
                tabIndex={keys.tabIndexOf(index)}
                disabled={!ok}
                onClick={() => chooseClass(option.id)}
                className={cx(
                  "relative flex flex-col overflow-hidden rounded-card border bg-white text-left text-sm transition-colors focus-ring disabled:cursor-not-allowed",
                  on ? "border-brand ring-1 ring-brand" : "border-edge",
                )}
              >
                <span className="relative block aspect-video bg-shade">
                  {option.imageUrl ? (
                    // The whole vehicle in view, as `CardImage fit="contain"` shows it.
                    <Image
                      src={option.imageUrl}
                      alt=""
                      fill
                      sizes="(min-width: 64rem) 14rem, 50vw"
                      className={cx("object-contain", !ok && "opacity-50")}
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-xs text-muted">
                      No picture yet
                    </span>
                  )}
                  {on ? (
                    <span className="absolute top-2 right-2 grid size-6 place-items-center rounded-full bg-brand text-white shadow-control">
                      <CheckIcon className="size-3.5" />
                    </span>
                  ) : null}
                </span>
                <span className="grid gap-0.5 p-3">
                  <span
                    className={cx(
                      "font-semibold",
                      ok ? "text-ink" : "text-muted",
                    )}
                  >
                    {option.name}
                  </span>
                  <span className="text-xs text-muted">
                    {seatsLabel(option)} · {option.luggage}
                    {option.unavailable ? (
                      <span className="text-warning">
                        {" "}
                        · {option.unavailable}
                      </span>
                    ) : null}
                  </span>
                  <span
                    className={cx(
                      "mt-1.5 font-semibold tabular-nums",
                      ok ? "text-ink" : "text-muted",
                    )}
                  >
                    {option.totalSen !== null
                      ? formatMyr(option.totalSen)
                      : null}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      <ModelFields chosen={chosen} onChange={onChange} />
    </div>
  );
}

/** "Any model" of a class; never a model's id. */
const ANY_MODEL = "any";

/**
 * The model the customer chooses, once a class the trips let them choose
 * in is chosen: any model by default, which the price includes, or one of
 * the models every trip's location has, at the classes' charge.
 */
function ModelFields({
  chosen,
  onChange,
}: {
  chosen: ChosenVehicle | null;
  onChange: (patch: Partial<VehicleDraft>) => void;
}) {
  if (chosen?.option.modelChoiceSen == null) return null;
  const { option, model } = chosen;
  const charge = `+${formatMyr(option.modelChoiceSen!)}`;
  return (
    <div className="grid gap-1.5 border-t border-hairline pt-4">
      <p className="text-sm font-medium text-body">Model</p>
      <Choices
        label="Model"
        size="sm"
        value={model?.id ?? ANY_MODEL}
        options={[
          { value: ANY_MODEL, label: `Any ${option.name}` },
          ...option.models.map((m) => ({
            value: m.id,
            label: `${m.name} ${charge}`,
          })),
        ]}
        onChange={(value) =>
          onChange({ vehicleModelId: value === ANY_MODEL ? null : value })
        }
      />
      <p className="text-xs text-muted">
        Any model is in the price. A model chosen costs {charge} more, and
        Operation sends that one.
      </p>
    </div>
  );
}
