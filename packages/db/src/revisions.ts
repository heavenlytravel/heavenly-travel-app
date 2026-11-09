import type { Actor } from "./activity-actions";
import { logActivity } from "./activity";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { revisionText, snapshotOf, type RevisionKind } from "./revision-rules";
import { itemHeading } from "./trip-view";

type Tx = Prisma.TransactionClient;

/**
 * Writes a booking's revisions: the next one, from the booking as it now
 * stands, inside the transaction that changed it. A revision is append
 * only. Billing follows it (./billing). See ./revision-rules and
 * docs/261108-billing-and-revisions.md, "Revisions in code".
 */

/** What a revision says about itself: its kind, the customer's line, and staff's reason. */
export type RevisionNote = {
  kind: RevisionKind;
  summary: string;
  reason?: string | null;
};

const SNAPSHOT_SELECT = {
  status: true,
  items: {
    orderBy: { position: "asc" },
    select: {
      id: true,
      position: true,
      status: true,
      startsAt: true,
      priceTotalSen: true,
      priceBreakdown: true,
      priceOverrideReason: true,
      tripDetails: {
        select: {
          vehicleClassCategory: true,
          vehicleClassName: true,
          vehicleModelName: true,
          mode: true,
          pickupPlace: true,
          stops: true,
          dropoffPlace: true,
          hours: true,
          distanceKm: true,
          passengers: true,
          guideLanguage: true,
        },
      },
    },
  },
  charges: {
    orderBy: { createdAt: "asc" },
    select: { itemId: true, label: true, amountSen: true },
  },
} as const satisfies Prisma.BookingSelect;

/** A revision opened by a change, to point its charges and pay lines at before it is closed. */
export type OpenRevision = { id: string; number: number; note: RevisionNote };

/**
 * Opens the booking's next revision, numbered after its last, for the
 * change being made: its charges and pay lines name it, then
 * `closeRevision` writes the booking as it then stands. The caller holds
 * the booking's row (`lockBooking`), so two changes never take one number.
 */
export async function openRevision(
  tx: Tx,
  actor: Actor,
  bookingId: string,
  note: RevisionNote,
  now: Date,
): Promise<OpenRevision> {
  const last = await tx.bookingRevision.aggregate({
    where: { bookingId },
    _max: { number: true },
  });
  const number = (last._max.number ?? 0) + 1;
  const revision = await tx.bookingRevision.create({
    data: {
      bookingId,
      number,
      kind: note.kind,
      summary: revisionText(note.summary),
      reason: note.reason ? revisionText(note.reason) : null,
      snapshot: {},
      quotedSen: 0,
      chargedSen: 0,
      createdById: "userId" in actor ? actor.userId : null,
      createdAt: now,
    },
    select: { id: true },
  });
  return { id: revision.id, number, note };
}

/**
 * Closes a revision: the booking as it now stands, its quote and what it
 * charges. Logged on the booking's history from Rev 2, Rev 1 being the
 * booking's own "created" entry.
 */
export async function closeRevision(
  tx: Tx,
  actor: Actor,
  bookingId: string,
  revision: OpenRevision,
): Promise<void> {
  const source = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: SNAPSHOT_SELECT,
  });
  const snapshot = snapshotOf(source, itemHeading);
  await tx.bookingRevision.update({
    where: { id: revision.id },
    data: {
      snapshot,
      quotedSen: snapshot.quotedSen,
      chargedSen: snapshot.chargedSen,
    },
  });
  if (revision.number > 1) {
    const reason = revision.note.reason
      ? revisionText(revision.note.reason)
      : null;
    await logActivity(tx, actor, {
      action: "booking.revised",
      entityId: bookingId,
      after: {
        revision: revision.number,
        kind: revision.note.kind,
        summary: revisionText(revision.note.summary),
        chargedSen: snapshot.chargedSen,
        ...(reason ? { reason } : {}),
      },
    });
  }
}

/** The booking's latest revision, for a change that bills without one of its own. */
export function latestRevisionOf(tx: Tx, bookingId: string) {
  return tx.bookingRevision.findFirst({
    where: { bookingId },
    orderBy: { number: "desc" },
    select: { id: true, number: true, summary: true, chargedSen: true },
  });
}

/** A booking's revisions, oldest first, for its page and the customer's change list. */
export function listRevisions(bookingId: string) {
  return db.bookingRevision.findMany({
    where: { bookingId },
    orderBy: { number: "asc" },
  });
}

/** One revision of a booking, by its number, for its read-only page. */
export function getRevision(bookingId: string, number: number) {
  return db.bookingRevision.findUnique({
    where: { bookingId_number: { bookingId, number } },
  });
}
