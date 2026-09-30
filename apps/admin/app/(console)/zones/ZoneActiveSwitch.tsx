"use client";

import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setZoneActiveAction } from "./actions";

/**
 * The zone's switch, on the list and on its page. Turning a zone off asks
 * first: customers with a pickup there are told the area is not served.
 */
export function ZoneActiveSwitch({
  id,
  name,
  active,
}: {
  id: string;
  name: string;
  active: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Switch
        checked={active}
        disabled={pending}
        label={`${name} is active`}
        onCheckedChange={(next) => {
          if (
            !next &&
            !confirm(
              `Turn ${name} off? Customers with a pickup in ${name} will be told the area is not served yet. Existing bookings are not changed.`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const result = await setZoneActiveAction(id, next);
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
