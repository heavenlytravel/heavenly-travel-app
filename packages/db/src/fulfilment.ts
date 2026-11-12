import { logActivity } from "./activity";
import { ITEM_ACTIONS, type Actor } from "./activity-actions";
import { bookingStatusOf, isLive, tipsDriver } from "./booking-status";
import { BOOKING_NUMBER_SELECT, bookingLabelOf } from "./booking-number";
import { formatLocalTime } from "./booking-rules";
import { refuse, type Change, type Refusal } from "./change";
import { db } from "./client";
import { DRIVER_DOCUMENTS, DRIVER_DOCUMENT_LABELS } from "./driver-input";
import { GUIDE_DOCUMENTS, GUIDE_DOCUMENT_LABELS } from "./guide-input";
import { dayOf, todayInMalaysia } from "./expiry";
import {
  clashSentence,
  DECLINE_NOTE_MAX_LENGTH,
  DECLINE_REASON_LABELS,
  defaultRespondBy,
  firstClash,
  isDeclineReason,
  namedIdOf,
  owesAfterCancel,
  PART_ROLES,
  timingWarnings,
  hasGuide,
  tripAssigned,
  isOtherClass,
  driverClassWarning,
  vehicleDriverWarning,
  type ClassRule,
  type DeclineReason,
  type Job,
  type PartRole,
  type TripFit,
} from "./fulfilment-rules";
import type { Prisma } from "./generated/prisma/client";
import { isPlace } from "./place";
import { VEHICLE_DOCUMENTS, VEHICLE_DOCUMENT_LABELS } from "./vehicle-input";
import { suppliesIt, supplyRefusalOf } from "./vendor-input";
import { modelName } from "./vehicle-model-input";

/**
 * Who does each trip: Operation asks a vendor for a vehicle, a driver, a
 * tour guide or more for a booking (`VendorOffer`), one part per trip and
 * role (`TripPart`), and each one's owner accepts. A trip is assigned once
 * every role it needs (`rolesOf`) is named and accepted; a decline, no answer in
 * time, a back-out or a release reopens that part alone. The writers take
 * the actor and log against the booking inside their transaction, and set
 * the trips' status from their parts (`settleTrips`). See
 * docs/261028-fulfilment-vendors-and-connect.md.
 */

/** A live trip with what fulfilment reads of it. */
export const tripInclude = {
  booking: { select: BOOKING_NUMBER_SELECT },
  tripDetails: {
    select: {
      vehicleClassId: true,
      vehicleClassName: true,
      vehicleClassCategory: true,
      pickupPlace: true,
      dropoffPlace: true,
      driveMinutes: true,
      distanceKm: true,
      passengers: true,
      mode: true,
      guideLanguage: true,
      guideRequest: true,
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
    bookingLabel: bookingLabelOf(trip.booking),
    startsAt: trip.startsAt,
    endsAt: trip.endsAt,
    driveMinutes: details?.driveMinutes ?? null,
    distanceKm: details?.distanceKm ?? null,
    pickup: pickup ? end(pickup) : { label: "the pickup", at: [0, 0] },
    dropoff: dropoff ? end(dropoff) : null,
  };
}

/** Whom a part names, as a filter on parts: a vehicle, a driver or a guide. */
export type NamedWhere =
  { vehicleId: string } | { driverId: string } | { guideId: string };

/** The filter on parts naming this record in this role. */
function namedWhere(role: PartRole, id: string): NamedWhere {
  return role === "vehicle"
    ? { vehicleId: id }
    : role === "guide"
      ? { guideId: id }
      : { driverId: id };
}

/** The trips a vehicle, a driver or a guide holds besides `exceptBookingId`'s: live, not done. */
export async function heldJobs(
  client: Prisma.TransactionClient,
  where: NamedWhere,
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
      vehicleModel: {
        select: {
          brand: true,
          name: true,
          vehicleClass: { select: { id: true, name: true } },
        },
      },
    },
  },
  driver: {
    select: { id: true, name: true, phone: true, userId: true },
  },
  guide: {
    select: { id: true, name: true, phone: true, languages: true },
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
  /** A tour guide goes on it, a third role to assign. */
  withGuide: boolean;
  /** The language the customer paid for the guide to speak; null without one. */
  guideLanguage: string | null;
  /** A coach trip: its driver is given a tip (`tipsDriver`). */
  tipped: boolean;
  /** Another language asked for, on request; null when none. */
  guideRequest: string | null;
  job: Job;
  parts: TripPartView[];
  assigned: boolean;
  /** What revisions added to each role's pay: "+RM40 stop at Pantai Cenang". */
  payLines: PayLine[];
};

/** An addition to a role's pay, from a revision. A role's pay is its part's cost plus these. */
export type PayLine = { role: string; amountSen: number; reason: string };

/** A booking's trips with who does each, for its page and the assign panel. */
export async function getBookingFulfilment(
  bookingId: string,
): Promise<FulfilmentTrip[]> {
  await expireOffers();
  const items = await db.bookingItem.findMany({
    where: { bookingId },
    orderBy: { position: "asc" },
    include: {
      ...tripInclude,
      parts: { include: partInclude },
      payLines: {
        orderBy: { createdAt: "asc" },
        select: { role: true, amountSen: true, reason: true },
      },
    },
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
    withGuide: hasGuide(item.tripDetails),
    guideLanguage: item.tripDetails?.guideLanguage ?? null,
    guideRequest: item.tripDetails?.guideRequest ?? null,
    tipped: tipsDriver(item.tripDetails?.vehicleClassCategory ?? ""),
    job: jobOf(item),
    parts: item.parts,
    assigned: tripAssigned(item.parts, hasGuide(item.tripDetails)),
    payLines: item.payLines,
  }));
}

/** The booking a trip belongs to, by the trip's id; null when there is none. */
export async function bookingIdOfTrip(itemId: string): Promise<string | null> {
  const item = await db.bookingItem.findUnique({
    where: { id: itemId },
    select: { bookingId: true },
  });
  return item?.bookingId ?? null;
}

/** The class a trip was booked in, by the name it was booked under; null without one. */
function bookedClassOf(
  details: { vehicleClassId: string; vehicleClassName: string } | null,
): ClassRule["booked"] {
  return details
    ? { id: details.vehicleClassId, name: details.vehicleClassName }
    : null;
}

/** A candidate's fit for one trip, and whether it is of another class than booked. */
export type CandidateFit = TripFit & { otherClass: boolean };

/**
 * Each trip's class rule (`ClassRule`), by item id: its class booked and
 * the vehicle and driver named on it already. A trip not found is not in
 * it.
 */
async function classRulesOf(
  client: Prisma.TransactionClient,
  itemIds: readonly string[],
): Promise<Map<string, ClassRule>> {
  const items = await client.bookingItem.findMany({
    where: { id: { in: [...itemIds] } },
    select: {
      id: true,
      tripDetails: {
        select: { vehicleClassId: true, vehicleClassName: true },
      },
      parts: {
        where: { role: { in: ["vehicle", "driver"] } },
        select: {
          role: true,
          vehicle: {
            select: {
              vehicleModel: {
                select: {
                  vehicleClass: { select: { id: true, name: true } },
                },
              },
            },
          },
          driver: {
            select: { name: true, vehicleClasses: { select: { id: true } } },
          },
        },
      },
    },
  });
  return new Map(
    items.map((item) => {
      const vehicle = item.parts.find((p) => p.role === "vehicle")?.vehicle;
      const driver = item.parts.find((p) => p.role === "driver")?.driver;
      return [
        item.id,
        {
          booked: bookedClassOf(item.tripDetails),
          vehicle: vehicle?.vehicleModel.vehicleClass ?? null,
          driver: driver
            ? {
                name: driver.name,
                classIds: driver.vehicleClasses.map((c) => c.id),
              }
            : null,
        } satisfies ClassRule,
      ] as const;
    }),
  );
}

/** A vehicle, a driver or a guide the picker lists, and why it cannot be used, if so. */
export type Candidate = {
  id: string;
  /** "VLE1234 · Toyota Alphard", "Ali bin Abu". */
  name: string;
  vendor: { id: string; name: string; isOurs: boolean };
  locationName: string;
  /** Why it cannot do every live trip, a few words each; empty when it can. */
  reasons: string[];
  /** Estimates that do not refuse it: the drive between jobs. */
  warnings: string[];
  /** A vehicle not of the class booked on one of the trips, listed only on asking. */
  otherClass: boolean;
  /**
   * Its fit for each live trip on its own, by item id: for a choice made
   * per trip, so a clash on trip 3 greys it on trip 3 alone.
   */
  trips: Record<string, CandidateFit>;
  /** Its other jobs on the trips' days: "08:00 HTB-1042 Airport → Datai, until 08:45". */
  day: string[];
};

/** Days of the trips, in Malaysia: "2026-11-03". */
function daysOf(jobs: readonly Job[]) {
  return new Set(jobs.map((job) => todayInMalaysia(job.startsAt)));
}

/** "08:00 HTB-1042 Airport → Datai, until 08:45". */
function dayLine(job: Job) {
  const where = job.dropoff
    ? `${job.pickup.label} → ${job.dropoff.label}`
    : job.pickup.label;
  const ends = job.endsAt ? `until ${formatLocalTime(job.endsAt)}` : "one-way";
  return `${formatLocalTime(job.startsAt)} ${job.bookingLabel} ${where}, ${ends}`;
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
 * The picker: every vehicle, driver or guide in service, ours first, the
 * class booked before the others, each with the reasons it cannot do the
 * booking's live trips, greyed in the list, and the warnings that only
 * warn. Refused: a clash with another job, a document expired on a
 * trip's day, its vendor suspended, a guide without the language paid
 * for. Warned: the drive between jobs, a driver who does not drive the
 * class (the vehicle's once named, `ClassRule`). A vehicle not of the
 * class booked says so, "MPV instead of Sedan", and needs a reason when
 * named. The same again for each trip on its own, for
 * a choice made per trip. The drive between jobs is the straight line's
 * estimate here.
 */
export async function listCandidates(
  bookingId: string,
  role: PartRole,
): Promise<Candidate[]> {
  // A guide is listed for the trips that go with one.
  const trips = (await getBookingFulfilment(bookingId)).filter(
    (t) =>
      isLive(t) &&
      t.status !== "completed" &&
      (role !== "guide" || t.withGuide),
  );
  if (trips.length === 0) return [];
  const jobs = trips.map((t) => t.job);
  const days = daysOf(jobs);
  const rules = await classRulesOf(
    db,
    trips.map((t) => t.id),
  );
  const ruleOf = (itemId: string) => rules.get(itemId)!;
  const location = await db.bookingItem.findFirst({
    where: { bookingId },
    select: { location: { select: { id: true, safetyBufferMinutes: true } } },
  });
  const bufferMinutes = location?.location?.safetyBufferMinutes ?? 15;
  const here = location?.location?.id;
  const vendorSelect = {
    select: { id: true, name: true, isOurs: true, status: true },
  } as const;

  // Each row says what its class means on a trip and which of its
  // documents expire on some days, so its fit is worked for all trips and
  // each.
  const rows =
    role === "guide"
      ? (
          await db.guide.findMany({
            where: { isActive: true },
            include: {
              vendor: vendorSelect,
              location: { select: { id: true, name: true } },
            },
          })
        ).map((g) => ({
          id: g.id,
          name:
            g.languages.length > 0
              ? `${g.name} · ${g.languages.join(", ")}`
              : g.name,
          vendor: g.vendor,
          location: g.location,
          // A guide goes with any class.
          classWarning: (): string | null => null,
          otherClass: () => false,
          speaks: g.languages,
          expired: (on: ReadonlySet<string>) =>
            expiredOn(
              g as unknown as Record<string, Date | null>,
              GUIDE_DOCUMENTS,
              GUIDE_DOCUMENT_LABELS,
              on,
            ),
          held: { guideId: g.id } as const,
        }))
      : role === "vehicle"
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
                    vehicleClass: { select: { id: true, name: true } },
                  },
                },
              },
            })
          ).map((v) => ({
            id: v.id,
            // "VLE1234 · Toyota Vios · Standard - Sedan": its class beside it, for Assign others.
            name: `${v.plate} · ${modelName(v.vehicleModel)} · ${v.vehicleModel.vehicleClass.name}`,
            vendor: v.vendor,
            location: v.location,
            classWarning: (rule: ClassRule) =>
              vehicleDriverWarning(rule, v.vehicleModel.vehicleClass),
            otherClass: (rule: ClassRule) =>
              isOtherClass(rule.booked, v.vehicleModel.vehicleClass),
            expired: (on: ReadonlySet<string>) =>
              expiredOn(
                v as unknown as Record<string, Date | null>,
                VEHICLE_DOCUMENTS,
                VEHICLE_DOCUMENT_LABELS,
                on,
              ),
            held: { vehicleId: v.id } as const,
            speaks: null,
          }))
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
            const may = new Set(d.vehicleClasses.map((c) => c.id));
            return {
              id: d.id,
              name: d.name,
              vendor: d.vendor,
              location: d.location,
              classWarning: (rule: ClassRule) =>
                driverClassWarning(rule, [...may]),
              otherClass: () => false,
              expired: (on: ReadonlySet<string>) =>
                expiredOn(
                  d as unknown as Record<string, Date | null>,
                  DRIVER_DOCUMENTS,
                  DRIVER_DOCUMENT_LABELS,
                  on,
                ),
              held: { driverId: d.id } as const,
              speaks: null,
            };
          });

  const candidates = await Promise.all(
    rows.map(async (row): Promise<Candidate & { rank: number }> => {
      const held = await heldJobs(db, row.held, bookingId);
      const suspended =
        row.vendor.status !== "active" ? ["Its vendor is suspended"] : [];
      const who = role === "vehicle" ? "It" : row.name.split(" ")[0];
      // A guide who does not speak the language paid for cannot be
      // chosen: the customer paid for that language.
      const unspoken = (languages: readonly string[]) => {
        const missing = row.speaks
          ? languages.filter((language) => !row.speaks.includes(language))
          : [];
        return missing.length > 0
          ? [`Does not speak ${missing.join(" or ")}`]
          : [];
      };
      // The fit for a set of trips: one, or all of them at once.
      const fitFor = (
        asked: readonly (typeof trips)[number][],
        languages: readonly string[],
      ): CandidateFit => {
        const jobsAsked = asked.map((t) => t.job);
        const reasons = [
          ...unspoken(languages),
          ...row.expired(daysOf(jobsAsked)),
          ...suspended,
        ];
        const clash = firstClash(jobsAsked, held);
        if (clash) reasons.push(clashSentence(clash));
        const warnings = [
          ...new Set(
            asked.flatMap((t) => row.classWarning(ruleOf(t.id)) ?? []),
          ),
          ...(clash
            ? []
            : timingWarnings(jobsAsked, held, { bufferMinutes, who })),
        ];
        const otherClass = asked.some((t) => row.otherClass(ruleOf(t.id)));
        return { reasons, warnings, otherClass };
      };
      const languagesOf = (t: (typeof trips)[number]) =>
        t.guideLanguage ? [t.guideLanguage] : [];
      const asked = [...new Set(trips.flatMap(languagesOf))];
      const all = fitFor(trips, asked);
      return {
        id: row.id,
        name: row.name,
        vendor: {
          id: row.vendor.id,
          name: row.vendor.name,
          isOurs: row.vendor.isOurs,
        },
        locationName: row.location.name,
        reasons: all.reasons,
        warnings: all.warnings,
        otherClass: all.otherClass,
        trips: Object.fromEntries(
          trips.map((t) => [t.id, fitFor([t], languagesOf(t))]),
        ),
        day: held
          .filter((job) => days.has(todayInMalaysia(job.startsAt)))
          .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime())
          .map(dayLine),
        // The class booked, and drivers who drive it, before the others.
        rank:
          (all.reasons.length > 0 ? 8 : 0) +
          (row.vendor.isOurs ? 0 : 4) +
          (all.otherClass || trips.some((t) => row.classWarning(ruleOf(t.id)))
            ? 2
            : 0) +
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

/** Whether a vehicle's, a driver's or a guide's vendor is active and serves for us. */
function usableVendor(vendor: { status: string }) {
  return vendor.status === "active";
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

/**
 * One role asked of one vendor for some of the booking's trips: a vehicle,
 * a driver or a guide named, or left to the vendor to choose.
 */
export type PartAsk = {
  vendorId: string;
  /** The vehicle, the driver or the guide Operation names; null asks the vendor to choose. */
  recordId: string | null;
  /** The trips it is asked for, by item id. */
  itemIds: string[];
  /** What we pay for each trip, by item id: the vendor, or the driver or guide themselves; ours is always 0. */
  costSen: Record<string, number>;
  /** A coach trip's driver's tip, by item id; any vendor, ours too. */
  tipSen: Record<string, number>;
};

export type AssignInput = {
  bookingId: string;
  /**
   * Each role's asks: one for every trip when the same vehicle or driver
   * does them all, or one per choice when trips differ. A trip is in at
   * most one ask of a role; empty leaves the role for later.
   */
  vehicle: PartAsk[];
  driver: PartAsk[];
  /** Only for trips that go with a guide. */
  guide: PartAsk[];
  /**
   * When each vendor answers by, by vendor id: unanswered by then, its
   * parts reopen. A vendor not in it gets `defaultRespondBy`. Never at or
   * after the first pickup it is asked for.
   */
  respondBy: Record<string, Date>;
  /** Operation accepts our vehicle or guide in the same step, having checked it. */
  acceptOurs: boolean;
};

const NO_BOOKING = refuse(
  "This booking was deleted meanwhile. Go back to Assign.",
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
  const held = await heldJobs(tx, namedWhere(role, recordId), bookingId);
  const clash = firstClash(jobs, held);
  return clash
    ? refuse(`${name} cannot take this booking. ${clashSentence(clash)}.`, role)
    : null;
}

/**
 * A named record checked: in service, its vendor the one asked and
 * active; a guide speaking the language paid for. A vehicle of another
 * class than booked, and a driver who does not drive the class, are only
 * marked in the picker.
 */
async function namedRecord(
  tx: Prisma.TransactionClient,
  role: PartRole,
  ask: Pick<PartAsk, "vendorId" | "recordId">,
  /** The trips it is named for: a guide must speak each one's language. */
  trips: readonly TripRow[],
) {
  const none = { ok: true as const, name: null };
  if (!ask.recordId) return none;
  const what = role === "guide" ? "tour guide" : role;
  const record =
    role === "guide"
      ? await tx.guide.findUnique({
          where: { id: ask.recordId },
          select: {
            name: true,
            isActive: true,
            vendorId: true,
            vendor: { select: { status: true } },
            languages: true,
          },
        })
      : role === "vehicle"
        ? await tx.vehicle.findUnique({
            where: { id: ask.recordId },
            select: {
              plate: true,
              isActive: true,
              vendorId: true,
              vendor: { select: { status: true } },
              vehicleModel: {
                select: { vehicleClass: { select: { id: true, name: true } } },
              },
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
    return refuse(`That ${what} was just deleted. Choose again.`, role);
  }
  const name = "plate" in record ? record.plate : record.name;
  if (!record.isActive) {
    return refuse(`${name} is out of service. Choose another ${what}.`, role);
  }
  if (record.vendorId !== ask.vendorId || !usableVendor(record.vendor)) {
    return refuse(
      `${name}'s vendor cannot take jobs now. Choose another ${what}.`,
      role,
    );
  }
  if ("languages" in record && Array.isArray(record.languages)) {
    const speaks: readonly unknown[] = record.languages;
    const unspoken = [
      ...new Set(trips.flatMap((t) => t.tripDetails?.guideLanguage ?? [])),
    ].filter((language) => !speaks.includes(language));
    if (unspoken.length > 0) {
      return refuse(
        `${name} does not speak ${unspoken.join(" or ")}, the language paid for. Choose another tour guide.`,
        role,
      );
    }
  }
  return { ...none, name };
}

/**
 * Asks vendors for the booking's trips: a vehicle and a driver for each,
 * and a guide for one that goes with one, from any vendor, named or left to the vendor, the same for every trip
 * or different ones. One offer per vendor, one part per trip and role,
 * each with what we owe that vendor for it. A role a trip has already is
 * refused: release it first. A named vehicle or driver that clashes with
 * another job on a trip it is asked for is refused. Our driver needs no
 * vendor acceptance, only their own; our vehicle or guide is accepted here
 * when Operation says it checked it. Then the trips' status follows their
 * parts.
 */
export async function assignBooking(
  actor: Actor,
  input: AssignInput,
  now: Date = new Date(),
): Promise<Change & { assigned?: string[] }> {
  const asks = (
    [
      ...input.vehicle.map((ask) => ["vehicle", ask] as const),
      ...input.driver.map((ask) => ["driver", ask] as const),
      ...input.guide.map((ask) => ["guide", ask] as const),
    ] satisfies (readonly [PartRole, PartAsk])[]
  ).filter(([, ask]) => ask.itemIds.length > 0);
  if (asks.length === 0) {
    return refuse("Choose a vehicle, a driver or a tour guide to ask for.");
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
    for (const tip of Object.values(ask.tipSen)) {
      if (role !== "driver" && tip !== 0) {
        return refuse("Only a driver is given a tip.", `${role}Tip`);
      }
      if (!Number.isInteger(tip) || tip < 0 || tip > 10_000_000) {
        return refuse("Enter the driver's tip in RM.", `${role}Tip`);
      }
    }
  }
  // A trip has one of each role: in one ask of each role at most.
  for (const role of PART_ROLES) {
    const ids = asks.flatMap(([r, ask]) => (r === role ? ask.itemIds : []));
    if (new Set(ids).size !== ids.length) {
      return refuse(`Choose one ${role} for each trip.`, role);
    }
  }
  return db.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: input.bookingId },
      select: {
        ...BOOKING_NUMBER_SELECT,
        items: {
          where: { status: { in: ["confirmed", "assigned"] } },
          orderBy: { position: "asc" },
          include: { ...tripInclude, parts: { select: { role: true } } },
        },
      },
    });
    if (!booking) return NO_BOOKING;
    const asked = new Set(asks.flatMap(([, ask]) => ask.itemIds));
    const trips = booking.items.filter((item) => asked.has(item.id));
    if (trips.length !== asked.size) {
      return refuse(
        "A trip asked for can no longer be assigned: it is not confirmed, or was cancelled. Reload.",
      );
    }
    const noGuide = trips.find(
      (t) =>
        !hasGuide(t.tripDetails) &&
        asks.some(([r, ask]) => r === "guide" && ask.itemIds.includes(t.id)),
    );
    if (noGuide) {
      return refuse(
        `Trip ${noGuide.position} goes without a tour guide. Reload.`,
        "guide",
      );
    }
    const userId = "userId" in actor ? actor.userId : null;
    // Each vendor answers once, before the first pickup it is asked for
    // across all its asks.
    const firstOf = new Map<string, (typeof trips)[number]>();
    for (const [, ask] of asks) {
      for (const t of trips.filter((t) => ask.itemIds.includes(t.id))) {
        const first = firstOf.get(ask.vendorId);
        if (!first || t.startsAt < first.startsAt) firstOf.set(ask.vendorId, t);
      }
    }

    for (const [role, ask] of asks) {
      const its = trips.filter((t) => ask.itemIds.includes(t.id));
      const taken = its.find((t) => t.parts.some((p) => p.role === role));
      if (taken) {
        return refuse(
          `Trip ${taken.position} has a ${role} already. Release it first to ask again.`,
          role,
        );
      }
      const vendor = await tx.vendor.findUnique({
        where: { id: ask.vendorId },
        select: {
          id: true,
          name: true,
          isOurs: true,
          status: true,
          services: true,
        },
      });
      if (!vendor || vendor.status !== "active") {
        return refuse(
          `That vendor cannot take jobs now. Choose another.`,
          role,
        );
      }
      // The screen offers each role only to the vendors that supply it.
      if (!suppliesIt(vendor, role)) {
        return refuse(supplyRefusalOf(vendor.name, role), role);
      }
      const first = firstOf.get(vendor.id)!;
      const given = input.respondBy[vendor.id];
      if (given && given.getTime() >= first.startsAt.getTime()) {
        return refuse(
          `Answer by must be before trip ${first.position}'s pickup.`,
          `respondBy:${vendor.id}`,
        );
      }
      const respondBy = given ?? defaultRespondBy(first.startsAt, now);
      const named = await namedRecord(tx, role, ask, its);
      if (!named.ok) return named;
      if (ask.recordId && named.name) {
        const clash = await clashRefusal(
          tx,
          role,
          ask.recordId,
          booking.id,
          its.map(jobOf),
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
      // vehicle or guide is accepted now when Operation checked it.
      const vendorAccepted =
        vendor.isOurs && (role === "driver" || input.acceptOurs) ? now : null;
      // A tip is a coach driver's only; asked on any other trip it is none.
      const tipOf = (trip: (typeof its)[number]) =>
        tipsDriver(trip.tripDetails?.vehicleClassCategory ?? "")
          ? (ask.tipSen[trip.id] ?? 0)
          : 0;
      for (const trip of its) {
        await tx.tripPart.create({
          data: {
            itemId: trip.id,
            offerId: offer.id,
            role,
            vehicleId: role === "vehicle" ? ask.recordId : null,
            driverId: role === "driver" ? ask.recordId : null,
            guideId: role === "guide" ? ask.recordId : null,
            costSen: vendor.isOurs ? 0 : (ask.costSen[trip.id] ?? 0),
            tipSen: tipOf(trip),
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
          positions: its.map((t) => t.position),
          costSen: vendor.isOurs
            ? 0
            : its.reduce((sum, t) => sum + (ask.costSen[t.id] ?? 0), 0),
          ...(role === "driver"
            ? {
                tipSen: its.reduce((sum, t) => sum + tipOf(t), 0),
              }
            : {}),
          respondBy: respondBy.toISOString(),
          ...(vendorAccepted && role !== "driver" ? { acceptedNow: true } : {}),
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
  guide: { select: { name: true } },
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
        if (namedIdOf(part) === null) {
          return refuse(
            `Name the ${part.role === "guide" ? "tour guide" : part.role} first, then accept.`,
          );
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
    guide: { name: string } | null;
  }[],
) {
  const first = parts[0]!;
  return {
    role: first.role,
    vendorName: first.offer.vendor.name,
    named:
      first.vehicle?.plate ?? first.driver?.name ?? first.guide?.name ?? null,
    positions: [...new Set(parts.map((p) => p.item.position))].sort(
      (a, b) => a - b,
    ),
  };
}

/**
 * The vendor names the vehicle, the driver or the guide Operation left to
 * it, for every one of the parts. Refused when it clashes with another job, is
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
      return refuse("Name one vehicle, driver or tour guide at a time.");
    }
    const bookingId = parts[0]!.item.bookingId;
    const named = await namedRecord(
      tx,
      role,
      { vendorId: parts[0]!.offer.vendorId, recordId },
      parts.map((p) => p.item),
    );
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
          : role === "guide"
            ? { guideId: recordId }
            : { driverId: recordId, driverAcceptedAt: null },
    });
    await logActivity(tx, actor, {
      action: "booking.part.named",
      entityId: bookingId,
      after: {
        ...describeParts(parts),
        named: named.name,
      },
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
 * by number.
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
  const labels: string[] = [];
  for (const [bookingId, list] of byBooking) {
    labels.push(bookingLabelOf(list[0]!.item.booking));
    for (const role of PART_ROLES) {
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
  return labels;
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
    include: { parts: true, tripDetails: { select: { guideLanguage: true } } },
  });
  const newlyAssigned = new Set<string>();
  const touched = new Set<string>();
  for (const item of items) {
    const assigned = tripAssigned(item.parts, hasGuide(item.tripDetails));
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

/** A booking a vendor, a vehicle, a driver or a guide has accepted and that is still to come: what suspending it or taking it out of service releases. `label` is how the screen names it. */
export type HeldBooking = { label: string; startsAt: Date };

/**
 * The accepted, coming bookings a vendor or a record holds, soonest first,
 * each named by its number.
 */
export async function heldBookingsOf(
  where: { vendorId: string } | NamedWhere,
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
        select: {
          startsAt: true,
          booking: { select: BOOKING_NUMBER_SELECT },
        },
      },
    },
    orderBy: { item: { startsAt: "asc" } },
  });
  const seen = new Map<string, HeldBooking>();
  for (const { item } of parts) {
    if (!seen.has(item.booking.id)) {
      seen.set(item.booking.id, {
        label: bookingLabelOf(item.booking),
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
  where: { vendorId: string } | NamedWhere,
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
    const guide = item.parts.find((p) => p.role === "guide")?.guide;
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
        guideName: guide?.name ?? null,
        guidePhone: guide?.phone ?? null,
      },
    ];
  });
}
