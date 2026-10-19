"use client";

import {
  TRIP_CATEGORY_LABELS,
  VEHICLE_DOCUMENTS,
  VEHICLE_DOCUMENT_LABELS,
  VEHICLE_FIELD_LABELS,
  VEHICLE_LIMITS,
  isTripCategory,
  vehicleFieldsOf,
} from "@repo/db";
import type {
  LocationName,
  ModelChoice,
  VehicleWithModel,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Input, Textarea } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { NumberField } from "@repo/ui/number-field";
import { Select, type SelectGroup } from "@repo/ui/select";
import Link from "next/link";
import { useActionState } from "react";
import { Card } from "../../../../_components/Card";
import { ExpiryDateField } from "../../../../_components/ExpiryDateField";
import type { ActionState } from "../../../../_lib/action-state";
import { locationTabHref } from "../../../../_lib/routes";
import { createVehicleAction, updateVehicleAction } from "./actions";

/**
 * The models as the picker groups them, by class in the catalogue's
 * order: "MPV VIP (Car with driver)", then its models. A model customers
 * do not see says so.
 */
function modelGroups(models: readonly ModelChoice[]): SelectGroup[] {
  const groups = new Map<string, SelectGroup>();
  for (const model of models) {
    const { vehicleClass } = model;
    let group = groups.get(vehicleClass.id);
    if (!group) {
      group = {
        label: isTripCategory(vehicleClass.category)
          ? `${vehicleClass.name} (${TRIP_CATEGORY_LABELS[vehicleClass.category]})`
          : vehicleClass.name,
        options: [],
      };
      groups.set(vehicleClass.id, group);
    }
    group.options.push({
      value: model.id,
      label: model.isActive ? model.name : `${model.name} (hidden)`,
    });
  }
  return [...groups.values()];
}

/**
 * The form for one of our vehicles, new or existing: what it is, where it
 * is based and whether it is in service, the expiry dates of its
 * documents, and notes. A saved vehicle opens the Vehicles tab of the
 * location it is based at.
 */
export function VehicleForm({
  slug,
  locationId,
  vehicle,
  models,
  locations,
}: {
  /** The location whose tab the form is on, for "Cancel". */
  slug: string;
  /** Where a new vehicle is based to start with. */
  locationId: string;
  /** Absent on the "new" page. */
  vehicle?: VehicleWithModel;
  /** Every model with its class, in the catalogue's order. */
  models: ModelChoice[];
  locations: LocationName[];
}) {
  const isNew = !vehicle;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isNew ? createVehicleAction : updateVehicleAction,
    null,
  );
  const fields = vehicle ? vehicleFieldsOf(vehicle) : null;

  return (
    <form action={action} className="grid gap-6">
      {vehicle ? <input type="hidden" name="id" value={vehicle.id} /> : null}

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
          <Field label={VEHICLE_FIELD_LABELS.vehicleModelId}>
            <Select
              name="vehicleModelId"
              required
              placeholder="Choose the model"
              defaultValue={fields?.vehicleModelId ?? ""}
              options={modelGroups(models)}
            />
          </Field>
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
              defaultValue={fields?.locationId ?? locationId}
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
            <InfoTip text="Out of service, the vehicle keeps its history and its documents are not checked." />
          </span>
        </label>
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
          href={locationTabHref(slug, "vehicles")}
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
