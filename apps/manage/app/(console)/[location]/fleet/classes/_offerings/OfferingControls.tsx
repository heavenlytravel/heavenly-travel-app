"use client";

import { TRIP_CATEGORY_LABELS, isTripCategory } from "@repo/db";
import type { Offering } from "@repo/db/server";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Switch } from "@repo/ui/switch";
import { Button } from "@repo/ui/button";
import { ArrowLeftIcon, ArrowRightIcon } from "@repo/ui/icons";
import { Tooltip } from "@repo/ui/tooltip";
import { useState, useTransition } from "react";
import { moveOfferingAction, setOfferingActiveAction } from "./actions";
import { FormError } from "@repo/ui/form-error";
import { errorOf } from "@repo/console/action-state";

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

/**
 * The arrows on an offering's card that move it earlier or later among
 * its category's here, the order the customer meets the classes in, as
 * Top choices are moved. The first has no way earlier, the last none later.
 */
export function OfferingMoveButtons({
  offering,
  first,
  last,
}: {
  offering: Offering;
  first: boolean;
  last: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { name } = offering.vehicleClass;

  function move(by: -1 | 1) {
    startTransition(async () => {
      const refused = errorOf(
        await answerOf(
          moveOfferingAction(offering.locationId, offering.id, by),
        ),
      );
      setError(refused);
      if (!refused) {
        toast.success(`Moved ${name} ${by < 0 ? "earlier" : "later"}.`);
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip content="Move earlier">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={first}
          pending={pending}
          aria-label={`Move ${name} earlier`}
          onClick={() => move(-1)}
        >
          <ArrowLeftIcon />
        </Button>
      </Tooltip>
      <Tooltip content="Move later">
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={last}
          pending={pending}
          aria-label={`Move ${name} later`}
          onClick={() => move(1)}
        >
          <ArrowRightIcon />
        </Button>
      </Tooltip>
      <FormError error={error} size="xs" />
    </div>
  );
}
