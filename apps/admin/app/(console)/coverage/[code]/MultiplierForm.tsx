"use client";

import { STATE_MULTIPLIER, checkMultiplier, multiplierEffect } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { setStateMultiplierAction } from "../actions";

/** The state's multiplier, with its effect shown as it is typed. */
export function MultiplierForm({
  code,
  multiplier,
}: {
  code: string;
  multiplier: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    setStateMultiplierAction,
    null,
  );
  const [value, setValue] = useState(String(multiplier));

  const typed = Number(value);
  const effect =
    value.trim() !== "" && checkMultiplier(typed).ok
      ? multiplierEffect(typed)
      : `A number between ${STATE_MULTIPLIER.min} and ${STATE_MULTIPLIER.max}, with at most two decimals.`;

  return (
    <form action={action} className="grid gap-3">
      <input type="hidden" name="code" value={code} />
      <Field label="Multiplier" hint={effect}>
        <Input
          name="multiplier"
          type="number"
          inputMode="decimal"
          step="0.01"
          min={STATE_MULTIPLIER.min}
          max={STATE_MULTIPLIER.max}
          required
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
