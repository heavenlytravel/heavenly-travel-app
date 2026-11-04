import {
  deleteAccountIfUnused,
  keepNewAccount,
  withAccount,
  type GivenAccount,
} from "./accounts";
import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import { checkDeleteConfirmed, type DeleteConfirmation } from "./delete-impact";
import {
  checkDriverFields,
  DRIVER_CLASSES_FIELD,
  DRIVER_DELETE_IMPACT,
  DRIVER_DOCUMENTS,
  driverFieldsOf,
  type DriverFields,
} from "./driver-input";
import { documentDates, dueByDate } from "./expiry";
import type { Prisma } from "./generated/prisma/client";
import type { FleetFilter } from "./vehicles";
import { isUniqueViolation } from "./prisma-errors";
import { phoneDigitsOf } from "./search";
import { checkVendorServes } from "./vendors";
import { releaseHeldWork } from "./fulfilment";

/**
 * Every vendor's drivers, ours and others', each based at one location
 * their vendor serves, with the classes they may drive and the expiry
 * dates of their licences. A driver with an email is given the account
 * for it when it is saved, and it opens Connect; one without has none.
 * The email is locked once saved. The readers serve a location's Drivers
 * tab and the list across locations; the writers take the actor and log
 * against the driver inside their transaction. See
 * docs/261019-vehicles-and-drivers.md.
 */

const withClasses = {
  include: {
    vehicleClasses: {
      select: { id: true, name: true, category: true, sortOrder: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    },
    location: { select: { id: true, name: true, slug: true, state: true } },
    vendor: { select: { id: true, name: true, isOurs: true, status: true } },
  },
} satisfies Prisma.DriverDefaultArgs;

/** A driver with the classes they may drive, their location and their vendor. */
export type DriverWithClasses = Prisma.DriverGetPayload<typeof withClasses>;

const NOT_FOUND = refuse(
  "This driver was deleted meanwhile. Go back to the list.",
);

/** Where a driver matches a search: their name or their phone. */
export function driverSearchWhere(search: string): Prisma.DriverWhereInput {
  const phone = phoneDigitsOf(search);
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      ...(phone ? [{ phone: { contains: phone } }] : []),
    ],
  };
}

/** Every driver, or those the filter leaves, active first, by name. */
export function listDrivers(
  filter: FleetFilter = {},
): Promise<DriverWithClasses[]> {
  const where: Prisma.DriverWhereInput[] = [];
  if (filter.locationId) where.push({ locationId: filter.locationId });
  if (filter.vendorId) where.push({ vendorId: filter.vendorId });
  if (filter.due) where.push(driversDueWhere());
  if (filter.search) where.push(driverSearchWhere(filter.search));
  return db.driver.findMany({
    where: { AND: where },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    ...withClasses,
  });
}

export function getDriver(id: string): Promise<DriverWithClasses | null> {
  return db.driver.findUnique({ where: { id }, ...withClasses });
}

/** Where a driver filter matches the active ones with a licence due by the warning, or expired. */
export function driversDueWhere(now: Date = new Date()) {
  const dueBy = dueByDate(now);
  return {
    isActive: true,
    OR: DRIVER_DOCUMENTS.map((key) => ({ [key]: { lte: dueBy } })),
  } satisfies Prisma.DriverWhereInput;
}

/**
 * Checks that the location and the classes a driver points at exist, and
 * answers their names for the log: the classes in the catalogue's order.
 */
async function namesOf(
  tx: Prisma.TransactionClient,
  fields: Partial<Pick<DriverFields, "locationId" | "vehicleClassIds">>,
): Promise<
  { ok: true; locationName?: string; classNames?: string[] } | Refusal
> {
  const ids = fields.vehicleClassIds;
  const [location, classes] = await Promise.all([
    fields.locationId
      ? tx.location.findUnique({
          where: { id: fields.locationId },
          select: { name: true },
        })
      : null,
    ids
      ? tx.vehicleClass.findMany({
          where: { id: { in: ids } },
          select: { name: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        })
      : null,
  ]);
  if (fields.locationId && !location) {
    return refuse(
      "That location was just deleted. Choose where they are based again.",
      "locationId",
    );
  }
  if (ids && classes?.length !== ids.length) {
    return refuse(
      "A class ticked was just deleted. Tick the classes they may drive again.",
      DRIVER_CLASSES_FIELD,
    );
  }
  return {
    ok: true,
    locationName: location?.name,
    classNames: classes?.map((c) => c.name),
  };
}

const EMAIL_TAKEN = refuse(
  "Another driver has this email. Each driver signs in with their own.",
  "email",
);

const EMAIL_LOCKED = refuse(
  "A driver's email stays as saved: it changes with their account's email, which our team changes.",
  "email",
);

/** Whether an email is free for this driver: no other driver has it, nor the account it belongs to. */
async function emailFree(email: string, driverId?: string) {
  const taken = await db.driver.findFirst({
    where: {
      NOT: driverId ? { id: driverId } : undefined,
      OR: [
        { email: { equals: email, mode: "insensitive" } },
        { user: { email: { equals: email, mode: "insensitive" } } },
      ],
    },
    select: { id: true },
  });
  return taken === null;
}

/**
 * The account a driver signs in to Connect with, for their email: the
 * one it has, or one made now (./accounts, `withAccount`), with the
 * password typed or none, so they sign in with a code. A driver with no
 * email needs none, and the change runs as it is.
 */
async function withDriverAccount<R extends Change | Created>(
  fields: { email: string | null; name: string; phone: string },
  password: string | null,
  driverId: string | undefined,
  change: (account: GivenAccount | null) => Promise<R>,
): Promise<R | Refusal> {
  if (!fields.email) return change(null);
  if (!(await emailFree(fields.email, driverId))) return EMAIL_TAKEN;
  return withAccount(
    {
      email: fields.email,
      firstName: fields.name,
      lastName: "",
      phone: fields.phone,
      password,
    },
    change,
  );
}

/**
 * A new driver. With an email, they are given the account for it at
 * once, so they sign in to Connect without signing up (`password`, or a
 * code when none). See docs/261102-direct-accounts.md.
 */
export async function createDriver(
  actor: Actor,
  fields: DriverFields,
  password: string | null = null,
): Promise<Created> {
  const check = checkDriverFields(fields);
  if (!check.ok) return check;
  try {
    return await withDriverAccount(fields, password, undefined, (account) =>
      createDriverIn(actor, fields, account),
    );
  } catch (error) {
    if (isUniqueViolation(error, "email")) return EMAIL_TAKEN;
    throw error;
  }
}

function createDriverIn(
  actor: Actor,
  fields: DriverFields,
  account: GivenAccount | null,
): Promise<Created> {
  return db.$transaction(async (tx) => {
    const names = await namesOf(tx, fields);
    if (!names.ok) return names;
    const vendor = await checkVendorServes(
      tx,
      fields.vendorId,
      fields.locationId,
      { kind: "driver" },
    );
    if (!vendor.ok) return vendor;
    const { vehicleClassIds, ...rest } = fields;
    const driver = await tx.driver.create({
      data: {
        ...rest,
        ...documentDates(DRIVER_DOCUMENTS, fields),
        userId: account?.userId ?? null,
        vehicleClasses: { connect: vehicleClassIds.map((id) => ({ id })) },
      },
    });
    if (account) {
      await keepNewAccount(tx, actor, account, `driver:${driver.id}`);
    }
    await logActivity(tx, actor, {
      action: "driver.created",
      entityId: driver.id,
      after: {
        ...rest,
        classes: names.classNames ?? [],
        locationName: names.locationName ?? null,
        vendorName: vendor.name,
      },
      locationIds: [fields.locationId],
    });
    return { ok: true, id: driver.id };
  });
}

/**
 * Changes any of the fields. The classes are logged by name when they
 * change. Saving what is already there logs nothing. The email is set
 * once: a driver saved without one may be given one, with its account
 * as a new driver's (`password`); one saved with it keeps it, and a
 * typo is fixed by deleting the driver. A real change of address is the
 * account's, on All Users, which the row follows (./accounts). A driver
 * whose email has no account yet, entered before accounts were made
 * with it, is given one at the save.
 */
export async function updateDriver(
  actor: Actor,
  id: string,
  patch: Partial<DriverFields>,
  password: string | null = null,
): Promise<Change> {
  const check = checkDriverFields(patch);
  if (!check.ok) return check;
  const current = await db.driver.findUnique({
    where: { id },
    select: { email: true, userId: true, name: true, phone: true },
  });
  if (!current) return NOT_FOUND;
  if (
    current.email !== null &&
    patch.email !== undefined &&
    patch.email !== current.email
  ) {
    return EMAIL_LOCKED;
  }
  const email = patch.email ?? current.email;
  try {
    if (current.userId || !email) {
      return await updateDriverIn(actor, id, patch, null);
    }
    return await withDriverAccount(
      {
        email,
        name: patch.name ?? current.name,
        phone: patch.phone ?? current.phone,
      },
      password,
      id,
      (account) => updateDriverIn(actor, id, patch, account),
    );
  } catch (error) {
    if (isUniqueViolation(error, "email")) return EMAIL_TAKEN;
    throw error;
  }
}

function updateDriverIn(
  actor: Actor,
  id: string,
  patch: Partial<DriverFields>,
  account: GivenAccount | null,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const driver = await tx.driver.findUnique({
      where: { id },
      include: {
        vehicleClasses: {
          select: { id: true, name: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        },
      },
    });
    if (!driver) return NOT_FOUND;
    const current = driverFieldsOf(driver);
    const { vehicleClassIds, ...scalars } = patch;
    const changed = changedFields(current, scalars);
    const classesChanged =
      vehicleClassIds !== undefined &&
      vehicleClassIds.join(",") !== current.vehicleClassIds.join(",");
    if (account) await keepNewAccount(tx, actor, account, `driver:${id}`);
    if (!changed && !classesChanged) {
      // Nothing of theirs changed; their account, if just given, links.
      if (account) {
        await tx.driver.update({
          where: { id },
          data: { userId: account.userId },
        });
      }
      return { ok: true };
    }

    const names = await namesOf(tx, {
      locationId: changed?.after.locationId,
      vehicleClassIds: classesChanged ? vehicleClassIds : undefined,
    });
    if (!names.ok) return names;
    const after = changed?.after ?? {};
    let vendorName: string | null = null;
    if (after.vendorId !== undefined || after.locationId !== undefined) {
      const vendor = await checkVendorServes(
        tx,
        after.vendorId ?? current.vendorId,
        after.locationId ?? current.locationId,
        { kind: "driver" },
      );
      if (!vendor.ok) return vendor;
      if (after.vendorId !== undefined) vendorName = vendor.name;
    }
    await tx.driver.update({
      where: { id },
      data: {
        ...(account ? { userId: account.userId } : {}),
        ...changed?.after,
        ...(changed ? documentDates(DRIVER_DOCUMENTS, changed.after) : {}),
        ...(classesChanged
          ? {
              vehicleClasses: {
                set: vehicleClassIds.map((classId) => ({ id: classId })),
              },
            }
          : {}),
      },
    });
    // Inactive, they leave the bookings they were accepted for, which the
    // form listed before the save.
    if (changed?.after.isActive === false) {
      await releaseHeldWork(
        tx,
        actor,
        { driverId: id },
        "out-of-service",
        new Date(),
      );
    }
    await logActivity(tx, actor, {
      action: "driver.updated",
      entityId: id,
      before: {
        ...changed?.before,
        ...(classesChanged
          ? { classes: driver.vehicleClasses.map((c) => c.name) }
          : {}),
      },
      after: {
        ...changed?.after,
        ...(classesChanged ? { classes: names.classNames ?? [] } : {}),
        ...(names.locationName ? { locationName: names.locationName } : {}),
        ...(vendorName ? { vendorName } : {}),
      },
      locationIds: [
        driver.locationId,
        ...(changed?.after.locationId ? [changed.after.locationId] : []),
      ],
    });
    return { ok: true };
  });
}

/**
 * Deletes a driver entered by mistake, once the admin confirmed what that
 * takes (`DRIVER_DELETE_IMPACT`, ./delete-impact). One who has driven for
 * us is made inactive instead. Their account goes too when no one has
 * used it, as one a typo made (./accounts, `deleteAccountIfUnused`); any
 * other stays.
 */
export async function deleteDriver(
  actor: Actor,
  id: string,
  confirmation: DeleteConfirmation,
): Promise<Change> {
  const confirmed = checkDeleteConfirmed(DRIVER_DELETE_IMPACT, confirmation);
  if (!confirmed.ok) return confirmed;
  const result = await deleteDriverIn(actor, id);
  if (result.ok && result.userId) {
    await deleteAccountIfUnused(actor, result.userId, `driver:${id}`);
  }
  return result.ok ? { ok: true } : result;
}

function deleteDriverIn(
  actor: Actor,
  id: string,
): Promise<{ ok: true; userId: string | null } | Refusal> {
  return db.$transaction(async (tx) => {
    const driver = await tx.driver.findUnique({
      where: { id },
      include: { location: { select: { name: true } } },
    });
    if (!driver) return NOT_FOUND;
    if (await tx.tripPart.count({ where: { driverId: id } })) {
      return refuse(
        "This driver has been on jobs. Make them inactive instead, so their history stays.",
      );
    }
    await tx.driver.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "driver.deleted",
      entityId: id,
      before: { name: driver.name, locationName: driver.location.name },
      locationIds: [driver.locationId],
    });
    return { ok: true, userId: driver.userId };
  });
}
