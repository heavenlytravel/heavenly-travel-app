"use client";

import type { ClassWithKinds } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { FormFoot } from "@repo/console/FormFoot";
import { classesHref } from "../../../../../_lib/routes";
import { useActionForm } from "@repo/console/use-action-form";
import { createVehicleClassAction, updateVehicleClassAction } from "./actions";
import { VehicleClassFieldset } from "./VehicleClassFields";
import { UploadsContext, useUploadCount } from "@repo/console/use-image-upload";
import { FORM_WIDTH } from "@repo/console/PageColumn";

/**
 * The form for one catalogue class, new or existing: its fields, then
 * "Add Class" or "Save". The rates and rules are each location's, on its
 * classes. A saved class goes back to the catalogue.
 */
export function VehicleClassForm({
  vehicleClass,
  kinds,
}: {
  /** Absent on the "new" page. */
  vehicleClass?: ClassWithKinds;
  /** The types and tiers there are, suggested as they are typed. */
  kinds: { types: string[]; tiers: string[] };
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
      <form {...formProps} className={`grid gap-6 ${FORM_WIDTH}`}>
        {vehicleClass ? (
          <input type="hidden" name="id" value={vehicleClass.id} />
        ) : null}
        <VehicleClassFieldset vehicleClass={vehicleClass} kinds={kinds} />
        <FormFoot
          submit={
            <Button type="submit" pending={pending || uploads.uploading}>
              {uploads.uploading
                ? "Uploading the picture…"
                : pending
                  ? "Saving…"
                  : isNew
                    ? "Add Class"
                    : "Save"}
            </Button>
          }
          cancelHref={classesHref(null)}
          error={error}
        />
        {leaveDialog}
      </form>
    </UploadsContext>
  );
}
