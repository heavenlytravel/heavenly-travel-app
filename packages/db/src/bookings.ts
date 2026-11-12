import { changedFields, logActivity } from "./activity";
import {
  ITEM_ACTIONS,
  type Actor,
  type AmendedFields,
  type CustomerActor,
} from "./activity-actions";
import { settleBilling } from "./billing";
import { isCredit, suggestedPriceOf } from "./billing-rules";
import type { ContactFields } from "./booking-contact";
import { nextBookingNumber } from "./booking-counter";
import {
  BOOKING_NUMBER_SELECT,
  bookingWhereOf,
  parseDocumentNumber,
  type BookingRef,
} from "./booking-number";
import { checkPriceOverride, type PriceOverride } from "./booking-input";
import { rateLimitDecision, rateLimitWindows } from "./booking-limits";
import type { BookingOrder } from "./booking-order";
import { BOOKING_RULES, localDayRange } from "./booking-rules";
import {
  checkCustomerCancel,
  checkCustomerTripCancel,
  isLive,
  nextItemStatusOf,
  bookingStatusOf,
  type BookingStatus,
  type Canceller,
  type ItemStatus,
  type Product,
  type TripCategory,
  type TripMode,
} from "./booking-status";
import { checkBookableBusiness } from "./businesses";
import { refuse, type Change, type Refusal } from "./change";
import { db } from "./client";
import { releaseParts, settleCancelledTrips } from "./fulfilment";
import { Prisma } from "./generated/prisma/client";
import { isPlace } from "./place";
import {
  REVISION_KIND_LABELS,
  chargedSenOf,
  type AmendWarning,
  type ChargeRevisionKind,
  type PriceRevisionKind,
} from "./revision-rules";
import { closeRevision, openRevision, type OpenRevision } from "./revisions";
import { phoneDigitsOf } from "./search";
import { itemQuoteSen, MAX_STOPS, stopsOf, type TripStop } from "./stops";
import { formatMyr } from "./money";

/**
 * The booking core, shared by every product: creation, lists, and every
 * change to a booking. A change to what we deliver, charge or pay writes
 * a revision (./revisions), and billing follows it in the same
 * transaction (./billing): the first invoice when the booking is first
 * confirmed, then an invoice or credit notes for what each revision moved.
 * Product-specific validation and pricing happen before this (see
 * transportation.ts) and arrive here as a `PreparedItem`. Every change
 * takes the actor and writes its activity entry in the same transaction.
 * See docs/260923-car-with-driver.md and
 * docs/261108-billing-and-revisions.md.
 */

const withItems = {
  include: {
    user: {
      select: { id: true, email: true, firstName: true, lastName: true },
    },
    business: {
      select: {
        id: true,
        name: true,
        contactEmail: true,
        paymentTerms: true,
      },
    },
    charges: {
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        itemId: true,
        label: true,
        amountSen: true,
        createdAt: true,
      },
    },
    /** Its issued invoices, by number, for the lists; ./billing reads the rest. */
    invoiceLines: {
      where: { invoice: { status: "issued", type: "invoice" } },
      orderBy: { invoice: { issuedAt: "asc" } },
      select: { invoice: { select: { id: true, type: true, number: true } } },
    },
    items: {
      orderBy: { position: "asc" },
      include: {
        tripDetails: true,
        district: {
          select: { code: true, name: true, state: { select: { name: true } } },
        },
        location: { select: { id: true, name: true, slug: true } },
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
  /** The location whose rates priced the item: the pickup's. */
  locationId: string | null;
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
  /** Staff only: the business it was sold through, billed for it: an agent. */
  businessId?: string | null;
  /**
   * Staff only: the old system's invoice number (HT1223), as typed. A note
   * for the team; it bills nothing.
   */
  legacyInvoiceNumber?: string | null;
  /**
   * Staff only: confirm it at once, every trip with it, opening its
   * invoice; false saves it as received, for confirming later.
   */
  confirm?: boolean;
  /**
   * Staff only: agreed that it is paid later, by this day ("2026-11-30"),
   * as the booking page's Pay later sets it; null or left out for none.
   * Refused on a credit agent's booking, which pays later on its terms.
   */
  payLaterDueOn?: string | null;
};

/** Holds a booking's row to the end of the transaction: its changes, revisions and bills go one at a time. */
async function lockBooking(tx: Prisma.TransactionClient, bookingId: string) {
  await tx.$executeRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
}

/**
 * Creates a booking with its items in one transaction, numbered by the
 * counters (HTB when made confirmed, else HTQ until it is), with its Rev 1, and when it belongs to an account,
 * remembers the phone number on it for next time. The actor is the
 * customer or the guest on the website, or the admin entering a booking
 * for them. An item with an agreed price is charged that price and
 * logged as priced. One from the website is received, for Reservation to
 * confirm. One staff enter is confirmed at once, every trip with it, when
 * they ask (`confirm`), else received. Confirmed, its invoice opens
 * (./billing), unless its business is on credit. Emails are the caller's
 * job, after this returns.
 */
export async function createBooking(
  actor: Actor,
  input: CreateBookingInput,
): Promise<BookingWithItems & { billed: string[] }> {
  if (input.items.length === 0) {
    throw new Error("A booking needs at least one item.");
  }
  const staff = actor.kind === "admin";
  const confirmed = staff && input.confirm === true;
  const businessId = input.businessId ?? null;
  const legacy = input.legacyInvoiceNumber ?? null;
  const payLater = input.payLaterDueOn ?? null;
  if ((legacy !== null || businessId !== null || payLater !== null) && !staff) {
    throw new Error(
      "Only staff may give a booking an agent, an old invoice number or Pay later.",
    );
  }
  const now = new Date();
  const status = confirmed ? "confirmed" : "received";
  for (const item of input.items) {
    if (!item.override) continue;
    const check = checkPriceOverride(item.override);
    if (!check.ok) throw new Error(check.error);
  }
  const startsAt = earliestStart(input.items) ?? input.items[0]!.startsAt;

  return db.$transaction(async (tx) => {
    if (input.userId) {
      await tx.user.update({
        where: { id: input.userId },
        data: { phone: input.contactPhone },
      });
    }
    let onCredit = false;
    if (businessId !== null) {
      const bookable = await checkBookableBusiness(tx, businessId);
      if (!bookable.ok) throw new BookingRefusal(bookable.error);
      onCredit = isCredit(
        (
          await tx.business.findUniqueOrThrow({
            where: { id: businessId },
            select: { paymentTerms: true },
          })
        ).paymentTerms,
      );
    }
    if (payLater !== null && onCredit) {
      throw new BookingRefusal(
        "A credit agent's booking pays later on its terms already: it takes no date.",
        "payLater",
      );
    }
    const payLaterDueOn =
      payLater !== null ? new Date(`${payLater}T00:00:00Z`) : null;
    const booking = await tx.booking.create({
      data: {
        // Received, it is a quotation, HTQ, until confirmed gives its HTB.
        ...(confirmed
          ? { number: await nextBookingNumber(tx, "booking") }
          : { quoteNumber: await nextBookingNumber(tx, "quote") }),
        userId: input.userId,
        businessId,
        legacyInvoiceNumber: legacy,
        payLaterDueOn,
        status: status satisfies BookingStatus,
        confirmedAt: confirmed ? now : null,
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
            status: status satisfies ItemStatus,
            confirmedAt: confirmed ? now : null,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
            cancellationCutoffHours: item.cancellationCutoffHours,
            districtCode: item.districtCode,
            locationId: item.locationId,
            priceTotalSen: chargedSen(item),
            priceBreakdown: item.priceBreakdown,
            priceOverrideSen: item.override?.totalSen ?? null,
            priceOverrideReason: item.override?.reason ?? null,
            ...detailsOf(item),
          })),
        },
      },
      select: { id: true, status: true, priceTotalSen: true },
    });
    await logActivity(tx, actor, {
      action: "booking.created",
      entityId: booking.id,
      after: {
        status: booking.status,
        priceTotalSen: booking.priceTotalSen,
        items: input.items.length,
        via: actor.kind === "admin" ? "console" : "website",
        ...(legacy !== null ? { legacyInvoiceNumber: legacy } : {}),
      },
    });
    if (payLaterDueOn) {
      await logActivity(tx, actor, {
        action: "booking.pay-later.set",
        entityId: booking.id,
        before: { dueOn: null },
        after: { dueOn: payLater },
      });
    }
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
    const revision = await openRevision(
      tx,
      actor,
      booking.id,
      { kind: "booked", summary: REVISION_KIND_LABELS.booked },
      now,
    );
    const refreshed = await refreshBooking(
      tx,
      actor,
      booking.id,
      null,
      now,
      revision,
    );
    return { ...refreshed.booking, billed: refreshed.billed };
  });
}

/** Why a booking could not be made as asked: its message is for staff. */
export class BookingRefusal extends Error {
  /** The form field it is about: "agent" (the default) or "payLater". */
  readonly field: "agent" | "payLater";
  constructor(message: string, field: "agent" | "payLater" = "agent") {
    super(message);
    this.field = field;
  }
}

/**
 * How many website bookings one email, or one address, has made since an
 * instant. Bookings staff enter carry no address and are not counted, so
 * a customer the team booked for can still book online.
 */
export function countRecentBookings(
  key: { contactEmail: string } | { createdIp: string },
  since: Date,
): Promise<number> {
  return db.booking.count({
    where: {
      createdIp: { not: null },
      ...key,
      createdAt: { gte: since },
    },
  });
}

/**
 * Whether the website may take one more booking from this contact email
 * and this address. Counted from the website's own bookings, so no other
 * store is needed; signed-in customers count too, staff bookings do not.
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

/** Owner only, by its number (HTB-1042, or HTQ-0012 while received or since): null when unknown or someone else's. */
export function getBookingForUser(
  ref: BookingRef,
  userId: string,
): Promise<BookingWithItems | null> {
  return db.booking.findFirst({
    where: { ...bookingWhereOf(ref), userId },
    ...withItems,
  });
}

/**
 * What the admin lists are narrowed to: a status, a location, the days an
 * item picks up in (Malaysian time, cancelled items aside), the kind of
 * trip, the agent, a search, or any of them together.
 */
export type BookingFilter = {
  status?: BookingStatus;
  locationId?: string;
  /** The day an item picks up on, or the first of a run of days ending at `pickupTo`. */
  pickupOn?: Date;
  /** The last day of the run from `pickupOn`, counted in. */
  pickupTo?: Date;
  /** A booking with a trip of this kind. */
  tripMode?: TripMode;
  /** A booking with a trip of this service: car with driver or coach charter. */
  category?: TripCategory;
  /** A booking with a trip of this vehicle class, by id. */
  vehicleClassId?: string;
  /** The agent it came through, by id; null for the bookings that came direct. */
  businessId?: string | null;
  /** As `searchTermOf` reads it: the id, an HTB, HTI or HTC number, a legacy invoice number, or part of the customer's name, phone or email. */
  search?: string;
};

function whereOf(filter: BookingFilter): Prisma.BookingWhereInput | undefined {
  const where: Prisma.BookingWhereInput = {};
  if (filter.status) where.status = filter.status;
  if (filter.businessId !== undefined) where.businessId = filter.businessId;
  // A booking is the location's when one of its items picks up there, the
  // days' when one of its live items starts in them, and the kind's when
  // one of its trips is (its service, its class); all at once when the same
  // item is.
  const item: Prisma.BookingItemWhereInput = {};
  if (filter.locationId) item.locationId = filter.locationId;
  if (filter.pickupOn) {
    const first = localDayRange(filter.pickupOn);
    const last = filter.pickupTo ? localDayRange(filter.pickupTo) : first;
    item.startsAt = { gte: first.start, lt: last.end };
    item.status = { not: "cancelled" satisfies ItemStatus };
  }
  const trip: Prisma.TripItemDetailsWhereInput = {};
  if (filter.tripMode) trip.mode = filter.tripMode;
  if (filter.category) trip.vehicleClassCategory = filter.category;
  if (filter.vehicleClassId) trip.vehicleClassId = filter.vehicleClassId;
  if (Object.keys(trip).length > 0) item.tripDetails = trip;
  if (Object.keys(item).length > 0) where.items = { some: item };
  if (filter.search) {
    const phone = phoneDigitsOf(filter.search);
    const number = parseDocumentNumber(filter.search);
    const onDocument = (type: "invoice" | "credit", n: number) => ({
      invoiceLines: {
        some: { invoice: { type, number: n } },
      },
    });
    where.OR = [
      // "HTB-1042", "HTQ-0012", "HTI-0012", "HTC-0003", or digits for any of them.
      ...(number && (number.kind === null || number.kind === "booking")
        ? [{ number: number.number }]
        : []),
      ...(number && (number.kind === null || number.kind === "quote")
        ? [{ quoteNumber: number.number }]
        : []),
      ...(number && (number.kind === null || number.kind === "invoice")
        ? [onDocument("invoice", number.number)]
        : []),
      ...(number && (number.kind === null || number.kind === "credit")
        ? [onDocument("credit", number.number)]
        : []),
      // A booking id pasted whole, from a log or a link.
      { id: filter.search },
      // The old random reference (HT-7K3QZM) customers were given, until
      // the column is dropped.
      { reference: { contains: filter.search.trim().toUpperCase() } },
      // A legacy invoice number as typed (HT1223, HTI-1295-03), in part.
      {
        legacyInvoiceNumber: {
          contains: filter.search.trim(),
          mode: "insensitive",
        },
      },
      { contactName: { contains: filter.search, mode: "insensitive" } },
      { contactEmail: { contains: filter.search, mode: "insensitive" } },
      ...(phone ? [{ contactPhone: { contains: phone } }] : []),
    ];
  }
  return Object.keys(where).length > 0 ? where : undefined;
}

const ORDERS: Record<BookingOrder, Prisma.BookingOrderByWithRelationInput[]> = {
  newest: [{ createdAt: "desc" }],
  oldest: [{ createdAt: "asc" }],
  soonest: [{ startsAt: "asc" }, { createdAt: "desc" }],
  latest: [{ startsAt: "desc" }, { createdAt: "desc" }],
};

/**
 * Admin list, newest first unless told otherwise. `take` caps it, for an
 * overview or a page; `skip` passes the pages before.
 */
export function listBookings(
  filter: BookingFilter = {},
  {
    order = "newest",
    take,
    skip,
  }: { order?: BookingOrder; take?: number; skip?: number } = {},
): Promise<BookingWithItems[]> {
  return db.booking.findMany({
    where: whereOf(filter),
    orderBy: ORDERS[order],
    take,
    skip,
    ...withItems,
  });
}

/**
 * The bookings a search finds, newest first, with only what a line of
 * them shows: for the console header's search, which asks as the admin
 * types.
 */
export function findBookingMatches(search: string, take: number) {
  return db.booking.findMany({
    where: whereOf({ search }),
    orderBy: ORDERS.newest,
    take,
    select: {
      ...BOOKING_NUMBER_SELECT,
      status: true,
      contactName: true,
      startsAt: true,
      legacyInvoiceNumber: true,
      items: {
        orderBy: { position: "asc" },
        select: { location: { select: { id: true, name: true, slug: true } } },
      },
    },
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
export type BookingEvent =
  | "confirmed"
  | "cancelled"
  | "amended"
  /** The customer cancelled a trip of a booking that lives on. */
  | "customer-cancelled-trip";

export type BookingChange =
  | {
      ok: true;
      booking: BookingWithItems;
      event: BookingEvent | null;
      /** The invoices and credit notes the change issued: "HTI-0012". */
      billed: string[];
      /** What the change no longer fits that is assigned, for Operation to change on Assign. */
      warnings: AmendWarning[];
    }
  | { ok: false; error: string };

function earliestStart(items: readonly { startsAt: Date }[]) {
  return items.reduce<Date | null>(
    (min, i) => (min === null || i.startsAt < min ? i.startsAt : min),
    null,
  );
}

type Refreshed = {
  booking: BookingWithItems;
  event: BookingEvent | null;
  billed: string[];
  warnings: AmendWarning[];
};

/**
 * Recomputes the booking's stored summary from its items and charges,
 * closes the change's revision when there is one, and bills what that
 * asks (./billing). Called after every item change, inside the same
 * transaction. Returns the booking-level event the change caused, if
 * any. The booking's row is held first: two trips changed at once
 * refresh one after the other, the second reading the first's trips, so
 * the status is right and a bill is issued once.
 */
async function refreshBooking(
  tx: Prisma.TransactionClient,
  actor: Actor,
  bookingId: string,
  cancelledBy: Canceller | null,
  now: Date,
  revision: OpenRevision | null = null,
): Promise<Refreshed> {
  await lockBooking(tx, bookingId);
  await settleCancelledTrips(tx, bookingId, now);
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: { items: true, charges: { select: { amountSen: true } } },
  });
  const live = booking.items.filter(isLive);
  const status = bookingStatusOf(booking.items);
  // Confirmed, a quotation takes its booking number, HTB, kept from then;
  // its HTQ stays for reference. Before the bill, which names it.
  const numbered =
    booking.number === null && status !== "received" && status !== "cancelled"
      ? { number: await nextBookingNumber(tx, "booking") }
      : {};
  await tx.booking.update({
    where: { id: bookingId },
    data: {
      ...numbered,
      status,
      // What the customer pays now: the live trips and every charge, so
      // a cancelled booking pays its fees alone.
      priceTotalSen: chargedSenOf(booking),
      startsAt: earliestStart(live) ?? booking.startsAt,
      confirmedAt:
        status !== "received" &&
        status !== "cancelled" &&
        booking.confirmedAt === null
          ? now
          : undefined,
      cancelledAt:
        status === "cancelled" && booking.cancelledAt === null
          ? now
          : undefined,
      cancelledBy:
        status === "cancelled" && booking.cancelledBy === null
          ? cancelledBy
          : undefined,
    },
  });
  if (revision) await closeRevision(tx, actor, bookingId, revision);
  const billed = await settleBilling(tx, actor, bookingId, now);
  const updated = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    ...withItems,
  });

  let event: BookingEvent | null = null;
  if (status === "cancelled" && booking.status !== "cancelled") {
    event = "cancelled";
  } else if (cancelledBy === "admin") {
    // An admin cancelled one item of a booking that lives on: the customer
    // still hears about it.
    event = "cancelled";
  } else if (cancelledBy === "customer") {
    // The customer cancelled a trip and kept the rest: both sides hear.
    event = "customer-cancelled-trip";
  } else if (status === "confirmed" && booking.status === "received") {
    event = "confirmed";
  }
  return { booking: updated, event, billed, warnings: [] };
}

const GONE_ITEM = "This trip is no longer on the booking. Reload the booking.";
const GONE_BOOKING = "This booking was deleted meanwhile. Go back to Bookings.";

/** A trip's booking, held, and the trip itself; null when it is gone. */
async function lockedItem(tx: Prisma.TransactionClient, itemId: string) {
  const found = await tx.bookingItem.findUnique({
    where: { id: itemId },
    select: { bookingId: true },
  });
  if (!found) return null;
  await lockBooking(tx, found.bookingId);
  return tx.bookingItem.findUnique({
    where: { id: itemId },
    include: { tripDetails: true, booking: { select: { status: true } } },
  });
}

/** Refuses a change to a cancelled booking: none is allowed once cancelled. */
function refuseCancelled(status: string): Refusal | null {
  return status === "cancelled"
    ? refuse(
        "This booking is cancelled, so it cannot change. Enter a new booking.",
      )
    : null;
}

/** A trip as the customer reads it in a change list: "Trip 2". */
const tripName = (position: number) => `Trip ${position}`;

/**
 * Moves one item forward one step: received -> confirmed, or assigned ->
 * completed; assigning is ./fulfilment's. The target is explicit so a
 * stale button press fails instead of skipping a step. Not a revision: a
 * status step changes nothing we deliver or charge. The first confirmed
 * trip bills the booking.
 */
export function advanceItem(
  actor: Actor,
  itemId: string,
  to: ItemStatus,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const item = await lockedItem(tx, itemId);
    if (!item) return refuse(GONE_ITEM);
    const next = nextItemStatusOf(item.status);
    if (next === null || next !== to) {
      return refuse(
        `Trip is ${item.status} now, so it cannot become ${to}. Reload the booking.`,
      );
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
      ...(await refreshBooking(tx, actor, item.bookingId, null, now)),
    };
  });
}

/** A cancellation fee kept on a cancelled trip: what the customer still pays, and why. */
export type CancelFee = { amountSen: number; reason: string } | null;

/** Checks a fee as posted: a whole positive amount of sen. */
function feeRefusal(fee: CancelFee): Refusal | null {
  if (!fee) return null;
  return Number.isInteger(fee.amountSen) && fee.amountSen > 0
    ? null
    : refuse("Enter the fee in RM, or leave it empty for none.", "feeAmount");
}

/** A cancellation's fee as a charge, and the minus charge that takes it off when it is undone. */
const FEE_LABEL = "Cancellation fee";
const FEE_OFF_LABEL = "Cancellation fee taken off";

/** Keeps a fee on a cancelled trip, or on the booking, as a charge of the revision. */
async function keepFee(
  tx: Prisma.TransactionClient,
  bookingId: string,
  itemId: string | null,
  revision: OpenRevision,
  fee: CancelFee,
) {
  if (!fee) return;
  await tx.bookingCharge.create({
    data: {
      bookingId,
      itemId,
      revisionId: revision.id,
      label: FEE_LABEL,
      amountSen: fee.amountSen,
    },
  });
}

/**
 * Admin cancels one item, keeping a fee or none. The booking stays live
 * if other items remain. A revision: billing credits what the trip no
 * longer charges.
 */
export function cancelItem(
  actor: Actor,
  itemId: string,
  fee: CancelFee = null,
  now: Date = new Date(),
): Promise<BookingChange> {
  const badFee = feeRefusal(fee);
  if (badFee) return Promise.resolve(badFee);
  return db.$transaction(async (tx) => {
    const item = await lockedItem(tx, itemId);
    if (!item) return refuse(GONE_ITEM);
    if (item.status === "cancelled" || item.status === "completed") {
      return refuse(`Trip is already ${item.status}. Reload the booking.`);
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
    const revision = await openRevision(
      tx,
      actor,
      item.bookingId,
      {
        kind: "cancel",
        summary: fee
          ? `${tripName(item.position)} cancelled, fee ${formatMyr(fee.amountSen)}`
          : `${tripName(item.position)} cancelled`,
        reason: fee?.reason ?? null,
      },
      now,
    );
    await keepFee(tx, item.bookingId, itemId, revision, fee);
    return {
      ok: true,
      ...(await refreshBooking(
        tx,
        actor,
        item.bookingId,
        "admin",
        now,
        revision,
      )),
    };
  });
}

/**
 * A new price agreed for one trip, in place of its quote: a discount
 * given, or a correction of our own mistake; null puts the quote back, as
 * a correction. The receipt is never changed. Allowed while the trip is
 * not cancelled, and after it is completed, so a late correction bills.
 * A revision; no email, since the price was agreed outside the app.
 */
export function priceItem(
  actor: Actor,
  itemId: string,
  input: { kind: PriceRevisionKind; override: PriceOverride | null },
  now: Date = new Date(),
): Promise<BookingChange> {
  if (input.override) {
    const check = checkPriceOverride(input.override);
    if (!check.ok) return Promise.resolve(check);
  }
  return db.$transaction(async (tx) => {
    const item = await lockedItem(tx, itemId);
    if (!item) return refuse(GONE_ITEM);
    const cancelled = refuseCancelled(item.booking.status);
    if (cancelled) return cancelled;
    if (item.status === "cancelled") {
      return refuse(
        "This trip is cancelled, so its price cannot change. Reload the booking.",
      );
    }
    const quote = itemQuoteSen(item);
    const priceTotalSen = input.override ? input.override.totalSen : quote;
    if (priceTotalSen === item.priceTotalSen) {
      return refuse(
        `${tripName(item.position)} is ${formatMyr(priceTotalSen)} already.`,
      );
    }
    await tx.bookingItem.update({
      where: { id: itemId },
      data: {
        priceTotalSen,
        priceOverrideSen: priceTotalSen === quote ? null : priceTotalSen,
        priceOverrideReason:
          priceTotalSen === quote ? null : (input.override?.reason ?? null),
      },
    });
    await logActivity(tx, actor, {
      action: "booking.item.priced",
      entityId: item.bookingId,
      before: { position: item.position, priceTotalSen: item.priceTotalSen },
      after: {
        position: item.position,
        priceTotalSen,
        reason: input.override ? input.override.reason : null,
      },
    });
    const word = input.kind === "discount" ? "Discount" : "Price corrected";
    const revision = await openRevision(
      tx,
      actor,
      item.bookingId,
      {
        kind: input.kind,
        summary: `${word} on ${tripName(item.position).toLowerCase()}: now ${formatMyr(priceTotalSen)}`,
        reason: input.override?.reason ?? "Back to the quoted price",
      },
      now,
    );
    return {
      ok: true,
      ...(await refreshBooking(tx, actor, item.bookingId, null, now, revision)),
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
    vehicleModelName?: string | null;
    passengers: number;
    childSeats?: number;
    flightNumber?: string | null;
    guideLanguage?: string | null;
    guideRequest?: string | null;
  },
): AmendedFields {
  return {
    mode: details.mode,
    pickup: isPlace(details.pickupPlace) ? details.pickupPlace.label : "",
    dropoff: isPlace(details.dropoffPlace) ? details.dropoffPlace.label : null,
    startsAt: item.startsAt.toISOString(),
    hours: details.hours ?? null,
    vehicleClassName: details.vehicleClassName,
    vehicleModel: details.vehicleModelName ?? null,
    passengers: details.passengers,
    childSeats: details.childSeats ?? 0,
    flightNumber: details.flightNumber ?? null,
    tourGuide:
      [
        details.guideLanguage,
        details.guideRequest ? `${details.guideRequest} on request` : null,
      ]
        .filter(Boolean)
        .join(", ") || null,
    priceTotalSen: item.priceTotalSen,
  };
}

/** A trip priced again for an item that exists, with an agreed price or none. */
export type AmendItemInput = {
  item: PreparedItem;
  override: PriceOverride | null;
};

/** The item statuses an amend takes: any not done or cancelled. */
const AMENDABLE: readonly string[] = ["received", "confirmed", "assigned"];

/** Whether staff may amend a trip: until it is done or cancelled. */
export function isAmendable(item: { status: string }) {
  return AMENDABLE.includes(item.status);
}

/**
 * What an amended trip charges by the price rule (`suggestedPriceOf`):
 * what it charged, moved by what its quote moved, unless staff agreed
 * another number. Its stops stay, with what they added. An agreed price
 * that differs from the new quote keeps its reason, or the old one.
 */
export function amendedPriceOf(
  item: {
    priceTotalSen: number;
    priceBreakdown: unknown;
    priceOverrideReason: string | null;
    tripDetails: { stops?: unknown } | null;
  },
  next: { priceTotalSen: number; override: PriceOverride | null },
): {
  chargedSen: number;
  quoteSen: number;
  suggestedSen: number;
  reason: string | null;
} {
  const stops = stopsOf(item.tripDetails?.stops);
  const quoteSen =
    next.priceTotalSen + stops.reduce((sum, s) => sum + s.quoteAddSen, 0);
  const suggestedSen = suggestedPriceOf({
    chargedSen: item.priceTotalSen,
    oldQuoteSen: itemQuoteSen(item),
    newQuoteSen: quoteSen,
  });
  const chargedSen = next.override?.totalSen ?? suggestedSen;
  return {
    chargedSen,
    quoteSen,
    suggestedSen,
    reason:
      chargedSen === quoteSen
        ? null
        : (next.override?.reason ??
          item.priceOverrideReason ??
          "Agreed price carried over from before the change"),
  };
}

/**
 * Replaces one item's trip, dates, district and receipt with a trip priced
 * again, in one transaction, the category too (a car for a coach). Allowed
 * until the item is completed or cancelled. The agreed price follows the
 * price rule (`amendedPriceOf`). The vendors and the driver stay: when the
 * change no longer fits them (another class, another time), the answer
 * warns, for Operation to change them on Assign. A revision; nothing is
 * written when every value is already there.
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
  return db.$transaction(async (tx) => {
    const item = await lockedItem(tx, itemId);
    if (!item) return refuse(GONE_ITEM);
    if (!isAmendable(item)) {
      return refuse(
        `Trip is ${item.status} now, so it cannot be amended. Go back to the booking.`,
      );
    }
    if (!item.tripDetails || item.product !== input.item.product) {
      return refuse("This item is not a trip.");
    }
    const price = amendedPriceOf(item, {
      priceTotalSen: input.item.priceTotalSen,
      override: input.override,
    });
    const next = input.item;
    const before = amendedFieldsOf(item, item.tripDetails);
    const after = amendedFieldsOf(
      { startsAt: next.startsAt, priceTotalSen: price.chargedSen },
      next.tripDetails,
    );
    const changed = changedFields(before, after);
    const same =
      changed === null &&
      (item.tripDetails.notes ?? null) === (next.tripDetails.notes ?? null) &&
      item.priceOverrideReason === price.reason;
    if (same) {
      return refuse("Nothing changed: the trip is already as entered.");
    }

    const parts = await tx.tripPart.findMany({
      where: { itemId },
      select: { role: true },
    });
    await tx.bookingItem.update({
      where: { id: itemId },
      data: {
        startsAt: next.startsAt,
        endsAt: next.endsAt,
        cancellationCutoffHours: next.cancellationCutoffHours,
        districtCode: next.districtCode,
        locationId: next.locationId,
        priceTotalSen: price.chargedSen,
        priceBreakdown: next.priceBreakdown,
        priceOverrideSen: price.reason === null ? null : price.chargedSen,
        priceOverrideReason: price.reason,
        tripDetails: {
          update: {
            ...next.tripDetails,
            // No model preferred now: the one preferred before goes.
            vehicleModel: next.tripDetails.vehicleModel ?? { disconnect: true },
          },
        },
      },
    });
    await logActivity(tx, actor, {
      action: "booking.item.amended",
      entityId: item.bookingId,
      before: { position: item.position, ...changed?.before },
      after: { position: item.position, ...changed?.after },
    });
    if (price.reason !== null) {
      await logActivity(tx, actor, {
        action: "booking.item.priced",
        entityId: item.bookingId,
        before: { position: item.position, priceTotalSen: price.quoteSen },
        after: {
          position: item.position,
          priceTotalSen: price.chargedSen,
          reason: price.reason,
        },
      });
    }
    const revision = await openRevision(
      tx,
      actor,
      item.bookingId,
      {
        kind: "change",
        summary: `${tripName(item.position)} changed`,
        trip: item.position,
        reason: input.override?.reason ?? null,
      },
      now,
    );
    const refreshed = await refreshBooking(
      tx,
      actor,
      item.bookingId,
      null,
      now,
      revision,
    );
    return {
      ok: true,
      ...refreshed,
      event: "amended",
      warnings: amendWarnings(parts, {
        classChanged: before.vehicleClassName !== after.vehicleClassName,
        timeChanged:
          before.startsAt !== after.startsAt || before.hours !== after.hours,
      }),
    };
  });
}

/**
 * What an amend no longer fits that stays assigned: the vehicle of
 * another class, a vehicle and a driver asked for another time. Operation
 * changes them on Assign; nothing is let go here.
 */
export function amendWarnings(
  parts: readonly { role: string }[],
  change: { classChanged: boolean; timeChanged: boolean },
): AmendWarning[] {
  const warnings: AmendWarning[] = [];
  if (change.classChanged && parts.some((p) => p.role === "vehicle")) {
    warnings.push("class");
  }
  if (change.timeChanged && parts.length > 0) warnings.push("time");
  return warnings;
}

/**
 * Adds a trip, priced on the server, to a booking staff took already, as
 * its next item: confirmed at once when the booking is, or received with
 * the rest while the booking waits to be confirmed. A revision: billing
 * follows, the new trip on its open invoice. Refused once the booking is
 * cancelled, or holds the most trips a booking may.
 */
export function addItem(
  actor: Actor,
  bookingId: string,
  input: AmendItemInput,
  now: Date = new Date(),
): Promise<BookingChange> {
  if (input.override) {
    const check = checkPriceOverride(input.override);
    if (!check.ok) return Promise.resolve(check);
  }
  const next = { ...input.item, override: input.override };
  return db.$transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: { items: { select: { position: true } } },
    });
    if (!booking) return refuse(GONE_BOOKING);
    const cancelled = refuseCancelled(booking.status);
    if (cancelled) return cancelled;
    if (booking.items.length >= BOOKING_RULES.maxTripsPerBooking) {
      return refuse(
        `A booking takes up to ${BOOKING_RULES.maxTripsPerBooking} trips. Enter the rest as a booking of their own.`,
      );
    }
    const position =
      booking.items.reduce((max, i) => Math.max(max, i.position), 0) + 1;
    const status: ItemStatus =
      booking.status === "received" ? "received" : "confirmed";
    await tx.bookingItem.create({
      data: {
        bookingId,
        position,
        product: next.product satisfies Product,
        status,
        confirmedAt: status === "confirmed" ? now : null,
        startsAt: next.startsAt,
        endsAt: next.endsAt,
        cancellationCutoffHours: next.cancellationCutoffHours,
        districtCode: next.districtCode,
        locationId: next.locationId,
        priceTotalSen: chargedSen(next),
        priceBreakdown: next.priceBreakdown,
        priceOverrideSen: next.override?.totalSen ?? null,
        priceOverrideReason: next.override?.reason ?? null,
        ...detailsOf(next),
      },
    });
    await logActivity(tx, actor, {
      action: "booking.item.added",
      entityId: bookingId,
      after: {
        position,
        status,
        ...amendedFieldsOf(
          { startsAt: next.startsAt, priceTotalSen: next.priceTotalSen },
          next.tripDetails,
        ),
      },
    });
    if (next.override) {
      await logActivity(tx, actor, {
        action: "booking.item.priced",
        entityId: bookingId,
        before: { position, priceTotalSen: next.priceTotalSen },
        after: {
          position,
          priceTotalSen: next.override.totalSen,
          reason: next.override.reason,
        },
      });
    }
    const revision = await openRevision(
      tx,
      actor,
      bookingId,
      {
        kind: "add-trip",
        summary: `${tripName(position)} added`,
        reason: next.override?.reason ?? null,
      },
      now,
    );
    const refreshed = await refreshBooking(
      tx,
      actor,
      bookingId,
      null,
      now,
      revision,
    );
    return { ok: true, ...refreshed, event: "amended" };
  });
}

/** A stop as Add stop posts it, its quote worked out on the server (./stop-quote). */
export type AddStopInput = {
  stop: TripStop;
  /** Where among the trip's stops it goes: 0 is the first after the pick-up. */
  at: number;
  /** What the trip charges with the stop: the suggestion, or what staff agreed. */
  chargedSen: number;
  /** What the stop adds to the driver's pay; 0 for nothing. */
  driverPaySen: number;
  /** Why, when staff agreed a charge or a pay other than suggested. */
  reason: string | null;
};

/**
 * Adds a stop on a trip: still one trip, A to C by B. The trip's quote
 * grows by what the legs added (`TripStop.quoteAddSen`), and it charges
 * what staff agreed; the driver's pay grows by a pay line. Allowed until
 * the trip is done or cancelled. The vendors and the driver stay. A
 * revision: billing bills the difference.
 */
export function addStop(
  actor: Actor,
  itemId: string,
  input: AddStopInput,
  now: Date = new Date(),
): Promise<BookingChange> {
  if (!Number.isInteger(input.chargedSen) || input.chargedSen < 0) {
    return Promise.resolve(
      refuse("Enter what the trip charges, in RM.", "chargedAmount"),
    );
  }
  if (!Number.isInteger(input.driverPaySen) || input.driverPaySen < 0) {
    return Promise.resolve(
      refuse("Enter the driver's pay for the stop, in RM.", "driverPay"),
    );
  }
  return db.$transaction(async (tx) => {
    const item = await lockedItem(tx, itemId);
    if (!item?.tripDetails) return refuse(GONE_ITEM);
    if (!isAmendable(item)) {
      return refuse(
        `Trip is ${item.status} now, so it takes no stop. Reload the booking.`,
      );
    }
    const stops = stopsOf(item.tripDetails.stops);
    if (stops.length >= MAX_STOPS) {
      return refuse(`A trip takes up to ${MAX_STOPS} stops.`);
    }
    const at = Math.max(0, Math.min(input.at, stops.length));
    const nextStops = [...stops];
    nextStops.splice(at, 0, input.stop);
    const quoteSen = itemQuoteSen(item) + input.stop.quoteAddSen;
    await tx.bookingItem.update({
      where: { id: itemId },
      data: {
        priceTotalSen: input.chargedSen,
        priceOverrideSen:
          input.chargedSen === quoteSen ? null : input.chargedSen,
        priceOverrideReason:
          input.chargedSen === quoteSen
            ? null
            : (input.reason ??
              item.priceOverrideReason ??
              "Agreed price carried over"),
        tripDetails: { update: { stops: nextStops } },
      },
    });
    const revision = await openRevision(
      tx,
      actor,
      item.bookingId,
      {
        kind: "stop",
        summary: `Stop at ${input.stop.place.label} added to ${tripName(item.position).toLowerCase()}`,
        reason: input.reason,
      },
      now,
    );
    if (input.driverPaySen > 0) {
      await tx.itemPayLine.create({
        data: {
          itemId,
          role: "driver",
          revisionId: revision.id,
          amountSen: input.driverPaySen,
          reason: `Stop at ${input.stop.place.label}`,
        },
      });
    }
    await logActivity(tx, actor, {
      action: "booking.stop.added",
      entityId: item.bookingId,
      after: {
        position: item.position,
        stop: input.stop.place.label,
        waitMinutes: input.stop.waitMinutes,
        quoteAddSen: input.stop.quoteAddSen,
        priceTotalSen: input.chargedSen,
        driverPaySen: input.driverPaySen,
      },
    });
    return {
      ok: true,
      ...(await refreshBooking(tx, actor, item.bookingId, null, now, revision)),
      event: "amended",
    };
  });
}

/** A charge as Add charge posts it. */
export type AddChargeInput = {
  kind: ChargeRevisionKind;
  /** The trip it is for; null for the booking as a whole. */
  itemId: string | null;
  /** The customer's words: "Parking at KLIA". */
  label: string;
  /** What the customer pays for it; minus to take a wrong charge off. */
  amountSen: number;
  /** What it adds to the trip's driver's pay: a reimbursement or overtime; 0 for nothing. */
  driverPaySen: number;
  reason: string | null;
};

/** The longest label a charge takes. */
export const CHARGE_LABEL_MAX = 80;

/**
 * Adds a charge to a booking: an add-on before or during a trip, or a
 * late charge after it (toll, parking, overtime), with what it adds to
 * the trip's driver's pay. Allowed while the booking is received,
 * confirmed, under way or completed; not once cancelled. A revision:
 * billing bills it.
 */
export function addCharge(
  actor: Actor,
  bookingId: string,
  input: AddChargeInput,
  now: Date = new Date(),
): Promise<BookingChange> {
  const label = input.label.trim();
  if (label === "" || label.length > CHARGE_LABEL_MAX) {
    return Promise.resolve(
      refuse(
        `Say what the charge is for, in up to ${CHARGE_LABEL_MAX} characters.`,
        "label",
      ),
    );
  }
  if (!Number.isInteger(input.amountSen) || input.amountSen === 0) {
    return Promise.resolve(refuse("Enter the amount in RM.", "amount"));
  }
  if (!Number.isInteger(input.driverPaySen) || input.driverPaySen < 0) {
    return Promise.resolve(
      refuse("Enter the driver's pay in RM, or 0.", "driverPay"),
    );
  }
  if (input.driverPaySen > 0 && input.itemId === null) {
    return Promise.resolve(
      refuse("Choose the trip whose driver is paid.", "itemId"),
    );
  }
  return db.$transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: {
        status: true,
        priceTotalSen: true,
        items: { select: { id: true, position: true } },
      },
    });
    if (!booking) return refuse(GONE_BOOKING);
    const cancelled = refuseCancelled(booking.status);
    if (cancelled) return cancelled;
    const trip = input.itemId
      ? booking.items.find((i) => i.id === input.itemId)
      : null;
    if (input.itemId && !trip) return refuse(GONE_ITEM);
    if (booking.priceTotalSen + input.amountSen < 0) {
      return refuse(
        "A charge cannot take the booking below nothing.",
        "amount",
      );
    }
    const revision = await openRevision(
      tx,
      actor,
      bookingId,
      {
        kind: input.kind,
        summary: `${label}${trip ? ` (${tripName(trip.position).toLowerCase()})` : ""}`,
        reason: input.reason,
      },
      now,
    );
    await tx.bookingCharge.create({
      data: {
        bookingId,
        itemId: input.itemId,
        revisionId: revision.id,
        label,
        amountSen: input.amountSen,
      },
    });
    if (input.driverPaySen > 0 && input.itemId) {
      await tx.itemPayLine.create({
        data: {
          itemId: input.itemId,
          role: "driver",
          revisionId: revision.id,
          amountSen: input.driverPaySen,
          reason: label,
        },
      });
    }
    await logActivity(tx, actor, {
      action: "booking.charge.added",
      entityId: bookingId,
      after: {
        kind: input.kind,
        label,
        amountSen: input.amountSen,
        ...(trip ? { position: trip.position } : {}),
        ...(input.driverPaySen > 0 ? { driverPaySen: input.driverPaySen } : {}),
      },
    });
    return {
      ok: true,
      ...(await refreshBooking(tx, actor, bookingId, null, now, revision)),
    };
  });
}

/** Cancels every open item, keeps the fee, refreshes the booking and logs the one action. */
async function cancelAllItems(
  tx: Prisma.TransactionClient,
  actor: Actor,
  booking: { id: string; status: string },
  by: Canceller,
  now: Date,
  fee: CancelFee,
) {
  await tx.bookingItem.updateMany({
    where: {
      bookingId: booking.id,
      status: { notIn: ["cancelled", "completed"] },
    },
    data: { status: "cancelled", cancelledAt: now },
  });
  const revision = await openRevision(
    tx,
    actor,
    booking.id,
    {
      kind: "cancel",
      summary: [
        by === "customer" ? "Cancelled by the customer" : "Booking cancelled",
        fee ? `fee ${formatMyr(fee.amountSen)}` : null,
      ]
        .filter(Boolean)
        .join(", "),
      reason: fee?.reason ?? null,
    },
    now,
  );
  await keepFee(tx, booking.id, null, revision, fee);
  const refreshed = await refreshBooking(
    tx,
    actor,
    booking.id,
    by,
    now,
    revision,
  );
  await logActivity(tx, actor, {
    action: "booking.cancelled",
    entityId: booking.id,
    before: { status: booking.status },
    after: { status: refreshed.booking.status },
  });
  return refreshed;
}

/** Admin cancels the whole booking, keeping a fee or none. Completed items stay completed. */
export function cancelBookingAsAdmin(
  actor: Actor,
  bookingId: string,
  fee: CancelFee = null,
  now: Date = new Date(),
): Promise<BookingChange> {
  const badFee = feeRefusal(fee);
  if (badFee) return Promise.resolve(badFee);
  return db.$transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await tx.booking.findUnique({ where: { id: bookingId } });
    if (!booking) return refuse(GONE_BOOKING);
    if (booking.status === "cancelled" || booking.status === "completed") {
      return refuse(
        `Booking is already ${booking.status}. Reload the booking.`,
      );
    }
    return {
      ok: true,
      ...(await cancelAllItems(tx, actor, booking, "admin", now, fee)),
    };
  });
}

/**
 * The customer cancels their own booking, by its number: all or nothing,
 * only while it is received or confirmed, and only before the deadline
 * its items' cutoffs set. No fee: one is only kept by staff.
 */
export function cancelBookingAsCustomer(
  customer: CustomerActor,
  ref: BookingRef,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const found = await tx.booking.findFirst({
      where: { ...bookingWhereOf(ref), userId: customer.userId },
      select: { id: true },
    });
    if (!found) return refuse(GONE_BOOKING);
    await lockBooking(tx, found.id);
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: found.id },
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
    const allowed = checkCustomerCancel(booking, now);
    if (!allowed.ok) return refuse(allowed.message);
    return {
      ok: true,
      ...(await cancelAllItems(tx, customer, booking, "customer", now, null)),
    };
  });
}

/**
 * The customer cancels one trip of their own booking, keeping the rest:
 * only while the trip is not yet done or cancelled, and only before its
 * own deadline. The last live trip cancelled cancels the booking. See
 * docs/261027-multi-trip-booking.md.
 */
export function cancelTripAsCustomer(
  customer: CustomerActor,
  ref: BookingRef,
  itemId: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const found = await tx.bookingItem.findFirst({
      where: {
        id: itemId,
        booking: { ...bookingWhereOf(ref), userId: customer.userId },
      },
      select: { id: true },
    });
    if (!found) return refuse(GONE_ITEM);
    const item = await lockedItem(tx, found.id);
    if (!item) return refuse(GONE_ITEM);
    const allowed = checkCustomerTripCancel(item, now);
    if (!allowed.ok) return refuse(allowed.message);
    await tx.bookingItem.update({
      where: { id: item.id },
      data: { status: "cancelled", cancelledAt: now },
    });
    await logActivity(tx, customer, {
      action: ITEM_ACTIONS.cancelled,
      entityId: item.bookingId,
      before: { position: item.position, status: item.status },
      after: { position: item.position, status: "cancelled" },
    });
    const revision = await openRevision(
      tx,
      customer,
      item.bookingId,
      {
        kind: "cancel",
        summary: `${tripName(item.position)} cancelled by the customer`,
      },
      now,
    );
    return {
      ok: true,
      ...(await refreshBooking(
        tx,
        customer,
        item.bookingId,
        "customer",
        now,
        revision,
      )),
    };
  });
}

/**
 * Takes off the cancellation fees still kept on these trips, or on the
 * booking itself (null), as one minus charge each, of the revision: the
 * charges stay as they were, so every revision reads as it was.
 */
async function takeOffFees(
  tx: Prisma.TransactionClient,
  bookingId: string,
  itemIds: readonly (string | null)[],
  revision: OpenRevision,
) {
  const charges = await tx.bookingCharge.findMany({
    where: { bookingId, label: { in: [FEE_LABEL, FEE_OFF_LABEL] } },
    select: { itemId: true, amountSen: true },
  });
  for (const itemId of itemIds) {
    const kept = charges
      .filter((c) => c.itemId === itemId)
      .reduce((sum, c) => sum + c.amountSen, 0);
    if (kept <= 0) continue;
    await tx.bookingCharge.create({
      data: {
        bookingId,
        itemId,
        revisionId: revision.id,
        label: FEE_OFF_LABEL,
        amountSen: -kept,
      },
    });
  }
}

/**
 * Puts cancelled trips back: confirmed when they were, else received,
 * with no vehicle or driver. What was left assigned to them, kept only to
 * be paid for the late cancel, is let go, so Operation assigns them again.
 */
async function putBackTrips(
  tx: Prisma.TransactionClient,
  actor: Actor,
  bookingId: string,
  items: readonly { id: string; position: number; confirmedAt: Date | null }[],
  now: Date,
) {
  for (const item of items) {
    const status: ItemStatus = item.confirmedAt ? "confirmed" : "received";
    await tx.bookingItem.update({
      where: { id: item.id },
      data: { status, cancelledAt: null },
    });
    await logActivity(tx, actor, {
      action: "booking.item.reinstated",
      entityId: bookingId,
      before: { position: item.position, status: "cancelled" },
      after: { position: item.position, status },
    });
  }
  await releaseParts(
    tx,
    actor,
    { itemId: { in: items.map((i) => i.id) } },
    "released",
    now,
    "Reinstated: assign it again",
  );
}

/**
 * Staff undo the cancel of one trip of a live booking: it goes back as it
 * was before (`putBackTrips`), its fee taken off. A revision; billing
 * follows, a credit note issued already staying as it is. A cancelled
 * booking is reinstated whole (`reinstateBooking`).
 */
export function reinstateItem(
  actor: Actor,
  itemId: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    const item = await lockedItem(tx, itemId);
    if (!item) return refuse(GONE_ITEM);
    if (item.booking.status === "cancelled") {
      return refuse(
        "The whole booking is cancelled. Reinstate the booking instead.",
      );
    }
    if (item.status !== "cancelled") {
      return refuse(`Trip is ${item.status} now. Reload the booking.`);
    }
    const revision = await openRevision(
      tx,
      actor,
      item.bookingId,
      { kind: "reinstate", summary: `${tripName(item.position)} reinstated` },
      now,
    );
    await takeOffFees(tx, item.bookingId, [item.id], revision);
    await putBackTrips(tx, actor, item.bookingId, [item], now);
    return {
      ok: true,
      ...(await refreshBooking(tx, actor, item.bookingId, null, now, revision)),
    };
  });
}

/**
 * Staff undo a booking's cancel: the trips cancelled with it go back as
 * they were before (`putBackTrips`), a trip cancelled on its own before
 * stays cancelled, and the cancellation fees are taken off. A revision;
 * billing follows, a credit note issued already staying as it is, what it
 * charges again going on its open invoice.
 */
export function reinstateBooking(
  actor: Actor,
  bookingId: string,
  now: Date = new Date(),
): Promise<BookingChange> {
  return db.$transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: {
          where: { status: "cancelled" },
          select: {
            id: true,
            position: true,
            confirmedAt: true,
            cancelledAt: true,
          },
        },
      },
    });
    if (!booking) return refuse(GONE_BOOKING);
    if (booking.status !== "cancelled") {
      return refuse(`Booking is ${booking.status} now. Reload the booking.`);
    }
    const cancelledAt = booking.cancelledAt?.getTime() ?? null;
    const withIt = booking.items.filter(
      (i) => cancelledAt === null || i.cancelledAt?.getTime() === cancelledAt,
    );
    if (withIt.length === 0) {
      return refuse("No trip was cancelled with the booking to put back.");
    }
    const revision = await openRevision(
      tx,
      actor,
      bookingId,
      { kind: "reinstate", summary: "Booking reinstated" },
      now,
    );
    await takeOffFees(
      tx,
      bookingId,
      [null, ...withIt.map((i) => i.id)],
      revision,
    );
    await putBackTrips(tx, actor, bookingId, withIt, now);
    await tx.booking.update({
      where: { id: bookingId },
      data: { cancelledAt: null, cancelledBy: null },
    });
    await logActivity(tx, actor, {
      action: "booking.reinstated",
      entityId: bookingId,
      before: { status: "cancelled" },
      after: { trips: withIt.length },
    });
    return {
      ok: true,
      ...(await refreshBooking(tx, actor, bookingId, null, now, revision)),
    };
  });
}

/**
 * Changes who a booking is for, as staff correct it: the name, the phone
 * and the email the booking's emails go to, checked by `parseContact`.
 * The account a booking shows under is left as it is. Not a revision:
 * nothing we deliver or charge changes. Its open invoice is billed to the
 * new details at once; an invoice issued already keeps who it was billed
 * to, for Finance to void and reissue. Saving what is already there logs
 * nothing.
 */
export function updateBookingContact(
  actor: Actor,
  bookingId: string,
  contact: ContactFields,
  now: Date = new Date(),
): Promise<Change> {
  return db.$transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { contactName: true, contactPhone: true, contactEmail: true },
    });
    if (!booking) return refuse(GONE_BOOKING);
    const changed = changedFields<ContactFields>(
      { ...booking, contactEmail: booking.contactEmail ?? "" },
      contact,
    );
    if (!changed) return { ok: true };
    await tx.booking.update({ where: { id: bookingId }, data: changed.after });
    await logActivity(tx, actor, {
      action: "booking.contact.updated",
      entityId: bookingId,
      before: changed.before,
      after: changed.after,
    });
    await settleBilling(tx, actor, bookingId, now);
    return { ok: true };
  });
}

/**
 * Corrects the agent a booking came through, or makes it direct (null).
 * Billing follows the new one at once: its open invoice is billed to it,
 * or gives way to the run when the agent is on credit. An invoice issued
 * already keeps who it was billed to, for Finance to void and reissue.
 * Not a revision.
 */
export function setBookingBusiness(
  actor: Actor,
  bookingId: string,
  businessId: string | null,
  now: Date = new Date(),
): Promise<Change> {
  return db.$transaction(async (tx) => {
    await lockBooking(tx, bookingId);
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { businessId: true, business: { select: { name: true } } },
    });
    if (!booking) return refuse(GONE_BOOKING);
    if (booking.businessId === businessId) return { ok: true };
    let name: string | null = null;
    if (businessId !== null) {
      const bookable = await checkBookableBusiness(tx, businessId);
      if (!bookable.ok) return bookable;
      name =
        (
          await tx.business.findUnique({
            where: { id: businessId },
            select: { name: true },
          })
        )?.name ?? null;
    }
    await tx.booking.update({ where: { id: bookingId }, data: { businessId } });
    await logActivity(tx, actor, {
      action: "booking.business.changed",
      entityId: bookingId,
      before: { agent: booking.business?.name ?? null },
      after: { agent: name },
    });
    await settleBilling(tx, actor, bookingId, now);
    return { ok: true };
  });
}

/**
 * Sets the booking's old invoice number, the old system's, or clears it:
 * a note for the team, apart from the booking's notes. It bills nothing
 * and changes no bill. Not a revision.
 */
export function setLegacyInvoiceNumber(
  actor: Actor,
  bookingId: string,
  value: string | null,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: { legacyInvoiceNumber: true },
    });
    if (!booking) return refuse(GONE_BOOKING);
    if (booking.legacyInvoiceNumber === value) return { ok: true };
    await tx.booking.update({
      where: { id: bookingId },
      data: { legacyInvoiceNumber: value },
    });
    await logActivity(tx, actor, {
      action: "booking.legacy.changed",
      entityId: bookingId,
      before: { legacyInvoiceNumber: booking.legacyInvoiceNumber },
      after: { legacyInvoiceNumber: value },
    });
    return { ok: true };
  });
}
