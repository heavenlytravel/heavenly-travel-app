"use client";

import { nextItemStatusOf, type NextItemStatus } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { FormError } from "@repo/console/FormError";
import { useActionForm } from "@repo/console/use-action-form";
import {
  advanceItemAction,
  cancelBookingAction,
  cancelItemAction,
} from "./actions";

/** What the toast says once each step is taken. */
const ADVANCED: Record<NextItemStatus, string> = {
  confirmed: "Item confirmed. The customer is told.",
  completed: "Item completed.",
};

/** What the forward button says for each step it would take. */
const ADVANCE_LABELS: Record<NextItemStatus, string> = {
  confirmed: "Confirm",
  completed: "Mark completed",
};

/**
 * The forward step, the amend and the cancel for one item, each shown only
 * to an admin who may do it. The next status travels with the form, so a
 * stale page that still shows "Confirm" on an item already confirmed fails
 * instead of skipping a step.
 */
export function ItemControls({
  itemId,
  status,
  label,
  canAdvance,
  canCancel,
  amendHref,
}: {
  itemId: string;
  status: string;
  /** How the cancel's question names the item: "HT-7K3QZM item 1". */
  label: string;
  /** Whether the admin may take the step that comes next. */
  canAdvance: boolean;
  canCancel: boolean;
  /** The amend form, or null when the admin may not or the item is past it. */
  amendHref: string | null;
}) {
  const next = canAdvance ? nextItemStatusOf(status) : null;
  const advance = useActionForm(advanceItemAction, {
    done: next ? ADVANCED[next] : undefined,
  });
  const [dialog, confirm] = useConfirm();
  const cancel = useActionForm(cancelItemAction, {
    ask: () =>
      confirm({
        title: `Cancel ${label}?`,
        description: "The customer will be told.",
        action: "Cancel item",
        cancel: "Keep it",
        danger: true,
      }),
    done: `Cancelled ${label}.`,
  });
  const cancellable =
    canCancel && status !== "cancelled" && status !== "completed";
  const pending = advance.pending || cancel.pending;

  if (!next && !cancellable && !amendHref) return null;

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        {amendHref ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={amendHref}>Amend</Link>
          </Button>
        ) : null}
        {next ? (
          <form {...advance.formProps}>
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="to" value={next} />
            <Button type="submit" size="sm" disabled={pending}>
              {advance.pending ? "Saving…" : ADVANCE_LABELS[next]}
            </Button>
          </form>
        ) : null}
        {cancellable ? (
          <form {...cancel.formProps}>
            <input type="hidden" name="itemId" value={itemId} />
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              Cancel item
            </Button>
          </form>
        ) : null}
      </div>
      <FormError error={advance.error ?? cancel.error} size="xs" />
      {dialog}
    </div>
  );
}

/** Cancels every live item at once. Completed items stay completed. */
export function CancelBookingControl({
  bookingId,
  reference,
}: {
  bookingId: string;
  reference: string;
}) {
  const [dialog, confirm] = useConfirm();
  const { pending, error, formProps } = useActionForm(cancelBookingAction, {
    ask: () =>
      confirm({
        title: `Cancel booking ${reference}?`,
        description: "Every open item is cancelled and the customer is told.",
        action: "Cancel booking",
        cancel: "Keep it",
        danger: true,
      }),
    done: `Cancelled booking ${reference}.`,
  });

  return (
    <form {...formProps} className="grid gap-1.5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button
        type="submit"
        variant="danger"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Cancelling…" : "Cancel booking"}
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}
