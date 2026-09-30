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
import { Sheet } from "@repo/ui/sheet";
import { useActionState, useState } from "react";
import type { ActionState } from "../../_lib/action-state";
import { createVehicleClassAction, updateVehicleClassAction } from "./actions";

const DEFAULT_CATEGORY: TripCategory = "car-with-driver";

const RULE_FIELDS = [
  "minLeadHours",
  "cancellationCutoffHours",
  "minHourlyHours",
] as const satisfies readonly (keyof VehicleClassRules)[];

const RULE_HINTS: Record<keyof VehicleClassRules, string> = {
  minLeadHours: "Hours before pickup a booking must be made.",
  cancellationCutoffHours: "Hours before pickup a customer may still cancel.",
  minHourlyHours: `Shortest hourly hire, ${BOOKING_RULES.hourlyFloorHours} to ${BOOKING_RULES.maxHourlyHours}.`,
};

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
    <Field label={`${VEHICLE_CLASS_FIELD_LABELS[field]} (RM)`}>
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
 * The form for one class, new or existing, in a side sheet. Choosing a
 * category on a new class fills the three rules with the category's usual
 * values; an existing class keeps its own. Money is typed in ringgit.
 */
export function VehicleClassSheet({
  open,
  onOpenChange,
  vehicleClass,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Absent for "Add class". */
  vehicleClass?: VehicleClass;
}) {
  const isNew = !vehicleClass;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await (isNew
        ? createVehicleClassAction(previous, formData)
        : updateVehicleClassAction(previous, formData));
      if (!result) onOpenChange(false);
      return result;
    },
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

  const title = isNew ? "Add class" : `Edit ${vehicleClass.name}`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} width="lg" title={title}>
      <form action={action} className="grid gap-5 p-6 text-left">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-neutral-600">
            {isNew
              ? "The slug is derived from the name and never changes after."
              : "Renaming is safe: bookings keep the name they were made with."}
          </p>
        </div>
        {vehicleClass ? (
          <input type="hidden" name="id" value={vehicleClass.id} />
        ) : null}

        <Field label="Name">
          <Input
            name="name"
            required
            autoComplete="off"
            defaultValue={vehicleClass?.name}
          />
        </Field>
        <Field
          label="Description"
          hint="One line, as the options page shows it."
        >
          <Input
            name="description"
            required
            autoComplete="off"
            defaultValue={vehicleClass?.description}
          />
        </Field>
        {vehicleClass ? (
          <Field label="Slug" hint="Set when the class was created.">
            <Input value={vehicleClass.slug} readOnly disabled />
          </Field>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Category"
            hint={
              isNew ? "Fills the rules below with the usual values." : undefined
            }
          >
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
          <Field label="Sort order" hint="Position within the category.">
            <WholeNumberInput
              field="sortOrder"
              defaultValue={vehicleClass?.sortOrder ?? 0}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Seats from" hint="Information only.">
            <WholeNumberInput
              field="minPassengers"
              min={1}
              defaultValue={vehicleClass?.minPassengers ?? 1}
            />
          </Field>
          <Field label="Seats to" hint="Refuses a larger group.">
            <WholeNumberInput
              field="maxPassengers"
              min={1}
              defaultValue={vehicleClass?.maxPassengers}
            />
          </Field>
          <Field label="Luggage">
            <Input
              name="luggage"
              required
              autoComplete="off"
              placeholder="5 large bags"
              defaultValue={vehicleClass?.luggage}
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
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
            The minimum fare is below the base fare, so it never applies to a
            one-way trip. Allowed, but check it is what you mean.
          </p>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          {RULE_FIELDS.map((field) => (
            <Field
              key={field}
              label={`${VEHICLE_CLASS_FIELD_LABELS[field]} (h)`}
              hint={RULE_HINTS[field]}
            >
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

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={vehicleClass?.isActive ?? true}
            className="size-4 accent-neutral-900"
          />
          Active: shown on the options page and the search card
        </label>

        <div className="flex items-center gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : isNew ? "Add class" : "Save"}
          </Button>
          <Button
            variant="ghost"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </form>
    </Sheet>
  );
}
