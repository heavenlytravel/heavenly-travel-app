"use client";

import {
  PRICE_OVERRIDE_FIELDS,
  PRICE_OVERRIDE_REASON_MAX_LENGTH,
  ringgitInputValue,
  type PriceOverride,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { overrideItemPriceAction } from "./actions";

/**
 * "Change price" on an item, for Reservation and Sales: the agreed total in
 * RM and the reason, or "Remove override" to charge the receipt's price
 * again. The form closes once the change is saved; the page shows the new
 * rows.
 */
export function PriceOverrideControl({
  itemId,
  current,
}: {
  itemId: string;
  /** The override in force, or null when the receipt's price stands. */
  current: PriceOverride | null;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await overrideItemPriceAction(previous, formData);
      if (result === null) setOpen(false);
      return result;
    },
    null,
  );

  if (!open) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          {current ? "Change agreed price" : "Change price"}
        </Button>
        {current ? (
          <form action={action}>
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="remove" value="true" />
            <Button type="submit" variant="ghost" size="sm" disabled={pending}>
              {pending ? "Removing…" : "Remove override"}
            </Button>
          </form>
        ) : null}
        {state?.error ? (
          <p aria-live="polite" className="text-xs text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form
      action={action}
      className="grid gap-3 rounded-md border border-neutral-200 bg-neutral-50 p-3"
    >
      <input type="hidden" name="itemId" value={itemId} />
      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <Field label="Agreed price (RM)">
          <Input
            name={PRICE_OVERRIDE_FIELDS.amount}
            inputMode="decimal"
            required
            autoComplete="off"
            defaultValue={current ? ringgitInputValue(current.totalSen) : ""}
          />
        </Field>
        <Field label="Reason">
          <Input
            name={PRICE_OVERRIDE_FIELDS.reason}
            required
            maxLength={PRICE_OVERRIDE_REASON_MAX_LENGTH}
            autoComplete="off"
            defaultValue={current?.reason}
            placeholder="Agreed on the phone, corporate rate, goodwill"
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save price"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        {state?.error ? (
          <p aria-live="polite" className="text-xs text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
