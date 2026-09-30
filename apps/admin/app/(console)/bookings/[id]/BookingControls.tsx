"use client";

import { nextItemStatusOf, type NextItemStatus } from "@repo/db";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { useActionState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import {
  advanceItemAction,
  cancelBookingAction,
  cancelItemAction,
} from "./actions";

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
  /** How the confirm dialog names the item: "HT-7K3QZM item 1". */
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
  >(advanceItemAction, null);
  const [cancelState, cancel, cancelling] = useActionState<
    ActionState,
    FormData
  >(cancelItemAction, null);
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
            onSubmit={(event) => {
              if (!confirm(`Cancel ${label}? The customer will be told.`)) {
                event.preventDefault();
              }
            }}
          >
            <input type="hidden" name="itemId" value={itemId} />
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              Cancel item
            </Button>
          </form>
        ) : null}
      </div>
      <ErrorLine state={advanceState ?? cancelState} />
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
    cancelBookingAction,
    null,
  );

  return (
    <form
      action={action}
      className="grid gap-1.5"
      onSubmit={(event) => {
        if (
          !confirm(
            `Cancel booking ${reference}? Every open item is cancelled and the customer is told.`,
          )
        ) {
          event.preventDefault();
        }
      }}
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
    </form>
  );
}
