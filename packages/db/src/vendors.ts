import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { phoneDigitsOf } from "./search";
import {
  checkReviewNote,
  checkVendorFields,
  VENDOR_LOCATIONS_FIELD,
  vendorFieldsOf,
  type VendorFields,
  type VendorStatus,
} from "./vendor-input";

/**
 * Vendors: whoever supplies a vehicle, a driver or both, Heavenly Travel
 * included. Staff enter one in the admin, active at once; one that signs up
 * in Connect waits as pending until SUPER approves it. Ours is a switch
 * only SUPER sets, and the code finds ours by it, never by the name. The
 * writers take the actor and log against the vendor inside their
 * transaction. See docs/261028-fulfilment-vendors-and-connect.md.
 */

const withLocations = {
  include: {
    locations: {
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    },
    _count: {
      select: {
        vehicles: { where: { isActive: true } },
        drivers: { where: { isActive: true } },
        members: true,
      },
    },
  },
} satisfies Prisma.VendorDefaultArgs;

/** A vendor with the locations it serves and how many vehicles and drivers it has in service. */
export type VendorWithLocations = Prisma.VendorGetPayload<typeof withLocations>;

const NOT_FOUND: Refusal = refuse(
  "This vendor was deleted meanwhile. Go back to the list.",
);

/** What the vendor list narrows to. */
export type VendorFilter = {
  status?: VendorStatus;
  /** Part of its name, its contact's name or phone, or its registration. */
  search?: string;
};

/** Where a vendor matches a search. */
function vendorSearchWhere(search: string): Prisma.VendorWhereInput {
  const phone = phoneDigitsOf(search);
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      { contactName: { contains: search, mode: "insensitive" } },
      { registrationNo: { contains: search, mode: "insensitive" } },
      ...(phone ? [{ contactPhone: { contains: phone } }] : []),
    ],
  };
}

/** Every vendor, or those the filter leaves: ours first, then by name. */
export function listVendors(
  filter: VendorFilter = {},
): Promise<VendorWithLocations[]> {
  const where: Prisma.VendorWhereInput[] = [];
  if (filter.status) where.push({ status: filter.status });
  if (filter.search) where.push(vendorSearchWhere(filter.search));
  return db.vendor.findMany({
    where: { AND: where },
    orderBy: [{ isOurs: "desc" }, { name: "asc" }],
    ...withLocations,
  });
}

/** How many vendors wait for SUPER's review. */
export function countPendingVendors(): Promise<number> {
  return db.vendor.count({ where: { status: "pending" } });
}

export function getVendor(id: string): Promise<VendorWithLocations | null> {
  return db.vendor.findUnique({ where: { id }, ...withLocations });
}

/** A vendor as the vehicle and driver forms choose it: active ones, ours first, with the locations each serves. */
export type VendorOption = {
  id: string;
  name: string;
  isOurs: boolean;
  status: string;
  locationIds: string[];
};

/**
 * Every vendor a vehicle or driver may belong to, ours first: the active
 * ones, and the suspended ones, which keep theirs. A vendor waiting for
 * approval, or refused, has none yet.
 */
export async function listVendorOptions(): Promise<VendorOption[]> {
  const rows = await db.vendor.findMany({
    where: { status: { in: ["active", "suspended"] } },
    orderBy: [{ isOurs: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      isOurs: true,
      status: true,
      locations: { select: { id: true } },
    },
  });
  return rows.map(({ locations, ...vendor }) => ({
    ...vendor,
    locationIds: locations.map((l) => l.id),
  }));
}

/**
 * Checks that a vendor exists and serves the location a vehicle or a driver
 * is based at, inside the writer's transaction; answers the vendor's name
 * for the log. `field` is the form's field the refusal is about.
 */
export async function checkVendorServes(
  tx: Prisma.TransactionClient,
  vendorId: string,
  locationId: string,
): Promise<{ ok: true; name: string; isOurs: boolean } | Refusal> {
  const vendor = await tx.vendor.findUnique({
    where: { id: vendorId },
    select: {
      name: true,
      isOurs: true,
      locations: { where: { id: locationId }, select: { id: true } },
    },
  });
  if (!vendor) {
    return refuse(
      "That vendor was just deleted. Choose whose it is again.",
      "vendorId",
    );
  }
  if (vendor.locations.length === 0) {
    const location = await tx.location.findUnique({
      where: { id: locationId },
      select: { name: true },
    });
    return refuse(
      `${vendor.name} does not serve ${location?.name ?? "that location"}. Choose a location it serves, or add it to the vendor's locations first.`,
      "locationId",
    );
  }
  return { ok: true, name: vendor.name, isOurs: vendor.isOurs };
}

/** Checks that every location ticked exists, and answers their names in order for the log. */
async function locationNamesOf(
  tx: Prisma.TransactionClient,
  ids: readonly string[],
): Promise<{ ok: true; names: string[] } | Refusal> {
  const rows = await tx.location.findMany({
    where: { id: { in: [...ids] } },
    select: { name: true },
    orderBy: { name: "asc" },
  });
  if (rows.length !== ids.length) {
    return refuse(
      "A location ticked was just deleted. Tick the locations it serves again.",
      VENDOR_LOCATIONS_FIELD,
    );
  }
  return { ok: true, names: rows.map((r) => r.name) };
}

/** The fields as the vendor's row stores them: without the locations. */
function vendorRow<F extends Partial<VendorFields>>(
  fields: F,
): Omit<F, "locationIds"> {
  const row: Partial<F> = { ...fields };
  delete row.locationIds;
  return row as Omit<F, "locationIds">;
}

/**
 * A new vendor. Staff enter one active; one that registers in Connect is
 * pending, with its applicant as its owner (`owner`). Never ours: only
 * SUPER switches that, on the vendor's page.
 */
export async function createVendor(
  actor: Actor,
  fields: VendorFields,
  options: { status: "active" | "pending"; owner?: string },
): Promise<Created> {
  const check = checkVendorFields(fields);
  if (!check.ok) return check;
  return db.$transaction(async (tx) => {
    const names = await locationNamesOf(tx, fields.locationIds);
    if (!names.ok) return names;
    const vendor = await tx.vendor.create({
      data: {
        ...vendorRow(fields),
        status: options.status,
        locations: { connect: fields.locationIds.map((id) => ({ id })) },
        ...(options.owner
          ? { members: { create: { userId: options.owner, role: "owner" } } }
          : {}),
      },
    });
    await logActivity(tx, actor, {
      action: "vendor.created",
      entityId: vendor.id,
      after: {
        ...vendorRow(fields),
        locations: names.names,
        status: options.status,
      },
    });
    return { ok: true, id: vendor.id };
  });
}

/**
 * Changes any of the fields. A location the vendor stops serving is
 * refused while one of its vehicles or drivers is based there. Saving what
 * is already there logs nothing.
 */
export async function updateVendor(
  actor: Actor,
  id: string,
  patch: Partial<VendorFields>,
): Promise<Change> {
  const check = checkVendorFields(patch);
  if (!check.ok) return check;
  return db.$transaction(async (tx) => {
    const vendor = await tx.vendor.findUnique({
      where: { id },
      include: { locations: { select: { id: true, name: true } } },
    });
    if (!vendor) return NOT_FOUND;
    const current = vendorFieldsOf(vendor);
    const { locationIds, services, ...scalars } = patch;
    const changed = changedFields(current, scalars);
    const servicesChanged =
      services !== undefined &&
      services.join(",") !== current.services.join(",");
    const locationsChanged =
      locationIds !== undefined &&
      locationIds.join(",") !== current.locationIds.join(",");
    if (!changed && !servicesChanged && !locationsChanged) return { ok: true };

    let locationNames: string[] | null = null;
    if (locationsChanged) {
      const names = await locationNamesOf(tx, locationIds);
      if (!names.ok) return names;
      locationNames = names.names;
      const dropped = current.locationIds.filter(
        (l) => !locationIds.includes(l),
      );
      if (dropped.length > 0) {
        const based = await tx.location.findFirst({
          where: {
            id: { in: dropped },
            OR: [
              { vehicles: { some: { vendorId: id } } },
              { drivers: { some: { vendorId: id } } },
            ],
          },
          select: { name: true },
        });
        if (based) {
          return refuse(
            `${vendor.name} has vehicles or drivers based in ${based.name}. Move them first, or keep ${based.name} ticked.`,
            VENDOR_LOCATIONS_FIELD,
          );
        }
      }
    }
    await tx.vendor.update({
      where: { id },
      data: {
        ...changed?.after,
        ...(servicesChanged ? { services } : {}),
        ...(locationsChanged
          ? { locations: { set: locationIds.map((l) => ({ id: l })) } }
          : {}),
      },
    });
    await logActivity(tx, actor, {
      action: "vendor.updated",
      entityId: id,
      before: {
        ...changed?.before,
        ...(servicesChanged ? { services: current.services } : {}),
        ...(locationsChanged
          ? { locations: vendor.locations.map((l) => l.name).sort() }
          : {}),
      },
      after: {
        ...changed?.after,
        ...(servicesChanged ? { services } : {}),
        ...(locationNames ? { locations: locationNames } : {}),
      },
    });
    return { ok: true };
  });
}

/** Why a status move is refused, from what the vendor is now. */
const STATUS_MOVES: Record<
  "approve" | "refuse" | "suspend" | "reinstate",
  { from: VendorStatus; to: VendorStatus; error: string }
> = {
  approve: {
    from: "pending",
    to: "active",
    error: "Only a vendor waiting for approval can be approved.",
  },
  refuse: {
    from: "pending",
    to: "refused",
    error: "Only a vendor waiting for approval can be refused.",
  },
  suspend: {
    from: "active",
    to: "suspended",
    error: "Only an active vendor can be suspended.",
  },
  reinstate: {
    from: "suspended",
    to: "active",
    error: "Only a suspended vendor can be reinstated.",
  },
};

const MOVE_ACTIONS = {
  approve: "vendor.approved",
  refuse: "vendor.refused",
  suspend: "vendor.suspended",
  reinstate: "vendor.reinstated",
} as const;

export type VendorMove = keyof typeof STATUS_MOVES;

/**
 * SUPER's review of a vendor: approve or refuse one that signed up,
 * suspend an active one or reinstate it. Refusing and suspending need a
 * reason, kept for staff. `release` runs inside the transaction before a
 * suspension, to take the vendor off the work it accepted. Ours is never
 * suspended: switch it off first.
 */
export async function moveVendor(
  actor: { kind: "admin"; userId: string },
  id: string,
  move: VendorMove,
  note: string,
  release?: (tx: Prisma.TransactionClient) => Promise<Prisma.InputJsonObject>,
): Promise<Change & { vendor?: { name: string; contactEmail: string } }> {
  const rule = STATUS_MOVES[move];
  if (move === "refuse" || move === "suspend") {
    const noteCheck = checkReviewNote(note);
    if (!noteCheck.ok) return noteCheck;
  }
  return db.$transaction(async (tx) => {
    const vendor = await tx.vendor.findUnique({ where: { id } });
    if (!vendor) return NOT_FOUND;
    if (vendor.status !== rule.from) return refuse(rule.error);
    if (move === "suspend" && vendor.isOurs) {
      return refuse(
        `${vendor.name} is ours. Switch "Ours" off before suspending it.`,
      );
    }
    const released = release ? await release(tx) : undefined;
    const reviewNote =
      move === "refuse" || move === "suspend" ? note : vendor.reviewNote;
    await tx.vendor.update({
      where: { id },
      data: {
        status: rule.to,
        reviewNote,
        reviewedAt: new Date(),
        reviewedById: actor.userId,
      },
    });
    await logActivity(tx, actor, {
      action: MOVE_ACTIONS[move],
      entityId: id,
      before: { status: vendor.status },
      after: {
        status: rule.to,
        ...(move === "refuse" || move === "suspend" ? { reason: note } : {}),
        ...released,
      },
    });
    return {
      ok: true,
      vendor: { name: vendor.name, contactEmail: vendor.contactEmail },
    };
  });
}

/**
 * Switches a vendor to ours or back: SUPER's alone. Ours has no members,
 * so a vendor with members cannot be made ours, and only an active one
 * can.
 */
export function setVendorOurs(
  actor: Actor,
  id: string,
  isOurs: boolean,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const vendor = await tx.vendor.findUnique({
      where: { id },
      include: { _count: { select: { members: true } } },
    });
    if (!vendor) return NOT_FOUND;
    if (vendor.isOurs === isOurs) return { ok: true };
    if (isOurs && vendor.status !== "active") {
      return refuse("Only an active vendor can be ours.");
    }
    if (isOurs && vendor._count.members > 0) {
      return refuse(
        `${vendor.name} has Connect accounts. Ours has none: Operation accepts for it. Remove its accounts first.`,
      );
    }
    await tx.vendor.update({ where: { id }, data: { isOurs } });
    await logActivity(tx, actor, {
      action: "vendor.ours.switched",
      entityId: id,
      before: { isOurs: vendor.isOurs },
      after: { isOurs },
    });
    return { ok: true };
  });
}
