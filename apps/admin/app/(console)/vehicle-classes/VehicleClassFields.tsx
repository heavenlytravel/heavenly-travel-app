"use client";

import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  VEHICLE_CLASS_FIELD_LABELS,
  isTripCategory,
  type TripCategory,
  type VehicleClassField,
} from "@repo/db";
import type { VehicleClass } from "@repo/db/server";
import { Checkbox, Field, Input } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { InfoTip } from "@repo/ui/info-tip";
import { useState } from "react";
import { Card } from "../../_components/Card";
import { ImageUpload } from "../../_components/ImageUpload";
import { VEHICLE_CLASS_IMAGE_UPLOAD_PATH } from "../../_lib/routes";

/** The category a new class starts in. */
export const DEFAULT_CATEGORY: TripCategory = "car-with-driver";

const TIPS: Partial<Record<VehicleClassField, string>> = {
  name: "Renaming is safe: bookings keep the name they were made with.",
  description: "One line, as the options page shows it.",
  sortOrder: "The position within the category, lowest first.",
  minPassengers: 'Information only, shown as "from".',
  maxPassengers: "A larger group is refused this class.",
  imageUrl:
    "Shown on the options page and on each location's product page. The whole vehicle stays in view: a photo or a cut-out on a plain background.",
  isActive:
    "Off hides the class from every location's options page and search card.",
};

/** A field label with its tooltip, when it has one. */
function ClassFieldLabel({ field }: { field: VehicleClassField }) {
  const tip = TIPS[field];
  return (
    <span className="inline-flex items-center gap-1.5">
      {VEHICLE_CLASS_FIELD_LABELS[field]}
      {tip ? <InfoTip text={tip} /> : null}
    </span>
  );
}

function WholeNumberInput({
  field,
  defaultValue,
  min,
}: {
  field: VehicleClassField;
  defaultValue?: number;
  min?: number;
}) {
  return (
    <NumberField
      name={field}
      step={1}
      min={min}
      required
      defaultValue={defaultValue}
    />
  );
}

/**
 * The fields of a catalogue class, as three sections of a form: what it
 * is, its picture, its seats and luggage. The rates and the rules are each
 * location's, on its offering. The Vehicle classes screen's form and a
 * location's "Add class" both post these under the same names; the picture
 * goes as the address the upload answered.
 */
export function VehicleClassFieldset({
  vehicleClass,
  showActive = true,
  onCategoryChange,
}: {
  /** Absent for a class that does not exist yet. */
  vehicleClass?: VehicleClass;
  /** The catalogue's switch; a location's form has its own "On sale" instead. */
  showActive?: boolean;
  /** Told when the category changes: a location's form starts the rules from it. */
  onCategoryChange?: (category: TripCategory) => void;
}) {
  const [category, setCategory] = useState<TripCategory>(
    vehicleClass && isTripCategory(vehicleClass.category)
      ? vehicleClass.category
      : DEFAULT_CATEGORY,
  );
  const [imageUrl, setImageUrl] = useState(vehicleClass?.imageUrl ?? null);

  function chooseCategory(next: string) {
    if (!isTripCategory(next)) return;
    setCategory(next);
    onCategoryChange?.(next);
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
        <h2 className="inline-flex items-center gap-1.5 text-xl font-semibold tracking-tight">
          {VEHICLE_CLASS_FIELD_LABELS.imageUrl}
          <InfoTip text={TIPS.imageUrl!} />
        </h2>
        <input type="hidden" name="imageUrl" value={imageUrl ?? ""} />
        <ImageUpload
          label={`Picture of ${vehicleClass?.name ?? "the class"}`}
          uploadPath={VEHICLE_CLASS_IMAGE_UPLOAD_PATH}
          src={imageUrl}
          alt={vehicleClass?.name ?? ""}
          onChange={(image) => setImageUrl(image?.url ?? null)}
        />
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
    </>
  );
}
