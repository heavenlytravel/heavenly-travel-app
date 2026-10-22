"use client";

import type { VehicleClass } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { FormError } from "../../_components/FormError";
import { VEHICLE_CLASSES_PATH } from "../../_lib/routes";
import { useActionForm } from "../../_lib/use-action-form";
import { createVehicleClassAction, updateVehicleClassAction } from "./actions";
import { VehicleClassFieldset } from "./VehicleClassFields";
import {
  UploadsContext,
  useUploadCount,
} from "../../_components/use-image-upload";

/**
 * The form for one catalogue class, new or existing: its fields, then
 * "Add class" or "Save". The rates and rules are a location's, on its
 * Vehicle classes tab. A saved class goes back to the list.
 */
export function VehicleClassForm({
  vehicleClass,
}: {
  /** Absent on the "new" page. */
  vehicleClass?: VehicleClass;
}) {
  const isNew = !vehicleClass;
  const { pending, error, formProps, leaveDialog } = useActionForm(
    isNew ? createVehicleClassAction : updateVehicleClassAction,
    {
      done: isNew ? "Class added to the catalogue." : "Class saved.",
      leave: isNew
        ? "The class is not added."
        : "The changes to this class are lost.",
    },
  );
  const uploads = useUploadCount();

  return (
    <UploadsContext value={uploads.track}>
      <form {...formProps} className="grid gap-6">
        {vehicleClass ? (
          <input type="hidden" name="id" value={vehicleClass.id} />
        ) : null}
        <VehicleClassFieldset vehicleClass={vehicleClass} />
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || uploads.uploading}>
            {uploads.uploading
              ? "Uploading the picture…"
              : pending
                ? "Saving…"
                : isNew
                  ? "Add class"
                  : "Save"}
          </Button>
          <Link
            href={VEHICLE_CLASSES_PATH}
            className="text-sm text-neutral-600 underline-offset-4 hover:underline"
          >
            Cancel
          </Link>
          <FormError error={error} />
        </div>
        {leaveDialog}
      </form>
    </UploadsContext>
  );
}
