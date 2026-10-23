"use client";

import {
  CROSS_LOCATION_LABELS,
  TRIP_REACH_FIELDS,
  TRIP_REACH_LIMITS,
  type TripReach,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { cx } from "@repo/ui/cx";
import { Field, Radio } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { useState } from "react";
import { FormError } from "../../../../_components/FormError";
import { useActionForm } from "../../../../_lib/use-action-form";
import { setTripReachAction } from "./actions";
import { crossLocationNote } from "./trip-reach-note";

/**
 * Where the location's trips may go: the furthest extra road, in whole
 * km, and trips across locations as two cards, the one in force marked.
 * Saved together; a refusal of the km shows under its field.
 */
export function TripReachForm({
  locationId,
  locationName,
  reach,
}: {
  locationId: string;
  locationName: string;
  reach: TripReach;
}) {
  const [maxExtraKm, setMaxExtraKm] = useState(String(reach.maxExtraKm));
  const [crossLocation, setCrossLocation] = useState(reach.crossLocation);
  const { pending, error, formProps } = useActionForm(setTripReachAction, {
    done: "Saved where trips may go.",
  });
  const unchanged =
    maxExtraKm === String(reach.maxExtraKm) &&
    crossLocation === reach.crossLocation;
  const { min, max } = TRIP_REACH_LIMITS.maxExtraKm;

  return (
    <form {...formProps} className="grid gap-5">
      <input type="hidden" name="locationId" value={locationId} />
      <Field
        label="Furthest extra road"
        hint={`An address outside every zone takes its nearest zone by road, and pays its road to the zone's edge at the class's rate per extra km. One further than this, in km, is not priced: the customer is sent to WhatsApp. Between ${min} and ${max}.`}
      >
        <NumberField
          name={TRIP_REACH_FIELDS.maxExtraKm}
          min={min}
          max={max}
          step={1}
          required
          value={maxExtraKm}
          onChange={(event) => setMaxExtraKm(event.target.value)}
          className="w-40"
        />
      </Field>
      <fieldset className="grid gap-2">
        <legend className="mb-1.5 text-sm font-medium text-slate-800">
          Trips across locations
        </legend>
        {([false, true] as const).map((on) => {
          const checked = crossLocation === on;
          return (
            <label
              key={String(on)}
              className={cx(
                "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm transition-colors",
                checked
                  ? "border-brand bg-brand-tint ring-1 ring-brand"
                  : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
              )}
            >
              <Radio
                name={TRIP_REACH_FIELDS.crossLocation}
                value={on ? "on" : "off"}
                checked={checked}
                onChange={() => setCrossLocation(on)}
                className="mt-0.5"
              />
              <span className="grid gap-0.5">
                <span className="font-medium text-slate-900">
                  {CROSS_LOCATION_LABELS[on ? "on" : "off"]}
                </span>
                <span className="text-slate-600">
                  {crossLocationNote(on, locationName)}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending || unchanged}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormError error={error} />
      </div>
    </form>
  );
}
