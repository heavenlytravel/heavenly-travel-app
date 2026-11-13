"use client";

import { nextItemStatusOf, type NextItemStatus } from "@repo/db";
import { Button } from "@repo/ui/button";
import { CheckIcon } from "@repo/ui/icons";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "@repo/console/use-action-form";
import { advanceItemAction } from "./actions";

/** What the toast says once each step is taken. */
const ADVANCED: Record<NextItemStatus, string> = {
  confirmed: "Trip confirmed. No email is sent: tell the customer.",
  completed: "Trip completed.",
};

/** What the forward button says for each step it would take. */
const ADVANCE_LABELS: Record<NextItemStatus, string> = {
  confirmed: "Confirm",
  completed: "Mark Completed",
};

/**
 * The foot of one trip's card: its next step, for an admin who may take
 * it. Every change to the trip (amend, stop, charge, price, cancel) is
 * under "Change Trip" on its card, where each says what it bills. The next status
 * travels with the form, so a stale page that still shows "Confirm" on a
 * trip already confirmed fails instead of skipping a step. Nothing when
 * there is no step to take.
 */
export function ItemActions({
  itemId,
  status,
  canAdvance,
  confirmBills,
}: {
  itemId: string;
  status: string;
  /** Whether the admin may take the step that comes next. */
  canAdvance: boolean;
  /** Confirming bills the booking: the button says so. */
  confirmBills: string | null;
}) {
  const next = canAdvance ? nextItemStatusOf(status) : null;
  const advance = useActionForm(advanceItemAction, {
    done: next ? ADVANCED[next] : undefined,
  });
  if (!next) return null;

  return (
    <div className="border-t border-hairline px-5 py-3.5">
      <form
        {...advance.formProps}
        className="flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="itemId" value={itemId} />
        <input type="hidden" name="to" value={next} />
        <Button type="submit" size="sm" pending={advance.pending}>
          {next === "confirmed" ? <CheckIcon className="size-4" /> : null}
          {advance.pending ? "Saving…" : ADVANCE_LABELS[next]}
        </Button>
        {next === "confirmed" && confirmBills ? (
          <span className="text-caption text-muted">{confirmBills}</span>
        ) : null}
      </form>
      <FormError error={advance.error} size="xs" className="mt-2" />
    </div>
  );
}
