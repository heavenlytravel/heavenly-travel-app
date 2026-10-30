"use client";

import {
  nextItemStatusOf,
  type NextItemStatus,
  type PriceOverride,
} from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { Button } from "@repo/ui/button";
import { CheckIcon, XIcon } from "@repo/ui/icons";
import Link from "next/link";
import { FormError } from "@repo/ui/form-error";
import { useActionForm } from "../../../../_lib/use-action-form";
import {
  advanceItemAction,
  cancelBookingAction,
  cancelItemAction,
} from "./actions";
import { PriceOverrideControl } from "./PriceOverride";

/** What the toast says once each step is taken. */
const ADVANCED: Record<NextItemStatus, string> = {
  confirmed: "Trip confirmed. The customer is told.",
  assigned: "Driver assigned.",
  completed: "Trip completed.",
};

/** What the forward button says for each step it would take. */
const ADVANCE_LABELS: Record<NextItemStatus, string> = {
  confirmed: "Confirm",
  assigned: "Mark driver assigned",
  completed: "Mark completed",
};

/**
 * The foot of one trip's card: the forward step, the amend, the agreed
 * price and the cancel, each shown only to an admin who may do it. The
 * next status travels with the form, so a stale page that still shows
 * "Confirm" on a trip already confirmed fails instead of skipping a step.
 * "Cancel item" is quiet; its question is where it turns red. Nothing
 * when the admin may do none of them.
 */
export function ItemActions({
  itemId,
  status,
  label,
  canAdvance,
  canCancel,
  amendHref,
  price,
}: {
  itemId: string;
  status: string;
  /** How the cancel's question names the trip: "HT-7K3QZM trip 1". */
  label: string;
  /** Whether the admin may take the step that comes next. */
  canAdvance: boolean;
  canCancel: boolean;
  /** The amend form, or null when the admin may not or the trip is past it. */
  amendHref: string | null;
  /** The agreed price in force, when the admin may change it; undefined when not. */
  price: { current: PriceOverride | null } | undefined;
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

  if (!next && !cancellable && !amendHref && !price) return null;

  return (
    <div className="border-t border-hairline px-5 py-3.5">
      <div className="flex flex-wrap items-center gap-2">
        {next ? (
          <form {...advance.formProps}>
            <input type="hidden" name="itemId" value={itemId} />
            <input type="hidden" name="to" value={next} />
            <Button
              type="submit"
              size="sm"
              disabled={cancel.pending}
              pending={advance.pending}
            >
              {next === "confirmed" ? <CheckIcon className="size-4" /> : null}
              {advance.pending ? "Saving…" : ADVANCE_LABELS[next]}
            </Button>
          </form>
        ) : null}
        {amendHref ? (
          <Button asChild variant="secondary" size="sm">
            <Link href={amendHref}>Amend</Link>
          </Button>
        ) : null}
        {price ? (
          <PriceOverrideControl itemId={itemId} current={price.current} />
        ) : null}
        {cancellable ? (
          <form {...cancel.formProps} className="ml-auto">
            <input type="hidden" name="itemId" value={itemId} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              disabled={advance.pending}
              pending={cancel.pending}
            >
              Cancel item
            </Button>
          </form>
        ) : null}
      </div>
      <FormError
        error={advance.error ?? cancel.error}
        size="xs"
        className="mt-2"
      />
      {dialog}
    </div>
  );
}

/** "Cancel booking" in the booking's header: cancels every live trip at once. Completed trips stay completed. */
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
        description: "Every open trip is cancelled and the customer is told.",
        action: "Cancel booking",
        cancel: "Keep it",
        danger: true,
      }),
    done: `Cancelled booking ${reference}.`,
  });

  return (
    <form {...formProps} className="grid justify-items-end gap-1.5">
      <input type="hidden" name="bookingId" value={bookingId} />
      <Button type="submit" variant="secondary" pending={pending}>
        <XIcon className="size-4" />
        {pending ? "Cancelling…" : "Cancel booking"}
      </Button>
      <FormError error={error} size="xs" />
      {dialog}
    </form>
  );
}
