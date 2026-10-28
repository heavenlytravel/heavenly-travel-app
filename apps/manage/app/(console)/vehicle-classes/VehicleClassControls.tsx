"use client";

import { TRIP_CATEGORY_LABELS, isTripCategory } from "@repo/db";
import type { VehicleClass } from "@repo/db/server";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setVehicleClassActiveAction } from "./actions";
import { FormError } from "@repo/console/FormError";
import { errorOf } from "@repo/console/action-state";

/**
 * The class's switch. Turning off the last active class of a category asks
 * first, in an alert dialog: the category's tab then has nothing to sell.
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
  const [dialog, confirm] = useConfirm();
  const categoryLabel = isTripCategory(vehicleClass.category)
    ? TRIP_CATEGORY_LABELS[vehicleClass.category]
    : vehicleClass.category;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Switch
        checked={vehicleClass.isActive}
        disabled={pending}
        label={`${vehicleClass.name} is active`}
        onCheckedChange={async (next) => {
          if (
            !next &&
            lastActiveInCategory &&
            !(await confirm({
              title: `Turn ${vehicleClass.name} off?`,
              description: `It is the last active class of ${categoryLabel}. With it off, the ${categoryLabel} tab has nothing to sell.`,
              action: "Turn off",
            }))
          ) {
            return;
          }
          startTransition(async () => {
            const refused = errorOf(
              await answerOf(
                setVehicleClassActiveAction(vehicleClass.id, next),
              ),
            );
            setError(refused);
            if (!refused) {
              toast.success(
                next
                  ? `${vehicleClass.name} is on.`
                  : `${vehicleClass.name} is off.`,
              );
            }
          });
        }}
      />
      <FormError error={error} size="xs" />
      {dialog}
    </div>
  );
}
