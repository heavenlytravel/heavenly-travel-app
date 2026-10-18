"use client";

import {
  OFFERING_FIELD_LABELS,
  OFFERING_MONEY_FIELDS,
  TRIP_CATEGORY_LABELS,
  isTripCategory,
  parseRinggit,
  ringgitInputValue,
  type TripRates,
} from "@repo/db";
import type { Offering, VehicleClass } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Input, Radio } from "@repo/ui/field";
import { Select } from "@repo/ui/select";
import { InfoTip } from "@repo/ui/info-tip";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Card } from "../../../../_components/Card";
import type { ActionState } from "../../../../_lib/action-state";
import { locationTabHref } from "../../../../_lib/routes";
import { VehicleClassFieldset } from "../../../vehicle-classes/VehicleClassFields";
import { createOfferingAction, updateOfferingAction } from "./actions";
import { SOURCES, SOURCE_FIELD } from "./offering-form";

const TIPS: Partial<Record<keyof TripRates, string>> = {
  minimumFareSen:
    "The least a metered one-way trip costs. Below the base fare it never applies. A route on the rate grid is not metered.",
};

function MoneyInput({
  field,
  defaultSen,
  onChange,
}: {
  field: keyof TripRates;
  defaultSen: number | undefined;
  onChange?: (text: string) => void;
}) {
  const tip = TIPS[field];
  return (
    <Field
      label={
        <span className="inline-flex items-center gap-1.5">
          {OFFERING_FIELD_LABELS[field]} (RM)
          {tip ? <InfoTip text={tip} /> : null}
        </span>
      }
    >
      <Input
        name={OFFERING_MONEY_FIELDS[field]}
        inputMode="decimal"
        required
        defaultValue={
          defaultSen === undefined ? "" : ringgitInputValue(defaultSen)
        }
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      />
    </Field>
  );
}

/**
 * The form for one offering of a location. A new one picks a class from
 * the catalogue or creates one, then sets the rates; an existing one edits
 * its rates and its switch. Money is typed in ringgit. A saved offering
 * goes back to the tab.
 */
export function OfferingForm({
  locationId,
  locationSlug,
  offering,
  candidates = [],
}: {
  locationId: string;
  /** The location's slug, its address, for the way back to the tab. */
  locationSlug: string;
  /** Absent on the "new" page. */
  offering?: Offering;
  /** The catalogue classes the location does not offer yet, for a new offering. */
  candidates?: VehicleClass[];
}) {
  const isNew = !offering;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isNew ? createOfferingAction : updateOfferingAction,
    null,
  );
  const [source, setSource] = useState<string>(
    candidates.length > 0 ? SOURCES.catalogue : SOURCES.new,
  );
  const [baseFare, setBaseFare] = useState(
    offering ? ringgitInputValue(offering.baseFareSen) : "",
  );
  const [minimumFare, setMinimumFare] = useState(
    offering ? ringgitInputValue(offering.minimumFareSen) : "",
  );
  const baseSen = parseRinggit(baseFare);
  const minimumSen = parseRinggit(minimumFare);
  const minimumBelowBase =
    baseSen !== null && minimumSen !== null && minimumSen < baseSen;

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="locationId" value={locationId} />
      {offering ? <input type="hidden" name="id" value={offering.id} /> : null}

      {isNew ? (
        <>
          <Card className="grid gap-4">
            <fieldset className="grid gap-2">
              <legend className="mb-1.5 text-sm font-medium text-neutral-800">
                Which class
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <Radio
                  name={SOURCE_FIELD}
                  value={SOURCES.catalogue}
                  checked={source === SOURCES.catalogue}
                  disabled={candidates.length === 0}
                  onChange={() => setSource(SOURCES.catalogue)}
                />
                One from the catalogue
                {candidates.length === 0 ? (
                  <span className="text-neutral-500">
                    (every class is offered here already)
                  </span>
                ) : null}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Radio
                  name={SOURCE_FIELD}
                  value={SOURCES.new}
                  checked={source === SOURCES.new}
                  onChange={() => setSource(SOURCES.new)}
                />
                A new class, added to the catalogue
              </label>
            </fieldset>
            {source === SOURCES.catalogue ? (
              <Field label="Class">
                <Select
                  name="vehicleClassId"
                  required
                  defaultValue={candidates[0]?.id}
                  options={candidates.map((vehicleClass) => ({
                    value: vehicleClass.id,
                    label: isTripCategory(vehicleClass.category)
                      ? `${vehicleClass.name} (${TRIP_CATEGORY_LABELS[vehicleClass.category]})`
                      : vehicleClass.name,
                  }))}
                />
              </Field>
            ) : null}
          </Card>
          {source === SOURCES.new ? (
            <VehicleClassFieldset showActive={false} />
          ) : null}
        </>
      ) : (
        <Card className="grid gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {offering.vehicleClass.name}
          </h2>
          <p className="text-sm text-neutral-600">
            {offering.vehicleClass.description} Its seats, luggage and rules are
            the catalogue's, the same at every location.
          </p>
        </Card>
      )}

      <Card className="grid gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Rates at this location
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyInput
            field="baseFareSen"
            defaultSen={offering?.baseFareSen}
            onChange={setBaseFare}
          />
          <MoneyInput field="perKmSen" defaultSen={offering?.perKmSen} />
          <MoneyInput
            field="hourlyRateSen"
            defaultSen={offering?.hourlyRateSen}
          />
          <MoneyInput
            field="minimumFareSen"
            defaultSen={offering?.minimumFareSen}
            onChange={setMinimumFare}
          />
        </div>
        {minimumBelowBase ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            The minimum fare is below the base fare, so it never applies.
            Allowed, but check it is what you mean.
          </p>
        ) : null}
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            name="isActive"
            defaultChecked={offering?.isActive ?? true}
          />
          <span className="inline-flex items-center gap-1.5">
            {OFFERING_FIELD_LABELS.isActive}
            <InfoTip text="Off hides the class from this location's options page and search card. Bookings already made are not changed." />
          </span>
        </label>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Add class" : "Save"}
        </Button>
        <Link
          href={locationTabHref(locationSlug, "vehicle-classes")}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
