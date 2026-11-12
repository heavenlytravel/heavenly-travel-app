import { logActivity } from "./activity";
import { ITEM_ACTIONS, SYSTEM_ACTOR } from "./activity-actions";
import { settleBilling } from "./billing";
import { bookingStatusOf } from "./booking-status";
import { db } from "./client";
import { NO_SHOW_UNDO_MINUTES, noShowEndsAt } from "./trip-events-input";

/**
 * Completes every trip whose no-show has waited its hour
 * (`NO_SHOW_UNDO_MINUTES`) without being taken back: the trip, then its
 * booking's status, and billing as a trip done does, dated when the hour
 * ended, so a late run never moves the date. Run before the screens read
 * trips (Assign, a booking's page, Connect's jobs), as offers expire, so
 * no scheduler is needed. A trip another run completed first is skipped,
 * and one that fails is logged and left for the next run, never stopping
 * the page.
 * See docs/261111-catalogue-booking-flow-and-ops.md, part E.
 */
export async function completeNoShows(now: Date = new Date()) {
  const due = await db.tripEvent.findMany({
    where: {
      kind: "no-show",
      createdAt: {
        lte: new Date(now.getTime() - NO_SHOW_UNDO_MINUTES * 60 * 1000),
      },
      item: { status: { in: ["confirmed", "assigned"] } },
    },
    select: { itemId: true },
  });
  for (const itemId of new Set(due.map((e) => e.itemId))) {
    await completeNoShow(itemId).catch((error: unknown) =>
      // The page that ran it still loads; the next run tries again.
      console.error(`completeNoShows: trip ${itemId}`, error),
    );
  }
}

/** One trip whose no-show's hour is over, completed and billed in one transaction. */
function completeNoShow(itemId: string) {
  return db.$transaction(async (tx) => {
    const item = await tx.bookingItem.findUnique({
      where: { id: itemId },
      select: {
        id: true,
        bookingId: true,
        position: true,
        status: true,
        events: { select: { kind: true, createdAt: true } },
      },
    });
    const endsAt = item ? noShowEndsAt(item.events) : null;
    if (!item || !endsAt) return;
    // Only one run completes it: the other finds it completed already.
    const { count } = await tx.bookingItem.updateMany({
      where: { id: item.id, status: { in: ["confirmed", "assigned"] } },
      data: { status: "completed" },
    });
    if (count === 0) return;
    await logActivity(tx, SYSTEM_ACTOR, {
      action: ITEM_ACTIONS.completed,
      entityId: item.bookingId,
      before: { position: item.position, status: item.status },
      after: { position: item.position, status: "completed" },
    });
    const siblings = await tx.bookingItem.findMany({
      where: { bookingId: item.bookingId },
      select: { status: true },
    });
    await tx.booking.update({
      where: { id: item.bookingId },
      data: { status: bookingStatusOf(siblings) },
    });
    // The last trip done ends the booking: its open invoice is issued.
    await settleBilling(tx, SYSTEM_ACTOR, item.bookingId, endsAt);
  });
}
