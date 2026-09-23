import {
  bookingStatusOf,
  checkCustomerCancel,
  isLive,
  NEXT_ITEM_STATUS,
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
 * validation and pricing happen before this (see car-with-driver.ts) and
 * arrive here as a `PreparedItem`. See docs/car-with-driver.md.
 */

const withItems = {
  include: {
    user: {
      select: { id: true, email: true, firstName: true, lastName: true },
    },
    items: {
      orderBy: { position: "asc" },
      include: {
        carDetails: true,
        zone: { select: { id: true, slug: true, name: true } },
      },
    },
  },
} satisfies Prisma.BookingDefaultArgs;

export type BookingWithItems = Prisma.BookingGetPayload<typeof withItems>;
export type BookingItemWithDetails = BookingWithItems["items"][number];

/** One product on one day, validated and priced, ready to be stored. */
export type PreparedItem = {
  product: Product;
  startsAt: Date;
  zoneId: string | null;
  priceTotalSen: number;
  priceBreakdown: Prisma.InputJsonValue;
  carDetails: Prisma.CarItemDetailsCreateWithoutItemInput;
};

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
 * phone number on the user for next time. The reference is random, so a
 * collision is retried. Emails are the caller's job, after this returns.
 */
export async function createBooking(
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
        product: item.product,
        status: "received" satisfies ItemStatus,
        startsAt: item.startsAt,
        zoneId: item.zoneId,
        priceTotalSen: item.priceTotalSen,
        priceBreakdown: item.priceBreakdown,
        carDetails: { create: item.carDetails },
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
        return tx.booking.create({
          data: { ...data, reference: generateReference() },
          ...withItems,
        });
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

export function listBookings(
  filter: {
    status?: BookingStatus;
  } = {},
): Promise<BookingWithItems[]> {
  return db.booking.findMany({
    where: filter.status ? { status: filter.status } : undefined,
    orderBy: { createdAt: "desc" },
    ...withItems,
  });
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
  itemId: string,
  to: ItemStatus,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const item = await tx.bookingItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "Booking item not found." };
    const next = NEXT_ITEM_STATUS[item.status as keyof typeof NEXT_ITEM_STATUS];
    if (next !== to) {
      return {
        ok: false,
        error: `Item is ${item.status}, so it cannot become ${to}.`,
      };
    }
    await tx.bookingItem.update({
      where: { id: itemId },
      data: {
        status: to,
        confirmedAt: to === "confirmed" ? now : undefined,
      },
    });
    return {
      ok: true,
      ...(await refreshBooking(tx, item.bookingId, null, now)),
    };
  });
}

/** Admin cancels one item. The booking stays live if other items remain. */
export function cancelItem(
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
    return {
      ok: true,
      ...(await refreshBooking(tx, item.bookingId, "admin", now)),
    };
  });
}

async function cancelAllItems(
  tx: Prisma.TransactionClient,
  bookingId: string,
  by: Canceller,
  now: Date,
) {
  await tx.bookingItem.updateMany({
    where: { bookingId, status: { notIn: ["cancelled", "completed"] } },
    data: { status: "cancelled", cancelledAt: now },
  });
  return refreshBooking(tx, bookingId, by, now);
}

/** Admin cancels the whole booking. Completed items stay completed. */
export function cancelBookingAsAdmin(
  bookingId: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return { ok: false, error: "Booking not found." };
    if (booking.status === "cancelled" || booking.status === "completed") {
      return { ok: false, error: `Booking is already ${booking.status}.` };
    }
    return { ok: true, ...(await cancelAllItems(tx, bookingId, "admin", now)) };
  });
}

/**
 * The customer cancels their own booking: all or nothing, only while it is
 * received or confirmed, and only before the cancellation cutoff.
 */
export function cancelBookingAsCustomer(
  reference: string,
  userId: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({
      where: { reference, userId },
    });
    if (!booking) return { ok: false, error: "Booking not found." };
    const allowed = checkCustomerCancel(booking, now);
    if (!allowed.ok) return { ok: false, error: allowed.message };
    return {
      ok: true,
      ...(await cancelAllItems(tx, booking.id, "customer", now)),
    };
  });
}
