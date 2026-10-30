"use client";

import {
  PRICE_OVERRIDE_FIELDS,
  PRICE_OVERRIDE_REASON_MAX_LENGTH,
  ringgitInputValue,
  type PriceOverride,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import { useState } from "react";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "../../../../_lib/use-action-form";
import { overrideItemPriceAction } from "./actions";

/**
 * "Change price" on a trip, for Reservation and Sales: the agreed total in
 * RM and the reason, or "Remove override" to charge the receipt's price
 * again. Among the trip's buttons; open, the form takes the row's width.
 * It closes once the change is saved; the card shows the new price.
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
  const save = useActionForm(overrideItemPriceAction, {
    done: "Agreed price saved.",
    onDone: () => setOpen(false),
  });
  const remove = useActionForm(overrideItemPriceAction, {
    done: "Agreed price removed. The rates' price stands.",
  });

  if (!open) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setOpen(true)}
        >
          {current ? "Change agreed price" : "Change price"}
        </Button>
        {current ? (
          <form {...remove.formProps}>
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="remove" value="true" />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              pending={remove.pending}
            >
              {remove.pending ? "Removing…" : "Remove override"}
            </Button>
          </form>
        ) : null}
        <FormError error={remove.error} size="xs" />
      </>
    );
  }

  return (
    <form
      {...save.formProps}
      className="order-last grid basis-full gap-3 rounded-control border border-dashed border-slot p-3"
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
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" pending={save.pending}>
          {save.pending ? "Saving…" : "Save price"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
        <FormError error={save.error} size="xs" />
      </div>
    </form>
  );
}
