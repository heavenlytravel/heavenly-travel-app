import { logActivity } from "./activity";
import { ITEM_ACTIONS, type Actor } from "./activity-actions";
import { bookingStatusOf } from "./booking-status";
import { refuse, type Change } from "./change";
import { db } from "./client";
import { answerParts, heldJobs, jobOf, tripInclude } from "./fulfilment";
import {
  DECLINE_REASONS,
  timingWarnings,
  type DeclineReason,
  type Job,
} from "./fulfilment-rules";
import type { Prisma } from "./generated/prisma/client";
import { isPlace, type Place } from "./place";
import { isUniqueViolation } from "./prisma-errors";
import {
  checkTripEvent,
  COMPLETING_EVENTS,
  contactVisible,
  placeArea,
  type TripEventInput,
  type TripEventKind,
} from "./trip-events-input";

/**
 * A driver's work in Connect: the offers waiting for their own yes, their
 * jobs, and their taps on the day. An offer shows only the trip: the day
 * and time, the areas, the class and the passengers; once accepted, the
 * job shows what it needs, the customer's name and phone, the exact places,
 * the flight and the notes, until a few days after the trip, and each view
 * of those is logged. Never the customer's price. See
 * docs/261028-fulfilment-vendors-and-connect.md, "What people see in
 * Connect" and "On the day".
 */

/** How long done jobs stay on a driver's list. */
export const DONE_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

export const jobInclude = {
  item: {
    include: {
      ...tripInclude,
      events: { orderBy: { at: "asc" } },
    },
  },
} satisfies Prisma.TripPartInclude;

export type JobPart = Prisma.TripPartGetPayload<{ include: typeof jobInclude }>;

/** A tap as the job shows it. */
export type TripEventView = {
  id: string;
  kind: string;
  at: Date;
  note: string | null;
};

/** A trip as a driver sees it before accepting, or on their list. */
export type DriverTrip = {
  itemId: string;
  partId: string;
  offerId: string;
  reference: string;
  position: number;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  className: string;
  passengers: number;
  /** "Kuah", "Pantai Cenang": the area, never the exact address. */
  pickupArea: string;
  dropoffArea: string | null;
  /** The driver has accepted it. */
  accepted: boolean;
  events: TripEventView[];
};

/** Trips of one booking the driver is asked for, answered together, with the timing warnings they see before accepting. */
export type DriverOffer = {
  offerId: string;
  reference: string;
  trips: DriverTrip[];
  warnings: string[];
};

/** The driver's screen: the offers, then the jobs accepted, today's, those to come and those done lately. */
export type DriverJobs = {
  offers: DriverOffer[];
  today: DriverTrip[];
  coming: DriverTrip[];
  done: DriverTrip[];
};

export function placeOf(value: unknown): Place | null {
  return isPlace(value) ? value : null;
}

export function tripOf(part: JobPart): DriverTrip {
  const details = part.item.tripDetails;
  const pickup = placeOf(details?.pickupPlace);
  const dropoff = placeOf(details?.dropoffPlace);
  return {
    itemId: part.itemId,
    partId: part.id,
    offerId: part.offerId,
    reference: part.item.booking.reference,
    position: part.item.position,
    status: part.item.status,
    startsAt: part.item.startsAt,
    endsAt: part.item.endsAt,
    className: details?.vehicleClassName ?? "",
    passengers: details?.passengers ?? 0,
    pickupArea: pickup ? placeArea(pickup) : "",
    dropoffArea: dropoff ? placeArea(dropoff) : null,
    accepted: part.driverAcceptedAt !== null,
    events: part.item.events.map(({ id, kind, at, note }) => ({
      id,
      kind,
      at,
      note,
    })),
  };
}

/** The day of an instant in Malaysia, "2026-11-03". */
function malaysianDay(instant: Date) {
  return instant.toLocaleDateString("en-CA", { timeZone: "Asia/Kuala_Lumpur" });
}

/** A driver's first name, for the warnings: "Ali". */
function firstName(name: string) {
  return name.split(" ")[0] ?? name;
}

/**
 * A driver's offers and jobs. An offer reaches the driver once their
 * vendor has accepted it; ours, at once. Done jobs stay a few days.
 */
export async function listDriverJobs(
  driver: { id: string; name: string },
  now: Date = new Date(),
): Promise<DriverJobs> {
  const parts = await db.tripPart.findMany({
    where: {
      driverId: driver.id,
      vendorAcceptedAt: { not: null },
      OR: [
        { item: { status: { in: ["confirmed", "assigned"] } } },
        {
          item: {
            status: "completed",
            startsAt: { gte: new Date(now.getTime() - DONE_DAYS * DAY_MS) },
          },
        },
      ],
    },
    include: jobInclude,
    orderBy: { item: { startsAt: "asc" } },
  });
  const today = malaysianDay(now);
  const jobs: DriverJobs = { offers: [], today: [], coming: [], done: [] };
  const offers = new Map<string, JobPart[]>();
  for (const part of parts) {
    const trip = tripOf(part);
    if (!trip.accepted) {
      offers.set(part.offerId, [...(offers.get(part.offerId) ?? []), part]);
    } else if (trip.status === "completed") jobs.done.unshift(trip);
    else if (malaysianDay(trip.startsAt) === today) jobs.today.push(trip);
    else jobs.coming.push(trip);
  }
  for (const [offerId, ofOffer] of offers) {
    const bookingId = ofOffer[0]!.item.bookingId;
    const held = await heldJobs(db, { driverId: driver.id }, bookingId);
    jobs.offers.push({
      offerId,
      reference: ofOffer[0]!.item.booking.reference,
      trips: ofOffer.map(tripOf),
      warnings: offerWarnings(
        ofOffer.map((p) => jobOf(p.item)),
        held,
        ofOffer[0]!.item.location?.safetyBufferMinutes ?? 15,
        driver.name,
      ),
    });
  }
  return jobs;
}

function offerWarnings(
  asked: readonly Job[],
  held: readonly Job[],
  bufferMinutes: number,
  name: string,
) {
  return timingWarnings(asked, held, { bufferMinutes, who: firstName(name) });
}

/** An exact place of a job, once accepted: what it is called, where, and its point to navigate to. */
export type JobStop = Pick<Place, "label" | "address" | "lat" | "lng">;

/** A booked place as the job shows it, or null when none was kept. */
export function stopOf(value: unknown): JobStop | null {
  const place = placeOf(value);
  return place
    ? {
        label: place.label,
        address: place.address,
        lat: place.lat,
        lng: place.lng,
      }
    : null;
}

/** One job as the driver opens it: the trip, its taps, and the customer's details while they may see them. */
export type DriverJob = DriverTrip & {
  /** Null before the driver accepted, and from a few days after the trip. */
  customer: {
    name: string;
    phone: string;
    pickup: JobStop | null;
    dropoff: JobStop | null;
    flightNumber: string | null;
    notes: string | null;
  } | null;
};

/**
 * One job of the driver's, or null when it is not theirs. Showing the
 * customer's details logs the view, as PDPA asks.
 */
export async function getDriverJob(
  actor: Actor,
  driver: { id: string; name: string },
  itemId: string,
  now: Date = new Date(),
): Promise<DriverJob | null> {
  const part = await db.tripPart.findFirst({
    where: { itemId, driverId: driver.id, vendorAcceptedAt: { not: null } },
    include: {
      item: {
        include: {
          ...jobInclude.item.include,
          booking: {
            select: {
              id: true,
              reference: true,
              contactName: true,
              contactPhone: true,
            },
          },
          tripDetails: {
            select: {
              ...tripInclude.tripDetails.select,
              flightNumber: true,
              notes: true,
            },
          },
        },
      },
    },
  });
  if (!part) return null;
  const trip = tripOf(part);
  const job = jobOf(part.item);
  const shows =
    trip.accepted &&
    part.item.status !== "cancelled" &&
    contactVisible(job, now);
  if (!shows) return { ...trip, customer: null };
  const details = part.item.tripDetails;
  await db.$transaction((tx) =>
    logActivity(tx, actor, {
      action: "booking.contact.viewed",
      entityId: part.item.booking.id,
      after: { position: part.item.position, driverName: driver.name },
    }),
  );
  return {
    ...trip,
    customer: {
      name: part.item.booking.contactName,
      phone: part.item.booking.contactPhone,
      pickup: stopOf(details?.pickupPlace),
      dropoff: stopOf(details?.dropoffPlace),
      flightNumber: details?.flightNumber ?? null,
      notes: details?.notes ?? null,
    },
  };
}

/**
 * The driver's answer to an offer: every trip of it they are asked for,
 * accepted or declined together. Accepting keeps the timing warnings they
 * were shown, worked out again here.
 */
export async function answerAsDriver(
  actor: Actor,
  driver: { id: string; name: string },
  offerId: string,
  answer:
    { accept: true } | { accept: false; reason: DeclineReason; note?: string },
): Promise<Change & { assigned?: string[] }> {
  const parts = await db.tripPart.findMany({
    where: {
      offerId,
      driverId: driver.id,
      role: "driver",
      driverAcceptedAt: null,
      vendorAcceptedAt: { not: null },
    },
    include: { item: { include: tripInclude } },
  });
  if (parts.length === 0) {
    return refuse("This offer changed meanwhile. Reload the page.");
  }
  if (!answer.accept && !DECLINE_REASONS.includes(answer.reason)) {
    return refuse("Choose why.", "reason");
  }
  const warnings = answer.accept
    ? offerWarnings(
        parts.map((p) => jobOf(p.item)),
        await heldJobs(db, { driverId: driver.id }, parts[0]!.item.bookingId),
        parts[0]!.item.location?.safetyBufferMinutes ?? 15,
        driver.name,
      )
    : [];
  return answerParts(actor, {
    partIds: parts.map((p) => p.id),
    as: "driver",
    accept: answer.accept,
    recorded: false,
    ...(answer.accept
      ? { warningsSeen: warnings }
      : { reason: answer.reason, note: answer.note }),
  });
}

/** Who taps: the trip's accepted driver, or Operation for them. */
export type Reporter =
  { driver: { id: string; name: string } } | { admin: true };

/**
 * Keeps one tap. Only the trip's driver, once they accepted it, or
 * Operation on their behalf; never on a cancelled trip. A tap sent again
 * with the same id from the phone is kept once and answers ok. Dropped
 * off and no-show complete the trip. The order of the steps is suggested,
 * not enforced.
 */
export async function reportTripEvent(
  actor: Actor,
  reporter: Reporter,
  input: TripEventInput,
  now: Date = new Date(),
): Promise<Change> {
  const check = checkTripEvent(input, now);
  if (!check.ok) return check;
  const seen = await db.tripEvent.findUnique({
    where: { clientId: input.clientId },
    select: { itemId: true },
  });
  if (seen)
    return seen.itemId === input.itemId
      ? { ok: true }
      : refuse("This tap did not arrive whole. Tap again.");
  try {
    return await db.$transaction(async (tx) => {
      const item = await tx.bookingItem.findUnique({
        where: { id: input.itemId },
        include: {
          parts: {
            where: { role: "driver" },
            select: {
              driverId: true,
              driverAcceptedAt: true,
              driver: { select: { name: true } },
            },
          },
        },
      });
      if (!item) return refuse("This trip is no longer on the booking.");
      const part = item.parts[0];
      if ("driver" in reporter) {
        if (part?.driverId !== reporter.driver.id || !part.driverAcceptedAt) {
          return refuse("This trip is not yours. Call Operation.");
        }
      }
      if (item.status === "cancelled") {
        return refuse("This trip was cancelled. Call Operation.");
      }
      await tx.tripEvent.create({
        data: {
          itemId: item.id,
          driverId: part?.driverId ?? null,
          actorId: "userId" in actor ? actor.userId : null,
          kind: input.kind,
          at: input.at,
          note: input.note?.trim() || null,
          clientId: input.clientId,
        },
      });
      await logActivity(tx, actor, {
        action: "booking.trip.reported",
        entityId: item.bookingId,
        after: {
          position: item.position,
          kind: input.kind,
          at: input.at.toISOString(),
          ...(input.note?.trim() ? { note: input.note.trim() } : {}),
          driverName: part?.driver?.name ?? null,
        },
      });
      if (
        COMPLETING_EVENTS.includes(input.kind as TripEventKind) &&
        item.status !== "completed"
      ) {
        await tx.bookingItem.update({
          where: { id: item.id },
          data: { status: "completed" },
        });
        await logActivity(tx, actor, {
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
      }
      return { ok: true };
    });
  } catch (error) {
    // The same tap, sent twice at once: the other one kept it.
    if (isUniqueViolation(error, "clientId")) return { ok: true };
    throw error;
  }
}

/** A trip's taps, in order, for the admin's booking page. */
export function listTripEvents(itemIds: readonly string[]) {
  return db.tripEvent.findMany({
    where: { itemId: { in: [...itemIds] } },
    orderBy: { at: "asc" },
    select: { id: true, itemId: true, kind: true, at: true, note: true },
  });
}
