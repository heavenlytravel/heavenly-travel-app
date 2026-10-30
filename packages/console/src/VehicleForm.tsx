"use client";

import {
  MODEL_LIMITS,
  modelName,
  PHOTOS_FIELD,
  sameName,
  VEHICLE_DOCUMENTS,
  VEHICLE_DOCUMENT_LABELS,
  VEHICLE_FIELD_LABELS,
  VEHICLE_LIMITS,
  vehicleFieldsOf,
  type Photo,
} from "@repo/db";
import type {
  ClassOption,
  HeldBooking,
  LocationName,
  ModelSuggestion,
  VehicleWithModel,
  VendorOption,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Combobox } from "@repo/ui/combobox";
import { Checkbox, Field, Input, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import { useState } from "react";
import type { ActionState } from "./action-state";
import { Card, CardTitle } from "./Card";
import { ExpiryDateField } from "./ExpiryDateField";
import { classGroups, DATES_CARDS, SCOPE_FIELD } from "./fleet-form";
import { FormFoot } from "./FormFoot";
import { DetailColumns } from "./PageColumn";
import { PhotoList } from "./PhotoList";
import { useActionForm } from "./use-action-form";
import { UploadsContext, useUploadCount } from "./use-image-upload";
import { useOutOfServiceAsk } from "./use-out-of-service-ask";
import { VendorField } from "./VendorField";

/** Each name once, in the spelling it was first entered with. */
function distinct(names: readonly string[]) {
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (name && !seen.has(key)) seen.set(key, name);
  }
  return [...seen.values()];
}

/** The models of the brand typed: the class's first, then the brand's in other classes. */
function modelsOf(
  suggestions: readonly ModelSuggestion[],
  classId: string,
  brand: string,
) {
  const ofBrand = suggestions.filter((s) => sameName(s.brand, brand));
  return distinct([
    ...ofBrand.filter((s) => s.vehicleClassId === classId).map((s) => s.name),
    ...ofBrand.map((s) => s.name),
  ]);
}

/**
 * What saving does to the catalogue, under the model: nothing when the
 * class has the model already; otherwise it adds it, and says so, and
 * names the class that has it already when that is another one.
 */
function ModelNote({
  suggestions,
  classes,
  classId,
  brand,
  model,
}: {
  suggestions: readonly ModelSuggestion[];
  classes: readonly ClassOption[];
  classId: string;
  brand: string;
  model: string;
}) {
  if (!classId || !brand.trim() || !model.trim()) return null;
  const same = suggestions.filter(
    (s) => sameName(s.brand, brand) && sameName(s.name, model),
  );
  if (same.some((s) => s.vehicleClassId === classId)) return null;
  const className = (id: string) => classes.find((c) => c.id === id)?.name;
  const elsewhere = same
    .map((s) => className(s.vehicleClassId))
    .filter(Boolean);
  const name = modelName({ brand: brand.trim(), name: model.trim() });
  return (
    <p className="text-xs text-muted sm:col-span-2">
      {elsewhere.length > 0
        ? `The ${name} is a model of ${elsewhere.join(" and ")}. Saving makes it a model of ${className(classId)} too.`
        : `A new model of ${className(classId)}. Saving adds it to the class's models.`}
    </p>
  );
}

/**
 * The form for a vendor's vehicle, new or existing, across the record's
 * page: its photos and its details (whose it is, plate, class, brand and
 * model, chosen from the ones entered before or added new, colour and
 * year, where it is based, notes, whether it is in service), and beside
 * them the expiry dates of its documents. A model the class does not have
 * yet is added to it on save. One copy for both apps: the admin chooses
 * the vendor from every one, and Connect fixes it to the member's vendor
 * and offers only the locations it serves and the classes on sale at
 * each. Each app passes its own action and upload route; where a saved
 * vehicle opens is the action's answer.
 */
export function VehicleForm({
  vehicle,
  scope,
  locationId,
  vehicleClassId,
  vendorId,
  vendors,
  classes,
  classesAt,
  suggestions,
  locations,
  action,
  cancelHref,
  uploadPath,
  photosNote = "What the customers of the location it is based at see of its model, plate and all, and swipe through when they choose one. The first cover of the class there is the class's picture at the location.",
  held = [],
}: {
  /** Absent on the "new" page. */
  vehicle?: VehicleWithModel;
  /** The admin's scope the form is open in (a slug, or `~`), which a save goes back to; absent in Connect. */
  scope?: string;
  /** Where a new vehicle is based to start with. */
  locationId?: string;
  /** Whose a new vehicle is to start with, ours when absent; with no `vendors`, fixed. */
  vendorId?: string;
  /** The vendors to choose from, in the admin; absent in Connect, where it is the member's. */
  vendors?: readonly VendorOption[];
  /** The classes on sale at each location, by its id: Connect narrows the class to them. */
  classesAt?: Record<string, readonly string[]>;
  /** The save, new or existing, as the app checks it. */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  /** Where Cancel goes. */
  cancelHref: string;
  /** The app's upload route for a vehicle's photo. */
  uploadPath: string;
  /** What the photos are for, in the tip beside their title. */
  photosNote?: string;
  /** The accepted bookings still to come it is on, which taking it out of service takes it off. */
  held?: readonly HeldBooking[];
  /** The class a new vehicle starts in, when it is added from the class's page. */
  vehicleClassId?: string;
  /** Every class in the catalogue, in its order. */
  classes: ClassOption[];
  /** Every model in the catalogue, for the brand and model fields. */
  suggestions: ModelSuggestion[];
  locations: readonly LocationName[];
}) {
  const isNew = !vehicle;
  const outOfService = useOutOfServiceAsk({
    name: vehicle?.plate ?? "",
    wasActive: vehicle?.isActive ?? false,
    held,
    action: "Take out of service",
  });
  const { pending, error, formProps, markDirty, leaveDialog } = useActionForm(
    action,
    {
      ask: outOfService.ask,
      done: isNew ? "Vehicle added." : "Vehicle saved.",
      leave: isNew
        ? "The vehicle is not added."
        : "The changes to this vehicle are lost.",
    },
  );
  const uploads = useUploadCount();
  const fields = vehicle ? vehicleFieldsOf(vehicle) : null;
  const [classId, setClassId] = useState(
    fields?.vehicleClassId ?? vehicleClassId ?? "",
  );
  const [brand, setBrand] = useState(fields?.brand ?? "");
  const [model, setModel] = useState(fields?.model ?? "");
  const [photos, setPhotos] = useState<Photo[]>(
    vehicle?.photos.map(({ url, caption }) => ({ url, caption })) ?? [],
  );
  const [basedAt, setBasedAt] = useState(
    fields?.locationId ?? locationId ?? "",
  );
  const onSale = classesAt ? new Set(classesAt[basedAt] ?? []) : null;
  const classChoices = onSale
    ? classes.filter((c) => onSale.has(c.id) || c.id === classId)
    : classes;
  const vendor = fields?.vendorId || vendorId || "";

  return (
    <UploadsContext value={uploads.track}>
      <form {...formProps} className="grid gap-5">
        {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
        <input
          type="hidden"
          name={PHOTOS_FIELD}
          value={JSON.stringify(photos)}
        />
        {scope ? (
          <input type="hidden" name={SCOPE_FIELD} value={scope} />
        ) : null}

        <DetailColumns
          main={
            <>
              <Card>
                <CardTitle meta="The first is the cover">
                  <span className="inline-flex items-center gap-1.5">
                    {VEHICLE_FIELD_LABELS.photos}
                    <InfoTip text={photosNote} />
                  </span>
                </CardTitle>
                <PhotoList
                  uploadPath={uploadPath}
                  name={modelName({ brand: brand.trim(), name: model.trim() })}
                  photos={photos}
                  setPhotos={(next) => {
                    markDirty();
                    setPhotos(next);
                  }}
                />
              </Card>

              <Card>
                <CardTitle>Details</CardTitle>
                <div className="grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {vendors ? (
                      <VendorField
                        vendors={vendors}
                        defaultValue={vendor}
                        what="vehicle"
                      />
                    ) : (
                      <input type="hidden" name="vendorId" value={vendor} />
                    )}
                    <Field label={VEHICLE_FIELD_LABELS.plate}>
                      <Input
                        name="plate"
                        required
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="VLE 1234"
                        className="uppercase"
                        defaultValue={fields?.plate}
                      />
                    </Field>
                    <Field
                      label={VEHICLE_FIELD_LABELS.vehicleClassId}
                      tip="The class the customer books it as. Its models are the brands and models of the vehicles entered in it."
                    >
                      <Select
                        name="vehicleClassId"
                        required
                        placeholder="Choose the class"
                        value={classId}
                        onValueChange={setClassId}
                        options={classGroups(classChoices)}
                      />
                    </Field>
                    <Field label={VEHICLE_FIELD_LABELS.brand}>
                      <Combobox
                        name="brand"
                        required
                        maxLength={MODEL_LIMITS.brand}
                        placeholder="Choose or add the brand"
                        searchPlaceholder="Find a brand, or type a new one"
                        options={distinct(suggestions.map((s) => s.brand))}
                        value={brand}
                        onValueChange={setBrand}
                      />
                    </Field>
                    <Field label={VEHICLE_FIELD_LABELS.model}>
                      <Combobox
                        name="model"
                        required
                        maxLength={MODEL_LIMITS.name}
                        placeholder="Choose or add the model"
                        searchPlaceholder="Find a model, or type a new one"
                        options={modelsOf(suggestions, classId, brand)}
                        value={model}
                        onValueChange={setModel}
                      />
                    </Field>
                    <ModelNote
                      suggestions={suggestions}
                      classes={classes}
                      classId={classId}
                      brand={brand}
                      model={model}
                    />
                    <Field label={VEHICLE_FIELD_LABELS.colour}>
                      <Input
                        name="colour"
                        required
                        autoComplete="off"
                        maxLength={VEHICLE_LIMITS.colour}
                        placeholder="Black"
                        defaultValue={fields?.colour}
                      />
                    </Field>
                    <Field label={VEHICLE_FIELD_LABELS.year}>
                      <NumberField
                        name="year"
                        step={1}
                        placeholder="2023"
                        defaultValue={fields?.year ?? undefined}
                      />
                    </Field>
                    <Field
                      label={VEHICLE_FIELD_LABELS.locationId}
                      tip="To move a vehicle to another location, change where it is based."
                    >
                      <Select
                        name="locationId"
                        required
                        placeholder="Choose the location"
                        value={basedAt}
                        onValueChange={setBasedAt}
                        options={locations.map((location) => ({
                          value: location.id,
                          label: location.name,
                        }))}
                      />
                    </Field>
                  </div>
                  <Field label={VEHICLE_FIELD_LABELS.notes}>
                    <Textarea
                      name="notes"
                      rows={3}
                      maxLength={VEHICLE_LIMITS.notes}
                      placeholder="Leather seats, a dent on the rear door, anything the team should know"
                      defaultValue={fields?.notes}
                    />
                  </Field>
                  {/* The tip beside the label, not in it: its button would join the box's name. */}
                  <span className="flex items-center gap-1.5 text-sm">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        name="isActive"
                        defaultChecked={fields?.isActive ?? true}
                        onChange={(event) =>
                          outOfService.onActiveChange(
                            event.currentTarget.checked,
                          )
                        }
                      />
                      {VEHICLE_FIELD_LABELS.isActive}
                    </label>
                    <InfoTip text="Out of service, the vehicle keeps its history, its documents are not checked, and customers no longer see its model at the location." />
                  </span>
                </div>
              </Card>
            </>
          }
          side={
            <Card id={DATES_CARDS.vehicles.id}>
              <CardTitle>
                <span className="inline-flex items-center gap-1.5">
                  {DATES_CARDS.vehicles.name}
                  <InfoTip text="The expiry dates of what a vehicle that carries paying passengers keeps valid. A date within 30 days shows as due." />
                </span>
              </CardTitle>
              <div className="grid gap-4">
                {VEHICLE_DOCUMENTS.map((key) => (
                  <ExpiryDateField
                    key={key}
                    name={key}
                    label={VEHICLE_DOCUMENT_LABELS[key]}
                    defaultValue={fields?.[key] ?? null}
                  />
                ))}
              </div>
            </Card>
          }
        />

        <FormFoot
          submit={
            <Button type="submit" pending={pending || uploads.uploading}>
              {uploads.uploading
                ? "Uploading photos…"
                : pending
                  ? "Saving…"
                  : isNew
                    ? "Add vehicle"
                    : "Save"}
            </Button>
          }
          cancelHref={cancelHref}
          error={error}
        />
        {leaveDialog}
        {outOfService.dialog}
      </form>
    </UploadsContext>
  );
}
