import { changedFields, logActivity } from "./activity";
import {
  ITEM_ACTIONS,
  type Actor,
  type AmendedFields,
  type CustomerActor,
} from "./activity-actions";
import { checkPriceOverride, type PriceOverride } from "./booking-input";
import { rateLimitDecision, rateLimitWindows } from "./booking-limits";
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
import { isPlace } from "./place";
import { isTripPriceBreakdown } from "./pricing";
import { isUniqueViolation } from "./prisma-errors";
import { generateReference } from "./references";

/**
 * The booking core, shared by every product: creation, lists, and the item
 * transitions that drive the booking's derived status. Product-specific
 * validation and pricing happen before this (see transportation.ts) and
 * arrive here as a `PreparedItem`. Every change takes the actor and writes
 * its activity entry in the same transaction. See
 * docs/260923-car-with-driver.md and docs/260930-admin-teams-and-access.md,
 * "Staff booking tools".
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
        district: {
          select: { code: true, name: true, state: { select: { name: true } } },
        },
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
  districtCode: string | null;
  /** The rates' price, as the receipt says. */
  priceTotalSen: number;
  priceBreakdown: Prisma.InputJsonValue;
  /** An agreed price in place of the rates', with why. Staff only. */
  override?: PriceOverride | null;
};

/** What an item is charged: the override when one is set, else the receipt's. */
function chargedSen(item: {
  priceTotalSen: number;
  override?: PriceOverride | null;
}) {
  return item.override ? item.override.totalSen : item.priceTotalSen;
}

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
  /**
   * The account the booking shows under; null for a guest, whether on the
   * website or entered by staff.
   */
  userId: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  /** The website visitor's address, for the rate limit; null from the console. */
  createdIp: string | null;
  items: PreparedItem[];
};

const REFERENCE_ATTEMPTS = 5;

/**
 * Creates a booking with its items in one transaction and, when it belongs
 * to an account, remembers the phone number on it for next time. The actor
 * is the customer or the guest on the website, or the admin entering a
 * booking for them. An item with an agreed price is charged that price and
 * logged as priced, so it is never a special case later. The reference is
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
  for (const item of input.items) {
    if (!item.override) continue;
    const check = checkPriceOverride(item.override);
    if (!check.ok) throw new Error(check.error);
  }
  const startsAt = earliestStart(input.items) ?? input.items[0]!.startsAt;
  const data = {
    userId: input.userId,
    status: "received" satisfies BookingStatus,
    contactName: input.contactName,
    contactPhone: input.contactPhone,
    contactEmail: input.contactEmail,
    createdIp: input.createdIp,
    priceTotalSen: input.items.reduce((sum, i) => sum + chargedSen(i), 0),
    startsAt,
    items: {
      create: input.items.map((item, index) => ({
        position: index + 1,
        product: item.product satisfies Product,
        status: "received" satisfies ItemStatus,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        cancellationCutoffHours: item.cancellationCutoffHours,
        districtCode: item.districtCode,
        priceTotalSen: chargedSen(item),
        priceBreakdown: item.priceBreakdown,
        priceOverrideSen: item.override?.totalSen ?? null,
        priceOverrideReason: item.override?.reason ?? null,
        ...detailsOf(item),
      })),
    },
  };

  for (let attempt = 1; ; attempt++) {
    try {
      return await db.$transaction(async (tx) => {
        if (input.userId) {
          await tx.user.update({
            where: { id: input.userId },
            data: { phone: input.contactPhone },
          });
        }
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
            via: actor.kind === "admin" ? "console" : "website",
          },
        });
        for (const [index, item] of input.items.entries()) {
          if (!item.override) continue;
          await logActivity(tx, actor, {
            action: "booking.item.priced",
            entityId: booking.id,
            before: { position: index + 1, priceTotalSen: item.priceTotalSen },
            after: {
              position: index + 1,
              priceTotalSen: item.override.totalSen,
              reason: item.override.reason,
            },
          });
        }
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

/** How many bookings one email, or one address, has made since an instant. */
export function countRecentBookings(
  key: { contactEmail: string } | { createdIp: string },
  since: Date,
): Promise<number> {
  return db.booking.count({ where: { ...key, createdAt: { gte: since } } });
}

/**
 * Whether the website may take one more booking from this contact email
 * and this address. Counted from the bookings themselves, so no other
 * store is needed; signed-in customers count too.
 */
export async function isBookingRateLimited(
  key: { contactEmail: string; createdIp: string | null },
  now: Date = new Date(),
): Promise<boolean> {
  const windows = rateLimitWindows(now);
  const [email, ip] = await Promise.all([
    countRecentBookings({ contactEmail: key.contactEmail }, windows.email),
    key.createdIp === null
      ? undefined
      : countRecentBookings({ createdIp: key.createdIp }, windows.ip),
  ]);
  return !rateLimitDecision({ email, ip });
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

/**
 * What changed at booking level, so the caller can send the matching email.
 * An amend is one too: the customer is told in writing what the trip now
 * is, whatever the status.
 */
export type BookingEvent = "confirmed" | "cancelled" | "amended";

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

/**
 * Sets an agreed price on one item in place of the rates', or removes it
 * with null so the receipt's total stands again. The receipt is never
 * changed. Allowed while the item is live and not yet completed. No
 * booking-level event: the price is agreed with the customer outside the
 * app.
 */
export function overrideItemPrice(
  actor: Actor,
  itemId: string,
  override: PriceOverride | null,
  now: Date = new Date(),
): Promise<BookingChange> {
  if (override) {
    const check = checkPriceOverride(override);
    if (!check.ok) return Promise.resolve(check);
  }
  return db.$transaction(async (tx) => {
    const item = await tx.bookingItem.findUnique({ where: { id: itemId } });
    if (!item) return { ok: false, error: "Booking item not found." };
    if (item.status === "cancelled" || item.status === "completed") {
      return {
        ok: false,
        error: `Item is ${item.status}, so its price cannot change.`,
      };
    }
    if (!isTripPriceBreakdown(item.priceBreakdown)) {
      return { ok: false, error: "This item has no receipt to price from." };
    }
    const priceTotalSen = override
      ? override.totalSen
      : item.priceBreakdown.totalSen;
    if (
      priceTotalSen === item.priceTotalSen &&
      (override?.reason ?? null) === item.priceOverrideReason
    ) {
      return {
        ok: true,
        ...(await refreshBooking(tx, item.bookingId, null, now)),
      };
    }

    await tx.bookingItem.update({
      where: { id: itemId },
      data: {
        priceTotalSen,
        priceOverrideSen: override ? override.totalSen : null,
        priceOverrideReason: override ? override.reason : null,
      },
    });
    await logActivity(tx, actor, {
      action: "booking.item.priced",
      entityId: item.bookingId,
      before: { position: item.position, priceTotalSen: item.priceTotalSen },
      after: {
        position: item.position,
        priceTotalSen,
        reason: override ? override.reason : null,
      },
    });
    return {
      ok: true,
      ...(await refreshBooking(tx, item.bookingId, null, now)),
    };
  });
}

/** What an amend compares and logs, from a stored item or a prepared one. */
function amendedFieldsOf(
  item: { startsAt: Date; priceTotalSen: number },
  details: {
    mode: string;
    pickupPlace: unknown;
    dropoffPlace?: unknown;
    hours?: number | null;
    vehicleClassName: string;
    passengers: number;
    childSeats?: number;
    flightNumber?: string | null;
  },
): AmendedFields {
  return {
    mode: details.mode,
    pickup: isPlace(details.pickupPlace) ? details.pickupPlace.label : "",
    dropoff: isPlace(details.dropoffPlace) ? details.dropoffPlace.label : null,
    startsAt: item.startsAt.toISOString(),
    hours: details.hours ?? null,
    vehicleClassName: details.vehicleClassName,
    passengers: details.passengers,
    childSeats: details.childSeats ?? 0,
    flightNumber: details.flightNumber ?? null,
    priceTotalSen: item.priceTotalSen,
  };
}

/** A trip priced again for an item that exists, with an agreed price or none. */
export type AmendItemInput = {
  item: PreparedItem;
  override: PriceOverride | null;
};

/**
 * Replaces one item's trip, dates, district and receipt with a trip priced
 * again, in one transaction. Allowed while the item is received or
 * confirmed; the status stays. The category cannot change. The override in
 * force is dropped, because the quoted price changed; a new one may come
 * with the amend and is logged as priced. Nothing is written when every
 * value is already there.
 */
export function amendItem(
  actor: Actor,
  itemId: string,
  input: AmendItemInput,
  now: Date = new Date(),
): Promise<BookingChange> {
  if (input.override) {
    const check = checkPriceOverride(input.override);
    if (!check.ok) return Promise.resolve(check);
  }
  const next = { ...input.item, override: input.override };
  return db.$transaction(async (tx) => {
    const item = await tx.bookingItem.findUnique({
      where: { id: itemId },
      include: { tripDetails: true },
    });
    if (!item) return { ok: false, error: "Booking item not found." };
    if (item.status !== "received" && item.status !== "confirmed") {
      return {
        ok: false,
        error: `Item is ${item.status}, so it cannot be amended.`,
      };
    }
    if (!item.tripDetails || item.product !== next.product) {
      return { ok: false, error: "This item is not a trip." };
    }
    if (
      item.tripDetails.vehicleClassCategory !==
      next.tripDetails.vehicleClassCategory
    ) {
      return {
        ok: false,
        error: "The category of an item cannot change. Cancel it and add one.",
      };
    }

    const before = amendedFieldsOf(item, item.tripDetails);
    const after = amendedFieldsOf(
      { startsAt: next.startsAt, priceTotalSen: chargedSen(next) },
      next.tripDetails,
    );
    const changed = changedFields(before, after);
    const same =
      changed === null &&
      (item.tripDetails.notes ?? null) === (next.tripDetails.notes ?? null) &&
      item.priceOverrideReason === (next.override?.reason ?? null);
    if (same) {
      return {
        ok: true,
        ...(await refreshBooking(tx, item.bookingId, null, now)),
      };
    }

    await tx.bookingItem.update({
      where: { id: itemId },
      data: {
        startsAt: next.startsAt,
        endsAt: next.endsAt,
        cancellationCutoffHours: next.cancellationCutoffHours,
        districtCode: next.districtCode,
        priceTotalSen: chargedSen(next),
        priceBreakdown: next.priceBreakdown,
        priceOverrideSen: next.override?.totalSen ?? null,
        priceOverrideReason: next.override?.reason ?? null,
        tripDetails: { update: next.tripDetails },
      },
    });
    await logActivity(tx, actor, {
      action: "booking.item.amended",
      entityId: item.bookingId,
      before: { position: item.position, ...changed?.before },
      after: { position: item.position, ...changed?.after },
    });
    if (next.override) {
      await logActivity(tx, actor, {
        action: "booking.item.priced",
        entityId: item.bookingId,
        before: { position: item.position, priceTotalSen: next.priceTotalSen },
        after: {
          position: item.position,
          priceTotalSen: next.override.totalSen,
          reason: next.override.reason,
        },
      });
    }
    const refreshed = await refreshBooking(tx, item.bookingId, null, now);
    return { ok: true, booking: refreshed.booking, event: "amended" };
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
