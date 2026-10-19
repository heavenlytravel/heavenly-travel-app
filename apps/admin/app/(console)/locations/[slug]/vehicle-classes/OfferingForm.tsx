"use client";

import {
  BOOKING_RULES,
  CATEGORY_RULE_DEFAULTS,
  OFFERING_FIELD_LABELS,
  OFFERING_MONEY_FIELDS,
  OFFERING_RULE_FIELDS,
  TRIP_CATEGORY_LABELS,
  isTripCategory,
  parseRinggit,
  ringgitInputValue,
  type OfferingField,
  type OfferingRules,
  type TripCategory,
  type TripRates,
} from "@repo/db";
import type { Offering, VehicleClass } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Input, Radio } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { InfoTip } from "@repo/ui/info-tip";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Card } from "../../../../_components/Card";
import type { ActionState } from "../../../../_lib/action-state";
import { locationTabHref } from "../../../../_lib/routes";
import {
  DEFAULT_CATEGORY,
  VehicleClassFieldset,
} from "../../../vehicle-classes/VehicleClassFields";
import { createOfferingAction, updateOfferingAction } from "./actions";
import { SOURCES, SOURCE_FIELD } from "./offering-form";

const TIPS: Partial<Record<OfferingField, string>> = {
  minimumFareSen:
    "The least a metered one-way trip costs. Below the base fare it never applies. A route on the rate grid is not metered.",
  minLeadHours: "Hours before pickup a booking must be made.",
  cancellationCutoffHours:
    "Hours before pickup a customer may still cancel. A booking keeps the cutoff it was made with.",
  minHourlyHours: `The shortest hourly hire, ${BOOKING_RULES.hourlyFloorHours} to ${BOOKING_RULES.maxHourlyHours} hours.`,
};

type RuleField = (typeof OFFERING_RULE_FIELDS)[number];

/** The rules as the fields hold them: typed text. */
type RuleTexts = Record<RuleField, string>;

const ruleTexts = (rules: OfferingRules): RuleTexts => ({
  minLeadHours: String(rules.minLeadHours),
  cancellationCutoffHours: String(rules.cancellationCutoffHours),
  minHourlyHours: String(rules.minHourlyHours),
});

/** A field's label, its unit, and its tooltip when it has one. */
function FieldLabel({ field, unit }: { field: OfferingField; unit: string }) {
  const tip = TIPS[field];
  return (
    <span className="inline-flex items-center gap-1.5">
      {OFFERING_FIELD_LABELS[field]} ({unit})
      {tip ? <InfoTip text={tip} /> : null}
    </span>
  );
}

function MoneyInput({
  field,
  defaultSen,
  onChange,
}: {
  field: keyof TripRates;
  defaultSen: number | undefined;
  onChange?: (text: string) => void;
}) {
  return (
    <Field label={<FieldLabel field={field} unit="RM" />}>
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
 * the catalogue or creates one, then sets the rates and the rules; the
 * rules start from the usual ones of the class's category, and start again
 * when the category changes. An existing one edits its rates, its rules
 * and its switch. Money is typed in ringgit, the rules in hours. A saved
 * offering goes back to the tab.
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
  const [classId, setClassId] = useState(candidates[0]?.id ?? "");
  const [newCategory, setNewCategory] =
    useState<TripCategory>(DEFAULT_CATEGORY);
  const categoryOf = (nextSource: string, nextClassId: string) => {
    if (nextSource === SOURCES.new) return newCategory;
    const picked = candidates.find((c) => c.id === nextClassId)?.category;
    return picked && isTripCategory(picked) ? picked : DEFAULT_CATEGORY;
  };
  const category = categoryOf(source, classId);
  const [rules, setRules] = useState<RuleTexts>(
    ruleTexts(offering ?? CATEGORY_RULE_DEFAULTS[category]),
  );
  /** A new offering's rules start again when its class's category changes. */
  function follow(next: TripCategory) {
    if (isNew && next !== category) {
      setRules(ruleTexts(CATEGORY_RULE_DEFAULTS[next]));
    }
  }
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
                  onChange={() => {
                    follow(categoryOf(SOURCES.catalogue, classId));
                    setSource(SOURCES.catalogue);
                  }}
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
                  onChange={() => {
                    follow(newCategory);
                    setSource(SOURCES.new);
                  }}
                />
                A new class, added to the catalogue
              </label>
            </fieldset>
            {source === SOURCES.catalogue ? (
              <Field label="Class">
                <Select
                  name="vehicleClassId"
                  required
                  value={classId}
                  onValueChange={(next) => {
                    follow(categoryOf(SOURCES.catalogue, next));
                    setClassId(next);
                  }}
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
            <VehicleClassFieldset
              showActive={false}
              onCategoryChange={(next) => {
                follow(next);
                setNewCategory(next);
              }}
            />
          ) : null}
        </>
      ) : (
        <Card className="grid gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            {offering.vehicleClass.name}
          </h2>
          <p className="text-sm text-neutral-600">
            {offering.vehicleClass.description} Its seats, luggage and picture
            are the catalogue&apos;s, the same at every location.
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

      <Card className="grid gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Rules at this location
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {OFFERING_RULE_FIELDS.map((field) => (
            <Field
              key={field}
              label={<FieldLabel field={field} unit="hours" />}
            >
              <NumberField
                name={field}
                step={1}
                min={
                  field === "minHourlyHours"
                    ? BOOKING_RULES.hourlyFloorHours
                    : 0
                }
                max={
                  field === "minHourlyHours"
                    ? BOOKING_RULES.maxHourlyHours
                    : undefined
                }
                required
                value={rules[field]}
                onChange={(e) =>
                  setRules((current) => ({
                    ...current,
                    [field]: e.target.value,
                  }))
                }
              />
            </Field>
          ))}
        </div>
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
