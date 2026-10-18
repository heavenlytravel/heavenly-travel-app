"use client";

import {
  BOOKING_RULES,
  CATEGORY_RULE_DEFAULTS,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  VEHICLE_CLASS_FIELD_LABELS,
  isTripCategory,
  type TripCategory,
  type VehicleClassField,
  type VehicleClassRules,
} from "@repo/db";
import type { VehicleClass } from "@repo/db/server";
import { Checkbox, Field, Input } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { InfoTip } from "@repo/ui/info-tip";
import { useState } from "react";
import { Card } from "../../_components/Card";

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
  minLeadHours: "Hours before pickup a booking must be made.",
  cancellationCutoffHours: "Hours before pickup a customer may still cancel.",
  minHourlyHours: `The shortest hourly hire, ${BOOKING_RULES.hourlyFloorHours} to ${BOOKING_RULES.maxHourlyHours} hours.`,
  isActive:
    "Off hides the class from every location's options page and search card.",
};

/** A field label with its tooltip, when it has one. */
export function ClassFieldLabel({
  field,
  unit,
}: {
  field: VehicleClassField;
  unit?: string;
}) {
  const tip = TIPS[field];
  return (
    <span className="inline-flex items-center gap-1.5">
      {VEHICLE_CLASS_FIELD_LABELS[field]}
      {unit ? ` (${unit})` : ""}
      {tip ? <InfoTip text={tip} /> : null}
    </span>
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
    <NumberField
      name={field}
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
 * The fields of a catalogue class, as three sections of a form: what it
 * is, its seats and luggage, its rules. Choosing a category on a new class
 * fills the three rules with the category's usual values; an existing
 * class keeps its own. The Vehicle classes screen's form and a location's
 * "Add class" both post these under the same names.
 */
export function VehicleClassFieldset({
  vehicleClass,
  showActive = true,
}: {
  /** Absent for a class that does not exist yet. */
  vehicleClass?: VehicleClass;
  /** The catalogue's switch; a location's form has its own "On sale" instead. */
  showActive?: boolean;
}) {
  const isNew = !vehicleClass;
  const initialCategory =
    vehicleClass && isTripCategory(vehicleClass.category)
      ? vehicleClass.category
      : DEFAULT_CATEGORY;
  const [category, setCategory] = useState<TripCategory>(initialCategory);
  const [rules, setRules] = useState<VehicleClassRules>(
    vehicleClass ?? CATEGORY_RULE_DEFAULTS[initialCategory],
  );

  function chooseCategory(next: string) {
    if (!isTripCategory(next)) return;
    setCategory(next);
    if (isNew) setRules(CATEGORY_RULE_DEFAULTS[next]);
  }

  return (
    <>
      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<ClassFieldLabel field="name" />}>
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
        <Field label={<ClassFieldLabel field="description" />}>
          <Input
            name="description"
            required
            autoComplete="off"
            defaultValue={vehicleClass?.description}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={<ClassFieldLabel field="category" />}>
            <Select
              name="category"
              value={category}
              onValueChange={chooseCategory}
              options={TRIP_CATEGORIES.map((option) => ({
                value: option,
                label: TRIP_CATEGORY_LABELS[option],
              }))}
            />
          </Field>
          <Field label={<ClassFieldLabel field="sortOrder" />}>
            <WholeNumberInput
              field="sortOrder"
              defaultValue={vehicleClass?.sortOrder ?? 0}
            />
          </Field>
        </div>
        {showActive ? (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              name="isActive"
              defaultChecked={vehicleClass?.isActive ?? true}
            />
            <ClassFieldLabel field="isActive" />
          </label>
        ) : null}
      </Card>

      <Card className="grid gap-4">
        <h2 className="text-xl font-semibold tracking-tight">
          Seats and luggage
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={<ClassFieldLabel field="minPassengers" />}>
            <WholeNumberInput
              field="minPassengers"
              min={1}
              defaultValue={vehicleClass?.minPassengers ?? 1}
            />
          </Field>
          <Field label={<ClassFieldLabel field="maxPassengers" />}>
            <WholeNumberInput
              field="maxPassengers"
              min={1}
              defaultValue={vehicleClass?.maxPassengers}
            />
          </Field>
          <Field label={<ClassFieldLabel field="luggage" />}>
            <Input
              name="luggage"
              required
              autoComplete="off"
              placeholder="5 large bags"
              defaultValue={vehicleClass?.luggage}
            />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-4">
        <h2 className="text-xl font-semibold tracking-tight">Rules</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {RULE_FIELDS.map((field) => (
            <Field
              key={field}
              label={<ClassFieldLabel field={field} unit="hours" />}
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
      </Card>
    </>
  );
}
