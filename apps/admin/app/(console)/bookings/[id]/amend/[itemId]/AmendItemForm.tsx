"use client";

import { formatMyr } from "@repo/db";
import { Button } from "@repo/ui/button";
import { useActionState, useState } from "react";
import type { ActionState } from "../../../../../_lib/action-state";
import { bookingHref } from "../../../../../_lib/routes";
import { BookingSummary } from "../../../_components/BookingSummary";
import { ItemHiddenFields } from "../../../_components/ItemHiddenFields";
import {
  ItemSteps,
  itemStepsDone,
  type ItemStep,
} from "../../../_components/ItemSteps";
import {
  agreedPriceIssue,
  chosenClass,
  itemTotalSen,
  tripLine,
  vehicleLine,
  type ItemDraft,
} from "../../../_lib/trip-form";
import { amendItemAction } from "../../actions";

/**
 * One item of a booking in the manual booking's steps, filled in from what
 * is stored and priced again: the trip, the vehicle and the details, each
 * folded to a line with "Edit", the category fixed. Saving replaces the
 * item's trip, class and details on the server and sends the customer a
 * "Booking updated" email, then goes back to the booking where it was
 * opened: the queue's, or a location's.
 */
export function AmendItemForm({
  bookingId,
  itemId,
  locationSlug,
  draft: initial,
  hasGoogle,
  canPrice,
  priceNote,
}: {
  bookingId: string;
  itemId: string;
  /** The location the booking is opened inside; absent from the queue. */
  locationSlug?: string;
  draft: ItemDraft;
  hasGoogle: boolean;
  canPrice: boolean;
  priceNote?: string;
}) {
  const [draft, setDraft] = useState(initial);
  const [open, setOpen] = useState<ItemStep | null>(null);
  const [state, action, pending] = useActionState<ActionState, FormData>(
    amendItemAction,
    null,
  );

  const patch = (changes: Partial<ItemDraft>) =>
    setDraft((current) => ({ ...current, ...changes }));
  const done = itemStepsDone(draft);
  const chosen = chosenClass(draft);
  const priceIssue = canPrice ? agreedPriceIssue(draft) : null;
  const missing = !done.trip
    ? "Fill in the trip."
    : !done.vehicle
      ? "Choose a vehicle."
      : priceIssue;
  const totalSen = canPrice ? itemTotalSen(draft) : (chosen?.totalSen ?? null);

  return (
    <form
      action={action}
      // Enter in a field does not save the item: the button does.
      onKeyDown={(event) => {
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault();
        }
      }}
      className="@container"
    >
      <input type="hidden" name="bookingId" value={bookingId} />
      <input type="hidden" name="itemId" value={itemId} />
      {locationSlug ? (
        <input type="hidden" name="locationSlug" value={locationSlug} />
      ) : null}
      <ItemHiddenFields index={0} draft={draft} canPrice={canPrice} />

      <div className="grid gap-6 @3xl:grid-cols-[1fr_20rem] @3xl:items-start">
        <div className="grid min-w-0 gap-3">
          <ItemSteps
            first={1}
            draft={draft}
            onChange={patch}
            open={open}
            onOpen={setOpen}
            hasGoogle={hasGoogle}
            categoryLocked
          />
        </div>
        <aside className="@3xl:sticky @3xl:top-20">
          <BookingSummary
            rows={[
              { label: "Trip", value: draft.quote ? tripLine(draft) : "—" },
              {
                label: "Vehicle",
                value: chosen ? vehicleLine(draft, { price: false }) : "—",
              },
            ]}
            draft={draft}
            onChange={patch}
            canPrice={canPrice}
            priceNote={priceNote}
            submit={
              <Button type="submit" disabled={pending || missing !== null}>
                {pending
                  ? "Saving…"
                  : totalSen !== null
                    ? `Save changes · ${formatMyr(totalSen)}`
                    : "Save changes"}
              </Button>
            }
            missing={missing}
            error={state?.error ?? null}
            cancelHref={bookingHref(bookingId, locationSlug)}
          />
        </aside>
      </div>
    </form>
  );
}
