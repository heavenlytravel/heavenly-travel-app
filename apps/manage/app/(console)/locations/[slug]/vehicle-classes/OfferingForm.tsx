"use client";

import {
  BOOKING_RULES,
  CATEGORY_RULE_DEFAULTS,
  MODEL_CHOICE_FIELDS,
  modelChoiceOf,
  OFFERING_FIELD_LABELS,
  OFFERING_MONEY_FIELDS,
  OFFERING_RULE_FIELDS,
  TRIP_CATEGORY_LABELS,
  isTripCategory,
  ringgitInputValue,
  type OfferingField,
  type OfferingRules,
  type SurchargeKind,
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
import { useState } from "react";
import { Card } from "@repo/console/Card";
import { ChargeInput } from "../../../../_components/ChargeInput";
import { FormError } from "@repo/console/FormError";
import {
  OFFERING_FROM_PARAM,
  offeringBackHref,
  type OfferingFrom,
} from "../../../../_lib/routes";
import { useActionForm } from "@repo/console/use-action-form";
import {
  DEFAULT_CATEGORY,
  VehicleClassFieldset,
} from "../../../vehicle-classes/VehicleClassFields";
import { createOfferingAction, updateOfferingAction } from "./actions";
import { SOURCES, SOURCE_FIELD } from "./offering-form";
import { UploadsContext, useUploadCount } from "@repo/console/use-image-upload";
import { FORM_WIDTH } from "@repo/console/PageColumn";

const TIPS: Partial<Record<OfferingField, string>> = {
  perKmSen:
    "A one-way trip costs its cell on the rate grid. An address outside every zone adds its road to the nearest zone's edge at this rate, when the trip runs past the edge.",
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
}: {
  field: keyof TripRates;
  defaultSen: number | undefined;
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
      />
    </Field>
  );
}

/**
 * The charge to choose a model in a sentence: "Choosing a model costs 15 %
 * more", or "RM 40 more" with the switch on RM. Empty, customers get any
 * model of the class.
 */
function ModelChoiceField({ offering }: { offering?: Offering }) {
  const charge = offering ? modelChoiceOf(offering) : null;
  const [kind, setKind] = useState<SurchargeKind>(
    charge && charge.percent === null ? "flat" : "percent",
  );
  const [amount, setAmount] = useState(
    charge
      ? charge.percent !== null
        ? String(charge.percent)
        : ringgitInputValue(charge.flatSen)
      : "",
  );
  return (
    <div className="grid gap-2">
      <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-800">
        {OFFERING_FIELD_LABELS.modelChoicePercent}
        <InfoTip text="Customers choose among the models of this location's vehicles in service, once there are two or more. A booking keeps the charge it was made with." />
      </span>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 text-sm text-slate-700">
        <span>Choosing a model costs</span>
        <ChargeInput
          name={MODEL_CHOICE_FIELDS.amount}
          kindName={MODEL_CHOICE_FIELDS.kind}
          label="Charge to choose a model"
          kind={kind}
          amount={amount}
          onKindChange={setKind}
          onAmountChange={setAmount}
        />
        <span>more.</span>
      </div>
      <p className="text-xs text-slate-500">
        {kind === "percent"
          ? "A whole percentage of the trip's price before any odd-hours surcharge."
          : "One amount added to the trip, whatever its price."}{" "}
        Leave it empty and customers here get any model of the class.
      </p>
    </div>
  );
}

/**
 * The form for one offering of a location. A new one picks a class from
 * the catalogue or creates one, then sets the rates and the rules; the
 * rules start from the usual ones of the class's category, and start again
 * when the category changes. An existing one edits its rates, its rules,
 * the charge to choose a model and its switch. Money is typed in ringgit,
 * the rules in hours. A saved offering goes back to the tab it came from.
 */
export function OfferingForm({
  locationId,
  locationSlug,
  offering,
  candidates = [],
  from = "vehicle-classes",
}: {
  locationId: string;
  /** The location's slug, its address, for the way back to the tab. */
  locationSlug: string;
  /** The tab the editor was opened from, which Cancel and a save go back to. */
  from?: OfferingFrom;
  /** Absent on the "new" page. */
  offering?: Offering;
  /** The catalogue classes the location does not offer yet, for a new offering. */
  candidates?: VehicleClass[];
}) {
  const isNew = !offering;
  const { pending, error, formProps, leaveDialog } = useActionForm(
    isNew ? createOfferingAction : updateOfferingAction,
    {
      done: isNew ? "Class added to this location." : "Rates saved.",
      leave: isNew
        ? "The class is not added to this location."
        : "The changes to its rates and rules are lost.",
    },
  );
  const uploads = useUploadCount();
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

  return (
    <UploadsContext value={uploads.track}>
      <form {...formProps} className={`grid gap-6 ${FORM_WIDTH}`}>
        <input type="hidden" name="locationId" value={locationId} />
        <input type="hidden" name={OFFERING_FROM_PARAM} value={from} />
        {offering ? (
          <input type="hidden" name="id" value={offering.id} />
        ) : null}

        {isNew ? (
          <>
            <Card className="grid gap-4">
              <fieldset className="grid gap-2">
                <legend className="mb-1.5 text-sm font-medium text-slate-800">
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
                    <span className="text-slate-500">
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
            <p className="text-sm text-slate-600">
              {offering.vehicleClass.description} Its seats, luggage and picture
              are the catalogue&apos;s, the same at every location.
            </p>
          </Card>
        )}

        <Card className="grid gap-4">
          <h2 className="text-xl font-semibold tracking-tight">
            Rates at this location
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <MoneyInput field="perKmSen" defaultSen={offering?.perKmSen} />
            <MoneyInput
              field="hourlyRateSen"
              defaultSen={offering?.hourlyRateSen}
            />
          </div>
          <ModelChoiceField offering={offering} />
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
          <Button type="submit" disabled={pending || uploads.uploading}>
            {uploads.uploading
              ? "Uploading the picture…"
              : pending
                ? "Saving…"
                : isNew
                  ? "Add class"
                  : "Save"}
          </Button>
          <Link
            href={offeringBackHref(locationSlug, from)}
            className="text-sm text-slate-600 underline-offset-4 hover:underline"
          >
            Cancel
          </Link>
          <FormError error={error} />
        </div>
        {leaveDialog}
      </form>
    </UploadsContext>
  );
}
