"use client";

import { formatMyr } from "@repo/db";
import { Button } from "@repo/ui/button";
import Link from "next/link";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../../../_lib/action-state";
import { bookingHref } from "../../../../../_lib/routes";
import { ItemEditor } from "../../../_components/ItemEditor";
import { chosenClass, type ItemDraft } from "../../../_lib/trip-form";
import { amendItemAction } from "../../actions";

/**
 * One item in the manual booking's editor, filled in from what is stored
 * and priced again. Saving replaces the item's trip, class and details on
 * the server and sends the customer a "Booking updated" email.
 */
export function AmendItemForm({
  bookingId,
  itemId,
  draft: initial,
  hasGoogle,
  canPrice,
  priceNote,
}: {
  bookingId: string;
  itemId: string;
  draft: ItemDraft;
  hasGoogle: boolean;
  canPrice: boolean;
  priceNote?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    amendItemAction,
    null,
  );
  const chosen = chosenClass(draft);

  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="itemId" value={itemId} />
      <ItemEditor
        index={0}
        draft={draft}
        onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
        hasGoogle={hasGoogle}
        categoryLocked
        canPrice={canPrice}
        priceNote={priceNote}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending || !chosen}>
          {pending
            ? "Saving…"
            : chosen
              ? `Save changes · ${formatMyr(chosen.totalSen)}`
              : "Choose a vehicle to continue"}
        </Button>
        <Link
          href={bookingHref(bookingId)}
          className="text-sm text-neutral-600 underline-offset-4 hover:underline"
        >
          Cancel
        </Link>
        {state?.error ? (
          <p aria-live="polite" className="text-sm text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
