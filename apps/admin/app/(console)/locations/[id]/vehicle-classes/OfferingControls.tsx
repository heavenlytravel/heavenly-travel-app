"use client";

import { TRIP_CATEGORY_LABELS, isTripCategory } from "@repo/db";
import type { Offering } from "@repo/db/server";
import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setOfferingActiveAction } from "./actions";

/**
 * An offering's switch. Taking the last class of a category off sale asks
 * first: the category's tab then has nothing to sell here.
 */
export function OfferingActiveSwitch({
  offering,
  lastOnSaleInCategory,
}: {
  offering: Offering;
  lastOnSaleInCategory: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { vehicleClass } = offering;
  const categoryLabel = isTripCategory(vehicleClass.category)
    ? TRIP_CATEGORY_LABELS[vehicleClass.category]
    : vehicleClass.category;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Switch
        checked={offering.isActive}
        disabled={pending}
        label={`${vehicleClass.name} is on sale`}
        onCheckedChange={(next) => {
          if (
            !next &&
            lastOnSaleInCategory &&
            !confirm(
              `${vehicleClass.name} is the last class of ${categoryLabel} on sale here. With it off the ${categoryLabel} tab has nothing to sell at this location. Take it off sale?`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const result = await setOfferingActiveAction(
              offering.locationId,
              offering.id,
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
