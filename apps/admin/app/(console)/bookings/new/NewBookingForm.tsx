"use client";

import { CONTACT_NAME_MAX_LENGTH, formatMyr } from "@repo/db";
import { Button } from "@repo/ui/button";
import { Field, Input } from "@repo/ui/field";
import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { Card, CardTitle } from "../../../_components/Card";
import type { ActionState } from "../../../_lib/action-state";
import { BOOKINGS_PATH } from "../../../_lib/routes";
import { ItemEditor } from "../_components/ItemEditor";
import {
  chosenClass,
  CONTACT_FIELDS,
  EMPTY_ITEM_DRAFT,
  type ItemDraft,
} from "../_lib/trip-form";
import { createManualBookingAction } from "./actions";

/** One vehicle of the form, under a key that survives a removal above it. */
type Entry = { key: number; draft: ItemDraft };

/**
 * The manual booking: one item editor per vehicle, each priced on its own,
 * then the customer once for the whole booking. The button sums the
 * quoted prices; an agreed price is applied on the server, per item.
 */
export function NewBookingForm({
  hasGoogle,
}: {
  /** False when the server runs without a Google key and offers the districts themselves. */
  hasGoogle: boolean;
}) {
  const nextKey = useRef(1);
  const [items, setItems] = useState<Entry[]>([
    { key: 0, draft: EMPTY_ITEM_DRAFT },
  ]);
  const [state, create, creating] = useActionState<ActionState, FormData>(
    createManualBookingAction,
    null,
  );

  function patch(key: number, changes: Partial<ItemDraft>) {
    setItems((current) =>
      current.map((entry) =>
        entry.key === key
          ? { ...entry, draft: { ...entry.draft, ...changes } }
          : entry,
      ),
    );
  }

  function add() {
    setItems((current) => [
      ...current,
      { key: nextKey.current++, draft: EMPTY_ITEM_DRAFT },
    ]);
  }

  function remove(key: number) {
    setItems((current) => current.filter((entry) => entry.key !== key));
  }

  const chosen = items.map((entry) => chosenClass(entry.draft));
  const ready = chosen.every((c) => c !== null);
  const totalSen = chosen.reduce((sum, c) => sum + (c?.totalSen ?? 0), 0);
  const several = items.length > 1;

  return (
    <form action={create} className="grid gap-6">
      {items.map((entry, index) => (
        <ItemEditor
          key={entry.key}
          index={index}
          draft={entry.draft}
          onChange={(changes) => patch(entry.key, changes)}
          hasGoogle={hasGoogle}
          canPrice
          heading={
            several
              ? {
                  title: `Vehicle ${index + 1}`,
                  onRemove: () => remove(entry.key),
                }
              : undefined
          }
        />
      ))}

      <div>
        <Button type="button" variant="secondary" onClick={add}>
          Add another vehicle
        </Button>
      </div>

      <Card>
        <CardTitle description="An email that belongs to an account links the booking to it. Leave it blank if they gave none: they then get no emails.">
          Customer
        </CardTitle>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name for the driver">
            <Input
              name={CONTACT_FIELDS.name}
              required
              maxLength={CONTACT_NAME_MAX_LENGTH}
              autoComplete="off"
            />
          </Field>
          <Field label="Phone">
            <Input
              name={CONTACT_FIELDS.phone}
              type="tel"
              required
              placeholder="+60 12 345 6789"
              autoComplete="off"
            />
          </Field>
          <Field label="Email" hint="Optional.">
            <Input
              name={CONTACT_FIELDS.email}
              type="email"
              autoComplete="off"
            />
          </Field>
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={creating || !ready}>
          {creating
            ? "Creating…"
            : ready
              ? `Create booking · ${formatMyr(totalSen)}`
              : several
                ? "Choose a vehicle for each trip to continue"
                : "Choose a vehicle to continue"}
        </Button>
        <Link
          href={BOOKINGS_PATH}
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
