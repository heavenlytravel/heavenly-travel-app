"use client";

import { ODD_HOURS, timeOfMinute, type OddHours } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../../_lib/action-state";
import { setOddHoursAction } from "./actions";

/**
 * The surcharge's window and percentage, saved together. All three empty
 * removes the surcharge; "Clear" empties them.
 */
export function OddHoursForm({
  locationId,
  window,
}: {
  locationId: string;
  /** The surcharge in force; null for none. */
  window: OddHours | null;
}) {
  const [saved, setSaved] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await setOddHoursAction(previous, formData);
      setSaved(result === null);
      return result;
    },
    null,
  );
  const [from, setFrom] = useState(
    window ? timeOfMinute(window.fromMinute) : "",
  );
  const [to, setTo] = useState(window ? timeOfMinute(window.toMinute) : "");
  const [percent, setPercent] = useState(window ? String(window.percent) : "");
  const empty = from === "" && to === "" && percent === "";

  return (
    <form
      action={action}
      className="grid gap-4"
      onChange={() => setSaved(false)}
    >
      <input type="hidden" name="locationId" value={locationId} />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-2">
        <Field label="From">
          <Input
            name="from"
            type="time"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="To">
          <Input
            name="to"
            type="time"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </Field>
        <Field
          label="Surcharge (%)"
          className="col-span-2 sm:col-span-1 lg:col-span-2"
        >
          <Input
            name="percent"
            type="number"
            inputMode="numeric"
            min={1}
            max={ODD_HOURS.maxPercent}
            step={1}
            value={percent}
            onChange={(event) => setPercent(event.target.value)}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : empty && window ? "Remove surcharge" : "Save"}
        </Button>
        {!empty ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFrom("");
              setTo("");
              setPercent("");
              setSaved(false);
            }}
          >
            Clear
          </Button>
        ) : null}
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : saved ? (
          <p aria-live="polite" className="text-sm text-emerald-700">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  );
}
