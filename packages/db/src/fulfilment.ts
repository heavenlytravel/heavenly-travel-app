import { logActivity } from "./activity";
import { ITEM_ACTIONS, type Actor } from "./activity-actions";
import { bookingStatusOf, isLive } from "./booking-status";
import { refuse, type Change, type Refusal } from "./change";
import { db } from "./client";
import { DRIVER_DOCUMENTS, DRIVER_DOCUMENT_LABELS } from "./driver-input";
import { dayOf, todayInMalaysia } from "./expiry";
import {
  clashSentence,
  DECLINE_NOTE_MAX_LENGTH,
  DECLINE_REASON_LABELS,
  defaultRespondBy,
  firstClash,
  isDeclineReason,
  owesAfterCancel,
  timingWarnings,
  tripAssigned,
  type DeclineReason,
  type Job,
  type PartRole,
} from "./fulfilment-rules";
import type { Prisma } from "./generated/prisma/client";
import { isPlace } from "./place";
import { VEHICLE_DOCUMENTS, VEHICLE_DOCUMENT_LABELS } from "./vehicle-input";
import { modelName } from "./vehicle-model-input";

/**
 * Who does each trip: Operation asks a vendor for a vehicle, a driver or
 * both for a booking (`VendorOffer`), one part per trip and role
 * (`TripPart`), and each one's owner accepts. A trip is assigned once its
 * vehicle and its driver are named and accepted; a decline, no answer in
 * time, a back-out or a release reopens that part alone. The writers take
 * the actor and log against the booking inside their transaction, and set
 * the trips' status from their parts (`settleTrips`). See
 * docs/261028-fulfilment-vendors-and-connect.md.
 */

/** A live trip with what fulfilment reads of it. */
export const tripInclude = {
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
} satisfies Prisma.BookingItemInclude;

type TripRow = Prisma.BookingItemGetPayload<{ include: typeof tripInclude }>;

/** A trip as a job: its times and its two ends. */
export function jobOf(trip: TripRow): Job {
  const details = trip.tripDetails;
  const pickup = isPlace(details?.pickupPlace) ? details.pickupPlace : null;
  const dropoff = isPlace(details?.dropoffPlace) ? details.dropoffPlace : null;
  const end = (place: { label: string; lng: number; lat: number }) => ({
    label: place.label,
    at: [place.lng, place.lat] as [number, number],
  });
  return {
    reference: trip.booking.reference,
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    driveMinutes: details?.driveMinutes ?? null,
    distanceKm: details?.distanceKm ?? null,
    pickup: pickup ? end(pickup) : { label: "the pickup", at: [0, 0] },
    dropoff: dropoff ? end(dropoff) : null,
  };
}

/** The trips a vehicle or a driver holds besides `exceptBookingId`'s: live, not done. */
export async function heldJobs(
  client: Prisma.TransactionClient,
  where: { vehicleId: string } | { driverId: string },
  exceptBookingId: string,
): Promise<Job[]> {
  const parts = await client.tripPart.findMany({
    where: {
      ...where,
      item: {
        status: { in: ["received", "confirmed", "assigned"] },
        bookingId: { not: exceptBookingId },
      },
    },
    select: { item: { include: tripInclude } },
  });
  return parts.map((p) => jobOf(p.item));
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const partInclude = {
  offer: {
    select: {
      id: true,
      status: true,
      respondBy: true,
      vendor: { select: { id: true, name: true, isOurs: true } },
    },
  },
  vehicle: {
    select: {
      id: true,
      plate: true,
      colour: true,
      vehicleModel: { select: { brand: true, name: true } },
    },
  },
  driver: {
    select: { id: true, name: true, phone: true, userId: true },
  },
} satisfies Prisma.TripPartInclude;

/** A part with its offer, its vendor and whom it names. */
export type TripPartView = Prisma.TripPartGetPayload<{
  include: typeof partInclude;
}>;

/** One trip of a booking as the assign panel shows it. */
export type FulfilmentTrip = {
  id: string;
  position: number;
  status: string;
  startsAt: Date;
  endsAt: Date | null;
  cancelledAt: Date | null;
  cancellationCutoffHours: number;
  vehicleClassId: string | null;
  job: Job;
  parts: TripPartView[];
  assigned: boolean;
};

/** A booking's trips with who does each, for its page and the assign panel. */
export async function getBookingFulfilment(
  bookingId: string,
): Promise<FulfilmentTrip[]> {
  await expireOffers();
  const items = await db.bookingItem.findMany({
    where: { bookingId },
    orderBy: { position: "asc" },
    include: { ...tripInclude, parts: { include: partInclude } },
  });
  return items.map((item) => ({
    id: item.id,
    position: item.position,
    status: item.status,
    startsAt: item.startsAt,
    endsAt: item.endsAt,
    cancelledAt: item.cancelledAt,
    cancellationCutoffHours: item.cancellationCutoffHours,
    vehicleClassId: item.tripDetails?.vehicleClassId ?? null,
    job: jobOf(item),
    parts: item.parts,
    assigned: tripAssigned(item.parts),
  }));
}

/** A vehicle or a driver the picker lists, and why it cannot be used, if so. */
export type Candidate = {
  id: string;
  /** "VLE1234 · Toyota Alphard", "Ali bin Abu". */
  name: string;
  vendor: { id: string; name: string; isOurs: boolean };
  locationName: string;
  /** Why it cannot be used, a few words each; empty when it can. */
  reasons: string[];
  /** Estimates that do not refuse it: the drive between jobs. */
  warnings: string[];
  /** Its other jobs on the trips' days: "8:00 HT-7K3QZM Airport → Datai, ends about 8:45". */
  day: string[];
};

/** Days of the trips, in Malaysia: "2026-11-03". */
function daysOf(jobs: readonly Job[]) {
  return new Set(jobs.map((job) => todayInMalaysia(job.startsAt)));
}

/** "8:00 HT-7K3QZM Airport → Datai, ends about 8:45". */
function dayLine(job: Job) {
  const time = (d: Date) =>
    d.toLocaleTimeString("en-MY", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kuala_Lumpur",
    });
  const where = job.dropoff
    ? `${job.pickup.label} → ${job.dropoff.label}`
    : job.pickup.label;
  const ends = job.endsAt ? `until ${time(job.endsAt)}` : "one-way";
  return `${time(job.startsAt)} ${job.reference} ${where}, ${ends}`;
}

/** A document expired on any of the days: "Road tax expired". */
function expiredOn(
  record: Record<string, Date | null>,
  keys: readonly string[],
  labels: Record<string, string>,
  days: ReadonlySet<string>,
) {
  const first = [...days].sort()[0];
  if (!first) return [];
  const last = [...days].sort().at(-1)!;
  return keys.flatMap((key) => {
    const day = dayOf(record[key] ?? null);
    if (day === null) return [];
    if (day < first) return [`${labels[key]} expired`];
    if (day < last) return [`${labels[key]} expires before the last trip`];
    return [];
  });
}

/**
 * The picker: every vehicle or driver in service, ours first, each with
 * the reasons it cannot do the booking's live trips, greyed in the list,
 * and the timing warnings that only warn. A clash with another job, a
 * class it is not of or may not drive, a document expired on a trip's
 * day, its vendor suspended. The drive between jobs is the straight
 * line's estimate here.
 */
export async function listCandidates(
  bookingId: string,
  role: PartRole,
): Promise<Candidate[]> {
  const trips = (await getBookingFulfilment(bookingId)).filter(
    (t) => isLive(t) && t.status !== "completed",
  );
  if (trips.length === 0) return [];
  const jobs = trips.map((t) => t.job);
  const days = daysOf(jobs);
  const classIds = new Set(trips.map((t) => t.vehicleClassId));
  const location = await db.bookingItem.findFirst({
    where: { bookingId },
    select: { location: { select: { id: true, safetyBufferMinutes: true } } },
  });
  const bufferMinutes = location?.location?.safetyBufferMinutes ?? 15;
  const here = location?.location?.id;
  const vendorSelect = {
    select: { id: true, name: true, isOurs: true, status: true },
  } as const;

  const rows =
    role === "vehicle"
      ? (
          await db.vehicle.findMany({
            where: { isActive: true },
            include: {
              vendor: vendorSelect,
              location: { select: { id: true, name: true } },
              vehicleModel: {
                select: {
                  brand: true,
                  name: true,
                  vehicleClassId: true,
                  vehicleClass: { select: { name: true } },
                },
              },
            },
          })
        ).map((v) => {
          const reasons: string[] = [];
          if (
            ![...classIds].every((c) => c === v.vehicleModel.vehicleClassId)
          ) {
            reasons.push(
              `A ${v.vehicleModel.vehicleClass.name}, not the class booked`,
            );
          }
          reasons.push(
            ...expiredOn(
              v as unknown as Record<string, Date | null>,
              VEHICLE_DOCUMENTS,
              VEHICLE_DOCUMENT_LABELS,
              days,
            ),
          );
          return {
            id: v.id,
            name: `${v.plate} · ${modelName(v.vehicleModel)}`,
            vendor: v.vendor,
            location: v.location,
            reasons,
            held: { vehicleId: v.id } as const,
          };
        })
      : (
          await db.driver.findMany({
            where: { isActive: true },
            include: {
              vendor: vendorSelect,
              location: { select: { id: true, name: true } },
              vehicleClasses: { select: { id: true } },
            },
          })
        ).map((d) => {
          const reasons: string[] = [];
          const may = new Set(d.vehicleClasses.map((c) => c.id));
          if (![...classIds].every((c) => c !== null && may.has(c))) {
            reasons.push("Not allowed on this class");
          }
          reasons.push(
            ...expiredOn(
              d as unknown as Record<string, Date | null>,
              DRIVER_DOCUMENTS,
              DRIVER_DOCUMENT_LABELS,
              days,
            ),
          );
          return {
            id: d.id,
            name: d.name,
            vendor: d.vendor,
            location: d.location,
            reasons,
            held: { driverId: d.id } as const,
          };
        });

  const candidates = await Promise.all(
    rows.map(async (row): Promise<Candidate & { rank: number }> => {
      const reasons = [...row.reasons];
      if (row.vendor.status !== "active") {
        reasons.push("Its vendor is suspended");
      }
      const held = await heldJobs(db, row.held, bookingId);
      const clash = firstClash(jobs, held);
      if (clash) reasons.push(clashSentence(clash));
      const warnings = clash
        ? []
        : timingWarnings(jobs, held, {
            bufferMinutes,
            who: role === "driver" ? row.name.split(" ")[0] : "It",
          });
      return {
        id: row.id,
        name: row.name,
        vendor: {
          id: row.vendor.id,
          name: row.vendor.name,
          isOurs: row.vendor.isOurs,
        },
        locationName: row.location.name,
        reasons,
        warnings,
        day: held
          .filter((job) => days.has(todayInMalaysia(job.startsAt)))
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
          .map(dayLine),
        rank:
          (reasons.length > 0 ? 4 : 0) +
          (row.vendor.isOurs ? 0 : 2) +
          (row.location.id === here ? 0 : 1),
      };
    }),
  );
  return candidates
    .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
    .map((candidate): Candidate => {
      const shown: Partial<typeof candidate> = { ...candidate };
      delete shown.rank;
      return shown as Candidate;
    });
}

/** Whether a vehicle's or a driver's vendor is active and serves for us. */
function usableVendor(vendor: { status: string }) {
  return vendor.status === "active";
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/** One role asked of one vendor for the booking: named, or left to the vendor to choose. */
export type PartAsk = {
  vendorId: string;
  /** The vehicle or the driver Operation names; null asks the vendor to choose. */
  recordId: string | null;
  /** What we owe the vendor for each trip, by item id; ours is always 0. */
  costSen: Record<string, number>;
};

export type AssignInput = {
  bookingId: string;
  /** The trips asked for; empty means every live trip not yet assigned. */
  itemIds: string[];
  vehicle: PartAsk | null;
  driver: PartAsk | null;
  /** Unanswered by then, the offer's parts reopen; default by `defaultRespondBy`. */
  respondBy: Date | null;
  /** Operation accepts our vehicle in the same step, having checked it. */
  acceptOurs: boolean;
};

const NO_BOOKING = refuse(
  "This booking was deleted meanwhile. Go back to the board.",
);

/** The time a trip's part is taken: refused when it clashes with another job of the record. */
async function clashRefusal(
  tx: Prisma.TransactionClient,
  role: PartRole,
  recordId: string,
  bookingId: string,
  jobs: readonly Job[],
  name: string,
): Promise<Refusal | null> {
  const held = await heldJobs(
    tx,
    role === "vehicle" ? { vehicleId: recordId } : { driverId: recordId },
    bookingId,
  );
  const clash = firstClash(jobs, held);
  return clash
    ? refuse(`${name} cannot take this booking. ${clashSentence(clash)}.`, role)
    : null;
}

/** A named record checked: in service, its vendor the one asked and active. */
async function namedRecord(
  tx: Prisma.TransactionClient,
  role: PartRole,
  ask: PartAsk,
) {
  if (!ask.recordId) return { ok: true as const, name: null };
  const record =
    role === "vehicle"
      ? await tx.vehicle.findUnique({
          where: { id: ask.recordId },
          select: {
            plate: true,
            isActive: true,
            vendorId: true,
            vendor: { select: { status: true } },
          },
        })
      : await tx.driver.findUnique({
          where: { id: ask.recordId },
          select: {
            name: true,
            isActive: true,
            vendorId: true,
            vendor: { select: { status: true } },
          },
        });
  if (!record) {
    return refuse(`That ${role} was just deleted. Choose again.`, role);
  }
  const name = "plate" in record ? record.plate : record.name;
  if (!record.isActive) {
    return refuse(`${name} is out of service. Choose another ${role}.`, role);
  }
  if (record.vendorId !== ask.vendorId || !usableVendor(record.vendor)) {
    return refuse(
      `${name}'s vendor cannot take jobs now. Choose another ${role}.`,
      role,
    );
  }
  return { ok: true as const, name };
}

/**
 * Asks vendors for the booking's trips: a vehicle and a driver, from any
 * vendor, named or left to the vendor. One offer per vendor, one part per
 * trip and role, each with what we owe that vendor for it. A role a trip
 * has already is refused: release it first. A named vehicle or driver that
 * clashes with another job is refused. Our driver needs no vendor
 * acceptance, only their own; our vehicle is accepted here when Operation
 * says it checked it. Then the trips' status follows their parts.
 */
export async function assignBooking(
  actor: Actor,
  input: AssignInput,
  now: Date = new Date(),
): Promise<Change & { assigned?: string[] }> {
  const asks = (
    [
      ["vehicle", input.vehicle],
      ["driver", input.driver],
    ] as const
  ).filter((pair): pair is readonly [PartRole, PartAsk] => pair[1] !== null);
  if (asks.length === 0) {
    return refuse("Choose a vehicle or a driver to ask for.");
  }
  for (const [role, ask] of asks) {
    for (const cost of Object.values(ask.costSen)) {
      if (!Number.isInteger(cost) || cost < 0 || cost > 10_000_000) {
        return refuse(
          `Enter what we owe for the ${role} on each trip, in RM.`,
          `${role}Cost`,
        );
      }
    }
  }
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        id: true,
        reference: true,
        items: {
          where: { status: { in: ["confirmed", "assigned"] } },
          orderBy: { position: "asc" },
          include: { ...tripInclude, parts: { select: { role: true } } },
        },
      },
    });
    if (!booking) return NO_BOOKING;
    const trips = booking.items.filter(
      (item) => input.itemIds.length === 0 || input.itemIds.includes(item.id),
    );
    if (trips.length === 0) {
      return refuse(
        "No trip of this booking can be assigned: confirm it first, or reload.",
      );
    }
    const jobs = trips.map(jobOf);
    const respondBy =
      input.respondBy ?? defaultRespondBy(trips[0]!.startsAt, now);
    const userId = "userId" in actor ? actor.userId : null;

    for (const [role, ask] of asks) {
      const taken = trips.find((t) => t.parts.some((p) => p.role === role));
      if (taken) {
        return refuse(
          `Trip ${taken.position} has a ${role} already. Release it first to ask again.`,
          role,
        );
      }
      const vendor = await tx.vendor.findUnique({
        where: { id: ask.vendorId },
        select: { id: true, name: true, isOurs: true, status: true },
      });
      if (!vendor || vendor.status !== "active") {
        return refuse(
          `That vendor cannot take jobs now. Choose another.`,
          role,
        );
      }
      const named = await namedRecord(tx, role, ask);
      if (!named.ok) return named;
      if (ask.recordId && named.name) {
        const clash = await clashRefusal(
          tx,
          role,
          ask.recordId,
          booking.id,
          jobs,
          named.name,
        );
        if (clash) return clash;
      }
      // One offer per vendor per booking while it is open.
      const open = await tx.vendorOffer.findFirst({
        where: {
          bookingId: booking.id,
          vendorId: vendor.id,
          status: { in: ["offered", "accepted"] },
        },
        select: { id: true },
      });
      const offer =
        open ??
        (await tx.vendorOffer.create({
          data: {
            bookingId: booking.id,
            vendorId: vendor.id,
            status: "offered",
            respondBy,
            sentById: userId,
          },
          select: { id: true },
        }));
      if (open) {
        await tx.vendorOffer.update({
          where: { id: open.id },
          data: { status: "offered", respondBy },
        });
      }
      // Ours costs nothing. Our driver needs only their own yes; our
      // vehicle is accepted now when Operation checked it.
      const vendorAccepted =
        vendor.isOurs && (role === "driver" || input.acceptOurs) ? now : null;
      for (const trip of trips) {
        await tx.tripPart.create({
          data: {
            itemId: trip.id,
            offerId: offer.id,
            role,
            vehicleId: role === "vehicle" ? ask.recordId : null,
            driverId: role === "driver" ? ask.recordId : null,
            costSen: vendor.isOurs ? 0 : (ask.costSen[trip.id] ?? 0),
            vendorAcceptedAt: vendorAccepted,
          },
        });
      }
      await logActivity(tx, actor, {
        action: "booking.offer.sent",
        entityId: booking.id,
        after: {
          role,
          vendorName: vendor.name,
          named: named.name,
          positions: trips.map((t) => t.position),
          costSen: vendor.isOurs
            ? 0
            : trips.reduce((sum, t) => sum + (ask.costSen[t.id] ?? 0), 0),
          respondBy: respondBy.toISOString(),
          ...(vendorAccepted && role === "vehicle"
            ? { acceptedNow: true }
            : {}),
        },
      });
      await settleOffer(tx, offer.id, now);
    }
    const assigned = await settleTrips(
      tx,
      actor,
      trips.map((t) => t.id),
    );
    return { ok: true, assigned };
  });
}

/** Who answers a part: its vendor, or its driver; `recorded` when Operation records it for them. */
export type PartAnswer = {
  partIds: string[];
  as: "vendor" | "driver";
  accept: boolean;
  reason?: DeclineReason;
  note?: string;
  /** Operation entered the answer given by phone or in person. */
  recorded: boolean;
  /** The warnings the one accepting saw, kept on the offer. */
  warningsSeen?: string[];
  /**
   * The vendor's member accepting is also the driver named, as a
   * one-person vendor is: their yes for the vendor is their own too. Only
   * for driver parts naming the actor's own account.
   */
  driverToo?: boolean;
};

/** Parts as an answer reads them. */
const answerInclude = {
  item: { include: tripInclude },
  offer: {
    select: { id: true, vendor: { select: { name: true, isOurs: true } } },
  },
  vehicle: { select: { plate: true } },
  driver: { select: { name: true, userId: true } },
} satisfies Prisma.TripPartInclude;

/**
 * A vendor's or a driver's answer to parts of an offer. Accepting a part
 * whose record is not named yet is refused: name it first. A decline asks
 * a reason and reopens those parts. Our vehicle is accepted for by
 * Operation and SUPER, as is the vendor's side of our driver, set when
 * asked.
 */
export async function answerParts(
  actor: Actor,
  answer: PartAnswer,
  now: Date = new Date(),
): Promise<Change & { assigned?: string[] }> {
  if (answer.partIds.length === 0) return refuse("Nothing to answer. Reload.");
  if (!answer.accept) {
    if (!answer.reason || !isDeclineReason(answer.reason)) {
      return refuse("Choose why.", "reason");
    }
    if (answer.reason === "other" && !answer.note?.trim()) {
      return refuse("Say why in a few words.", "note");
    }
    if ((answer.note ?? "").length > DECLINE_NOTE_MAX_LENGTH) {
      return refuse(`At most ${DECLINE_NOTE_MAX_LENGTH} characters.`, "note");
    }
  }
  return db.$transaction(async (tx) => {
    const parts = await tx.tripPart.findMany({
      where: { id: { in: answer.partIds } },
      include: answerInclude,
    });
    if (parts.length !== answer.partIds.length) {
      return refuse("This job changed meanwhile. Reload it.");
    }
    if (answer.as === "driver" && parts.some((p) => p.role !== "driver")) {
      return refuse("A driver answers for their own driving only.");
    }
    const bookingId = parts[0]!.item.bookingId;
    if (parts.some((p) => p.item.bookingId !== bookingId)) {
      return refuse("Answer one booking at a time.");
    }
    const what = describeParts(parts);
    if (answer.accept) {
      for (const part of parts) {
        if (part.role === "vehicle" ? !part.vehicleId : !part.driverId) {
          return refuse(`Name the ${part.role} first, then accept.`);
        }
        if (answer.as === "driver" && !part.vendorAcceptedAt) {
          return refuse("The vendor has not accepted this job yet.");
        }
      }
      const userId = "userId" in actor ? actor.userId : null;
      for (const part of parts) {
        // A one-person vendor's yes covers their own driving too.
        const ownDriving =
          answer.driverToo === true &&
          part.role === "driver" &&
          userId !== null &&
          part.driver?.userId === userId;
        await tx.tripPart.update({
          where: { id: part.id },
          data:
            answer.as === "vendor"
              ? {
                  vendorAcceptedAt: part.vendorAcceptedAt ?? now,
                  ...(ownDriving
                    ? { driverAcceptedAt: part.driverAcceptedAt ?? now }
                    : {}),
                }
              : { driverAcceptedAt: part.driverAcceptedAt ?? now },
        });
      }
      if (answer.warningsSeen && answer.warningsSeen.length > 0) {
        for (const offerId of new Set(parts.map((p) => p.offerId))) {
          await tx.vendorOffer.update({
            where: { id: offerId },
            data: { warningsSeen: { push: answer.warningsSeen } },
          });
        }
      }
      await logActivity(tx, actor, {
        action: "booking.part.accepted",
        entityId: bookingId,
        after: {
          ...what,
          by: answer.as,
          recorded: answer.recorded,
          ...(answer.warningsSeen?.length
            ? { warnings: answer.warningsSeen }
            : {}),
        },
      });
    } else {
      await tx.tripPart.deleteMany({ where: { id: { in: answer.partIds } } });
      const reason = answer.reason!;
      for (const offerId of new Set(parts.map((p) => p.offerId))) {
        await tx.vendorOffer.update({
          where: { id: offerId },
          data: {
            declineReason: reason,
            declineNote: answer.note?.trim() || null,
          },
        });
      }
      await logActivity(tx, actor, {
        action: "booking.part.declined",
        entityId: bookingId,
        after: {
          ...what,
          by: answer.as,
          recorded: answer.recorded,
          reason: DECLINE_REASON_LABELS[reason],
          ...(answer.note?.trim() ? { note: answer.note.trim() } : {}),
        },
      });
    }
    for (const offerId of new Set(parts.map((p) => p.offerId))) {
      await tx.vendorOffer.update({
        where: { id: offerId },
        data: {
          answeredById: "userId" in actor ? actor.userId : null,
          answeredAt: now,
        },
      });
      await settleOffer(tx, offerId, now, answer.accept ? null : "declined");
    }
    const assigned = await settleTrips(tx, actor, [
      ...new Set(parts.map((p) => p.itemId)),
    ]);
    return { ok: true, assigned };
  });
}

/** The parts by role, vendor, record and trips, for the log. */
function describeParts(
  parts: readonly {
    role: string;
    item: { position: number };
    offer: { vendor: { name: string } };
    vehicle: { plate: string } | null;
    driver: { name: string } | null;
  }[],
) {
  const first = parts[0]!;
  return {
    role: first.role,
    vendorName: first.offer.vendor.name,
    named: first.vehicle?.plate ?? first.driver?.name ?? null,
    positions: [...new Set(parts.map((p) => p.item.position))].sort(
      (a, b) => a - b,
    ),
  };
}

/**
 * The vendor names the vehicle or the driver Operation left to it, for
 * every one of the parts. Refused when it clashes with another job, is
 * not the vendor's, or is out of service. Naming does not accept.
 */
export async function nameParts(
  actor: Actor,
  partIds: string[],
  recordId: string,
): Promise<Change & { assigned?: string[] }> {
  return db.$transaction(async (tx) => {
    const parts = await tx.tripPart.findMany({
      where: { id: { in: partIds } },
      include: {
        ...answerInclude,
        offer: {
          select: {
            id: true,
            vendorId: true,
            vendor: { select: { name: true, isOurs: true } },
          },
        },
      },
    });
    if (parts.length !== partIds.length || parts.length === 0) {
      return refuse("This job changed meanwhile. Reload it.");
    }
    const role = parts[0]!.role as PartRole;
    if (
      parts.some(
        (p) => p.role !== role || p.offer.vendorId !== parts[0]!.offer.vendorId,
      )
    ) {
      return refuse("Name one vehicle or one driver at a time.");
    }
    const bookingId = parts[0]!.item.bookingId;
    const named = await namedRecord(tx, role, {
      vendorId: parts[0]!.offer.vendorId,
      recordId,
      costSen: {},
    });
    if (!named.ok) return named;
    const clash = await clashRefusal(
      tx,
      role,
      recordId,
      bookingId,
      parts.map((p) => jobOf(p.item)),
      named.name!,
    );
    if (clash) return clash;
    await tx.tripPart.updateMany({
      where: { id: { in: partIds } },
      data:
        role === "vehicle"
          ? { vehicleId: recordId }
          : { driverId: recordId, driverAcceptedAt: null },
    });
    await logActivity(tx, actor, {
      action: "booking.part.named",
      entityId: bookingId,
      after: { ...describeParts(parts), named: named.name },
    });
    const assigned = await settleTrips(tx, actor, [
      ...new Set(parts.map((p) => p.itemId)),
    ]);
    return { ok: true, assigned };
  });
}

/** Why a part was let go: Operation released it, its vendor or driver backed out, it went unanswered, its vendor was suspended or its record taken out of service. */
export type ReleaseCause =
  "released" | "backed-out" | "expired" | "suspended" | "out-of-service";

/**
 * Lets parts go, reopening their trips: the parts are deleted, their
 * offers marked when nothing of them is left, and the release logged per
 * booking. Inside the caller's transaction. Answers the bookings touched,
 * by reference.
 */
export async function releaseParts(
  tx: Prisma.TransactionClient,
  actor: Actor,
  where: Prisma.TripPartWhereInput,
  cause: ReleaseCause,
  now: Date,
  note?: string,
): Promise<string[]> {
  const parts = await tx.tripPart.findMany({
    where,
    include: answerInclude,
  });
  if (parts.length === 0) return [];
  await tx.tripPart.deleteMany({
    where: { id: { in: parts.map((p) => p.id) } },
  });
  const byBooking = new Map<string, typeof parts>();
  for (const part of parts) {
    const list = byBooking.get(part.item.bookingId) ?? [];
    list.push(part);
    byBooking.set(part.item.bookingId, list);
  }
  const references: string[] = [];
  for (const [bookingId, list] of byBooking) {
    references.push(list[0]!.item.booking.reference);
    for (const role of ["vehicle", "driver"]) {
      const ofRole = list.filter((p) => p.role === role);
      if (ofRole.length === 0) continue;
      await logActivity(tx, actor, {
        action: "booking.part.released",
        entityId: bookingId,
        after: { ...describeParts(ofRole), cause, ...(note ? { note } : {}) },
      });
    }
  }
  for (const offerId of new Set(parts.map((p) => p.offerId))) {
    await settleOffer(
      tx,
      offerId,
      now,
      cause === "expired"
        ? "expired"
        : cause === "released"
          ? "withdrawn"
          : "released",
    );
  }
  await settleTrips(tx, actor, [...new Set(parts.map((p) => p.itemId))]);
  return references;
}

/** Operation lets a trip's part go, or every part of a booking. */
export function releaseAction(
  actor: Actor,
  target: { partId: string } | { bookingId: string },
  cause: "released" | "backed-out",
  now: Date = new Date(),
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const released = await releaseParts(
      tx,
      actor,
      "partId" in target
        ? { id: target.partId }
        : {
            item: {
              bookingId: target.bookingId,
              status: { in: ["confirmed", "assigned"] },
            },
          },
      cause,
      now,
    );
    return released.length > 0
      ? { ok: true }
      : refuse("Nothing to release: it changed meanwhile. Reload.");
  });
}

/**
 * Reopens the parts of every offer past its time to answer that its
 * vendor has not accepted. Run before the screens read fulfilment, so no
 * cron is needed: an offer is expired when it is next looked at.
 */
export async function expireOffers(now: Date = new Date()) {
  const due = await db.vendorOffer.findMany({
    where: { status: "offered", respondBy: { lt: now } },
    select: { id: true },
  });
  if (due.length === 0) return;
  await db.$transaction(async (tx) => {
    await releaseParts(
      tx,
      { kind: "system" },
      {
        offerId: { in: due.map((o) => o.id) },
        vendorAcceptedAt: null,
      },
      "expired",
      now,
    );
  });
}

/**
 * An offer's status from its parts: accepted once every part its vendor
 * holds is accepted by it; `gone` when no part is left (declined, expired,
 * withdrawn or released).
 */
async function settleOffer(
  tx: Prisma.TransactionClient,
  offerId: string,
  now: Date,
  gone: "declined" | "expired" | "withdrawn" | "released" | null = null,
) {
  const offer = await tx.vendorOffer.findUnique({
    where: { id: offerId },
    select: { status: true, parts: { select: { vendorAcceptedAt: true } } },
  });
  if (!offer) return;
  const status =
    offer.parts.length === 0
      ? (gone ?? "withdrawn")
      : offer.parts.every((p) => p.vendorAcceptedAt)
        ? "accepted"
        : "offered";
  if (status !== offer.status) {
    await tx.vendorOffer.update({
      where: { id: offerId },
      data: {
        status,
        ...(status === "accepted" ? { answeredAt: now } : {}),
      },
    });
  }
}

/**
 * Sets each trip's status from its parts: confirmed and every part
 * accepted makes it assigned; an assigned trip that lost a part is
 * confirmed again. Logs the change against the booking and refreshes the
 * booking's status. Answers the ids of the bookings a trip of became
 * assigned, for the customer's email.
 */
export async function settleTrips(
  tx: Prisma.TransactionClient,
  actor: Actor,
  itemIds: readonly string[],
): Promise<string[]> {
  const items = await tx.bookingItem.findMany({
    where: { id: { in: [...itemIds] } },
    include: { parts: true },
  });
  const newlyAssigned = new Set<string>();
  const touched = new Set<string>();
  for (const item of items) {
    const assigned = tripAssigned(item.parts);
    const next =
      item.status === "confirmed" && assigned
        ? "assigned"
        : item.status === "assigned" && !assigned
          ? "confirmed"
          : null;
    if (!next) continue;
    await tx.bookingItem.update({
      where: { id: item.id },
      data: { status: next },
    });
    await logActivity(tx, actor, {
      action:
        next === "assigned" ? ITEM_ACTIONS.assigned : "booking.item.reopened",
      entityId: item.bookingId,
      before: { position: item.position, status: item.status },
      after: { position: item.position, status: next },
    });
    touched.add(item.bookingId);
    if (next === "assigned") newlyAssigned.add(item.bookingId);
  }
  for (const bookingId of touched) {
    const siblings = await tx.bookingItem.findMany({
      where: { bookingId },
      select: { status: true },
    });
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: bookingStatusOf(siblings) },
    });
  }
  return [...newlyAssigned];
}

/**
 * After trips are cancelled at `now`: their parts not yet accepted go,
 * and the accepted ones of a trip cancelled before its free-cancellation
 * deadline owe nothing. A late cancellation keeps the cost; Operation can
 * change it (`setPartCost`). Inside the cancelling transaction.
 */
export async function settleCancelledTrips(
  tx: Prisma.TransactionClient,
  bookingId: string,
  now: Date,
) {
  const items = await tx.bookingItem.findMany({
    where: { bookingId, status: "cancelled", cancelledAt: now },
    select: {
      id: true,
      startsAt: true,
      cancellationCutoffHours: true,
      parts: { select: { id: true, offerId: true, vendorAcceptedAt: true } },
    },
  });
  const offers = new Set<string>();
  for (const item of items) {
    const open = item.parts.filter((p) => !p.vendorAcceptedAt);
    if (open.length > 0) {
      await tx.tripPart.deleteMany({
        where: { id: { in: open.map((p) => p.id) } },
      });
    }
    if (!owesAfterCancel(item, now)) {
      await tx.tripPart.updateMany({
        where: { itemId: item.id },
        data: { costSen: 0 },
      });
    }
    for (const part of item.parts) offers.add(part.offerId);
  }
  for (const offerId of offers)
    await settleOffer(tx, offerId, now, "withdrawn");
}

/** Operation changes what we owe a vendor for a part, with why: a late cancellation, an agreed change. */
export function setPartCost(
  actor: Actor,
  partId: string,
  costSen: number,
  reason: string,
): Promise<Change> {
  if (!Number.isInteger(costSen) || costSen < 0 || costSen > 10_000_000) {
    return Promise.resolve(refuse("Enter the amount in RM.", "costSen"));
  }
  if (!reason.trim()) {
    return Promise.resolve(refuse("Say why, for the record.", "reason"));
  }
  return db.$transaction(async (tx) => {
    const part = await tx.tripPart.findUnique({
      where: { id: partId },
      include: answerInclude,
    });
    if (!part) return refuse("This part changed meanwhile. Reload.");
    if (part.offer.vendor.isOurs) return refuse("Ours costs nothing.");
    if (part.costSen === costSen) return { ok: true };
    await tx.tripPart.update({ where: { id: partId }, data: { costSen } });
    await logActivity(tx, actor, {
      action: "booking.part.cost.changed",
      entityId: part.item.bookingId,
      before: { ...describeParts([part]), costSen: part.costSen },
      after: { ...describeParts([part]), costSen, reason: reason.trim() },
    });
    return { ok: true };
  });
}

/** A booking a vendor, a vehicle or a driver has accepted and that is still to come: what suspending it or taking it out of service releases. */
export type HeldBooking = { reference: string; startsAt: Date };

/** The accepted, coming bookings a vendor or a record holds, soonest first. */
export async function heldBookingsOf(
  where: { vendorId: string } | { vehicleId: string } | { driverId: string },
): Promise<HeldBooking[]> {
  const parts = await db.tripPart.findMany({
    where: {
      ...("vendorId" in where
        ? { offer: { vendorId: where.vendorId } }
        : where),
      vendorAcceptedAt: { not: null },
      item: { status: { in: ["confirmed", "assigned"] } },
    },
    select: {
      item: {
        select: { startsAt: true, booking: { select: { reference: true } } },
      },
    },
    orderBy: { item: { startsAt: "asc" } },
  });
  const seen = new Map<string, HeldBooking>();
  for (const { item } of parts) {
    if (!seen.has(item.booking.reference)) {
      seen.set(item.booking.reference, {
        reference: item.booking.reference,
        startsAt: item.startsAt,
      });
    }
  }
  return [...seen.values()];
}

/** Releases a vendor's or a record's coming work, inside a suspension or an out-of-service save. */
export function releaseHeldWork(
  tx: Prisma.TransactionClient,
  actor: Actor,
  where: { vendorId: string } | { vehicleId: string } | { driverId: string },
  cause: "suspended" | "out-of-service",
  now: Date,
) {
  return releaseParts(
    tx,
    actor,
    {
      ...("vendorId" in where
        ? { offer: { vendorId: where.vendorId } }
        : where),
      item: { status: { in: ["confirmed", "assigned"] } },
    },
    cause,
    now,
  );
}

/** Who does each assigned trip of a booking, for the customer's email. */
export async function tripCrewsOf(bookingId: string) {
  const items = await db.bookingItem.findMany({
    where: { bookingId, status: "assigned" },
    orderBy: { position: "asc" },
    select: {
      position: true,
      startsAt: true,
      parts: { include: partInclude },
    },
  });
  return items.flatMap((item) => {
    const vehicle = item.parts.find((p) => p.role === "vehicle")?.vehicle;
    const driver = item.parts.find((p) => p.role === "driver")?.driver;
    if (!vehicle || !driver) return [];
    return [
      {
        position: item.position,
        startsAt: item.startsAt,
        driverName: driver.name,
        driverPhone: driver.phone,
        plate: vehicle.plate,
        model: modelName(vehicle.vehicleModel),
        colour: vehicle.colour,
      },
    ];
  });
}
