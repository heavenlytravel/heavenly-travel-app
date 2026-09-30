import { logActivity } from "./activity";
import type { AdminActor } from "./activity-actions";
import { parseNoteBody } from "./booking-input";
import type { Change } from "./change";
import { db } from "./client";
import { fullName } from "./names";

/**
 * Internal notes on a booking: what staff tell each other about it. The
 * customer never sees them; nothing customer-facing reads this table.
 * Append-only, like the log: a wrong note is followed by a correcting one.
 * See docs/260930-admin-teams-and-access.md, "Step 8: Internal notes".
 */

/** A note with its author named, ready to show. */
export type BookingNoteEntry = {
  id: string;
  body: string;
  createdAt: Date;
  /** "Nurul Aina", the email when there is no name, or "Former staff". */
  authorName: string;
};

/** The notes on one booking, oldest first, so they read as a thread. */
export async function listBookingNotes(
  bookingId: string,
): Promise<BookingNoteEntry[]> {
  const rows = await db.bookingNote.findMany({
    where: { bookingId },
    orderBy: { createdAt: "asc" },
    include: {
      author: { select: { email: true, firstName: true, lastName: true } },
    },
  });
  return rows.map(({ author, ...row }) => ({
    id: row.id,
    body: row.body,
    createdAt: row.createdAt,
    authorName: author ? fullName(author) || author.email : "Former staff",
  }));
}

/** Adds a note under the admin's name and logs that one was added. */
export function addBookingNote(
  actor: AdminActor,
  bookingId: string,
  body: string,
): Promise<Change> {
  const parsed = parseNoteBody(body);
  if (!parsed.ok) return Promise.resolve(parsed);

  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { id: true },
    });
    if (!booking) return { ok: false, error: "Booking not found." };

    const note = await tx.bookingNote.create({
      data: { bookingId, authorId: actor.userId, body: parsed.value },
    });
    await logActivity(tx, actor, {
      action: "booking.note.added",
      entityId: bookingId,
      after: { noteId: note.id },
    });
    return { ok: true };
  });
}
