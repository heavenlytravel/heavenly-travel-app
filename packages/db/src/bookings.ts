import { logActivity } from "./activity";
import {
  ITEM_ACTIONS,
  type Actor,
  type CustomerActor,
} from "./activity-actions";
import {
  bookingStatusOf,
  checkCustomerCancel,
  isLive,
  nextItemStatusOf,
  type BookingStatus,
  type Canceller,
  type ItemStatus,
  type Product,
} from "./booking-status";
import { db } from "./client";
import { Prisma } from "./generated/prisma/client";
import { generateReference } from "./references";

/**
 * The booking core, shared by every product: creation, lists, and the item
 * transitions that drive the booking's derived status. Product-specific
 * validation and pricing happen before this (see transportation.ts) and
 * arrive here as a `PreparedItem`. Every change takes the actor and writes
 * its activity entry in the same transaction. See
 * docs/260923-car-with-driver.md.
 */

const withItems = {
  include: {
    user: {
      select: { id: true, email: true, firstName: true, lastName: true },
    },
    items: {
      orderBy: { position: "asc" },
      include: {
        tripDetails: true,
        zone: { select: { id: true, slug: true, name: true } },
      },
    },
  },
} satisfies Prisma.BookingDefaultArgs;

export type BookingWithItems = Prisma.BookingGetPayload<typeof withItems>;
export type BookingItemWithDetails = BookingWithItems["items"][number];

/**
 * One product on one day, validated and priced, ready to be stored. Keyed by
 * `product`: each product brings its own details row, so a new one joins
 * `ProductDetails` and `detailsOf` without touching `createBooking`'s callers.
 */
export type PreparedItem = PreparedItemCore & ProductDetails;

type ProductDetails = {
  product: "transportation";
  tripDetails: Prisma.TripItemDetailsCreateWithoutItemInput;
};

type PreparedItemCore = {
  startsAt: Date;
  /** Null when the item has no set end, as a one-way trip. */
  endsAt: Date | null;
  /** The customer may cancel until this long before `startsAt`. */
  cancellationCutoffHours: number;
  zoneId: string | null;
  priceTotalSen: number;
  priceBreakdown: Prisma.InputJsonValue;
};

/** The nested create for the item's details row. */
function detailsOf(
  item: PreparedItem,
): Pick<Prisma.BookingItemCreateWithoutBookingInput, "tripDetails"> {
  switch (item.product) {
    case "transportation":
      return { tripDetails: { create: item.tripDetails } };
  }
}

export type CreateBookingInput = {
  userId: string;
  contactName: string;
  contactPhone: string;
  items: PreparedItem[];
};

const REFERENCE_ATTEMPTS = 5;

function isUniqueViolation(error: unknown, field: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta?.target ?? "").includes(field)
  );
}

/**
 * Creates a booking with its items in one transaction and remembers the
 * phone number on the user for next time. The actor is the customer on the
 * website, or the admin entering a booking for them. The reference is
 * random, so a collision is retried. Emails are the caller's job, after
 * this returns.
 */
export async function createBooking(
  actor: Actor,
  input: CreateBookingInput,
): Promise<BookingWithItems> {
  if (input.items.length === 0) {
    throw new Error("A booking needs at least one item.");
  }
  const startsAt = earliestStart(input.items) ?? input.items[0]!.startsAt;
  const data = {
    userId: input.userId,
    status: "received" satisfies BookingStatus,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    priceTotalSen: input.items.reduce((sum, i) => sum + i.priceTotalSen, 0),
    startsAt,
    items: {
      create: input.items.map((item, index) => ({
        position: index + 1,
        product: item.product satisfies Product,
        status: "received" satisfies ItemStatus,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        cancellationCutoffHours: item.cancellationCutoffHours,
        zoneId: item.zoneId,
        priceTotalSen: item.priceTotalSen,
        priceBreakdown: item.priceBreakdown,
        ...detailsOf(item),
      })),
    },
  };

  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: input.userId },
          data: { phone: input.contactPhone },
        });
        const booking = await tx.booking.create({
          data: { ...data, reference: generateReference() },
          ...withItems,
        });
        await logActivity(tx, actor, {
          action: "booking.created",
          entityId: booking.id,
          after: {
            status: booking.status,
            priceTotalSen: booking.priceTotalSen,
            items: booking.items.length,
          },
        });
        return booking;
      });
    } catch (error) {
      if (
        attempt >= REFERENCE_ATTEMPTS ||
        !isUniqueViolation(error, "reference")
      ) {
        throw error;
      }
    }
  }
}

export function listBookingsForUser(
  userId: string,
): Promise<BookingWithItems[]> {
  return db.booking.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    ...withItems,
  });
}

/** Owner only: null when the reference is unknown or belongs to someone else. */
export function getBookingForUser(
  reference: string,
  userId: string,
): Promise<BookingWithItems | null> {
  return db.booking.findFirst({ where: { reference, userId }, ...withItems });
}

export type BookingFilter = { status?: BookingStatus };

function whereOf(filter: BookingFilter): Prisma.BookingWhereInput | undefined {
  return filter.status ? { status: filter.status } : undefined;
}

/** Admin list, newest first. `take` caps it for the dashboard. */
export function listBookings(
  filter: BookingFilter = {},
  take?: number,
): Promise<BookingWithItems[]> {
  return db.booking.findMany({
    where: whereOf(filter),
    orderBy: { createdAt: "desc" },
    take,
    ...withItems,
  });
}

export function countBookings(filter: BookingFilter = {}): Promise<number> {
  return db.booking.count({ where: whereOf(filter) });
}

export function getBooking(id: string): Promise<BookingWithItems | null> {
  return db.booking.findUnique({ where: { id }, ...withItems });
}

/** What changed at booking level, so the caller can send the matching email. */
export type BookingEvent = "confirmed" | "cancelled";

export type BookingChange =
  | { ok: true; booking: BookingWithItems; event: BookingEvent | null }
  | { ok: false; error: string };

function earliestStart(items: readonly { startsAt: Date }[]) {
  return items.reduce<Date | null>(
    (min, i) => (min === null || i.startsAt < min ? i.startsAt : min),
    null,
  );
}

/**
 * Recomputes the booking's stored summary from its items. Called after every
 * item change, inside the same transaction. Returns the booking-level event
 * the change caused, if any.
 */
async function refreshBooking(
  tx: Prisma.TransactionClient,
  bookingId: string,
  cancelledBy: Canceller | null,
  now: Date,
): Promise<{ booking: BookingWithItems; event: BookingEvent | null }> {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { items: true },
  });
  const live = booking.items.filter(isLive);
  const status = bookingStatusOf(booking.items);

  const updated = await tx.booking.update({
    where: { id: bookingId },
    data: {
      status,
      // The total is what is owed for the live items. A fully cancelled
      // booking keeps its last total, so the record still says what it was.
      priceTotalSen:
        live.length > 0
          ? live.reduce((sum, i) => sum + i.priceTotalSen, 0)
          : booking.priceTotalSen,
      startsAt: earliestStart(live) ?? booking.startsAt,
      confirmedAt:
        status !== "received" && booking.confirmedAt === null ? now : undefined,
      cancelledAt:
        status === "cancelled" && booking.cancelledAt === null
          ? now
          : undefined,
      cancelledBy:
        status === "cancelled" && booking.cancelledBy === null
          ? cancelledBy
          : undefined,
    },
    ...withItems,
  });

  let event: BookingEvent | null = null;
  if (status === "cancelled" && booking.status !== "cancelled") {
    event = "cancelled";
  } else if (cancelledBy !== null) {
    // An admin cancelled one item of a booking that lives on: the customer
    // still hears about it.
    event = "cancelled";
  } else if (status === "confirmed" && booking.status === "received") {
    event = "confirmed";
  }
  return { booking: updated, event };
}

/**
 * Moves one item forward one step: received -> confirmed -> assigned ->
 * completed. The target is explicit so a stale button press fails instead
 * of skipping a step.
 */
export function advanceItem(
  actor: Actor,
  itemId: string,
  to: ItemStatus,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const item = await tx.bookingItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "Booking item not found." };
    const next = nextItemStatusOf(item.status);
    if (next === null || next !== to) {
      return {
        ok: false,
        error: `Item is ${item.status}, so it cannot become ${to}.`,
      };
    }
    await tx.bookingItem.update({
      where: { id: itemId },
      data: {
        status: next,
        confirmedAt: next === "confirmed" ? now : undefined,
      },
    });
    await logActivity(tx, actor, {
      action: ITEM_ACTIONS[next],
      entityId: item.bookingId,
      before: { position: item.position, status: item.status },
      after: { position: item.position, status: next },
    });
    return {
      ok: true,
      ...(await refreshBooking(tx, item.bookingId, null, now)),
    };
  });
}

/** Admin cancels one item. The booking stays live if other items remain. */
export function cancelItem(
  actor: Actor,
  itemId: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const item = await tx.bookingItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "Booking item not found." };
    if (item.status === "cancelled" || item.status === "completed") {
      return { ok: false, error: `Item is already ${item.status}.` };
    }
    await tx.bookingItem.update({
      where: { id: itemId },
      data: { status: "cancelled", cancelledAt: now },
    });
    await logActivity(tx, actor, {
      action: ITEM_ACTIONS.cancelled,
      entityId: item.bookingId,
      before: { position: item.position, status: item.status },
      after: { position: item.position, status: "cancelled" },
    });
    return {
      ok: true,
      ...(await refreshBooking(tx, item.bookingId, "admin", now)),
    };
  });
}

/** Cancels every open item, refreshes the booking and logs the one action. */
async function cancelAllItems(
  tx: Prisma.TransactionClient,
  actor: Actor,
  booking: { id: string; status: string },
  by: Canceller,
  now: Date,
) {
  await tx.bookingItem.updateMany({
    where: {
      bookingId: booking.id,
      status: { notIn: ["cancelled", "completed"] },
    },
    data: { status: "cancelled", cancelledAt: now },
  });
  const refreshed = await refreshBooking(tx, booking.id, by, now);
  await logActivity(tx, actor, {
    action: "booking.cancelled",
    entityId: booking.id,
    before: { status: booking.status },
    after: { status: refreshed.booking.status },
  });
  return refreshed;
}

/** Admin cancels the whole booking. Completed items stay completed. */
export function cancelBookingAsAdmin(
  actor: Actor,
  bookingId: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { ok: false, error: "Booking not found." };
    if (booking.status === "cancelled" || booking.status === "completed") {
      return { ok: false, error: `Booking is already ${booking.status}.` };
    }
    return {
      ok: true,
      ...(await cancelAllItems(tx, actor, booking, "admin", now)),
    };
  });
}

/**
 * The customer cancels their own booking: all or nothing, only while it is
 * received or confirmed, and only before the deadline its items' cutoffs set.
 */
export function cancelBookingAsCustomer(
  customer: CustomerActor,
  reference: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { reference, userId: customer.userId },
      include: {
        items: {
          select: {
            status: true,
            startsAt: true,
            cancellationCutoffHours: true,
          },
        },
      },
    });
    if (!booking) return { ok: false, error: "Booking not found." };
    const allowed = checkCustomerCancel(booking, now);
    if (!allowed.ok) return { ok: false, error: allowed.message };
    return {
      ok: true,
      ...(await cancelAllItems(tx, customer, booking, "customer", now)),
    };
  });
}
