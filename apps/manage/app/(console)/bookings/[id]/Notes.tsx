"use client";

import { BOOKING_NOTE_MAX_LENGTH, formatLocalDateTime } from "@repo/db";
import type { BookingNoteEntry } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { FieldGroup, Textarea } from "@repo/ui/field";
import { FormError } from "../../../_components/FormError";
import { useActionForm } from "../../../_lib/use-action-form";
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
  const { pending, error, formProps } = useActionForm(addNoteAction, {
    done: "Note added.",
    reset: true,
  });

  return (
    <div className="grid gap-4">
      {notes.length === 0 ? (
        <p className="text-sm text-slate-500">
          No notes yet. Only staff see these.
        </p>
      ) : (
        <ol className="divide-y divide-slate-100 text-sm">
          {notes.map((note) => (
            <li key={note.id} className="py-2">
              <p className="whitespace-pre-wrap text-slate-900">{note.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                {note.authorName}, {formatLocalDateTime(note.createdAt)}
              </p>
            </li>
          ))}
        </ol>
      )}
      <form {...formProps} className="grid gap-2">
        <input type="hidden" name="bookingId" value={bookingId} />
        <FieldGroup className="grid gap-1.5">
          <Textarea
            name="body"
            required
            maxLength={BOOKING_NOTE_MAX_LENGTH}
            rows={3}
            aria-label="Note"
            placeholder="Something the team should know. The customer never sees this."
          />
        </FieldGroup>
        <div className="flex items-center gap-3">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Adding…" : "Add note"}
          </Button>
          <FormError error={error} size="xs" />
        </div>
      </form>
    </div>
  );
}
