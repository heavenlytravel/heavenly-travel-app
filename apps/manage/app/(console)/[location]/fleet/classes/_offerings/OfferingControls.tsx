"use client";

import { TRIP_CATEGORY_LABELS, isTripCategory } from "@repo/db";
import type { Offering } from "@repo/db/server";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setOfferingActiveAction } from "./actions";
import { FormError } from "@repo/console/FormError";
import { errorOf } from "../../../../../_lib/action-state";

/**
 * An offering's switch. Taking the last class of a category off sale asks
 * first, in an alert dialog: the category's tab then has nothing to sell
 * here.
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
  const [dialog, confirm] = useConfirm();
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
        onCheckedChange={async (next) => {
          if (
            !next &&
            lastOnSaleInCategory &&
            !(await confirm({
              title: `Take ${vehicleClass.name} off sale?`,
              description: `It is the last class of ${categoryLabel} on sale here. With it off, the ${categoryLabel} tab has nothing to sell at this location.`,
              action: "Take off sale",
            }))
          ) {
            return;
          }
          startTransition(async () => {
            const refused = errorOf(
              await answerOf(
                setOfferingActiveAction(offering.locationId, offering.id, next),
              ),
            );
            setError(refused);
            if (!refused) {
              toast.success(
                next
                  ? `${vehicleClass.name} is on sale here.`
                  : `${vehicleClass.name} is off sale here.`,
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
