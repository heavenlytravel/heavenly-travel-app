"use client";

import { plural } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Button } from "@repo/ui/button";
import { useState, useTransition } from "react";
import { deleteZoneAction } from "./actions";
import { pricedFromSentence, type PricedFrom } from "./zone-lines";
import { FormError } from "../../../../_components/FormError";
import { errorOf } from "../../../../_lib/action-state";

/**
 * The remove button of one zone's row, quiet beside "Edit" since a row
 * needs it rarely. Removing takes the zone's rates with it, other
 * locations' routes to it too, so it asks first in an alert dialog, and
 * says how many priced routes go and whose.
 */
export function ZoneList({
  zoneId,
  name,
  routes,
  pricedFrom,
}: {
  zoneId: string;
  name: string;
  /** The priced routes the zone is an end of. */
  routes: number;
  /** The other locations whose grids end at the zone. */
  pricedFrom: PricedFrom;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dialog, confirm] = useConfirm();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        aria-label={`Remove the zone ${name}`}
        className="text-red-700 hover:bg-red-50 hover:text-red-800"
        onClick={async () => {
          const rates =
            routes > 0
              ? `Its ${plural(routes, "priced route")} on the rate grid ${routes === 1 ? "goes" : "go"} with it, and a pickup there is no longer served unless another zone holds it.`
              : "A pickup there is no longer served unless another zone holds it.";
          const elsewhere =
            pricedFrom.length > 0
              ? ` ${pricedFromSentence(pricedFrom)} on ${pricedFrom.length === 1 ? "its" : "their"} own rate ${pricedFrom.length === 1 ? "grid" : "grids"}; ${pricedFrom.reduce((sum, entry) => sum + entry.routes, 0) === 1 ? "that route goes" : "those routes go"} too.`
              : "";
          const remove = await confirm({
            title: `Remove the zone ${name}?`,
            description: rates + elsewhere,
            action: "Remove zone",
            danger: true,
          });
          if (!remove) return;
          startTransition(async () => {
            const refused = errorOf(await answerOf(deleteZoneAction(zoneId)));
            setError(refused);
            if (!refused) toast.success(`Removed the zone ${name}.`);
          });
        }}
      >
        {pending ? "Removing…" : "Remove"}
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </div>
  );
}
