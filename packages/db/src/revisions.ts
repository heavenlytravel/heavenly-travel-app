import type { Actor } from "./activity-actions";
import { logActivity } from "./activity";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import {
  amendSummaryOf,
  revisionDetailsOf,
  revisionSnapshotOf,
  revisionText,
  snapshotOf,
  type RevisionDetail,
  type RevisionKind,
} from "./revision-rules";
import { fullName } from "./names";
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
  /** An amend's trip: its summary names what changed on it, once the change is made. */
  trip?: number;
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
 * charges. An amend's summary names what changed on its trip, from the
 * revision before ("Trip 1: pick-up time and vehicle changed"). Logged on
 * the booking's history from Rev 2, Rev 1 being the booking's own
 * "created" entry.
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
  let summary = revisionText(revision.note.summary);
  if (revision.note.trip !== undefined && revision.number > 1) {
    const previous = await tx.bookingRevision.findUnique({
      where: { bookingId_number: { bookingId, number: revision.number - 1 } },
      select: { snapshot: true },
    });
    summary = revisionText(
      amendSummaryOf(
        revision.note.trip,
        revisionDetailsOf(revisionSnapshotOf(previous?.snapshot), snapshot),
      ),
    );
  }
  await tx.bookingRevision.update({
    where: { id: revision.id },
    data: {
      snapshot,
      summary,
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
        summary,
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

/** A revision as staff read it: what it changed from the one before, and who made it. */
export type StaffRevision<R> = R & {
  details: RevisionDetail[];
  /** Who made it; "System" for none, "Former staff" for a deleted account. */
  by: string;
};

/**
 * Revisions in order, each with what it changed from the one before
 * (`before`: the snapshot of the revision before the first, null when the
 * first is Rev 1) and who made it, named in one query.
 */
export async function withDetails<
  R extends { snapshot: unknown; createdById: string | null },
>(rows: readonly R[], before: unknown): Promise<StaffRevision<R>[]> {
  const ids = [
    ...new Set(rows.flatMap((r) => (r.createdById ? [r.createdById] : []))),
  ];
  const users = ids.length
    ? await db.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstName: true, lastName: true, email: true },
      })
    : [];
  const names = new Map(users.map((u) => [u.id, fullName(u) || u.email]));
  let previous = revisionSnapshotOf(before);
  return rows.map((row) => {
    const snapshot = revisionSnapshotOf(row.snapshot);
    const details = snapshot ? revisionDetailsOf(previous, snapshot) : [];
    previous = snapshot;
    return {
      ...row,
      details,
      by: row.createdById
        ? (names.get(row.createdById) ?? "Former staff")
        : "System",
    };
  });
}

/** A booking's revisions for staff, oldest first, each with what it changed and who made it. */
export async function listStaffRevisions(bookingId: string) {
  return withDetails(await listRevisions(bookingId), null);
}
