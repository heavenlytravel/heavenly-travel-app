import { logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change } from "./change";
import { db } from "./client";
import {
  DONE_DAYS,
  jobInclude,
  stopOf,
  tripOf,
  type DriverJob,
  type DriverTrip,
} from "./driver-jobs";
import {
  answerParts,
  heldJobs,
  jobOf,
  listCandidates,
  nameParts,
  type Candidate,
} from "./fulfilment";
import {
  PART_ROLES,
  timingWarnings,
  type DeclineReason,
  type PartRole,
} from "./fulfilment-rules";
import type { Prisma } from "./generated/prisma/client";
import { contactVisible } from "./trip-events-input";

/**
 * A vendor's work in Connect, for its owner and staff: the offers waiting
 * for the vendor's yes, with what we pay for each trip's vehicle and
 * driver, and the jobs it accepted. An offer shows only the trip; a job
 * accepted, what it needs, the customer's details until a few days after
 * the trip, each view logged. Never the customer's price. See
 * docs/261028-fulfilment-vendors-and-connect.md, "What people see in
 * Connect" and "Acceptance".
 */

const DAY_MS = 24 * 60 * 60 * 1000;

const vendorPartInclude = {
  ...jobInclude,
  vehicle: {
    select: {
      id: true,
      plate: true,
      vehicleModel: { select: { brand: true, name: true } },
    },
  },
  driver: { select: { id: true, name: true, userId: true } },
} satisfies Prisma.TripPartInclude;

type VendorPart = Prisma.TripPartGetPayload<{
  include: typeof vendorPartInclude;
}>;

/** One role an offer asks of the vendor, across the booking's trips. */
export type OfferRole = {
  role: PartRole;
  partIds: string[];
  /** The plate or the driver's name, once named; null while the vendor is to choose. */
  named: string | null;
  recordId: string | null;
  /** What we pay for it on each trip, by the trip's position. */
  costs: { position: number; costSen: number }[];
  /** The vendor's own vehicles or drivers to choose from, when not named; greyed ones say why. */
  choices: Candidate[];
};

/** An offer as the vendor answers it. */
export type VendorOfferView = {
  offerId: string;
  reference: string;
  respondBy: Date;
  trips: DriverTrip[];
  roles: OfferRole[];
  /** The timing warnings of what is named, seen before accepting. */
  warnings: string[];
  /** The member accepting is the driver named: one yes covers both. */
  ownDriving: boolean;
};

/** "VLE1234" or "Ali bin Abu", once named. */
function namedOf(part: VendorPart) {
  return part.vehicle?.plate ?? part.driver?.name ?? null;
}

/** The timing warnings of the records named on these parts, against their other jobs. */
async function warningsOf(parts: readonly VendorPart[]) {
  if (parts.length === 0) return [];
  const bookingId = parts[0]!.item.bookingId;
  const asked = [
    ...new Map(parts.map((p) => [p.itemId, jobOf(p.item)])).values(),
  ];
  const buffer = parts[0]!.item.location?.safetyBufferMinutes ?? 15;
  const warnings: string[] = [];
  const vehicle = parts.find((p) => p.vehicle)?.vehicle;
  const driver = parts.find((p) => p.driver)?.driver;
  if (vehicle) {
    const held = await heldJobs(db, { vehicleId: vehicle.id }, bookingId);
    warnings.push(
      ...timingWarnings(asked, held, {
        bufferMinutes: buffer,
        who: vehicle.plate,
      }),
    );
  }
  if (driver) {
    const held = await heldJobs(db, { driverId: driver.id }, bookingId);
    warnings.push(
      ...timingWarnings(asked, held, {
        bufferMinutes: buffer,
        who: driver.name.split(" ")[0] ?? driver.name,
      }),
    );
  }
  return warnings;
}

/** The parts of the vendor's open offers it has not accepted, by offer. */
async function openParts(vendorId: string, offerId?: string) {
  const parts = await db.tripPart.findMany({
    where: {
      vendorAcceptedAt: null,
      offer: {
        vendorId,
        status: "offered",
        ...(offerId ? { id: offerId } : {}),
      },
      item: { status: { in: ["confirmed", "assigned"] } },
    },
    include: { ...vendorPartInclude, offer: { select: { respondBy: true } } },
    orderBy: { item: { startsAt: "asc" } },
  });
  const byOffer = new Map<string, typeof parts>();
  for (const part of parts) {
    byOffer.set(part.offerId, [...(byOffer.get(part.offerId) ?? []), part]);
  }
  return byOffer;
}

/**
 * The offers waiting for the vendor: each with its trips by area, what is
 * asked and what we pay, the vendor's records to choose from where it is
 * to choose, and the timing warnings of what is named. `userId` is the
 * member looking, a one-person vendor's own driving.
 */
export async function listVendorOffers(
  vendorId: string,
  userId: string,
): Promise<VendorOfferView[]> {
  const byOffer = await openParts(vendorId);
  const offers: VendorOfferView[] = [];
  for (const [offerId, parts] of byOffer) {
    const first = parts[0]!;
    const trips = [
      ...new Map(parts.map((p) => [p.itemId, tripOf(p)])).values(),
    ];
    const roles: OfferRole[] = [];
    for (const role of PART_ROLES) {
      const ofRole = parts.filter((p) => p.role === role);
      if (ofRole.length === 0) continue;
      const named = ofRole.find((p) => namedOf(p));
      roles.push({
        role,
        partIds: ofRole.map((p) => p.id),
        named: named ? namedOf(named) : null,
        recordId: named?.vehicleId ?? named?.driverId ?? null,
        costs: ofRole.map((p) => ({
          position: p.item.position,
          costSen: p.costSen,
        })),
        choices: named
          ? []
          : (await listCandidates(first.item.bookingId, role)).filter(
              (c) => c.vendor.id === vendorId,
            ),
      });
    }
    offers.push({
      offerId,
      reference: first.item.booking.reference,
      respondBy: first.offer.respondBy,
      trips,
      roles,
      warnings: await warningsOf(parts),
      ownDriving: parts.some(
        (p) => p.role === "driver" && p.driver?.userId === userId,
      ),
    });
  }
  return offers;
}

/**
 * The vendor names its vehicle or driver for a role an offer left to it.
 * The writer checks the record is the vendor's, in service, and free.
 */
export async function nameForVendor(
  actor: Actor,
  vendorId: string,
  offerId: string,
  role: PartRole,
  recordId: string,
): Promise<Change & { assigned?: string[] }> {
  const parts = (await openParts(vendorId, offerId)).get(offerId) ?? [];
  const ofRole = parts.filter((p) => p.role === role);
  if (ofRole.length === 0) {
    return refuse("This offer changed meanwhile. Reload the page.");
  }
  return nameParts(
    actor,
    ofRole.map((p) => p.id),
    recordId,
  );
}

/**
 * The vendor's answer to an offer: every part of it it holds, accepted or
 * declined together. Accepting needs each part named, and keeps the
 * timing warnings worked out again here. A member who is also the driver
 * named accepts their own driving with it.
 */
export async function answerAsVendor(
  actor: Actor & { userId: string },
  vendorId: string,
  offerId: string,
  answer:
    { accept: true } | { accept: false; reason: DeclineReason; note?: string },
): Promise<Change & { assigned?: string[] }> {
  const parts = (await openParts(vendorId, offerId)).get(offerId) ?? [];
  if (parts.length === 0) {
    return refuse("This offer changed meanwhile. Reload the page.");
  }
  if (answer.accept) {
    const unnamed = parts.find((p) => !namedOf(p));
    if (unnamed) {
      return refuse(`Choose the ${unnamed.role} first, then accept.`);
    }
  }
  return answerParts(actor, {
    partIds: parts.map((p) => p.id),
    as: "vendor",
    accept: answer.accept,
    recorded: false,
    ...(answer.accept
      ? {
          warningsSeen: await warningsOf(parts),
          driverToo: parts.some(
            (p) => p.role === "driver" && p.driver?.userId === actor.userId,
          ),
        }
      : { reason: answer.reason, note: answer.note }),
  });
}

/** One of the vendor's accepted trips, with whom it named. */
export type VendorTrip = DriverTrip & {
  vehicle: string | null;
  driver: string | null;
  /** The driver has accepted it. */
  driverAccepted: boolean;
};

/** The vendor's jobs: today's and those to come, and those done lately. */
export type VendorJobs = { coming: VendorTrip[]; done: VendorTrip[] };

/** The accepted trips of a vendor's offers, one per trip with its vehicle and driver when the vendor holds them. */
export async function listVendorJobs(
  vendorId: string,
  now: Date = new Date(),
): Promise<VendorJobs> {
  const parts = await db.tripPart.findMany({
    where: {
      vendorAcceptedAt: { not: null },
      offer: { vendorId },
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
    include: vendorPartInclude,
    orderBy: { item: { startsAt: "asc" } },
  });
  const trips = new Map<string, VendorTrip>();
  for (const part of parts) {
    const trip = trips.get(part.itemId) ?? {
      ...tripOf(part),
      vehicle: null,
      driver: null,
      driverAccepted: false,
    };
    if (part.role === "vehicle") trip.vehicle = part.vehicle?.plate ?? null;
    if (part.role === "driver") {
      trip.driver = part.driver?.name ?? null;
      trip.driverAccepted = part.driverAcceptedAt !== null;
    }
    trips.set(part.itemId, trip);
  }
  const jobs: VendorJobs = { coming: [], done: [] };
  for (const trip of trips.values()) {
    if (trip.status === "completed") jobs.done.unshift(trip);
    else jobs.coming.push(trip);
  }
  return jobs;
}

/** One of the vendor's jobs as its member opens it. */
export type VendorJob = DriverJob & {
  vehicle: string | null;
  driver: string | null;
};

/**
 * One job the vendor accepted, or null when it holds none of the trip.
 * The customer's details show until a few days after the trip, and the
 * view is logged, as PDPA asks.
 */
export async function getVendorJob(
  actor: Actor,
  vendor: { id: string; name: string },
  itemId: string,
  now: Date = new Date(),
): Promise<VendorJob | null> {
  const parts = await db.tripPart.findMany({
    where: {
      itemId,
      offer: { vendorId: vendor.id },
      vendorAcceptedAt: { not: null },
    },
    include: {
      ...vendorPartInclude,
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
              ...jobInclude.item.include.tripDetails.select,
              flightNumber: true,
              notes: true,
            },
          },
        },
      },
    },
  });
  const first = parts[0];
  if (!first) return null;
  const vehicle = parts.find((p) => p.role === "vehicle")?.vehicle?.plate;
  const driver = parts.find((p) => p.role === "driver")?.driver?.name;
  const trip = { ...tripOf(first), accepted: true };
  const shows =
    first.item.status !== "cancelled" && contactVisible(jobOf(first.item), now);
  const base = { ...trip, vehicle: vehicle ?? null, driver: driver ?? null };
  if (!shows) return { ...base, customer: null };
  const details = first.item.tripDetails;
  await db.$transaction((tx) =>
    logActivity(tx, actor, {
      action: "booking.contact.viewed",
      entityId: first.item.booking.id,
      after: { position: first.item.position, vendorName: vendor.name },
    }),
  );
  return {
    ...base,
    customer: {
      name: first.item.booking.contactName,
      phone: first.item.booking.contactPhone,
      pickup: stopOf(details?.pickupPlace),
      dropoff: stopOf(details?.dropoffPlace),
      flightNumber: details?.flightNumber ?? null,
      notes: details?.notes ?? null,
    },
  };
}
