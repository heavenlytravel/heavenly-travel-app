import { pickupInstant } from "./booking-rules";
import { todayInMalaysia } from "./expiry";
import { db } from "./client";
import {
  assignStateOf,
  rolesToAsk,
  tripWindow,
  type AssignState,
  type Job,
  type PartRole,
} from "./fulfilment-rules";
import { expireOffers, jobOf } from "./fulfilment";
import type { Prisma } from "./generated/prisma/client";
import { modelName } from "./vehicle-model-input";

/**
 * Operation's Assign page: every trip from today on, where it stands (to
 * assign, waiting to accept, assigned, on the road, done today), worked
 * out from its status and its parts, never stored; and the parts of ours
 * waiting for Operation's own yes. See
 * docs/261028-fulfilment-vendors-and-connect.md, "Assigning a booking".
 */

const tripInclude = {
  booking: {
    select: {
      id: true,
      reference: true,
      contactName: true,
      items: { select: { status: true } },
    },
  },
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
      hours: true,
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

/** One part of a trip: who, from whom, and what it waits for. */
export type AssignPart = {
  role: string;
  /** "VLE1234 · Toyota Alphard", "Ali bin Abu"; null while the vendor is to choose. */
  name: string | null;
  /** The vendor's name when it is not ours. */
  vendorName: string | null;
  /** What it waits for; null once settled. */
  waiting: "vendor" | "driver" | "name" | null;
};

/** A trip as the Assign page lists it. */
export type AssignRow = {
  itemId: string;
  bookingId: string;
  reference: string;
  /** The booking's customer, as booked. */
  customer: string;
  position: number;
  /** The booking's trips still live, for "Trip 2 of 3". */
  tripCount: number;
  startsAt: Date;
  state: AssignState;
  /** The roles it still needs asked for. */
  roles: PartRole[];
  job: Job;
  className: string;
  passengers: number;
  /** Hourly: the hours it runs; null for one-way. */
  hours: number | null;
  locationName: string | null;
  parts: AssignPart[];
  /** Assigned or on the road, and past its estimated end with no Dropped off yet. */
  overdue: boolean;
  /** The driver's last tap, and when; null before the first. */
  lastEvent: { kind: string; at: Date } | null;
};

/**
 * What the Assign page shows, at one location (its id) or every one: its
 * trips and our parts waiting for Operation's yes. Offers past their time
 * are expired once, first, so neither list shows one still offered.
 */
export async function getAssignPage(
  locationId?: string,
  now: Date = new Date(),
): Promise<{ rows: AssignRow[]; ours: OursToAccept[] }> {
  await expireOffers(now);
  const [rows, ours] = await Promise.all([
    listAssignTrips(locationId, now),
    listOursToAccept(locationId),
  ]);
  return { rows, ours };
}

/**
 * Every trip from the start of today in Malaysia on, by pickup: those
 * confirmed, to assign or waiting, the assigned ones, and those done
 * today. A trip whose driver has tapped in Connect is on the road.
 */
async function listAssignTrips(
  locationId: string | undefined,
  now: Date,
): Promise<AssignRow[]> {
  const from = pickupInstant(todayInMalaysia(now), "00:00") ?? now;
  const items = await db.bookingItem.findMany({
    where: {
      status: { in: ["confirmed", "assigned", "completed"] },
      startsAt: { gte: from },
      ...(locationId ? { locationId } : {}),
    },
    orderBy: [{ startsAt: "asc" }, { position: "asc" }],
    include: tripInclude,
  });
  return items.map((item) => {
    const job = jobOf(item);
    const lastEvent = item.events[0] ?? null;
    const state = assignStateOf({
      status: item.status,
      parts: item.parts,
      reported: lastEvent !== null,
    });
    return {
      itemId: item.id,
      bookingId: item.booking.id,
      reference: item.booking.reference,
      customer: item.booking.contactName,
      position: item.position,
      tripCount: item.booking.items.filter((i) => i.status !== "cancelled")
        .length,
      startsAt: item.startsAt,
      state,
      roles: rolesToAsk(item),
      job,
      className: item.tripDetails?.vehicleClassName ?? "",
      passengers: item.tripDetails?.passengers ?? 0,
      hours:
        item.tripDetails?.mode === "hourly"
          ? (item.tripDetails.hours ?? null)
          : null,
      locationName: item.location?.name ?? null,
      parts: item.parts.map((part): AssignPart => ({
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
        (state === "assigned" || state === "on-the-road") &&
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

/** Our parts not yet accepted for ours, soonest first. */
async function listOursToAccept(
  locationId: string | undefined,
): Promise<OursToAccept[]> {
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
