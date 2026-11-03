import { pickupInstant } from "./booking-rules";
import { todayInMalaysia } from "./expiry";
import { db } from "./client";
import {
  assignStateOf,
  rolesToAsk,
  tripWindow,
  type AssignState,
  type Job,
  partWaitingOf,
  type PartRole,
  type PartWaiting,
} from "./fulfilment-rules";
import { expireOffers, jobOf } from "./fulfilment";
import type { Prisma } from "./generated/prisma/client";
import { isOnTheRoad } from "./trip-events-input";
import { modelName } from "./vehicle-model-input";

/**
 * Operation's Assign page: every trip from today on, where it stands (to
 * assign, waiting to accept, assigned, on the road, done today), worked
 * out from its status and its parts, never stored, and who does it. See
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
      offer: {
        select: {
          respondBy: true,
          vendor: { select: { name: true, isOurs: true } },
        },
      },
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
    select: { kind: true, at: true },
  },
} satisfies Prisma.BookingItemInclude;

/** One part of a trip: who, from whom, and what it waits for. */
export type AssignPart = {
  role: string;
  /** "VLE1234 · Toyota Alphard", "Ali bin Abu"; null while not named. */
  name: string | null;
  vendorName: string;
  isOurs: boolean;
  /**
   * What it waits for, null once settled: its vendor's yes, Operation's
   * own for ours, the driver's, or the vehicle or driver named.
   */
  waiting: PartWaiting | null;
  /** When its vendor answers by, while it waits for that answer. */
  respondBy: Date | null;
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
  /** Where each role stands on its own, for the list by role. */
  roleStates: Record<PartRole, AssignState>;
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
 * What the Assign page lists, at one location (its id) or every one.
 * Offers past their time are expired first, so none shows still offered.
 */
export async function getAssignPage(
  locationId?: string,
  now: Date = new Date(),
): Promise<AssignRow[]> {
  await expireOffers(now);
  return listAssignTrips(locationId, now);
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
    const standing = {
      status: item.status,
      parts: item.parts,
      reported: isOnTheRoad(item.events),
    };
    const state = assignStateOf(standing);
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
      roleStates: {
        vehicle: assignStateOf(standing, "vehicle"),
        driver: assignStateOf(standing, "driver"),
      },
      roles: rolesToAsk(item),
      job,
      className: item.tripDetails?.vehicleClassName ?? "",
      passengers: item.tripDetails?.passengers ?? 0,
      hours:
        item.tripDetails?.mode === "hourly"
          ? (item.tripDetails.hours ?? null)
          : null,
      locationName: item.location?.name ?? null,
      parts: item.parts.map((part): AssignPart => {
        const vendorWaits = !part.vendorAcceptedAt;
        const { vendor } = part.offer;
        return {
          role: part.role,
          name: part.vehicle
            ? `${part.vehicle.plate} · ${modelName(part.vehicle.vehicleModel)}`
            : (part.driver?.name ?? null),
          vendorName: vendor.name,
          isOurs: vendor.isOurs,
          waiting: partWaitingOf(part, vendor.isOurs),
          respondBy: vendorWaits ? part.offer.respondBy : null,
        };
      }),
      overdue:
        (state === "assigned" || state === "on-the-road") &&
        tripWindow(job).end.getTime() < now.getTime(),
      lastEvent,
    };
  });
}
