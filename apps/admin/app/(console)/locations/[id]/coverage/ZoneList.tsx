"use client";

import { Button } from "@repo/ui/button";
import { useState, useTransition } from "react";
import { deleteZoneAction } from "./actions";

/** The remove button of one zone's row. Removing takes its rates with it, so it asks first. */
export function ZoneList({
  locationId,
  zoneId,
  name,
}: {
  locationId: string;
  zoneId: string;
  name: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="danger"
        size="sm"
        disabled={pending}
        aria-label={`Remove the zone ${name}`}
        onClick={() => {
          if (
            !confirm(
              `Remove the zone ${name}? Every rate on a route through it goes with it, and trips there are metered from then on.`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const result = await deleteZoneAction(locationId, zoneId);
            setError(result?.error ?? null);
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
    </div>
  );
}
