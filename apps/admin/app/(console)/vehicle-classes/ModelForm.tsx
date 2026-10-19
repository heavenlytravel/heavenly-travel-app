"use client";

import {
  MODEL_LIMITS,
  MODEL_PHOTOS_FIELD,
  modelName,
  VEHICLE_MODEL_FIELD_LABELS,
  type ModelPhoto,
} from "@repo/db";
import type { CatalogueModel } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { Checkbox, Field, Input } from "@repo/ui/field";
import { InfoTip } from "@repo/ui/info-tip";
import { NumberField } from "@repo/ui/number-field";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Card } from "../../_components/Card";
import type { ActionState } from "../../_lib/action-state";
import { vehicleClassHref } from "../../_lib/routes";
import { updateVehicleModelAction } from "./actions";
import { PhotoList } from "./PhotoList";

/**
 * The form for one model of a class, which a vehicle added: its brand and
 * name, its place in the class's order, whether customers see it, and its
 * photos. The photos post as JSON in one field. A saved model goes back to
 * its class.
 */
export function ModelForm({
  classId,
  model,
}: {
  classId: string;
  model: CatalogueModel;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateVehicleModelAction,
    null,
  );
  const [brand, setBrand] = useState(model.brand);
  const [name, setName] = useState(model.name);
  const [photos, setPhotos] = useState<ModelPhoto[]>(
    model.photos.map(({ url, caption }) => ({ url, caption })),
  );

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="vehicleClassId" value={classId} />
      <input type="hidden" name="id" value={model.id} />
      <input
        type="hidden"
        name={MODEL_PHOTOS_FIELD}
        value={JSON.stringify(photos)}
      />

      <Card className="grid gap-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr_10rem]">
          <Field label={VEHICLE_MODEL_FIELD_LABELS.brand}>
            <Input
              name="brand"
              required
              autoComplete="off"
              maxLength={MODEL_LIMITS.brand}
              placeholder="Toyota"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </Field>
          <Field label={VEHICLE_MODEL_FIELD_LABELS.name}>
            <Input
              name="name"
              required
              autoComplete="off"
              maxLength={MODEL_LIMITS.name}
              placeholder="Alphard"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field
            label={
              <span className="inline-flex items-center gap-1.5">
                {VEHICLE_MODEL_FIELD_LABELS.sortOrder}
                <InfoTip text="The position within the class, lowest first." />
              </span>
            }
          >
            <NumberField
              name="sortOrder"
              step={1}
              required
              defaultValue={model.sortOrder}
            />
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox name="isActive" defaultChecked={model.isActive} />
          <span className="inline-flex items-center gap-1.5">
            {VEHICLE_MODEL_FIELD_LABELS.isActive}
            <InfoTip text="Off hides the model from the options page and the location pages, so it cannot be chosen. Vehicles of it stay." />
          </span>
        </label>
      </Card>

      <Card className="grid gap-4">
        <h2 className="inline-flex items-center gap-1.5 text-xl font-semibold tracking-tight">
          {VEHICLE_MODEL_FIELD_LABELS.photos}
          <InfoTip text="The customer sees the first when choosing a model, and pages through them all on the options page and on each location's product page. A caption, such as Interior, is read out with the model's name." />
        </h2>
        <PhotoList
          modelName={modelName({ brand, name })}
          photos={photos}
          setPhotos={setPhotos}
        />
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Link
          href={vehicleClassHref(classId)}
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
