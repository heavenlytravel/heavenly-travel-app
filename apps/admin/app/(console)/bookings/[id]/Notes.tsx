"use client";

import { BOOKING_NOTE_MAX_LENGTH, formatLocalDateTime } from "@repo/db";
import type { BookingNoteEntry } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { inputClassName } from "@repo/ui/field";
import { useActionState } from "react";
import type { ActionState } from "../../../_lib/action-state";
import { addNoteAction } from "./actions";

/**
 * The internal notes on a booking, oldest first, and the field to add one.
 * Shown to every team that can open the booking; the customer never sees
 * them. Notes are never edited or deleted, so a wrong one is followed by a
 * correcting one.
 */
export function Notes({
  bookingId,
  notes,
}: {
  bookingId: string;
  notes: BookingNoteEntry[];
}) {
  const [state, action, pending] = useActionState<ActionState, FormData>(
    addNoteAction,
    null,
  );

  return (
    <div className="grid gap-4">
      {notes.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No notes yet. Only staff see these.
        </p>
      ) : (
        <ol className="divide-y divide-neutral-100 text-sm">
          {notes.map((note) => (
            <li key={note.id} className="py-2">
              <p className="whitespace-pre-wrap text-neutral-900">
                {note.body}
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {note.authorName}, {formatLocalDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
      <form action={action} className="grid gap-2">
        <input type="hidden" name="bookingId" value={bookingId} />
        <textarea
          name="body"
          required
          maxLength={BOOKING_NOTE_MAX_LENGTH}
          rows={3}
          placeholder="Something the team should know. The customer never sees this."
          className={`${inputClassName} h-auto py-2`}
        />
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add note"}
          </Button>
          {state?.error ? (
            <p aria-live="polite" className="text-xs text-red-700">
              {state.error}
            </p>
          ) : null}
        </div>
      </form>
    </div>
  );
}
