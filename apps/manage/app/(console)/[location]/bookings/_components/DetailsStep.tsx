"use client";

import {
  GUIDE_LANGUAGES,
  guideIssue,
  guideOfChoice,
  includesGuide,
  offersChildSeats,
  TRIP_MAX_CHILD_SEATS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  type TripCategory,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Checkbox, Field, FieldGroup, Input, Textarea } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import {
  detailsLine,
  type BookingDetails,
  type ItemDetails,
} from "../_lib/trip-form";
import { Step, StepFoot } from "./Step";

/**
 * The details step, which is optional: what the driver needs. The amend
 * form edits one item's own flight; a new booking asks the arriving and
 * the departing flight once, each only when a trip picks up or drops off
 * at an airport, and copies them onto the trips they are for. Child seats,
 * where the category has them, and the note go on every trip. Its
 * add-ons are the website's: the tour guide, ticked and included for a
 * coach, the admin's to tick for a car, with the languages they should
 * speak, one or more (docs/261103-tour-guide.md).
 */
export function DetailsStep({
  number,
  details,
  onChange,
  category,
  airports,
  done,
  open,
  onOpen,
  onDone,
}: {
  number: number;
  details: ItemDetails | BookingDetails;
  /** Names only fields of the shape given. */
  onChange: (patch: Partial<ItemDetails & BookingDetails>) => void;
  category: TripCategory;
  /** A new booking's: whether a trip picks up at an airport, and whether one drops off at one. */
  airports?: { arriving: boolean; departing: boolean };
  /** The vehicle is chosen, so nothing before it waits. */
  done: boolean;
  open: boolean;
  onOpen: () => void;
  onDone: () => void;
}) {
  const included = includesGuide(category);
  const guide = guideOfChoice(category, details.guide);
  const issue = guideIssue(guide);

  function toggle(language: string, ticked: boolean) {
    const chosen = new Set(details.guide.languages);
    if (ticked) chosen.add(language);
    else chosen.delete(language);
    onChange({
      guide: {
        ...details.guide,
        languages: GUIDE_LANGUAGES.filter((l) => chosen.has(l)),
      },
    });
  }

  return (
    <Step
      number={number}
      title="Details"
      optional
      done={done}
      summary={detailsLine(details, category)}
      open={open}
      onOpen={onOpen}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {"flightNumber" in details ? (
          <FlightField
            label="Flight number"
            value={details.flightNumber}
            onChange={(flightNumber) => onChange({ flightNumber })}
          />
        ) : (
          <>
            {airports?.arriving ? (
              <FlightField
                label="Arriving flight"
                value={details.arrivingFlight}
                onChange={(arrivingFlight) => onChange({ arrivingFlight })}
              />
            ) : null}
            {airports?.departing ? (
              <FlightField
                label="Departing flight"
                value={details.departingFlight}
                onChange={(departingFlight) => onChange({ departingFlight })}
              />
            ) : null}
          </>
        )}
        {offersChildSeats(category) ? (
          <Field label="Child seats">
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
          label="Notes for the driver"
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
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={guide.withGuide}
              disabled={included}
              onChange={(event) =>
                onChange({
                  guide: {
                    ...details.guide,
                    added: event.currentTarget.checked,
                  },
                })
              }
            />
            Tour guide
            {included ? <Badge tone="green">Included</Badge> : null}
          </label>
          {guide.withGuide ? (
            <fieldset className="grid gap-2 pl-6">
              <legend className="mb-2 text-sm text-body">
                Languages the guide should speak
              </legend>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
                {GUIDE_LANGUAGES.map((language) => (
                  <label
                    key={language}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={details.guide.languages.includes(language)}
                      onChange={(event) =>
                        toggle(language, event.currentTarget.checked)
                      }
                    />
                    {language}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </FieldGroup>
      </div>
      <StepFoot
        label="Done"
        disabled={issue !== null}
        missing={issue}
        onNext={onDone}
      />
    </Step>
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
