"use client";

import { plural } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Button } from "@repo/ui/button";
import { useState, useTransition } from "react";
import { deleteZoneAction } from "./actions";

/**
 * The remove button of one zone's row, quiet beside "Edit" since a row
 * needs it rarely. Removing takes the zone's rates with it, so it asks
 * first in an alert dialog, and says how many priced routes go.
 */
export function ZoneList({
  locationId,
  zoneId,
  name,
  routes,
}: {
  locationId: string;
  zoneId: string;
  name: string;
  /** The priced routes the zone is an end of. */
  routes: number;
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
          const remove = await confirm({
            title: `Remove the zone ${name}?`,
            description: rates,
            action: "Remove zone",
            danger: true,
          });
          if (!remove) return;
          startTransition(async () => {
            const result = await deleteZoneAction(locationId, zoneId);
            setError(result?.error ?? null);
            if (!result?.error) toast.success(`Removed the zone ${name}.`);
          });
        }}
      >
        {pending ? "Removing…" : "Remove"}
      </Button>
      {error ? (
        <p aria-live="polite" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {dialog}
    </div>
  );
}
