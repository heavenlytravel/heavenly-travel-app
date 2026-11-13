"use client";

import {
  formatMyr,
  offersChildSeats,
  requestableLanguages,
  TRIP_MAX_CHILD_SEATS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  type GuideChoice,
  type GuideOffer,
  type TripCategory,
} from "@repo/db";
import {
  Checkbox,
  Field,
  FieldGroup,
  Input,
  Radio,
  Textarea,
} from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { Select } from "@repo/ui/select";
import { useId } from "react";
import { detailsLine, type ItemDetails } from "../_lib/trip-form";
import { Step, StepFoot } from "./Step";

/**
 * The details step of the amend form, which is optional: what the driver
 * needs on the item (`DetailsFields`). A new booking shows the same
 * fields inside each trip.
 */
export function DetailsStep({
  number,
  details,
  onChange,
  category,
  guideOffers,
  guideIssue,
  done,
  open,
  onOpen,
  onDone,
}: {
  number: number;
  details: ItemDetails;
  onChange: (patch: Partial<ItemDetails>) => void;
  category: TripCategory;
  /** The guide languages on sale for the trip, at their price. */
  guideOffers: readonly GuideOffer[];
  /** Why the guide chosen cannot be booked; null when it can. */
  guideIssue: string | null;
  /** The vehicle is chosen, so nothing before it waits. */
  done: boolean;
  open: boolean;
  onOpen: () => void;
  onDone: () => void;
}) {
  return (
    <Step
      number={number}
      title="Details"
      optional
      done={done}
      summary={detailsLine(details)}
      open={open}
      onOpen={onOpen}
    >
      <DetailsFields
        details={details}
        onChange={onChange}
        category={category}
        guideOffers={guideOffers}
        guideIssue={guideIssue}
        flightLabel="Flight number"
      />
      <StepFoot
        label="Done"
        disabled={guideIssue !== null}
        missing={guideIssue}
        onNext={onDone}
      />
    </Step>
  );
}

/**
 * What the driver needs on one item: its flight, child seats where the
 * category has them, and the note. Then its add-ons, the website's: the
 * tour guide in a language on sale for the trip (Rates' Tour Guide
 * Rates), priced into it, and another language asked for, free
 * (docs/261103-tour-guide.md). The radios are named for this item, so the
 * trips of one form do not share a group.
 */
export function DetailsFields({
  details,
  onChange,
  category,
  guideOffers,
  guideIssue,
  flightLabel,
}: {
  details: ItemDetails;
  onChange: (patch: Partial<ItemDetails>) => void;
  category: TripCategory;
  guideOffers: readonly GuideOffer[];
  guideIssue: string | null;
  /** The flight field's label; null hides it, for a trip at no airport. */
  flightLabel: string | null;
}) {
  const id = useId();
  const guide = details.guide;
  const others = requestableLanguages(guideOffers);
  const setGuide = (change: Partial<GuideChoice>) =>
    onChange({ guide: { ...guide, ...change } });

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {flightLabel !== null ? (
        <FlightField
          label={flightLabel}
          value={details.flightNumber}
          onChange={(flightNumber) => onChange({ flightNumber })}
        />
      ) : null}
      {offersChildSeats(category) ? (
        <Field label="Child Seats">
          <Select
            value={details.childSeats}
            onValueChange={(childSeats) => onChange({ childSeats })}
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
        label="Notes for the Driver"
        hint="The customer sees these on their booking."
        className="sm:col-span-2"
      >
        <Textarea
          maxLength={TRIP_MAX_NOTES_LENGTH}
          rows={3}
          placeholder="Meeting point, extra stops, anything the driver should know"
          value={details.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
        />
      </Field>
      <FieldGroup className="grid gap-3 sm:col-span-2">
        <p className="text-sm font-semibold text-ink">Add-ons</p>
        {/* A guide chosen stays untickable after its language goes off
            sale (a trip copied from the one before, a rate cleared since). */}
        {guideOffers.length > 0 || guide.language !== null ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={guide.language !== null}
              onChange={(event) =>
                setGuide({
                  language: event.currentTarget.checked
                    ? (guideOffers[0]?.language ?? null)
                    : null,
                })
              }
            />
            Tour Guide
          </label>
        ) : (
          <p className="text-sm text-muted">
            No tour guide is on sale for this trip: its location has no guide
            rate for it.
          </p>
        )}
        {guide.language !== null ? (
          <fieldset className="grid gap-2 pl-6">
            <legend className="mb-2 text-sm text-body">
              The Language the Guide Speaks
            </legend>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              {guideOffers.map((offer) => (
                <label
                  key={offer.language}
                  className="flex items-center gap-2 text-sm"
                >
                  <Radio
                    name={`${id}-guide`}
                    checked={guide.language === offer.language}
                    onChange={() => setGuide({ language: offer.language })}
                  />
                  <span className="flex-1">{offer.language}</span>
                  <span className="tabular-nums">
                    {formatMyr(offer.amountSen)}
                  </span>
                </label>
              ))}
            </div>
            {guideIssue ? <FormError error={guideIssue} /> : null}
          </fieldset>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={guide.request !== null}
            onChange={(event) =>
              setGuide({
                request: event.currentTarget.checked
                  ? (others.find((l) => l !== guide.language) ?? null)
                  : null,
              })
            }
          />
          A guide in another language, asked for
        </label>
        {guide.request !== null ? (
          <fieldset className="grid gap-2 pl-6">
            <legend className="mb-2 text-sm text-body">
              Free to ask. Once a guide is found, amend the trip to add them.
            </legend>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {others.map((language) => (
                <label
                  key={language}
                  className="flex items-center gap-2 text-sm"
                >
                  <Radio
                    name={`${id}-request`}
                    checked={guide.request === language}
                    onChange={() => setGuide({ request: language })}
                  />
                  {language}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
      </FieldGroup>
    </div>
  );
}

function FlightField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
        placeholder="MH 1234"
        autoComplete="off"
        className="uppercase"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
