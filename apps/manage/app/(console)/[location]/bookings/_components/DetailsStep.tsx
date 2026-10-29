"use client";

import {
  offersChildSeats,
  TRIP_MAX_CHILD_SEATS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  type TripCategory,
} from "@repo/db";
import { Field, Input, Textarea } from "@repo/ui/field";
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
 * where the category has them, and the note go on every trip.
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
      </div>
      <StepFoot label="Done" disabled={false} missing={null} onNext={onDone} />
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
