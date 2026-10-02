"use client";

import { LANDING_PAGE, pageNameOf, type LocationPageKey } from "@repo/db";
import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setPageOnAction } from "../actions";

/**
 * One page's On switch: whether the page exists for the public. Turning a
 * page off while the location is public asks first.
 */
export function PageSwitch({
  locationId,
  page,
  isOn,
  isPublic,
}: {
  locationId: string;
  page: LocationPageKey;
  isOn: boolean;
  /** The location is live or paused, so visitors notice the switch. */
  isPublic: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Switch
        checked={isOn}
        disabled={pending}
        label={`${pageNameOf(page)} is on`}
        onCheckedChange={(next) => {
          if (
            !next &&
            isPublic &&
            page !== LANDING_PAGE &&
            !confirm(
              `Turn ${pageNameOf(page)} off? Visitors to it are sent to the location's landing page.`,
            )
          ) {
            return;
          }
          startTransition(async () => {
            const result = await setPageOnAction(locationId, page, next);
            setError(result?.error ?? null);
          });
        }}
      />
      {error ? (
        <p
          aria-live="polite"
          className="max-w-56 text-right text-xs text-red-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
