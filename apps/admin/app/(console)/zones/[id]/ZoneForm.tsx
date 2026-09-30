"use client";

import { ZONE_MULTIPLIER, checkZoneFields, multiplierEffect } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { updateZoneAction } from "../actions";

/** The name and the multiplier, edited in place and saved together. */
export function ZoneForm({
  id,
  name,
  multiplier,
}: {
  id: string;
  name: string;
  multiplier: number;
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    updateZoneAction,
    null,
  );
  const [nameValue, setNameValue] = useState(name);
  const [multiplierValue, setMultiplierValue] = useState(String(multiplier));

  const typed = Number(multiplierValue);
  const effect =
    multiplierValue.trim() !== "" && checkZoneFields({ multiplier: typed }).ok
      ? multiplierEffect(typed)
      : `A number between ${ZONE_MULTIPLIER.min} and ${ZONE_MULTIPLIER.max}, with at most two decimals.`;

  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-[1fr_11rem]">
        <Field label="Name">
          <Input
            name="name"
            required
            autoComplete="off"
            value={nameValue}
            onChange={(event) => setNameValue(event.target.value)}
          />
        </Field>
        <Field label="Multiplier" hint={effect}>
          <Input
            name="multiplier"
            type="number"
            inputMode="decimal"
            step="0.01"
            min={ZONE_MULTIPLIER.min}
            max={ZONE_MULTIPLIER.max}
            required
            value={multiplierValue}
            onChange={(event) => setMultiplierValue(event.target.value)}
          />
        </Field>
      </div>
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
