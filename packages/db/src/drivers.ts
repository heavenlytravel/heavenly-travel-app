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
  type DriverDocument,
  type DriverFields,
} from "./driver-input";
import { dateOfDay, dueByDate } from "./expiry";
import type { Prisma } from "./generated/prisma/client";
import type { FleetFilter } from "./vehicles";
import { isUniqueViolation } from "./prisma-errors";
import { phoneDigitsOf } from "./search";
import { checkVendorServes } from "./vendors";

/**
 * Every vendor's drivers, ours and others', each based at one location
 * their vendor serves, with the classes they may drive and the expiry
 * dates of their licences. A driver needs no account: their email links
 * one when it exists or is made (./sync), and it opens Connect. The readers serve a location's Drivers
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

const NOT_FOUND: Change = refuse(
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

/** The days among the fields as the row stores them: dates. */
function documentDates(fields: Partial<DriverFields>) {
  const dates: Partial<Record<DriverDocument, Date | null>> = {};
  for (const key of DRIVER_DOCUMENTS) {
    const day = fields[key];
    if (day !== undefined) dates[key] = dateOfDay(day);
  }
  return dates;
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

/** The account an email links a driver to: the user with it, or none. */
async function accountOf(tx: Prisma.TransactionClient, email: string | null) {
  if (!email) return null;
  const user = await tx.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, driver: { select: { id: true } } },
  });
  return user ? { id: user.id, driverId: user.driver?.id ?? null } : null;
}

const EMAIL_TAKEN = refuse(
  "Another driver has this email. Each driver signs in with their own.",
  "email",
);

export async function createDriver(
  actor: Actor,
  fields: DriverFields,
): Promise<Created> {
  const check = checkDriverFields(fields);
  if (!check.ok) return check;
  try {
    return await db.$transaction(async (tx) => {
      const names = await namesOf(tx, fields);
      if (!names.ok) return names;
      const vendor = await checkVendorServes(
        tx,
        fields.vendorId,
        fields.locationId,
      );
      if (!vendor.ok) return vendor;
      const account = await accountOf(tx, fields.email);
      if (account?.driverId) return EMAIL_TAKEN;
      const { vehicleClassIds, ...rest } = fields;
      const driver = await tx.driver.create({
        data: {
          ...rest,
          ...documentDates(fields),
          userId: account?.id ?? null,
          vehicleClasses: { connect: vehicleClassIds.map((id) => ({ id })) },
        },
      });
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
  } catch (error) {
    if (isUniqueViolation(error, "email")) return EMAIL_TAKEN;
    throw error;
  }
}

/**
 * Changes any of the fields. The classes are logged by name when they
 * change. Saving what is already there logs nothing.
 */
export async function updateDriver(
  actor: Actor,
  id: string,
  patch: Partial<DriverFields>,
): Promise<Change> {
  const check = checkDriverFields(patch);
  if (!check.ok) return check;
  try {
    return await updateDriverIn(actor, id, patch);
  } catch (error) {
    if (isUniqueViolation(error, "email")) return EMAIL_TAKEN;
    throw error;
  }
}

function updateDriverIn(
  actor: Actor,
  id: string,
  patch: Partial<DriverFields>,
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
    if (!changed && !classesChanged) return { ok: true };

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
      );
      if (!vendor.ok) return vendor;
      if (after.vendorId !== undefined) vendorName = vendor.name;
    }
    // The account follows the email: the one with the new email, or none.
    let userId: string | null | undefined;
    if (after.email !== undefined) {
      const account = await accountOf(tx, after.email);
      if (account?.driverId && account.driverId !== id) return EMAIL_TAKEN;
      userId = account?.id ?? null;
    }
    await tx.driver.update({
      where: { id },
      data: {
        ...(userId !== undefined ? { userId } : {}),
        ...changed?.after,
        ...(changed ? documentDates(changed.after) : {}),
        ...(classesChanged
          ? {
              vehicleClasses: {
                set: vehicleClassIds.map((classId) => ({ id: classId })),
              },
            }
          : {}),
      },
    });
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
 * us is made inactive instead.
 */
export function deleteDriver(
  actor: Actor,
  id: string,
  confirmation: DeleteConfirmation,
): Promise<Change> {
  const confirmed = checkDeleteConfirmed(DRIVER_DELETE_IMPACT, confirmation);
  if (!confirmed.ok) return Promise.resolve(confirmed);
  return db.$transaction(async (tx) => {
    const driver = await tx.driver.findUnique({
      where: { id },
      include: { location: { select: { name: true } } },
    });
    if (!driver) return NOT_FOUND;
    await tx.driver.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "driver.deleted",
      entityId: id,
      before: { name: driver.name, locationName: driver.location.name },
      locationIds: [driver.locationId],
    });
    return { ok: true };
  });
}
