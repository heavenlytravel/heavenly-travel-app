import { pickupInstant } from "./booking-rules";
import { db } from "./client";
import {
  boardColumnOf,
  tripWindow,
  type BoardColumn,
  type Job,
} from "./fulfilment-rules";
import { expireOffers, jobOf } from "./fulfilment";
import type { Prisma } from "./generated/prisma/client";
import { modelName } from "./vehicle-model-input";

/**
 * Operation's board: a day's trips in the columns they stand in, worked
 * out from their status and their parts, never stored; and the parts of
 * ours waiting for Operation's own yes. For watching: a card moves when
 * someone acts, never by a drag. See
 * docs/261028-fulfilment-vendors-and-connect.md, "The booking's life".
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const boardInclude = {
  booking: { select: { id: true, reference: true } },
  tripDetails: {
    select: {
      vehicleClassId: true,
      vehicleClassName: true,
      pickupPlace: true,
      dropoffPlace: true,
      driveMinutes: true,
      distanceKm: true,
      passengers: true,
      mode: true,
    },
  },
  location: { select: { id: true, name: true, safetyBufferMinutes: true } },
  parts: {
    select: {
      role: true,
      vehicleId: true,
      driverId: true,
      vendorAcceptedAt: true,
      driverAcceptedAt: true,
      offer: { select: { vendor: { select: { name: true, isOurs: true } } } },
      vehicle: {
        select: {
          plate: true,
          vehicleModel: { select: { brand: true, name: true } },
        },
      },
      driver: { select: { name: true } },
    },
  },
  events: {
    orderBy: { at: "desc" },
    take: 1,
    select: { kind: true, at: true },
  },
} satisfies Prisma.BookingItemInclude;

/** One part of a card: who, from whom, and what it waits for. */
export type BoardPart = {
  role: string;
  /** "VLE1234 · Toyota Alphard", "Ali bin Abu"; null while the vendor is to choose. */
  name: string | null;
  /** The vendor's name when it is not ours. */
  vendorName: string | null;
  /** What it waits for; null once settled. */
  waiting: "vendor" | "driver" | "name" | null;
};

/** A trip as a card on the board. */
export type BoardCard = {
  itemId: string;
  bookingId: string;
  reference: string;
  position: number;
  column: BoardColumn;
  job: Job;
  className: string;
  passengers: number;
  locationName: string | null;
  parts: BoardPart[];
  /** Assigned or on the road, and past its estimated end with no Dropped off yet. */
  overdue: boolean;
  /** The driver's last tap, and when; null before the first. */
  lastEvent: { kind: string; at: Date } | null;
};

/** The instants a day in Malaysia runs between: "2026-11-03". Null for a day that is not one. */
export function boardDayRange(day: string) {
  const start = pickupInstant(day, "00:00");
  return start ? { start, end: new Date(start.getTime() + DAY_MS) } : null;
}

/**
 * The cards of a day's trips, at one location or every one, by pickup:
 * the confirmed ones to assign or waiting, the assigned ones, and those
 * done that day. Offers past their time are expired first. A trip whose
 * driver has tapped in Connect is on the road.
 */
export async function listBoard(
  day: string,
  locationId?: string,
  now: Date = new Date(),
): Promise<BoardCard[]> {
  const range = boardDayRange(day);
  if (!range) return [];
  await expireOffers(now);
  const items = await db.bookingItem.findMany({
    where: {
      status: { in: ["confirmed", "assigned", "completed"] },
      startsAt: { gte: range.start, lt: range.end },
      ...(locationId ? { locationId } : {}),
    },
    orderBy: [{ startsAt: "asc" }, { position: "asc" }],
    include: boardInclude,
  });
  return items.map((item) => {
    const job = jobOf(item);
    const lastEvent = item.events[0] ?? null;
    const reported = lastEvent !== null;
    const column = boardColumnOf({
      status: item.status,
      parts: item.parts,
      reported,
    });
    return {
      itemId: item.id,
      bookingId: item.booking.id,
      reference: item.booking.reference,
      position: item.position,
      column,
      job,
      className: item.tripDetails?.vehicleClassName ?? "",
      passengers: item.tripDetails?.passengers ?? 0,
      locationName: item.location?.name ?? null,
      parts: item.parts.map((part): BoardPart => ({
        role: part.role,
        name: part.vehicle
          ? `${part.vehicle.plate} · ${modelName(part.vehicle.vehicleModel)}`
          : (part.driver?.name ?? null),
        vendorName: part.offer.vendor.isOurs ? null : part.offer.vendor.name,
        waiting: (part.role === "vehicle" ? !part.vehicleId : !part.driverId)
          ? "name"
          : !part.vendorAcceptedAt
            ? "vendor"
            : part.role === "driver" && !part.driverAcceptedAt
              ? "driver"
              : null,
      })),
      overdue:
        (column === "assigned" || column === "on-the-road") &&
        tripWindow(job).end.getTime() < now.getTime(),
      lastEvent,
    };
  });
}

/** A part of ours waiting for Operation's yes: our vehicle not yet accepted. */
export type OursToAccept = {
  bookingId: string;
  reference: string;
  position: number;
  startsAt: Date;
  role: string;
  /** The vehicle's plate, or the driver's name; null while not named. */
  name: string | null;
};

/** Our parts not yet accepted for ours, soonest first; at one location (its id) or every one. */
export async function listOursToAccept(
  locationId?: string,
): Promise<OursToAccept[]> {
  await expireOffers();
  const parts = await db.tripPart.findMany({
    where: {
      vendorAcceptedAt: null,
      offer: { vendor: { isOurs: true } },
      item: {
        status: { in: ["confirmed", "assigned"] },
        ...(locationId ? { locationId } : {}),
      },
    },
    orderBy: { item: { startsAt: "asc" } },
    select: {
      role: true,
      vehicle: { select: { plate: true } },
      driver: { select: { name: true } },
      item: {
        select: {
          position: true,
          startsAt: true,
          booking: { select: { id: true, reference: true } },
        },
      },
    },
  });
  return parts.map((part) => ({
    bookingId: part.item.booking.id,
    reference: part.item.booking.reference,
    position: part.item.position,
    startsAt: part.item.startsAt,
    role: part.role,
    name: part.vehicle?.plate ?? part.driver?.name ?? null,
  }));
}
