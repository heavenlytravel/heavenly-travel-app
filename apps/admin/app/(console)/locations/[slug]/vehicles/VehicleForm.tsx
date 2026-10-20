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
  LocationName,
  ModelSuggestion,
  VehicleWithModel,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Combobox } from "@repo/ui/combobox";
import { Checkbox, Field, Input, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { NumberField } from "@repo/ui/number-field";
import { Select } from "@repo/ui/select";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Card } from "../../../../_components/Card";
import { ExpiryDateField } from "../../../../_components/ExpiryDateField";
import type { ActionState } from "../../../../_lib/action-state";
import {
  classGroups,
  type FleetClassOption,
} from "../../../../_lib/fleet-form";
import { FLEET_BACK_FIELD, FLEET_BACK_TO_LIST } from "../../../../_lib/routes";
import { createVehicleAction, updateVehicleAction } from "./actions";
import { PhotoList } from "./PhotoList";

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
  classes: readonly FleetClassOption[];
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
    <p className="text-xs text-neutral-500 sm:col-span-2">
      {elsewhere.length > 0
        ? `The ${name} is a model of ${elsewhere.join(" and ")}. Saving makes it a model of ${className(classId)} too.`
        : `A new model of ${className(classId)}. Saving adds it to the class's models.`}
    </p>
  );
}

/**
 * The form for one of our vehicles, new or existing: its plate, its class,
 * its brand and model, chosen from the ones entered before or added new,
 * where it is based and whether it is in service, its photos, the expiry
 * dates of its documents, and notes. A model the class does not have yet
 * is added to it on save. A saved vehicle opens the Vehicles tab of the location it is
 * based at, or the list across locations it was added from.
 */
export function VehicleForm({
  vehicle,
  locationId,
  classes,
  suggestions,
  locations,
  backHref,
  backToList = false,
}: {
  /** Absent on the "new" page. */
  vehicle?: VehicleWithModel;
  /** Where a new vehicle is based to start with; absent on the list across locations. */
  locationId?: string;
  /** Every class in the catalogue, in its order. */
  classes: FleetClassOption[];
  /** Every model in the catalogue, for the brand and model fields. */
  suggestions: ModelSuggestion[];
  locations: LocationName[];
  /** Where "Cancel" goes. */
  backHref: string;
  /** Opened from the list across locations, which a saved vehicle goes back to. */
  backToList?: boolean;
}) {
  const isNew = !vehicle;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isNew ? createVehicleAction : updateVehicleAction,
    null,
  );
  const fields = vehicle ? vehicleFieldsOf(vehicle) : null;
  const [classId, setClassId] = useState(fields?.vehicleClassId ?? "");
  const [brand, setBrand] = useState(fields?.brand ?? "");
  const [model, setModel] = useState(fields?.model ?? "");
  const [photos, setPhotos] = useState<Photo[]>(
    vehicle?.photos.map(({ url, caption }) => ({ url, caption })) ?? [],
  );

  return (
    <form action={action} className="grid gap-6">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}
      <input type="hidden" name={PHOTOS_FIELD} value={JSON.stringify(photos)} />
      {backToList ? (
        <input
          type="hidden"
          name={FLEET_BACK_FIELD}
          value={FLEET_BACK_TO_LIST}
        />
      ) : null}

      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
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
            label={
              <span className="inline-flex items-center gap-1.5">
                {VEHICLE_FIELD_LABELS.vehicleClassId}
                <InfoTip text="The class the customer books it as. Its models are the brands and models of the vehicles entered in it." />
              </span>
            }
          >
            <Select
              name="vehicleClassId"
              required
              placeholder="Choose the class"
              value={classId}
              onValueChange={setClassId}
              options={classGroups(classes)}
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
            label={
              <span className="inline-flex items-center gap-1.5">
                {VEHICLE_FIELD_LABELS.locationId}
                <InfoTip text="To move a vehicle to another location, change where it is based." />
              </span>
            }
          >
            <Select
              name="locationId"
              required
              placeholder="Choose the location"
              defaultValue={fields?.locationId ?? locationId ?? ""}
              options={locations.map((location) => ({
                value: location.id,
                label: location.name,
              }))}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isActive" defaultChecked={fields?.isActive ?? true} />
          <span className="inline-flex items-center gap-1.5">
            {VEHICLE_FIELD_LABELS.isActive}
            <InfoTip text="Out of service, the vehicle keeps its history, its documents are not checked, and customers no longer see its model at the location." />
          </span>
        </label>
      </Card>

      <Card className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {VEHICLE_FIELD_LABELS.photos}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            What the customers of the location it is based at see of its model,
            plate and all, and swipe through when they choose one. The first is
            its cover; the first cover of the class there is the class&apos;s
            picture at the location.
          </p>
        </div>
        <PhotoList
          name={modelName({ brand: brand.trim(), name: model.trim() })}
          photos={photos}
          setPhotos={setPhotos}
        />
      </Card>

      <Card className="grid gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Documents</h2>
          <p className="mt-1 text-sm text-neutral-500">
            The expiry dates of what a vehicle that carries paying passengers
            keeps valid. A date within 30 days shows as due.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
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

      <Card className="grid gap-4">
        <Field label={VEHICLE_FIELD_LABELS.notes}>
          <Textarea
            name="notes"
            rows={3}
            maxLength={VEHICLE_LIMITS.notes}
            placeholder="Leather seats, a dent on the rear door, anything the team should know"
            defaultValue={fields?.notes}
          />
        </Field>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Add vehicle" : "Save"}
        </Button>
        <Link
          href={backHref}
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
