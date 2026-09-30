"use client";

import { Switch } from "@repo/ui/switch";
import { useState, useTransition } from "react";
import { setWallAction } from "./actions";

const CONFIRM = {
  on: "Turn the wall on? Each admin will reach only the screens and actions of their teams.",
  off: "Turn the wall off? Every admin will reach every team screen and action.",
};

/** The one switch for the whole app. The page shows it to SUPER admins only. */
export function WallSwitch({ active }: { active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1.5">
      <Switch
        checked={active}
        disabled={pending}
        label="The wall between teams"
        onCheckedChange={(next) => {
          if (!confirm(next ? CONFIRM.on : CONFIRM.off)) return;
          startTransition(async () => {
            const result = await setWallAction(next);
            setError(result.ok ? null : result.error);
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
