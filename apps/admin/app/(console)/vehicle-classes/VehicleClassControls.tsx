"use client";

import { TRIP_CATEGORY_LABELS, isTripCategory } from "@repo/db";
import type { VehicleClass } from "@repo/db/server";
import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setVehicleClassActiveAction } from "./actions";

/**
 * The class's switch. Turning off the last active class of a category asks
 * first: the category's tab then has nothing to sell.
 */
export function VehicleClassActiveSwitch({
  vehicleClass,
  lastActiveInCategory,
}: {
  vehicleClass: VehicleClass;
  lastActiveInCategory: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const categoryLabel = isTripCategory(vehicleClass.category)
    ? TRIP_CATEGORY_LABELS[vehicleClass.category]
    : vehicleClass.category;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Switch
        checked={vehicleClass.isActive}
        disabled={pending}
        label={`${vehicleClass.name} is active`}
        onCheckedChange={(next) => {
          if (
            !next &&
            lastActiveInCategory &&
            !confirm(
              `${vehicleClass.name} is the last active class of ${categoryLabel}. With it off the ${categoryLabel} tab has nothing to sell. Turn it off?`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const result = await setVehicleClassActiveAction(
              vehicleClass.id,
              next,
            );
            setError(result?.error ?? null);
          });
        }}
      />
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
