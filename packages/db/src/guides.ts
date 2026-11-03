import { changedFields, logActivity } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change, type Created } from "./change";
import { db } from "./client";
import { checkDeleteConfirmed, type DeleteConfirmation } from "./delete-impact";
import { dateOfDay, dueByDate } from "./expiry";
import { releaseHeldWork } from "./fulfilment";
import type { Prisma } from "./generated/prisma/client";
import {
  checkGuideFields,
  GUIDE_DELETE_IMPACT,
  GUIDE_DOCUMENTS,
  guideFieldsOf,
  type GuideDocument,
  type GuideFields,
} from "./guide-input";
import { phoneDigitsOf } from "./search";
import type { FleetFilter } from "./vehicles";
import { checkVendorServes } from "./vendors";

/**
 * Every vendor's tour guides, ours and others', each based at one location
 * their vendor serves, with their languages and the expiry of their MOTAC
 * licence. A guide has no account: their vendor accepts a trip for them
 * and names them, as for a vehicle. The readers serve a location's Guides
 * tab, the list across locations and Connect; the writers take the actor
 * and log against the guide inside their transaction. See
 * docs/261103-tour-guide.md.
 */

const withVendor = {
  include: {
    location: { select: { id: true, name: true, slug: true, state: true } },
    vendor: { select: { id: true, name: true, isOurs: true, status: true } },
  },
} satisfies Prisma.GuideDefaultArgs;

/** A guide with their location and their vendor. */
export type GuideWithVendor = Prisma.GuideGetPayload<typeof withVendor>;

const NOT_FOUND = refuse(
  "This tour guide was deleted meanwhile. Go back to the list.",
);

/** Where a guide matches a search: their name or their phone. */
export function guideSearchWhere(search: string): Prisma.GuideWhereInput {
  const phone = phoneDigitsOf(search);
  return {
    OR: [
      { name: { contains: search, mode: "insensitive" } },
      ...(phone ? [{ phone: { contains: phone } }] : []),
    ],
  };
}

/** Every guide, or those the filter leaves, active first, by name. */
export function listGuides(
  filter: FleetFilter = {},
): Promise<GuideWithVendor[]> {
  const where: Prisma.GuideWhereInput[] = [];
  if (filter.locationId) where.push({ locationId: filter.locationId });
  if (filter.vendorId) where.push({ vendorId: filter.vendorId });
  if (filter.due) where.push(guidesDueWhere());
  if (filter.search) where.push(guideSearchWhere(filter.search));
  return db.guide.findMany({
    where: { AND: where },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    ...withVendor,
  });
}

export function getGuide(id: string): Promise<GuideWithVendor | null> {
  return db.guide.findUnique({ where: { id }, ...withVendor });
}

/** Where a guide filter matches the active ones with a licence due by the warning, or expired. */
export function guidesDueWhere(now: Date = new Date()) {
  const dueBy = dueByDate(now);
  return {
    isActive: true,
    OR: GUIDE_DOCUMENTS.map((key) => ({ [key]: { lte: dueBy } })),
  } satisfies Prisma.GuideWhereInput;
}

/** The days among the fields as the row stores them: dates. */
function documentDates(fields: Partial<GuideFields>) {
  const dates: Partial<Record<GuideDocument, Date | null>> = {};
  for (const key of GUIDE_DOCUMENTS) {
    const day = fields[key];
    if (day !== undefined) dates[key] = dateOfDay(day);
  }
  return dates;
}

/** The location's name for the log, checking it still exists. */
async function locationNameOf(tx: Prisma.TransactionClient, id: string) {
  const location = await tx.location.findUnique({
    where: { id },
    select: { name: true },
  });
  return location?.name ?? null;
}

const LOCATION_GONE = refuse(
  "That location was just deleted. Choose where they are based again.",
  "locationId",
);

/** A new guide, of a vendor that serves the location they are based at. */
export function createGuide(
  actor: Actor,
  fields: GuideFields,
): Promise<Created> {
  const check = checkGuideFields(fields);
  if (!check.ok) return Promise.resolve(check);
  return db.$transaction(async (tx) => {
    const locationName = await locationNameOf(tx, fields.locationId);
    if (!locationName) return LOCATION_GONE;
    const vendor = await checkVendorServes(
      tx,
      fields.vendorId,
      fields.locationId,
    );
    if (!vendor.ok) return vendor;
    const guide = await tx.guide.create({
      data: { ...fields, ...documentDates(fields) },
    });
    await logActivity(tx, actor, {
      action: "guide.created",
      entityId: guide.id,
      after: { ...fields, locationName, vendorName: vendor.name },
      locationIds: [fields.locationId],
    });
    return { ok: true, id: guide.id };
  });
}

/**
 * Changes any of the fields. Saving what is already there logs nothing.
 * Made inactive, they leave the trips they were accepted for, which the
 * form listed before the save.
 */
export function updateGuide(
  actor: Actor,
  id: string,
  patch: Partial<GuideFields>,
): Promise<Change> {
  const check = checkGuideFields(patch);
  if (!check.ok) return Promise.resolve(check);
  return db.$transaction(async (tx) => {
    const guide = await tx.guide.findUnique({ where: { id } });
    if (!guide) return NOT_FOUND;
    const current = guideFieldsOf(guide);
    const { languages, ...scalars } = patch;
    const languagesChanged =
      languages !== undefined &&
      languages.join(",") !== current.languages.join(",");
    const changed = changedFields(current, scalars);
    if (!changed && !languagesChanged) return { ok: true };
    const after = changed?.after ?? {};
    let locationName: string | null = null;
    if (after.locationId !== undefined) {
      locationName = await locationNameOf(tx, after.locationId);
      if (!locationName) return LOCATION_GONE;
    }
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
    await tx.guide.update({
      where: { id },
      data: {
        ...after,
        ...documentDates(after),
        ...(languagesChanged ? { languages } : {}),
      },
    });
    if (after.isActive === false) {
      await releaseHeldWork(
        tx,
        actor,
        { guideId: id },
        "out-of-service",
        new Date(),
      );
    }
    await logActivity(tx, actor, {
      action: "guide.updated",
      entityId: id,
      before: {
        ...changed?.before,
        ...(languagesChanged ? { languages: current.languages } : {}),
      },
      after: {
        ...after,
        ...(languagesChanged ? { languages } : {}),
        ...(locationName ? { locationName } : {}),
        ...(vendorName ? { vendorName } : {}),
      },
      locationIds: [
        guide.locationId,
        ...(after.locationId ? [after.locationId] : []),
      ],
    });
    return { ok: true };
  });
}

/**
 * Deletes a guide entered by mistake, once the admin confirmed what that
 * takes (`GUIDE_DELETE_IMPACT`, ./delete-impact). One who has been on a
 * trip is made inactive instead.
 */
export function deleteGuide(
  actor: Actor,
  id: string,
  confirmation: DeleteConfirmation,
): Promise<Change> {
  const confirmed = checkDeleteConfirmed(GUIDE_DELETE_IMPACT, confirmation);
  if (!confirmed.ok) return Promise.resolve(confirmed);
  return db.$transaction(async (tx) => {
    const guide = await tx.guide.findUnique({
      where: { id },
      include: { location: { select: { name: true } } },
    });
    if (!guide) return NOT_FOUND;
    if (await tx.tripPart.count({ where: { guideId: id } })) {
      return refuse(
        "This tour guide has been on trips. Make them inactive instead, so their history stays.",
      );
    }
    await tx.guide.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "guide.deleted",
      entityId: id,
      before: { name: guide.name, locationName: guide.location.name },
      locationIds: [guide.locationId],
    });
    return { ok: true };
  });
}
