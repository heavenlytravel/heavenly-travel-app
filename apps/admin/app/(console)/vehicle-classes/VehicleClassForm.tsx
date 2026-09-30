"use client";

import {
  BOOKING_RULES,
  CATEGORY_RULE_DEFAULTS,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  VEHICLE_CLASS_FIELD_LABELS,
  VEHICLE_CLASS_MONEY_FIELDS,
  isTripCategory,
  parseRinggit,
  ringgitInputValue,
  type TripCategory,
  type VehicleClassField,
  type VehicleClassRules,
} from "@repo/db";
import type { VehicleClass } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Field, Input, Select } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { ActionState } from "../../_lib/action-state";
import { VEHICLE_CLASSES_PATH } from "../../_lib/routes";
import { createVehicleClassAction, updateVehicleClassAction } from "./actions";

const DEFAULT_CATEGORY: TripCategory = "car-with-driver";

const RULE_FIELDS = [
  "minLeadHours",
  "cancellationCutoffHours",
  "minHourlyHours",
] as const satisfies readonly (keyof VehicleClassRules)[];

const TIPS: Partial<Record<VehicleClassField, string>> = {
  name: "Renaming is safe: bookings keep the name they were made with.",
  description: "One line, as the options page shows it.",
  category:
    "Choosing a category on a new class fills the three rules with its usual values.",
  sortOrder: "The position within the category, lowest first.",
  minPassengers: 'Information only, shown as "from".',
  maxPassengers: "A larger group is refused this class.",
  minimumFareSen:
    "The least a one-way trip costs. Below the base fare it never applies.",
  minLeadHours: "Hours before pickup a booking must be made.",
  cancellationCutoffHours: "Hours before pickup a customer may still cancel.",
  minHourlyHours: `The shortest hourly hire, ${BOOKING_RULES.hourlyFloorHours} to ${BOOKING_RULES.maxHourlyHours} hours.`,
  isActive: "Off hides the class from the options page and the search card.",
};

/** A field label with its tooltip, when it has one. */
function Label({ field, unit }: { field: VehicleClassField; unit?: string }) {
  const tip = TIPS[field];
  return (
    <span className="inline-flex items-center gap-1.5">
      {VEHICLE_CLASS_FIELD_LABELS[field]}
      {unit ? ` (${unit})` : ""}
      {tip ? <InfoTip text={tip} /> : null}
    </span>
  );
}

function MoneyInput({
  field,
  defaultSen,
  onChange,
}: {
  field: keyof typeof VEHICLE_CLASS_MONEY_FIELDS;
  defaultSen: number | undefined;
  onChange?: (text: string) => void;
}) {
  return (
    <Field label={<Label field={field} unit="RM" />}>
      <Input
        name={VEHICLE_CLASS_MONEY_FIELDS[field]}
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

function WholeNumberInput({
  field,
  defaultValue,
  min,
  max,
  value,
  onChange,
}: {
  field: VehicleClassField;
  defaultValue?: number;
  min?: number;
  max?: number;
  value?: number;
  onChange?: (value: number) => void;
}) {
  return (
    <Input
      name={field}
      type="number"
      inputMode="numeric"
      step={1}
      min={min}
      max={max}
      required
      defaultValue={value === undefined ? defaultValue : undefined}
      value={value}
      onChange={onChange ? (e) => onChange(Number(e.target.value)) : undefined}
    />
  );
}

/**
 * The form for one class, new or existing. Choosing a category on a new
 * class fills the three rules with the category's usual values; an existing
 * class keeps its own. Money is typed in ringgit. A saved class goes back to
 * the list.
 */
export function VehicleClassForm({
  vehicleClass,
}: {
  /** Absent on the "new" page. */
  vehicleClass?: VehicleClass;
}) {
  const isNew = !vehicleClass;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isNew ? createVehicleClassAction : updateVehicleClassAction,
    null,
  );

  const initialCategory =
    vehicleClass && isTripCategory(vehicleClass.category)
      ? vehicleClass.category
      : DEFAULT_CATEGORY;
  const [category, setCategory] = useState<TripCategory>(initialCategory);
  const [rules, setRules] = useState<VehicleClassRules>(
    vehicleClass ?? CATEGORY_RULE_DEFAULTS[initialCategory],
  );
  const [baseFare, setBaseFare] = useState(
    vehicleClass ? ringgitInputValue(vehicleClass.baseFareSen) : "",
  );
  const [minimumFare, setMinimumFare] = useState(
    vehicleClass ? ringgitInputValue(vehicleClass.minimumFareSen) : "",
  );

  const baseSen = parseRinggit(baseFare);
  const minimumSen = parseRinggit(minimumFare);
  const minimumBelowBase =
    baseSen !== null && minimumSen !== null && minimumSen < baseSen;

  function chooseCategory(next: string) {
    if (!isTripCategory(next)) return;
    setCategory(next);
    if (isNew) setRules(CATEGORY_RULE_DEFAULTS[next]);
  }

  return (
    <form action={action} className="grid gap-6">
      {vehicleClass ? (
        <input type="hidden" name="id" value={vehicleClass.id} />
      ) : null}

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<Label field="name" />}>
            <Input
              name="name"
              required
              autoComplete="off"
              defaultValue={vehicleClass?.name}
            />
          </Field>
          {vehicleClass ? (
            <Field label="Slug" hint="Set when the class was created.">
              <Input value={vehicleClass.slug} readOnly disabled />
            </Field>
          ) : (
            <Field
              label="Slug"
              hint="Derived from the name, never changed after."
            >
              <Input value="" placeholder="from the name" readOnly disabled />
            </Field>
          )}
        </div>
        <Field label={<Label field="description" />}>
          <Input
            name="description"
            required
            autoComplete="off"
            defaultValue={vehicleClass?.description}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<Label field="category" />}>
            <Select
              name="category"
              value={category}
              onChange={(e) => chooseCategory(e.target.value)}
            >
              {TRIP_CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {TRIP_CATEGORY_LABELS[option]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label={<Label field="sortOrder" />}>
            <WholeNumberInput
              field="sortOrder"
              defaultValue={vehicleClass?.sortOrder ?? 0}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={vehicleClass?.isActive ?? true}
            className="size-4 accent-neutral-900"
          />
          <Label field="isActive" />
        </label>
      </section>

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold tracking-tight">
          Seats and luggage
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={<Label field="minPassengers" />}>
            <WholeNumberInput
              field="minPassengers"
              min={1}
              defaultValue={vehicleClass?.minPassengers ?? 1}
            />
          </Field>
          <Field label={<Label field="maxPassengers" />}>
            <WholeNumberInput
              field="maxPassengers"
              min={1}
              defaultValue={vehicleClass?.maxPassengers}
            />
          </Field>
          <Field label={<Label field="luggage" />}>
            <Input
              name="luggage"
              required
              autoComplete="off"
              placeholder="5 large bags"
              defaultValue={vehicleClass?.luggage}
            />
          </Field>
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold tracking-tight">Rates</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MoneyInput
            field="baseFareSen"
            defaultSen={vehicleClass?.baseFareSen}
            onChange={setBaseFare}
          />
          <MoneyInput field="perKmSen" defaultSen={vehicleClass?.perKmSen} />
          <MoneyInput
            field="hourlyRateSen"
            defaultSen={vehicleClass?.hourlyRateSen}
          />
          <MoneyInput
            field="minimumFareSen"
            defaultSen={vehicleClass?.minimumFareSen}
            onChange={setMinimumFare}
          />
        </div>
        {minimumBelowBase ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            The minimum fare is below the base fare, so it never applies.
            Allowed, but check it is what you mean.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="text-base font-semibold tracking-tight">Rules</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {RULE_FIELDS.map((field) => (
            <Field key={field} label={<Label field={field} unit="hours" />}>
              <WholeNumberInput
                field={field}
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
                value={rules[field]}
                onChange={(value) =>
                  setRules((current) => ({ ...current, [field]: value }))
                }
              />
            </Field>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Add class" : "Save"}
        </Button>
        <Link
          href={VEHICLE_CLASSES_PATH}
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
