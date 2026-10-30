"use client";

import { SAFETY_BUFFER_FIELD, SAFETY_BUFFER_MAX_MINUTES } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field } from "@repo/ui/field";
import { NumberField } from "@repo/ui/number-field";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { setSafetyBufferAction } from "../../../_lib/location-actions";

/**
 * The minutes this location keeps a vehicle or a driver free after a job,
 * on top of the drive to the next pickup. Assigning warns when a job
 * leaves less; it never refuses on it. 0 turns it off.
 */
export function SafetyBufferForm({
  locationId,
  minutes,
}: {
  locationId: string;
  minutes: number;
}) {
  const { pending, error, formProps } = useActionForm(setSafetyBufferAction, {
    done: "Safety buffer saved.",
  });
  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="locationId" value={locationId} />
      <Field
        label="Safety buffer (minutes)"
        hint="Added after a job's estimated end and the drive to the next pickup. 0 turns it off."
      >
        <NumberField
          name={SAFETY_BUFFER_FIELD}
          required
          min={0}
          max={SAFETY_BUFFER_MAX_MINUTES}
          step={5}
          defaultValue={minutes}
          className="w-32"
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" pending={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormError error={error} />
      </div>
    </form>
  );
}
