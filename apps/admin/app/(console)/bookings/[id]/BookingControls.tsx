"use client";

import {
  isNextItemStatus,
  nextItemStatusOf,
  type NextItemStatus,
} from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { toast } from "@repo/ui/toast";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { confirmedSubmit } from "../../../_lib/confirmed-submit";
import {
  advanceItemAction,
  cancelBookingAction,
  cancelItemAction,
} from "./actions";

/** What the toast says once each step is taken. */
const ADVANCED: Record<NextItemStatus, string> = {
  confirmed: "Item confirmed. The customer is told.",
  assigned: "Driver assigned.",
  completed: "Item completed.",
};

/** What the forward button says for each step it would take. */
const ADVANCE_LABELS: Record<NextItemStatus, string> = {
  confirmed: "Confirm",
  assigned: "Mark driver assigned",
  completed: "Mark completed",
};

function ErrorLine({ state }: { state: ActionState }) {
  return state?.error ? (
    <p aria-live="polite" className="text-xs text-red-700">
      {state.error}
    </p>
  ) : null;
}

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
  const [advanceState, advance, advancing] = useActionState<
    ActionState,
    FormData
  >(async (previous, formData) => {
    const result = await advanceItemAction(previous, formData);
    const to = formData.get("to");
    if (!result?.error && isNextItemStatus(to)) toast.success(ADVANCED[to]);
    return result;
  }, null);
  const [cancelState, cancel, cancelling] = useActionState<
    ActionState,
    FormData
  >(async (previous, formData) => {
    const result = await cancelItemAction(previous, formData);
    if (!result?.error) toast.success(`Cancelled ${label}.`);
    return result;
  }, null);
  const [dialog, confirm] = useConfirm();
  const next = canAdvance ? nextItemStatusOf(status) : null;
  const cancellable =
    canCancel && status !== "cancelled" && status !== "completed";
  const pending = advancing || cancelling;

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
          <form action={advance}>
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="to" value={next} />
            <Button type="submit" size="sm" disabled={pending}>
              {advancing ? "Saving…" : ADVANCE_LABELS[next]}
            </Button>
          </form>
        ) : null}
        {cancellable ? (
          <form
            action={cancel}
            onSubmit={confirmedSubmit(
              confirm,
              {
                title: `Cancel ${label}?`,
                description: "The customer will be told.",
                action: "Cancel item",
                cancel: "Keep it",
                danger: true,
              },
              cancel,
            )}
          >
            <input type="hidden" name="itemId" value={itemId} />
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              Cancel item
            </Button>
          </form>
        ) : null}
      </div>
      <ErrorLine state={advanceState ?? cancelState} />
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
  const [state, action, pending] = useActionState<ActionState, FormData>(
    async (previous, formData) => {
      const result = await cancelBookingAction(previous, formData);
      if (!result?.error) toast.success(`Cancelled booking ${reference}.`);
      return result;
    },
    null,
  );
  const [dialog, confirm] = useConfirm();

  return (
    <form
      action={action}
      className="grid gap-1.5"
      onSubmit={confirmedSubmit(
        confirm,
        {
          title: `Cancel booking ${reference}?`,
          description: "Every open item is cancelled and the customer is told.",
          action: "Cancel booking",
          cancel: "Keep it",
          danger: true,
        },
        action,
      )}
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button
        type="submit"
        variant="danger"
        disabled={pending}
        className="w-full"
      >
        {pending ? "Cancelling…" : "Cancel booking"}
      </Button>
      <ErrorLine state={state} />
      {dialog}
    </form>
  );
}
