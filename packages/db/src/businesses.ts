import type { Actor } from "./activity-actions";
import { changedFields, logActivity } from "./activity";
import {
  isBusinessStatus,
  isPaymentTerms,
  type BusinessStatus,
  type PaymentTerms,
} from "./billing-rules";
import {
  checkBusinessProfile,
  type BusinessFields,
  type BusinessProfile,
} from "./business-input";
import { refuse, type Change, type Created } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";

/**
 * The businesses we sell to on account: agents for now, moved out of
 * Vendor (docs/261108-billing-and-revisions.md, part 1). Adding one picks
 * its payment terms; changing them later is Finance's, with a reason, and
 * applies to what is not billed yet. Inactive takes no new bookings and is
 * still billed.
 */

const SUMMARY = {
  id: true,
  kind: true,
  name: true,
  status: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  paymentTerms: true,
  daysToPay: true,
  createdAt: true,
} as const satisfies Prisma.BusinessSelect;

export type BusinessSummary = Prisma.BusinessGetPayload<{
  select: typeof SUMMARY;
}>;

/** Every agent, active first then by name, with a search over its name, contact and email. */
export function listBusinesses(
  filter: { search?: string; status?: BusinessStatus } = {},
): Promise<BusinessSummary[]> {
  const search = filter.search?.trim();
  return db.business.findMany({
    where: {
      kind: "agent",
      ...(filter.status ? { status: filter.status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { contactName: { contains: search, mode: "insensitive" } },
              { contactEmail: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
    select: SUMMARY,
  });
}

/** The agents a new booking may come through, by name: the active ones. */
export function listAgents(): Promise<{ id: string; name: string }[]> {
  return db.business.findMany({
    where: { kind: "agent", status: "active" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Every agent by name, inactive included, for a filter of the bookings they had. */
export function listAgentNames(): Promise<{ id: string; name: string }[]> {
  return db.business.findMany({
    where: { kind: "agent" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export function getBusiness(id: string) {
  return db.business.findUnique({ where: { id } });
}

export type Business = NonNullable<Awaited<ReturnType<typeof getBusiness>>>;

/** Adds an agent, active, with its terms; logged with every field. */
export async function createBusiness(
  actor: Actor,
  fields: BusinessFields,
): Promise<Created> {
  const check = checkBusinessProfile(fields);
  if (!check.ok) return check;
  if (!isPaymentTerms(fields.paymentTerms)) {
    return refuse("Choose the payment terms.", "paymentTerms");
  }
  return db.$transaction(async (tx) => {
    const taken = await tx.business.findFirst({
      where: {
        kind: "agent",
        name: { equals: fields.name, mode: "insensitive" },
      },
      select: { id: true },
    });
    if (taken) {
      return refuse(`An agent named ${fields.name} exists already.`, "name");
    }
    const business = await tx.business.create({
      data: { ...fields, kind: "agent", status: "active" },
      select: { id: true },
    });
    await logActivity(tx, actor, {
      action: "business.created",
      entityId: business.id,
      after: fields,
    });
    return { ok: true, id: business.id };
  });
}

/** Changes an agent's profile; its terms are `changeBusinessTerms`'. Saving what is there logs nothing. */
export async function updateBusiness(
  actor: Actor,
  id: string,
  profile: BusinessProfile,
): Promise<Change> {
  const check = checkBusinessProfile(profile);
  if (!check.ok) return check;
  return db.$transaction(async (tx) => {
    const business = await tx.business.findUnique({ where: { id } });
    if (!business) return refuse("This agent was deleted meanwhile.");
    const changed = changedFields<BusinessProfile>(
      {
        name: business.name,
        registrationNo: business.registrationNo,
        contactName: business.contactName,
        contactPhone: business.contactPhone,
        contactEmail: business.contactEmail,
        address: business.address,
      },
      profile,
    );
    if (!changed) return { ok: true };
    await tx.business.update({ where: { id }, data: changed.after });
    await logActivity(tx, actor, {
      action: "business.updated",
      entityId: id,
      before: changed.before,
      after: changed.after,
    });
    return { ok: true };
  });
}

/**
 * Changes an agent's payment terms or days to pay, going forward: what
 * is billed already stays as it is, what is not is billed by the new
 * terms. No document is made by the change itself. Finance's, with why.
 */
export async function changeBusinessTerms(
  actor: Actor,
  id: string,
  input: { paymentTerms: PaymentTerms; daysToPay: number; reason: string },
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { id },
      select: { paymentTerms: true, daysToPay: true },
    });
    if (!business) return refuse("This agent was deleted meanwhile.");
    if (
      business.paymentTerms === input.paymentTerms &&
      business.daysToPay === input.daysToPay
    ) {
      return refuse("These are its terms already.", "paymentTerms");
    }
    await tx.business.update({
      where: { id },
      data: { paymentTerms: input.paymentTerms, daysToPay: input.daysToPay },
    });
    await logActivity(tx, actor, {
      action: "business.terms.changed",
      entityId: id,
      before: business,
      after: {
        paymentTerms: input.paymentTerms,
        daysToPay: input.daysToPay,
        reason: input.reason,
      },
    });
    return { ok: true };
  });
}

/** Makes an agent active or inactive: inactive takes no new bookings, and is still billed. */
export async function setBusinessStatus(
  actor: Actor,
  id: string,
  status: BusinessStatus,
): Promise<Change> {
  if (!isBusinessStatus(status)) return refuse("Choose active or inactive.");
  return db.$transaction(async (tx) => {
    const business = await tx.business.findUnique({
      where: { id },
      select: { status: true },
    });
    if (!business) return refuse("This agent was deleted meanwhile.");
    if (business.status === status) return { ok: true };
    await tx.business.update({ where: { id }, data: { status } });
    await logActivity(tx, actor, {
      action: "business.status.changed",
      entityId: id,
      before: { status: business.status },
      after: { status },
    });
    return { ok: true };
  });
}

/** Refuses a business a new booking cannot come through: gone, or inactive. */
export async function checkBookableBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
): Promise<Change> {
  const business = await tx.business.findUnique({
    where: { id: businessId },
    select: { status: true },
  });
  return business?.status === "active"
    ? { ok: true }
    : refuse(
        "That agent was just removed or made inactive. Choose the agent again.",
      );
}
