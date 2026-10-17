"use client";

import type { VehicleClass } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "../../_lib/action-state";
import { VEHICLE_CLASSES_PATH } from "../../_lib/routes";
import { createVehicleClassAction, updateVehicleClassAction } from "./actions";
import { VehicleClassFieldset } from "./VehicleClassFields";

/**
 * The form for one catalogue class, new or existing: its fields, then
 * "Add class" or "Save". The rates are a location's, on its Vehicle
 * classes tab. A saved class goes back to the list.
 */
export function VehicleClassForm({
  vehicleClass,
}: {
  /** Absent on the "new" page. */
  vehicleClass?: VehicleClass;
}) {
  const isNew = !vehicleClass;
  const [state, action, pending] = useActionState<ActionState, FormData>(
    isNew ? createVehicleClassAction : updateVehicleClassAction,
    null,
  );

  return (
    <form action={action} className="grid gap-6">
      {vehicleClass ? (
        <input type="hidden" name="id" value={vehicleClass.id} />
      ) : null}
      <VehicleClassFieldset vehicleClass={vehicleClass} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isNew ? "Add class" : "Save"}
        </Button>
        <Link
          href={VEHICLE_CLASSES_PATH}
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
