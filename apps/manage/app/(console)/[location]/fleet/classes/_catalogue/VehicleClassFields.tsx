"use client";

import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  VEHICLE_CLASS_FIELD_LABELS,
  isTripCategory,
  type Photo,
  type TripCategory,
  type VehicleClassField,
} from "@repo/db";
import type { VehicleClass } from "@repo/db/server";
import { Checkbox, Field, Input } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { InfoTip } from "@repo/ui/info-tip";
import { useState } from "react";
import { Card, CardTitle } from "@repo/console/Card";
import { PhotoList } from "@repo/console/PhotoList";
import { MediaPicker } from "../../../../../_components/MediaPicker";
import { VEHICLE_CLASS_IMAGE_UPLOAD_PATH } from "../../../../../_lib/routes";

/** The category a new class starts in. */
export const DEFAULT_CATEGORY: TripCategory = "car-with-driver";

const TIPS: Partial<Record<VehicleClassField, string>> = {
  name: "Renaming is safe: bookings keep the name they were made with.",
  description: "One line, as the options page shows it.",
  sortOrder: "The position within the category, lowest first.",
  minPassengers: 'Information only, shown as "from".',
  maxPassengers: "A larger group is refused this class.",
  imageUrls:
    "Neutral pictures, with no number plate, the class's at every location. The first is its cover; the website lets a customer swipe through the rest. Cards crop each to fill, so keep the vehicle in the middle.",
  isActive:
    "Off hides the class from every location's options page and search card.",
};

/** A field's label and its tip, when it has one, as `Field` takes them. */
function classField(field: VehicleClassField) {
  return { label: VEHICLE_CLASS_FIELD_LABELS[field], tip: TIPS[field] };
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
 * location's, on its offering. The catalogue's class editor and a
 * location's "Add class" both post these under the same names; the
 * picture goes as the address the upload answered.
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
  // Kept as the list edits them; a class's pictures have no caption.
  const [pictures, setPictures] = useState<Photo[]>(
    vehicleClass?.imageUrls.map((url) => ({ url, caption: "" })) ?? [],
  );

  function chooseCategory(next: string) {
    if (!isTripCategory(next)) return;
    setCategory(next);
    onCategoryChange?.(next);
  }

  return (
    <>
      <Card>
        <CardTitle>Details</CardTitle>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field {...classField("name")}>
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
          <Field {...classField("description")}>
            <Input
              name="description"
              required
              autoComplete="off"
              defaultValue={vehicleClass?.description}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field {...classField("category")}>
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
            <Field {...classField("sortOrder")}>
              <WholeNumberInput
                field="sortOrder"
                defaultValue={vehicleClass?.sortOrder ?? 0}
              />
            </Field>
          </div>
          {showActive ? (
            // The tip beside the label, not in it: its button would join the box's name.
            <span className="flex items-center gap-1.5 text-sm">
              <label className="flex items-center gap-2">
                <Checkbox
                  name="isActive"
                  defaultChecked={vehicleClass?.isActive ?? true}
                />
                {VEHICLE_CLASS_FIELD_LABELS.isActive}
              </label>
              <InfoTip text={TIPS.isActive!} />
            </span>
          ) : null}
        </div>
      </Card>

      <Card>
        <CardTitle>
          <span className="inline-flex items-center gap-1.5">
            {VEHICLE_CLASS_FIELD_LABELS.imageUrls}
            <InfoTip text={TIPS.imageUrls!} />
          </span>
        </CardTitle>
        <input
          type="hidden"
          name="imageUrls"
          value={JSON.stringify(pictures.map((picture) => picture.url))}
        />
        <PhotoList
          of="class"
          name={vehicleClass?.name ?? ""}
          photos={pictures}
          setPhotos={setPictures}
          uploadPath={VEHICLE_CLASS_IMAGE_UPLOAD_PATH}
          mediaPicker={MediaPicker}
        />
      </Card>

      <Card>
        <CardTitle>Seats and luggage</CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field {...classField("minPassengers")}>
            <WholeNumberInput
              field="minPassengers"
              min={1}
              defaultValue={vehicleClass?.minPassengers ?? 1}
            />
          </Field>
          <Field {...classField("maxPassengers")}>
            <WholeNumberInput
              field="maxPassengers"
              min={1}
              defaultValue={vehicleClass?.maxPassengers}
            />
          </Field>
          <Field {...classField("luggage")}>
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
