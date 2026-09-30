"use client";

import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setDistrictActiveAction } from "../actions";

/** One district's switch. Turning it off asks first. */
export function DistrictSwitch({
  stateCode,
  code,
  name,
  active,
}: {
  stateCode: string;
  code: string;
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
        label={`${name} is served`}
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
            const result = await setDistrictActiveAction(stateCode, code, next);
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
