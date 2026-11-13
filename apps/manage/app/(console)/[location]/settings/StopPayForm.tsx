"use client";

import { ringgitInputValue } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { setStopPayAction } from "../../../_lib/location-actions";

/**
 * What a stop added to a trip here suggests for its driver's pay: so much
 * per extra km by road, plus a fee a stop. Add stop starts at it; staff
 * may change it. Empty, there is no suggestion and staff type the pay.
 */
export function StopPayForm({
  locationId,
  perKmSen,
  feeSen,
}: {
  locationId: string;
  perKmSen: number | null;
  feeSen: number | null;
}) {
  const { pending, error, formProps } = useActionForm(setStopPayAction, {
    done: "Stop pay saved.",
  });
  return (
    <form {...formProps} className="grid gap-4">
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Pay per Extra km (RM)" hint="For the road a stop adds.">
          <Input
            name="driverPayPerKm"
            inputMode="decimal"
            autoComplete="off"
            className="w-32"
            defaultValue={perKmSen === null ? "" : ringgitInputValue(perKmSen)}
          />
        </Field>
        <Field label="Fee a Stop (RM)" hint="On top, for each stop.">
          <Input
            name="stopFee"
            inputMode="decimal"
            autoComplete="off"
            className="w-32"
            defaultValue={feeSen === null ? "" : ringgitInputValue(feeSen)}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" pending={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <FormError error={error} />
      </div>
    </form>
  );
}
