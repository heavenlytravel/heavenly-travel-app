import type { Actor } from "./activity-actions";
import { logActivity } from "./activity";
import { lastBookingNumber, nextBookingNumber } from "./booking-counter";
import {
  bookingLabelOf,
  documentLabelOf,
  formatDocumentNumber,
} from "./booking-number";
import {
  billingPlanOf,
  billingPlanSentence,
  billToOf,
  dueAtOf,
  invoiceMoneyOf,
  isCredit,
  isInvoiceStatus,
  localDayOf,
  localDayStart,
  periodHasEnded,
  periodLabel,
  periodOf,
  spreadPayment,
  sumMoney,
  type BilledInvoice,
  type BillingPeriod,
  type BillingPlan,
  type BillTo,
  type InvoiceBilled,
  type InvoiceIssuedWhen,
  type InvoiceMoney,
  type InvoiceStatus,
  type InvoiceType,
  type PaymentMethod,
  type PaymentState,
} from "./billing-rules";
import { refuse, type Change, type Refusal } from "./change";
import { db } from "./client";
import type { MadeOrder } from "./list-order";
import type { Prisma } from "./generated/prisma/client";
import { formatMyr } from "./money";
import {
  revisionSnapshotOf,
  type RevisionDetail,
  type SnapshotTrip,
} from "./revision-rules";
import { latestRevisionOf, withDetails } from "./revisions";

type Tx = Prisma.TransactionClient;

/**
 * Billing: the invoices and credit notes a booking's changes make, the
 * month-end run, voids, and payments. Every rule is in ./billing-rules;
 * this reads and writes them. Staff never type an amount on an invoice:
 * the amounts come from the bookings, and an issued document never
 * changes. A live booking not on credit has one open invoice, numbered
 * when it is confirmed, that follows it: payments go on it as they come
 * in, and it is issued in full, its number kept, when the booking ends or
 * by Finance. Finance's (`invoices.manage`), except what follows a
 * booking's own change, which bills inside that change's transaction. See
 * docs/261108-billing-and-revisions.md, "Billing rules in code" and "One
 * open invoice per booking".
 */

/** What billing reads of a booking. */
const BILLED_BOOKING = {
  id: true,
  number: true,
  status: true,
  confirmedAt: true,
  priceTotalSen: true,
  startsAt: true,
  contactName: true,
  contactPhone: true,
  contactEmail: true,
  user: { select: { email: true } },
  business: {
    select: {
      id: true,
      name: true,
      contactEmail: true,
      contactPhone: true,
      address: true,
      registrationNo: true,
      paymentTerms: true,
      daysToPay: true,
    },
  },
} as const satisfies Prisma.BookingSelect;

type BilledBooking = Prisma.BookingGetPayload<{
  select: typeof BILLED_BOOKING;
}>;

/** Who a booking is billed to now: its business, or its contact. */
function billToOfBooking(booking: BilledBooking): BillTo {
  const business = booking.business;
  if (business) {
    return {
      name: business.name,
      email: business.contactEmail,
      phone: business.contactPhone,
      address: business.address,
      registrationNo: business.registrationNo,
      businessId: business.id,
    };
  }
  return {
    name: booking.contactName,
    email: booking.contactEmail ?? booking.user?.email ?? "",
    phone: booking.contactPhone,
    address: "",
    registrationNo: "",
    businessId: null,
  };
}

/** When a booking's invoice issued now is due. */
function dueOf(booking: BilledBooking, issuedAt: Date) {
  return booking.business
    ? dueAtOf(issuedAt, { daysToPay: booking.business.daysToPay })
    : dueAtOf(issuedAt, { firstPickup: booking.startsAt });
}

/**
 * The issued invoices a booking is on, newest first, each with what it
 * nets for the booking after the credit notes against it: what a
 * reduction credits, in that order.
 */
async function billedInvoicesOf(
  client: Tx,
  bookingId: string,
): Promise<BilledInvoice[]> {
  const lines = await client.invoiceLine.findMany({
    where: { bookingId, invoice: { status: "issued" } },
    select: {
      amountSen: true,
      invoice: {
        select: {
          id: true,
          type: true,
          number: true,
          issuedAt: true,
          creditsId: true,
        },
      },
    },
  });
  const byInvoice = new Map<
    string,
    { invoiceId: string; label: string; netSen: number; issuedAt: number }
  >();
  for (const line of lines.filter((l) => l.invoice.type === "invoice")) {
    const at = byInvoice.get(line.invoice.id);
    if (at) at.netSen += line.amountSen;
    else {
      byInvoice.set(line.invoice.id, {
        invoiceId: line.invoice.id,
        label: documentLabelOf(line.invoice),
        netSen: line.amountSen,
        issuedAt: line.invoice.issuedAt?.getTime() ?? 0,
      });
    }
  }
  for (const line of lines.filter((l) => l.invoice.type === "credit")) {
    const credited = line.invoice.creditsId
      ? byInvoice.get(line.invoice.creditsId)
      : undefined;
    if (credited) credited.netSen += line.amountSen;
  }
  return [...byInvoice.values()]
    .sort((a, b) => b.issuedAt - a.issuedAt)
    .map(({ invoiceId, label, netSen }) => ({ invoiceId, label, netSen }));
}

/** What a booking has been billed: its lines on issued invoices and credit notes. */
async function billedSenOf(client: Tx, bookingId: string) {
  const { _sum } = await client.invoiceLine.aggregate({
    where: { bookingId, invoice: { status: "issued" } },
    _sum: { amountSen: true },
  });
  return _sum.amountSen ?? 0;
}

/** Completed or cancelled: what it owes is issued at once, nothing waits on an open invoice. */
function hasEnded(status: string) {
  return status === "completed" || status === "cancelled";
}

function onCredit(booking: BilledBooking) {
  return booking.business ? isCredit(booking.business.paymentTerms) : false;
}

/**
 * What billing plans for a booking were it to charge `chargedSen`: a
 * credit agent's booking on the agent's month-end invoice, any other on
 * its own. With `now`, what issuing now bills: Finance's Issue now,
 * ended or not.
 */
async function planFor(
  client: Tx,
  booking: BilledBooking,
  chargedSen: number,
  { now = false }: { now?: boolean } = {},
): Promise<BillingPlan> {
  return billingPlanOf({
    confirmed: booking.confirmedAt !== null,
    credit: now ? false : await isMonthly(client, booking),
    ended: now || hasEnded(booking.status),
    chargedSen,
    billed: await billedInvoicesOf(client, booking.id),
  });
}

type IssueInput = {
  type: InvoiceType;
  billTo: BillTo;
  lines: {
    bookingId: string;
    revisionId: string | null;
    description: string;
    amountSen: number;
  }[];
  creditsId?: string | null;
  period?: BillingPeriod | null;
  dueAt: Date | null;
};

/**
 * Issues an invoice or a credit note in one step: its number from its
 * counter (locked to the end of the transaction), its total frozen, who
 * it is billed to frozen. Logged on the document and on each booking.
 */
async function issueDocument(
  tx: Tx,
  actor: Actor,
  input: IssueInput,
  now: Date,
): Promise<{ id: string; label: string }> {
  const number = await nextBookingNumber(
    tx,
    input.type === "credit" ? "credit" : "invoice",
  );
  const totalSen = input.lines.reduce((sum, l) => sum + l.amountSen, 0);
  const created = await tx.invoice.create({
    data: {
      type: input.type,
      number,
      status: "issued" satisfies InvoiceStatus,
      businessId: input.billTo.businessId,
      billTo: input.billTo,
      periodStart: input.period
        ? new Date(`${input.period.start}T00:00:00Z`)
        : null,
      periodEnd: input.period
        ? new Date(`${input.period.end}T00:00:00Z`)
        : null,
      creditsId: input.creditsId ?? null,
      totalSen,
      issuedAt: now,
      dueAt: input.dueAt,
      createdById: "userId" in actor ? actor.userId : null,
      issuedById: "userId" in actor ? actor.userId : null,
      lines: { create: input.lines },
    },
    select: { id: true, type: true, number: true },
  });
  const label = documentLabelOf(created);
  await logIssued(
    tx,
    actor,
    { id: created.id, label, totalSen, billTo: input.billTo },
    input.lines,
  );
  return { id: created.id, label };
}

/** Logs a document issued, on it and on each booking it bills. */
async function logIssued(
  tx: Tx,
  actor: Actor,
  doc: { id: string; label: string; totalSen: number; billTo: BillTo },
  lines: readonly { bookingId: string; amountSen: number }[],
) {
  await logActivity(tx, actor, {
    action: "invoice.issued",
    entityId: doc.id,
    after: {
      document: doc.label,
      totalSen: doc.totalSen,
      billTo: doc.billTo.name,
    },
  });
  for (const line of lines) {
    await logActivity(tx, actor, {
      action: "booking.billed",
      entityId: line.bookingId,
      after: { document: doc.label, amountSen: line.amountSen },
    });
  }
}

/**
 * A booking's line on an invoice: its first bill names the booking; a
 * later one, the revisions since the last bill, which an open invoice
 * gathers: "HTB-0042 Amendments 3–5: Stop at B added; Late charge; Discount".
 */
async function lineDescription(
  tx: Tx,
  booking: { id: string; number: number | null },
  revision: { number: number } | null,
) {
  const label = bookingLabelOf(booking);
  if (!revision) return label;
  const last = await tx.invoiceLine.findFirst({
    where: {
      bookingId: booking.id,
      invoice: { status: "issued" },
      revisionId: { not: null },
    },
    orderBy: { revision: { number: "desc" } },
    select: { revision: { select: { number: true } } },
  });
  if (!last?.revision) return label;
  const since = await tx.bookingRevision.findMany({
    where: {
      bookingId: booking.id,
      number: { gt: last.revision.number, lte: revision.number },
    },
    orderBy: { number: "asc" },
    select: { number: true, summary: true },
  });
  const first = since[0];
  const latest = since.at(-1);
  if (!first || !latest) return label;
  const range =
    first === latest
      ? `Amendment ${first.number}`
      : `Amendments ${first.number}–${latest.number}`;
  return `${label} ${range}: ${since.map((r) => r.summary).join("; ")}`;
}

type IssuingPlan = Extract<BillingPlan, { kind: "invoice" | "credit" }>;

/** A booking's line as billed now: its latest revision, and the words for it. */
async function lineOf(tx: Tx, booking: BilledBooking, amountSen: number) {
  const revision = await latestRevisionOf(tx, booking.id);
  return {
    revisionId: revision?.id ?? null,
    description: await lineDescription(tx, booking, revision),
    amountSen,
  };
}

/**
 * Issues what a plan asks for one booking: its open invoice, its number
 * kept, or a new invoice when it has none (a change after it ended); or
 * credit notes against its invoices. Each line names the booking's latest
 * revision.
 */
async function issuePlan(
  tx: Tx,
  actor: Actor,
  booking: BilledBooking,
  plan: IssuingPlan,
  now: Date,
): Promise<{ id: string; label: string }[]> {
  const billTo = billToOfBooking(booking);
  const line = async (amountSen: number) => ({
    bookingId: booking.id,
    ...(await lineOf(tx, booking, amountSen)),
  });
  if (plan.kind === "invoice") {
    const open = await ownOpenOf(tx, booking.id);
    if (open) {
      return [
        await issueOpen(tx, actor, booking, open.id, plan.amountSen, now),
      ];
    }
    return [
      await issueDocument(
        tx,
        actor,
        {
          type: "invoice",
          billTo,
          lines: [await line(plan.amountSen)],
          dueAt: dueOf(booking, now),
        },
        now,
      ),
    ];
  }
  const issued: { id: string; label: string }[] = [];
  for (const note of plan.notes) {
    issued.push(
      await issueDocument(
        tx,
        actor,
        {
          type: "credit",
          billTo,
          creditsId: note.invoiceId,
          lines: [await line(note.amountSen)],
          dueAt: null,
        },
        now,
      ),
    );
  }
  return issued;
}

const OPEN_SELECT = {
  id: true,
  type: true,
  number: true,
  createdAt: true,
  periodStart: true,
  periodEnd: true,
  _count: { select: { payments: { where: { reversedAt: null } } } },
} as const satisfies Prisma.InvoiceSelect;

/** The booking's own open invoice, with how many live payments it holds. */
function ownOpenOf(client: Tx, bookingId: string) {
  return client.invoice.findFirst({
    where: {
      status: "open",
      periodStart: null,
      lines: { some: { bookingId } },
    },
    select: OPEN_SELECT,
  });
}

/** The agent's open month-end invoice the booking is a line of. */
function periodOpenOf(client: Tx, bookingId: string) {
  return client.invoice.findFirst({
    where: {
      status: "open",
      periodStart: { not: null },
      lines: { some: { bookingId } },
    },
    select: OPEN_SELECT,
  });
}

type OpenInvoice = NonNullable<Awaited<ReturnType<typeof ownOpenOf>>>;

/**
 * A credit agent's booking billed on an invoice of its own: one Finance
 * split out ("Bill on its own"), or one invoiced on its own from before
 * its agent was on credit. It is billed as a direct booking from then on.
 */
async function billedAloneOf(client: Tx, bookingId: string) {
  const own = await client.invoiceLine.count({
    where: {
      bookingId,
      invoice: {
        type: "invoice",
        periodStart: null,
        status: { in: ["open", "issued"] },
      },
    },
  });
  return own > 0;
}

/** Billed on its agent's month-end invoice: on credit terms, and not split out. */
async function isMonthly(client: Tx, booking: BilledBooking) {
  return onCredit(booking) && !(await billedAloneOf(client, booking.id));
}

/** A run's period as the database keeps its first day. */
const periodStartOf = (period: BillingPeriod) =>
  new Date(`${period.start}T00:00:00Z`);

/**
 * The period whose month-end invoice a credit agent's booking goes on:
 * its first pick-up's, unless that one is issued already; then today's,
 * or the first after it not issued (a late charge, a booking confirmed
 * after its month was billed).
 */
async function targetPeriodOf(
  client: Tx,
  booking: BilledBooking,
  now: Date,
): Promise<BillingPeriod> {
  const terms = booking.business?.paymentTerms ?? "";
  if (!booking.business || !isCredit(terms)) {
    throw new Error(
      "Only a credit agent's booking goes on a month-end invoice.",
    );
  }
  const businessId = booking.business.id;
  const issued = async (period: BillingPeriod) =>
    (await client.invoice.count({
      where: {
        businessId,
        type: "invoice",
        status: "issued",
        periodStart: periodStartOf(period),
      },
    })) > 0;
  const own = periodOf(localDayOf(booking.startsAt), terms);
  if (!(await issued(own))) return own;
  let period = periodOf(localDayOf(now), terms);
  while (await issued(period)) {
    const after = new Date(`${period.end}T00:00:00Z`);
    after.setUTCDate(after.getUTCDate() + 1);
    period = periodOf(after.toISOString().slice(0, 10), terms);
  }
  return period;
}

/**
 * The agent's open month-end invoice for the booking's period, opened
 * when the first booking of the period needs it, numbered when issued. The
 * agent's row is held, so two saves never open two for one period.
 */
async function periodInvoiceFor(
  tx: Tx,
  actor: Actor,
  booking: BilledBooking,
  now: Date,
): Promise<{ id: string }> {
  const business = booking.business!;
  await tx.$executeRaw`SELECT id FROM "Business" WHERE id = ${business.id} FOR UPDATE`;
  const period = await targetPeriodOf(tx, booking, now);
  const open = await tx.invoice.findFirst({
    where: {
      businessId: business.id,
      type: "invoice",
      status: "open",
      periodStart: periodStartOf(period),
    },
    select: { id: true },
  });
  if (open) return open;
  const billTo = billToOfBooking(booking);
  const opened = await tx.invoice.create({
    data: {
      type: "invoice",
      status: "open" satisfies InvoiceStatus,
      businessId: business.id,
      billTo,
      periodStart: periodStartOf(period),
      periodEnd: new Date(`${period.end}T00:00:00Z`),
      totalSen: 0,
      createdById: "userId" in actor ? actor.userId : null,
    },
    select: { id: true, type: true, number: true },
  });
  await logActivity(tx, actor, {
    action: "invoice.opened",
    entityId: opened.id,
    after: { period: periodLabel(period), billTo: billTo.name },
  });
  return opened;
}

/**
 * The number an open invoice takes as it is issued: the next from the
 * counter, so numbers run in the order invoices are issued and none is
 * lost to an invoice that never was. One numbered before this rule keeps
 * its own.
 */
async function numberOnIssue(tx: Tx, invoiceId: string): Promise<number> {
  const { number } = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: { number: true },
  });
  return number ?? (await nextBookingNumber(tx, "invoice"));
}

/**
 * Drops an open invoice nothing was paid on, with why. Not numbered yet,
 * it leaves no gap; the log keeps that it was.
 */
async function dropOpen(
  tx: Tx,
  actor: Actor,
  open: { id: string; type: string; number: number | null },
  reason: string,
) {
  await tx.invoice.delete({ where: { id: open.id } });
  await logActivity(tx, actor, {
    action: "invoice.dropped",
    entityId: open.id,
    after: { reason },
  });
}

/**
 * An open month-end invoice's total, its lines' sum, after a line came,
 * moved or went. One left with no booking and nothing paid is dropped.
 */
async function retotalPeriod(tx: Tx, actor: Actor, invoiceId: string) {
  const doc = await tx.invoice.findUniqueOrThrow({
    where: { id: invoiceId },
    select: {
      ...OPEN_SELECT,
      lines: { select: { amountSen: true } },
    },
  });
  if (doc.lines.length === 0 && doc._count.payments === 0) {
    await dropOpen(tx, actor, doc, "No booking is left on it.");
    return;
  }
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { totalSen: doc.lines.reduce((sum, l) => sum + l.amountSen, 0) },
  });
}

/** Takes the booking's line off an open month-end invoice. */
async function leavePeriod(
  tx: Tx,
  actor: Actor,
  bookingId: string,
  invoiceId: string,
) {
  await tx.invoiceLine.deleteMany({ where: { invoiceId, bookingId } });
  await retotalPeriod(tx, actor, invoiceId);
}

/**
 * Issues the booking's own open invoice for `amountSen`, numbered now,
 * its payments kept: the amount, who it is billed to, its revision and
 * when it is due frozen now.
 */
async function issueOpen(
  tx: Tx,
  actor: Actor,
  booking: BilledBooking,
  invoiceId: string,
  amountSen: number,
  now: Date,
): Promise<{ id: string; label: string }> {
  const billTo = billToOfBooking(booking);
  const line = await lineOf(tx, booking, amountSen);
  const issued = await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      number: await numberOnIssue(tx, invoiceId),
      status: "issued" satisfies InvoiceStatus,
      totalSen: amountSen,
      businessId: billTo.businessId,
      billTo,
      issuedAt: now,
      dueAt: dueOf(booking, now),
      issuedById: "userId" in actor ? actor.userId : null,
      lines: { updateMany: { where: { bookingId: booking.id }, data: line } },
    },
    select: { id: true, type: true, number: true },
  });
  const label = documentLabelOf(issued);
  await logIssued(
    tx,
    actor,
    { id: issued.id, label, totalSen: amountSen, billTo },
    [{ bookingId: booking.id, amountSen }],
  );
  return { id: issued.id, label };
}

/**
 * The booking's own open invoice, opened now for `amountSen`, numbered
 * when issued: on confirming, or when Finance bills it on its own.
 */
async function openOwn(
  tx: Tx,
  actor: Actor,
  booking: BilledBooking,
  amountSen: number,
  now: Date,
): Promise<{ id: string; label: string }> {
  const billTo = billToOfBooking(booking);
  const opened = await tx.invoice.create({
    data: {
      type: "invoice",
      status: "open" satisfies InvoiceStatus,
      businessId: billTo.businessId,
      billTo,
      totalSen: amountSen,
      dueAt: dueOf(booking, now),
      createdById: "userId" in actor ? actor.userId : null,
      lines: {
        create: [
          { bookingId: booking.id, ...(await lineOf(tx, booking, amountSen)) },
        ],
      },
    },
    select: { id: true, type: true, number: true },
  });
  const label = documentLabelOf(opened);
  await logActivity(tx, actor, {
    action: "invoice.opened",
    entityId: opened.id,
    after: { totalSen: amountSen, billTo: billTo.name },
  });
  return { id: opened.id, label };
}

/**
 * Keeps the open invoice a confirmed booking is on as the rules ask. Its
 * amount there is what the booking has not been billed yet, never below
 * nothing, with its revision and billed-to, after every change.
 *
 * A credit agent's booking is a line of the agent's open month-end
 * invoice for its period, moved when its period moves, taken off when
 * nothing is left to bill. It stays there when the booking ends: the
 * invoice is issued when the period ends.
 *
 * Any other booking has its own open invoice, numbered the first time it
 * has something to bill, so the payments on it read Paid, then Partially
 * paid after an amend that charges more. When it ends, what is left was
 * issued on it (./settleBilling); one left over is closed.
 */
async function syncOpenInvoice(
  tx: Tx,
  actor: Actor,
  booking: BilledBooking,
  now: Date,
) {
  if (booking.confirmedAt === null) return;
  const amountSen = Math.max(
    0,
    booking.priceTotalSen - (await billedSenOf(tx, booking.id)),
  );
  const onPeriod = await periodOpenOf(tx, booking.id);
  if (await isMonthly(tx, booking)) {
    const target =
      amountSen > 0 ? await periodInvoiceFor(tx, actor, booking, now) : null;
    if (onPeriod && onPeriod.id !== target?.id) {
      await leavePeriod(tx, actor, booking.id, onPeriod.id);
    }
    if (target) {
      const line = await lineOf(tx, booking, amountSen);
      await tx.invoiceLine.upsert({
        where: {
          invoiceId_bookingId: { invoiceId: target.id, bookingId: booking.id },
        },
        create: { invoiceId: target.id, bookingId: booking.id, ...line },
        update: line,
      });
      await retotalPeriod(tx, actor, target.id);
    }
    return;
  }
  if (onPeriod) await leavePeriod(tx, actor, booking.id, onPeriod.id);
  const open = await ownOpenOf(tx, booking.id);
  if (hasEnded(booking.status)) {
    if (open) await closeOpen(tx, actor, booking, open, now);
    return;
  }
  if (!open) {
    if (amountSen > 0) await openOwn(tx, actor, booking, amountSen, now);
    return;
  }
  const billTo = billToOfBooking(booking);
  await tx.invoice.update({
    where: { id: open.id },
    data: {
      totalSen: amountSen,
      businessId: billTo.businessId,
      billTo,
      dueAt: dueOf(booking, open.createdAt),
      lines: {
        updateMany: {
          where: { bookingId: booking.id },
          data: await lineOf(tx, booking, amountSen),
        },
      },
    },
  });
}

/**
 * The own open invoice of a booking that has ended with nothing left on
 * it: issued as it stands when money was paid on it, so the payments keep
 * their invoice (a cancelled booking's, to refund); else dropped.
 */
async function closeOpen(
  tx: Tx,
  actor: Actor,
  booking: BilledBooking,
  open: OpenInvoice,
  now: Date,
) {
  if (open._count.payments > 0) {
    const unbilled =
      booking.priceTotalSen - (await billedSenOf(tx, booking.id));
    await issueOpen(tx, actor, booking, open.id, Math.max(0, unbilled), now);
    return;
  }
  await dropOpen(
    tx,
    actor,
    open,
    "Nothing was left to bill when the booking ended.",
  );
}

/** A booking as billing reads it, its row held to the end of the transaction. */
async function heldBooking(tx: Tx, bookingId: string) {
  await tx.$executeRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
  return tx.booking.findUnique({
    where: { id: bookingId },
    select: BILLED_BOOKING,
  });
}

/**
 * Bills what a booking's change asks, inside the change's transaction,
 * after the booking is refreshed and its revision written
 * (`billingPlanOf`): while there is an open invoice to hold it, the
 * difference only moves that; a booking of its own that has ended issues
 * what is due at once: its open invoice, its number kept, when the last
 * trip is done or the booking is cancelled, a new invoice for more after
 * that, or credit notes for less. A credit agent's booking stays on the
 * agent's month-end invoice; less than it was billed is a credit note at
 * once. Answers the documents issued, for the save's message.
 */
export async function settleBilling(
  tx: Tx,
  actor: Actor,
  bookingId: string,
  now: Date,
): Promise<string[]> {
  const booking = await tx.booking.findUniqueOrThrow({
    where: { id: bookingId },
    select: BILLED_BOOKING,
  });
  const plan = await planFor(tx, booking, booking.priceTotalSen);
  const issued =
    plan.kind === "invoice" || plan.kind === "credit"
      ? await issuePlan(tx, actor, booking, plan, now)
      : [];
  await syncOpenInvoice(tx, actor, booking, now);
  return issued.map((doc) => doc.label);
}

/**
 * db:set-billing's: one invoice of the old system issued again in the new
 * series, dated as it was, a line per booking for its total now, naming
 * the old number. Billed to the first booking's agent or contact. With
 * `paid`, the old row said fully paid: a payment for the total, method
 * Other. Null when its bookings charge nothing. The bookings are confirmed
 * and billed nothing yet; the caller holds them.
 */
export async function issueOldInvoice(
  tx: Tx,
  actor: Actor,
  input: {
    bookingIds: readonly string[];
    oldNumber: ReadonlyMap<string, string>;
    issuedAt: Date;
    paid: { at: Date } | null;
  },
): Promise<{ id: string; label: string; totalSen: number } | null> {
  const bookings = await tx.booking.findMany({
    where: { id: { in: [...input.bookingIds] } },
    orderBy: { startsAt: "asc" },
    select: BILLED_BOOKING,
  });
  const lines: IssueInput["lines"] = [];
  for (const booking of bookings) {
    if (booking.priceTotalSen <= 0) continue;
    const revision = await latestRevisionOf(tx, booking.id);
    const old = input.oldNumber.get(booking.id);
    lines.push({
      bookingId: booking.id,
      revisionId: revision?.id ?? null,
      description: [bookingLabelOf(booking), old ? `old invoice ${old}` : null]
        .filter(Boolean)
        .join(", "),
      amountSen: booking.priceTotalSen,
    });
  }
  const first = bookings[0];
  if (!first || lines.length === 0) return null;
  const issued = await issueDocument(
    tx,
    actor,
    {
      type: "invoice",
      billTo: billToOfBooking(first),
      lines,
      dueAt: dueOf(first, input.issuedAt),
    },
    input.issuedAt,
  );
  const totalSen = lines.reduce((sum, l) => sum + l.amountSen, 0);
  if (input.paid) {
    const paidAt = input.paid.at;
    // A payment per booking, so each reads its own.
    await tx.payment.createMany({
      data: lines.map((line) => ({
        invoiceId: issued.id,
        bookingId: line.bookingId,
        amountSen: line.amountSen,
        method: "other" satisfies PaymentMethod,
        paidAt,
        note: "Paid before the switch-over",
      })),
    });
  }
  return { ...issued, totalSen };
}

/** What saving a change would bill, in a sentence, for the save to show first. */
export type BillingPreview = { plan: BillingPlan; sentence: string };

/**
 * The sentence for a plan, naming the open invoice it goes on when there
 * is one, else the next number: the booking's own, or its agent's
 * month-end invoice for its period. `monthly` without a booking: a new
 * credit agent's booking, its period not known yet.
 */
async function previewOf(
  client: Tx,
  plan: BillingPlan,
  {
    verb,
    booking,
    monthly = false,
  }: { verb?: string; booking?: BilledBooking; monthly?: boolean } = {},
) {
  const [invoice, credit] = await Promise.all([
    lastBookingNumber(client, "invoice"),
    lastBookingNumber(client, "credit"),
  ]);
  let opened = false;
  let period: string | undefined = monthly ? "" : undefined;
  if (booking && (await isMonthly(client, booking))) {
    period = periodLabel(await targetPeriodOf(client, booking, new Date()));
  } else if (booking) {
    opened = (await ownOpenOf(client, booking.id)) !== null;
  }
  return billingPlanSentence(
    plan,
    {
      invoice: formatDocumentNumber("invoice", invoice + 1),
      credit: (index) => formatDocumentNumber("credit", credit + 1 + index),
      opened,
      period,
    },
    verb,
  );
}

/**
 * What saving a booking at `chargedSen` would bill, as `settleBilling`
 * would, and nothing given: the next number may go to another save first.
 * `confirmed` stands for a save that confirms it. Null when the booking
 * is gone.
 */
export async function billingPreviewOf(
  bookingId: string,
  chargedSen: number,
  { confirms = false }: { confirms?: boolean } = {},
): Promise<BillingPreview | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: BILLED_BOOKING,
  });
  if (!booking) return null;
  const saved = confirms
    ? { ...booking, confirmedAt: booking.confirmedAt ?? new Date() }
    : booking;
  const plan = await planFor(db, saved, chargedSen);
  return {
    plan,
    sentence: await previewOf(db, plan, {
      verb: confirms ? "Confirming" : undefined,
      booking: saved,
    }),
  };
}

/**
 * What making a booking in Manage and confirming it bills: its own open
 * invoice for its total, or a line on its agent's month-end invoice for
 * an agent on credit. Saved as received, nothing is billed until it is
 * confirmed.
 */
export async function newBookingBillingPreview(input: {
  businessId: string | null;
  chargedSen: number;
}): Promise<BillingPreview> {
  const business = input.businessId
    ? await db.business.findUnique({
        where: { id: input.businessId },
        select: { paymentTerms: true },
      })
    : null;
  const monthly = business ? isCredit(business.paymentTerms) : false;
  const plan = billingPlanOf({
    confirmed: true,
    credit: monthly,
    ended: false,
    chargedSen: input.chargedSen,
    billed: [],
  });
  return {
    plan,
    sentence: await previewOf(db, plan, { verb: "Confirming", monthly }),
  };
}

/* A booking's billing, for its page */

export const DOCUMENT_MONEY = {
  id: true,
  type: true,
  number: true,
  status: true,
  totalSen: true,
  dueAt: true,
  issuedAt: true,
  creditsId: true,
  billTo: true,
  periodStart: true,
  periodEnd: true,
  lines: { select: { bookingId: true, amountSen: true } },
  payments: {
    where: { reversedAt: null },
    select: { amountSen: true, bookingId: true },
  },
  creditNotes: {
    where: { status: "issued" },
    select: {
      totalSen: true,
      lines: { select: { bookingId: true, amountSen: true } },
      payments: {
        where: { reversedAt: null },
        select: { amountSen: true, bookingId: true },
      },
    },
  },
} as const satisfies Prisma.InvoiceSelect;

type DocumentRow = Prisma.InvoiceGetPayload<{ select: typeof DOCUMENT_MONEY }>;

/**
 * An open or issued invoice's money, its credit notes folded in; null for
 * a credit note or a void one. With `bookingId`, that booking's share
 * only: its lines, its credit notes' lines and the payments for it, so
 * a booking on an agent's month-end invoice reads its own amount and
 * payments, never the other bookings'.
 */
export function moneyOf(
  doc: DocumentRow,
  now: Date,
  bookingId?: string,
): InvoiceMoney | null {
  if (doc.status !== "issued" && doc.status !== "open") return null;
  if (doc.type === "credit") return null;
  const sum = (rows: readonly { amountSen: number; bookingId: string }[]) =>
    rows
      .filter((r) => bookingId === undefined || r.bookingId === bookingId)
      .reduce((total, r) => total + r.amountSen, 0);
  return invoiceMoneyOf({
    totalSen: bookingId === undefined ? doc.totalSen : sum(doc.lines),
    creditSen: doc.creditNotes.reduce(
      (total, c) =>
        total + (bookingId === undefined ? c.totalSen : sum(c.lines)),
      0,
    ),
    paidSen:
      sum(doc.payments) +
      doc.creditNotes.reduce((total, c) => total + sum(c.payments), 0),
    dueAt: doc.dueAt,
    now,
  });
}

/** One document a booking is on, as its page lists it. */
export type BookingDocument = {
  id: string;
  type: InvoiceType;
  label: string;
  status: InvoiceStatus;
  /** What it bills or credits this booking. */
  amountSen: number;
  /** The line: "HTB-0042 Amendment 3: Stop at Pantai Cenang added". */
  description: string;
  /** The revision (amendment) it bills up to: 3. */
  revisionNumber: number | null;
  issuedAt: Date | null;
  dueAt: Date | null;
  /** This booking's share of an invoice's money, credit notes folded in; null for a credit note or a void one. */
  money: InvoiceMoney | null;
  /** A credit note's invoice. */
  credits: string | null;
  creditsId: string | null;
  /** A month-end run's period. */
  period: string | null;
};

/** A booking's billing at a glance, for its page. */
export type BookingBilling = {
  documents: BookingDocument[];
  /** The old system's invoice number: a note for the team, it bills nothing. */
  oldInvoiceNumber: string | null;
  /** On its agent's month-end invoice: on credit terms, not billed on its own. */
  monthly: boolean;
  /** Completed or cancelled: what is due is issued at once. */
  ended: boolean;
  billedSen: number;
  /** What it charges less what is billed; 0 before it is confirmed. Negative: a credit to give. */
  unbilledSen: number;
  /** The open invoice it is on: its own, or its agent's month-end one. */
  open: { id: string; label: string; period: string | null } | null;
  /**
   * Its money on every invoice it is on, its own or its agent's month-end
   * one, this booking's share only; null before any.
   */
  money: InvoiceMoney | null;
  /** The payments and refunds for it, on any document, the oldest first; reversed ones too. */
  payments: BookingPayment[];
  /**
   * Where a payment for it is recorded: the oldest invoice it still owes
   * on, the open one last. Null once nothing is owed.
   */
  payTo: { id: string; label: string; balanceSen: number } | null;
  /** An invoice it paid over on, with what is to refund. */
  refundFrom: { id: string; label: string; refundSen: number } | null;
};

/** One payment in or refund out for a booking. */
export type BookingPayment = {
  id: string;
  documentId: string;
  /** The document it is on: HTI-0012, "Open invoice". */
  document: string;
  /** Below nothing for a refund. */
  amountSen: number;
  method: string;
  paidAt: Date;
  note: string | null;
  reversedAt: Date | null;
  reverseReason: string | null;
};

export function periodOfRow(row: {
  periodStart: Date | null;
  periodEnd: Date | null;
}): string | null {
  return row.periodStart && row.periodEnd
    ? periodLabel({
        start: row.periodStart.toISOString().slice(0, 10),
        end: row.periodEnd.toISOString().slice(0, 10),
      })
    : null;
}

export async function bookingBillingOf(
  bookingId: string,
  now: Date = new Date(),
): Promise<BookingBilling | null> {
  const booking = await db.booking.findUnique({
    where: { id: bookingId },
    select: {
      priceTotalSen: true,
      confirmedAt: true,
      status: true,
      legacyInvoiceNumber: true,
      business: { select: { paymentTerms: true } },
      invoiceLines: {
        select: {
          amountSen: true,
          description: true,
          revision: { select: { number: true } },
          invoice: { select: DOCUMENT_MONEY },
        },
      },
    },
  });
  if (!booking) return null;
  const labels = new Map(
    booking.invoiceLines.map((l) => [l.invoice.id, documentLabelOf(l.invoice)]),
  );
  const payments = await db.payment.findMany({
    where: { bookingId },
    orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      invoiceId: true,
      amountSen: true,
      method: true,
      paidAt: true,
      note: true,
      reversedAt: true,
      reverseReason: true,
    },
  });
  const documents: BookingDocument[] = booking.invoiceLines
    .map((line) => ({
      id: line.invoice.id,
      type: (line.invoice.type === "credit"
        ? "credit"
        : "invoice") as InvoiceType,
      label: documentLabelOf(line.invoice),
      status: isInvoiceStatus(line.invoice.status)
        ? line.invoice.status
        : "issued",
      amountSen: line.amountSen,
      description: line.description,
      revisionNumber: line.revision?.number ?? null,
      issuedAt: line.invoice.issuedAt,
      dueAt: line.invoice.dueAt,
      money: moneyOf(line.invoice, now, bookingId),
      credits: line.invoice.creditsId
        ? (labels.get(line.invoice.creditsId) ?? null)
        : null,
      creditsId: line.invoice.creditsId,
      period: periodOfRow(line.invoice),
    }))
    .sort(
      (a, b) =>
        (a.issuedAt?.getTime() ?? Infinity) -
        (b.issuedAt?.getTime() ?? Infinity),
    );
  const billedSen = booking.invoiceLines
    .filter((l) => l.invoice.status === "issued")
    .reduce((sum, l) => sum + l.amountSen, 0);
  const open = documents.find((d) => d.status === "open");
  const alone = documents.some(
    (d) => d.type === "invoice" && d.period === null && d.status !== "void",
  );
  // Its share of each, oldest issued first and the open one last.
  const invoices = documents.flatMap((d) =>
    d.type === "invoice" && d.money ? [{ ...d, money: d.money }] : [],
  );
  const payTo = invoices.find((d) => d.money.balanceSen > 0);
  const overpaid = invoices.find((d) => d.money.balanceSen < 0);
  return {
    documents,
    oldInvoiceNumber: booking.legacyInvoiceNumber,
    monthly:
      !alone &&
      (booking.business ? isCredit(booking.business.paymentTerms) : false),
    ended: hasEnded(booking.status),
    billedSen,
    unbilledSen:
      booking.confirmedAt === null ? 0 : booking.priceTotalSen - billedSen,
    open: open ? { id: open.id, label: open.label, period: open.period } : null,
    money: sumMoney(
      invoices.map((d) => d.money),
      now,
    ),
    payments: payments.map(({ invoiceId, ...payment }) => ({
      ...payment,
      documentId: invoiceId,
      document: labels.get(invoiceId) ?? "",
    })),
    payTo: payTo
      ? {
          id: payTo.id,
          label: payTo.label,
          balanceSen: payTo.money.balanceSen,
        }
      : null,
    refundFrom: overpaid
      ? {
          id: overpaid.id,
          label: overpaid.label,
          refundSen: -overpaid.money.balanceSen,
        }
      : null,
  };
}

/* Finance's own billing */

/**
 * Finance's Issue now on one booking's own open invoice, in full: what
 * it has not been billed yet, issued at once, its number kept; less is
 * credit notes. Refused for a booking not confirmed, one with nothing to
 * bill, and one on its agent's month-end invoice.
 */
export async function billBookingNow(
  actor: Actor,
  bookingId: string,
  now: Date = new Date(),
): Promise<{ ok: true; id: string; label: string } | Refusal> {
  return db.$transaction(async (tx) => {
    const booking = await heldBooking(tx, bookingId);
    if (!booking) return refuse("This booking was deleted meanwhile.");
    return issueNow(tx, actor, booking, now);
  });
}

/** Issue now, inside the caller's transaction, the booking held. */
async function issueNow(
  tx: Tx,
  actor: Actor,
  booking: BilledBooking,
  now: Date,
): Promise<{ ok: true; id: string; label: string } | Refusal> {
  if (booking.confirmedAt === null) {
    return refuse("Only a confirmed booking is billed. Confirm it first.");
  }
  if (await isMonthly(tx, booking)) {
    return refuse(
      "This booking is on its agent's month-end invoice. Bill it on its own, or issue that invoice.",
    );
  }
  const plan = await planFor(tx, booking, booking.priceTotalSen, {
    now: true,
  });
  if (plan.kind !== "invoice" && plan.kind !== "credit") {
    return refuse("Nothing on this booking waits to be billed.");
  }
  const issued = await issuePlan(tx, actor, booking, plan, now);
  await syncOpenInvoice(tx, actor, booking, now);
  return { ok: true, ...issued[0]! };
}

/**
 * Finance's "Bill on its own" for a booking on its agent's open month-end
 * invoice: its line leaves that invoice for an invoice of its own, still
 * billed to the agent and due by the agent's days to pay. While the
 * booking is live the new one is open, numbered now and followed like any
 * booking's; once it has ended it is issued now. It stays on its own
 * after: later changes bill it alone.
 */
export async function billBookingAlone(
  actor: Actor,
  bookingId: string,
  now: Date = new Date(),
): Promise<{ ok: true; id: string; label: string } | Refusal> {
  return db.$transaction(async (tx) => {
    const booking = await heldBooking(tx, bookingId);
    if (!booking) return refuse("This booking was deleted meanwhile.");
    const from = await periodOpenOf(tx, booking.id);
    if (!from || !(await isMonthly(tx, booking))) {
      return refuse(
        "This booking is not on an open month-end invoice. Reload it.",
      );
    }
    const amountSen = Math.max(
      0,
      booking.priceTotalSen - (await billedSenOf(tx, booking.id)),
    );
    if (amountSen === 0) {
      return refuse("Nothing on this booking is left to bill.");
    }
    const own = hasEnded(booking.status)
      ? await issueDocument(
          tx,
          actor,
          {
            type: "invoice",
            billTo: billToOfBooking(booking),
            lines: [
              {
                bookingId: booking.id,
                ...(await lineOf(tx, booking, amountSen)),
              },
            ],
            dueAt: dueOf(booking, now),
          },
          now,
        )
      : await openOwn(tx, actor, booking, amountSen, now);
    // Billed alone now: its line leaves the month-end invoice.
    await syncOpenInvoice(tx, actor, booking, now);
    await logActivity(tx, actor, {
      action: "booking.billed.alone",
      entityId: booking.id,
      before: { document: documentLabelOf(from) },
      after: { document: own.label },
    });
    return { ok: true, ...own };
  });
}

/**
 * Issues an agent's open month-end invoice once its period has ended,
 * its number and payments kept: each booking's line takes what the
 * booking has not been billed yet as it now stands, and its latest
 * revision; a booking with nothing left leaves it. Due the agent's days
 * to pay from now. Refused before the period ends, and when nothing on it
 * is left to bill and nothing was paid.
 */
export async function issueMonthEnd(
  actor: Actor,
  invoiceId: string,
  now: Date = new Date(),
): Promise<{ ok: true; id: string; label: string } | Refusal> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
    const doc = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        ...OPEN_SELECT,
        status: true,
        business: { select: { daysToPay: true } },
        lines: { select: { id: true, bookingId: true } },
      },
    });
    if (
      !doc ||
      doc.status !== "open" ||
      doc.periodStart === null ||
      doc.periodEnd === null
    ) {
      return refuse("This is not an open month-end invoice. Reload it.");
    }
    const period = {
      start: doc.periodStart.toISOString().slice(0, 10),
      end: doc.periodEnd.toISOString().slice(0, 10),
    };
    if (!periodHasEnded(period, now)) {
      return refuse(`It is issued once ${periodLabel(period)} has ended.`);
    }
    const lines: { id: string; booking: BilledBooking; amountSen: number }[] =
      [];
    for (const line of doc.lines) {
      const booking = await heldBooking(tx, line.bookingId);
      if (!booking) continue;
      lines.push({
        id: line.id,
        booking,
        amountSen: Math.max(
          0,
          booking.priceTotalSen - (await billedSenOf(tx, booking.id)),
        ),
      });
    }
    const billing = lines.filter((l) => l.amountSen > 0);
    if (billing.length === 0 && doc._count.payments === 0) {
      return refuse("Nothing on it is left to bill. Reload it.");
    }
    await tx.invoiceLine.deleteMany({
      where: {
        id: { in: lines.filter((l) => l.amountSen === 0).map((l) => l.id) },
      },
    });
    for (const line of billing) {
      await tx.invoiceLine.update({
        where: { id: line.id },
        data: await lineOf(tx, line.booking, line.amountSen),
      });
    }
    const totalSen = billing.reduce((sum, l) => sum + l.amountSen, 0);
    const billTo = billing[0]
      ? billToOfBooking(billing[0].booking)
      : billToOf(
          (
            await tx.invoice.findUniqueOrThrow({
              where: { id: invoiceId },
              select: { billTo: true },
            })
          ).billTo,
        );
    const issued = await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        number: await numberOnIssue(tx, invoiceId),
        status: "issued" satisfies InvoiceStatus,
        totalSen,
        billTo,
        issuedAt: now,
        dueAt: dueAtOf(now, { daysToPay: doc.business?.daysToPay ?? 30 }),
        issuedById: "userId" in actor ? actor.userId : null,
      },
      select: { type: true, number: true },
    });
    const label = documentLabelOf(issued);
    await logIssued(
      tx,
      actor,
      { id: doc.id, label, totalSen, billTo },
      billing.map((l) => ({ bookingId: l.booking.id, amountSen: l.amountSen })),
    );
    return { ok: true, id: doc.id, label };
  });
}

/**
 * Voids an issued invoice or credit note, with why: its lines stop
 * counting, so its bookings are unbilled again, and its number stays
 * listed as void. With payments on it, or credit notes against it, it is
 * voided only with its replacement: the same lines, billed to whoever the
 * bookings are billed to now (the corrected business or contact),
 * issued in the same transaction, the payments and credit notes moved
 * across.
 */
export async function voidInvoice(
  actor: Actor,
  invoiceId: string,
  input: { reason: string; reissue: boolean },
  now: Date = new Date(),
): Promise<
  { ok: true; replacement: { id: string; label: string } | null } | Refusal
> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
    const doc = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        type: true,
        number: true,
        status: true,
        creditsId: true,
        periodStart: true,
        periodEnd: true,
        dueAt: true,
        issuedAt: true,
        lines: {
          select: {
            bookingId: true,
            revisionId: true,
            description: true,
            amountSen: true,
          },
        },
        payments: { where: { reversedAt: null }, select: { id: true } },
        creditNotes: { where: { status: "issued" }, select: { id: true } },
      },
    });
    if (!doc || doc.status !== "issued") {
      return refuse(
        "Only an issued invoice or credit note is voided. Reload it.",
      );
    }
    const label = documentLabelOf(doc);
    const held = doc.payments.length > 0 || doc.creditNotes.length > 0;
    if (held && !input.reissue) {
      return refuse(
        `${label} has payments or credit notes. Void it with its replacement, so they move across.`,
      );
    }
    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: "void" satisfies InvoiceStatus,
        voidedAt: now,
        voidReason: input.reason,
        voidedById: "userId" in actor ? actor.userId : null,
      },
    });
    await logActivity(tx, actor, {
      action: "invoice.voided",
      entityId: invoiceId,
      after: { document: label, reason: input.reason },
    });
    if (!input.reissue) {
      // Its bookings are unbilled again: a live one's open invoice holds it.
      for (const bookingId of new Set(doc.lines.map((l) => l.bookingId))) {
        const booking = await heldBooking(tx, bookingId);
        if (booking) await syncOpenInvoice(tx, actor, booking, now);
      }
      return { ok: true, replacement: null };
    }

    // Billed to whoever the bookings are billed to now: one booking's
    // own invoice, or a run's business.
    const first = await tx.booking.findUniqueOrThrow({
      where: { id: doc.lines[0]!.bookingId },
      select: BILLED_BOOKING,
    });
    const billTo = billToOfBooking(first);
    const issuedAt = now;
    const replacement = await issueDocument(
      tx,
      actor,
      {
        type: doc.type === "credit" ? "credit" : "invoice",
        billTo,
        lines: doc.lines,
        creditsId: doc.creditsId,
        period:
          doc.periodStart && doc.periodEnd
            ? {
                start: doc.periodStart.toISOString().slice(0, 10),
                end: doc.periodEnd.toISOString().slice(0, 10),
              }
            : null,
        dueAt:
          doc.type === "credit"
            ? null
            : first.business
              ? dueAtOf(issuedAt, { daysToPay: first.business.daysToPay })
              : (doc.dueAt ?? dueOf(first, issuedAt)),
      },
      now,
    );
    await tx.invoice.update({
      where: { id: invoiceId },
      data: { replacedById: replacement.id },
    });
    await tx.payment.updateMany({
      where: { invoiceId, reversedAt: null },
      data: { invoiceId: replacement.id },
    });
    await tx.invoice.updateMany({
      where: { creditsId: invoiceId },
      data: { creditsId: replacement.id },
    });
    return { ok: true, replacement };
  });
}

/* Payments */

export type PaymentInput = {
  amountSen: number;
  method: PaymentMethod;
  /** The day it came in, "2026-11-08". */
  paidOn: string;
  note: string | null;
  /**
   * The booking it is for, one of the document's. Left out on a document
   * of one booking; on an agent's month-end invoice, a payment left out is
   * spread over its bookings, the oldest pick-up first (`spreadPayment`).
   */
  bookingId?: string;
};

/**
 * Records money in against an open or issued invoice, or a refund out (a
 * minus amount) against an issued credit note or an invoice paid more than
 * it comes to, no more than the overpayment: each for one booking on it,
 * so a booking reads its own payments. One transfer for a month-end
 * invoice is a record per booking it pays. One transfer paying three
 * invoices is recorded on each.
 */
export async function recordPayment(
  actor: Actor,
  invoiceId: string,
  input: PaymentInput,
): Promise<Change> {
  if (!Number.isInteger(input.amountSen) || input.amountSen === 0) {
    return refuse("Enter the amount in RM.", "amount");
  }
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
    const doc = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: DOCUMENT_MONEY,
    });
    const credit = doc?.type === "credit";
    if (
      !doc ||
      !(doc.status === "issued" || (doc.status === "open" && !credit))
    ) {
      return refuse("Payments go on an open or issued invoice. Reload it.");
    }
    const refund = input.amountSen < 0;
    if (credit && !refund) {
      return refuse("A payment is recorded against an invoice.");
    }
    // Its bookings, the oldest pick-up first.
    const bookings = (
      await tx.invoiceLine.findMany({
        where: { invoiceId },
        orderBy: { booking: { startsAt: "asc" } },
        select: { booking: { select: { id: true, number: true } } },
      })
    ).map((l) => l.booking);
    const now = new Date();
    const owedBy = (bookingId: string) =>
      moneyOf(doc, now, bookingId)?.balanceSen ?? 0;
    let parts: { bookingId: string; amountSen: number }[];
    if (input.bookingId !== undefined) {
      if (!bookings.some((b) => b.id === input.bookingId)) {
        return refuse("That booking is not on this invoice. Reload it.");
      }
      parts = [{ bookingId: input.bookingId, amountSen: input.amountSen }];
    } else if (bookings.length === 1) {
      parts = [{ bookingId: bookings[0]!.id, amountSen: input.amountSen }];
    } else if (refund || bookings.length === 0) {
      return refuse("Choose the booking it is for.", "bookingId");
    } else {
      parts = spreadPayment(
        input.amountSen,
        bookings.map((b) => ({ bookingId: b.id, owedSen: owedBy(b.id) })),
      );
    }
    if (!credit && refund) {
      const over = -owedBy(parts[0]!.bookingId);
      if (over <= 0) {
        return refuse(
          "Nothing was paid over for this booking. A refund goes against its credit note.",
        );
      }
      if (-input.amountSen > over) {
        return refuse(
          `No more than was paid over: ${formatMyr(over)}.`,
          "amount",
        );
      }
    }
    const recorded: string[] = [];
    for (const part of parts) {
      const payment = await tx.payment.create({
        data: {
          invoiceId,
          bookingId: part.bookingId,
          amountSen: part.amountSen,
          method: input.method,
          paidAt: new Date(`${input.paidOn}T00:00:00Z`),
          note: input.note,
          recordedById: "userId" in actor ? actor.userId : null,
        },
        select: { id: true },
      });
      recorded.push(payment.id);
    }
    await logActivity(tx, actor, {
      action: refund ? "payment.refunded" : "payment.recorded",
      entityId: invoiceId,
      after: {
        document: documentLabelOf(doc),
        amountSen: input.amountSen,
        method: input.method,
        paidOn: input.paidOn,
        bookings: parts.map((part) =>
          bookingLabelOf(bookings.find((b) => b.id === part.bookingId)!),
        ),
        payments: recorded,
      },
    });
    return { ok: true };
  });
}

/** Reverses a wrong payment entry, with why; it stays listed, struck out. The right one is recorded anew. */
export async function reversePayment(
  actor: Actor,
  paymentId: string,
  reason: string,
  now: Date = new Date(),
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: {
        reversedAt: true,
        amountSen: true,
        invoiceId: true,
        invoice: { select: { type: true, number: true } },
      },
    });
    if (!payment || payment.reversedAt) {
      return refuse("This payment was reversed meanwhile. Reload the invoice.");
    }
    await tx.payment.update({
      where: { id: paymentId },
      data: {
        reversedAt: now,
        reversedById: "userId" in actor ? actor.userId : null,
        reverseReason: reason,
      },
    });
    await logActivity(tx, actor, {
      action: "payment.reversed",
      entityId: payment.invoiceId,
      after: {
        document: documentLabelOf(payment.invoice),
        amountSen: payment.amountSen,
        reason,
      },
    });
    return { ok: true };
  });
}

/* Finance's list and an invoice's page */

/** What Finance's list narrows to. */
export type InvoiceFilter = {
  type?: InvoiceType;
  status?: InvoiceStatus;
  state?: PaymentState;
  businessId?: string;
  /** Only those owed past their due date. */
  overdue?: boolean;
  /** Who it bills: a customer's booking, an agent's booking, or an agent's month-end run. */
  billed?: InvoiceBilled;
  /** Issued in this month, the last, or this year, Malaysia's calendar. */
  issued?: InvoiceIssuedWhen;
  /** HTI-0012, HTC-0003, a booking's HTB number, or billed-to text. */
  search?: string;
  /** By when each was made; the newest first unless the oldest. */
  order?: MadeOrder;
};

/** The span an issued filter means, from its first instant to the next span's, Malaysia's calendar. */
function issuedSpanOf(
  when: InvoiceIssuedWhen,
  now: Date,
): { gte: Date; lt: Date } {
  const [year, month] = localDayOf(now).split("-").map(Number) as [
    number,
    number,
  ];
  const monthStart = (y: number, m: number) => {
    const at = new Date(Date.UTC(y, m - 1, 1));
    return localDayStart(at.toISOString().slice(0, 10));
  };
  switch (when) {
    case "this-month":
      return { gte: monthStart(year, month), lt: monthStart(year, month + 1) };
    case "last-month":
      return { gte: monthStart(year, month - 1), lt: monthStart(year, month) };
    case "this-year":
      return { gte: monthStart(year, 1), lt: monthStart(year + 1, 1) };
  }
}

/** One row of Finance's list. */
export type InvoiceRow = {
  id: string;
  type: InvoiceType;
  label: string;
  status: InvoiceStatus;
  billTo: BillTo;
  period: string | null;
  totalSen: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  createdAt: Date;
  money: InvoiceMoney | null;
  /** A credit note's invoice. */
  credits: string | null;
  creditsId: string | null;
  bookings: string[];
  /** Open: numbered, it follows its bookings until issued. */
  open: boolean;
  /** An open month-end invoice whose period has ended: Finance issues it. */
  ready: boolean;
  /** An invoice's credit notes in the list, shown under it. */
  notes: InvoiceRow[];
};

const LIST_SELECT = {
  ...DOCUMENT_MONEY,
  createdAt: true,
  credits: { select: { type: true, number: true } },
  lines: {
    select: {
      ...DOCUMENT_MONEY.lines.select,
      booking: { select: { id: true, number: true } },
    },
    orderBy: { booking: { startsAt: "asc" } },
  },
} as const satisfies Prisma.InvoiceSelect;

type ListedDocument = Prisma.InvoiceGetPayload<{ select: typeof LIST_SELECT }>;

/** An open month-end invoice whose period has ended: Finance issues it. */
function readyToIssue(
  doc: { status: string; periodStart: Date | null; periodEnd: Date | null },
  now: Date,
) {
  return (
    doc.status === "open" &&
    doc.periodStart !== null &&
    doc.periodEnd !== null &&
    periodHasEnded(
      {
        start: doc.periodStart.toISOString().slice(0, 10),
        end: doc.periodEnd.toISOString().slice(0, 10),
      },
      now,
    )
  );
}

function rowOf(doc: ListedDocument, now: Date): InvoiceRow {
  const period = periodOfRow(doc);
  return {
    id: doc.id,
    type: doc.type === "credit" ? "credit" : "invoice",
    label: documentLabelOf(doc),
    status: isInvoiceStatus(doc.status) ? doc.status : "issued",
    billTo: billToOf(doc.billTo),
    period,
    totalSen: doc.totalSen,
    issuedAt: doc.issuedAt,
    dueAt: doc.dueAt,
    createdAt: doc.createdAt,
    money: moneyOf(doc, now),
    credits: doc.credits ? documentLabelOf(doc.credits) : null,
    creditsId: doc.creditsId,
    bookings: doc.lines.map((l) => bookingLabelOf(l.booking)),
    open: doc.status === "open",
    ready: readyToIssue(doc, now),
    notes: [],
  };
}

/**
 * Every document of the new series, newest first: open and issued
 * invoices, and credit notes, narrowed by the filter. A credit note whose
 * invoice is listed too is under it (`notes`), not a row of its own. The
 * payment state is worked out here from the payments, so a state's
 * filter reads every row of the other filters; there are hundreds, not
 * millions.
 */
export async function listInvoices(
  filter: InvoiceFilter = {},
  now: Date = new Date(),
): Promise<InvoiceRow[]> {
  const where: Prisma.InvoiceWhereInput = {
    // The old system's rows wait for db:set-billing to move them.
    agentId: null,
    OR: [{ number: { not: null } }, { status: "open" }],
  };
  if (filter.type) where.type = filter.type;
  if (filter.status) where.status = filter.status;
  if (filter.businessId) where.businessId = filter.businessId;
  if (filter.billed === "customer") where.businessId ??= null;
  if (filter.billed === "agent") {
    where.periodStart = null;
    where.businessId ??= { not: null };
  }
  if (filter.billed === "month-end") where.periodStart = { not: null };
  if (filter.issued) where.issuedAt = issuedSpanOf(filter.issued, now);
  const search = filter.search?.trim();
  if (search) {
    const number = /(\d{1,7})\s*$/.exec(search)?.[1];
    where.AND = [
      {
        OR: [
          ...(number ? [{ number: Number(number) }] : []),
          ...(number
            ? [{ lines: { some: { booking: { number: Number(number) } } } }]
            : []),
          { billTo: { path: ["name"], string_contains: search } },
        ],
      },
    ];
  }
  const docs = await db.invoice.findMany({
    where,
    orderBy: [{ createdAt: filter.order === "oldest" ? "asc" : "desc" }],
    select: LIST_SELECT,
  });
  const rows = docs
    .map((doc) => rowOf(doc, now))
    .filter(
      (row) =>
        (!filter.state || row.money?.state === filter.state) &&
        (!filter.overdue || row.money?.overdue === true),
    );
  if (filter.type === "credit") return rows;
  const byId = new Map(rows.map((row) => [row.id, row]));
  return rows.filter((row) => {
    const invoice = row.creditsId ? byId.get(row.creditsId) : undefined;
    if (!invoice) return true;
    invoice.notes.unshift(row);
    return false;
  });
}

/** One document with everything its page shows. */
export async function getInvoice(invoiceId: string, now: Date = new Date()) {
  const doc = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      ...LIST_SELECT,
      voidedAt: true,
      voidReason: true,
      businessId: true,
      replacedBy: { select: { id: true, type: true, number: true } },
      replaces: { select: { id: true, type: true, number: true } },
      creditNotes: {
        orderBy: { issuedAt: "asc" },
        select: {
          id: true,
          type: true,
          number: true,
          status: true,
          totalSen: true,
          issuedAt: true,
          payments: {
            where: { reversedAt: null },
            select: { amountSen: true },
          },
        },
      },
      lines: {
        orderBy: { booking: { startsAt: "asc" } },
        select: {
          id: true,
          description: true,
          amountSen: true,
          revision: { select: { number: true } },
          booking: {
            select: {
              id: true,
              number: true,
              contactName: true,
              startsAt: true,
              status: true,
              priceTotalSen: true,
            },
          },
        },
      },
      payments: {
        orderBy: [{ paidAt: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          amountSen: true,
          method: true,
          paidAt: true,
          note: true,
          recordedById: true,
          reversedAt: true,
          reverseReason: true,
          booking: { select: { id: true, number: true } },
        },
      },
    },
  });
  if (!doc) return null;
  // Each booking's share, for a document of several.
  const shares = await db.invoice.findUnique({
    where: { id: invoiceId },
    select: DOCUMENT_MONEY,
  });
  const live = (
    rows: readonly { amountSen: number; reversedAt?: Date | null }[],
  ) =>
    rows.filter((r) => !r.reversedAt).reduce((sum, r) => sum + r.amountSen, 0);
  const money =
    (doc.status === "issued" || doc.status === "open") && doc.type === "invoice"
      ? invoiceMoneyOf({
          totalSen: doc.totalSen,
          creditSen: doc.creditNotes
            .filter((c) => c.status === "issued")
            .reduce((sum, c) => sum + c.totalSen, 0),
          paidSen:
            live(doc.payments) +
            doc.creditNotes
              .filter((c) => c.status === "issued")
              .reduce((sum, c) => sum + live(c.payments), 0),
          dueAt: doc.dueAt,
          now,
        })
      : null;
  const changes = await changesOf(doc, now);
  return {
    id: doc.id,
    type: (doc.type === "credit" ? "credit" : "invoice") as InvoiceType,
    label: documentLabelOf(doc),
    status: doc.status as InvoiceStatus,
    /** Open: numbered, it follows its bookings until issued. */
    open: doc.status === "open",
    /** An open month-end invoice whose period has ended. */
    ready: readyToIssue(doc, now),
    billTo: billToOf(doc.billTo),
    businessId: doc.businessId,
    period: periodOfRow(doc),
    totalSen: doc.totalSen,
    issuedAt: doc.issuedAt,
    dueAt: doc.dueAt,
    createdAt: doc.createdAt,
    voidedAt: doc.voidedAt,
    voidReason: doc.voidReason,
    credits: doc.credits
      ? { id: doc.creditsId!, label: documentLabelOf(doc.credits) }
      : null,
    replacedBy: doc.replacedBy
      ? { id: doc.replacedBy.id, label: documentLabelOf(doc.replacedBy) }
      : null,
    replaces: doc.replaces
      ? { id: doc.replaces.id, label: documentLabelOf(doc.replaces) }
      : null,
    creditNotes: doc.creditNotes.map((c) => ({
      id: c.id,
      label: documentLabelOf(c),
      status: c.status as InvoiceStatus,
      totalSen: c.totalSen,
      issuedAt: c.issuedAt,
    })),
    lines: doc.lines.map((line) => ({
      id: line.id,
      bookingId: line.booking.id,
      booking: bookingLabelOf(line.booking),
      contactName: line.booking.contactName,
      startsAt: line.booking.startsAt,
      description: line.description,
      amountSen: line.amountSen,
      /** This booking's share: what it nets after credit notes, what came in for it, what is left. */
      money: shares ? moneyOf(shares, now, line.booking.id) : null,
    })),
    changes,
    payments: doc.payments.map(({ booking, ...payment }) => ({
      ...payment,
      booking: { id: booking.id, label: bookingLabelOf(booking) },
    })),
    money,
  };
}

export type InvoicePage = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** One revision a document bills, as staff read it: what it changed, who made it, the total it left. */
export type BilledChange = {
  number: number;
  kind: string;
  summary: string;
  reason: string | null;
  at: Date;
  by: string;
  chargedSen: number;
  details: RevisionDetail[];
};

/** One booking on a document: what it is now, at a glance, and the changes the document bills. */
export type InvoiceBooking = {
  bookingId: string;
  booking: string;
  contactName: string;
  status: string;
  chargedSen: number;
  /** Its trips as the latest revision keeps them. */
  trips: SnapshotTrip[];
  revisions: BilledChange[];
};

/**
 * Per booking on a document, what it is now (its trips, status and total)
 * and the revisions the document bills: those after the booking's last
 * revision billed on an earlier issued document, up to its own line's;
 * while open, up to the latest. A first bill starts at Rev 1,
 * the booking as booked. Each revision says what it changed and who made
 * it.
 */
async function changesOf(
  doc: {
    id: string;
    status: string;
    issuedAt: Date | null;
    lines: readonly {
      revision: { number: number } | null;
      booking: {
        id: string;
        number: number | null;
        contactName: string;
        status: string;
        priceTotalSen: number;
      };
    }[];
  },
  now: Date,
): Promise<InvoiceBooking[]> {
  const live = doc.status === "open";
  const before = doc.issuedAt ?? now;
  return Promise.all(
    doc.lines.map(async (line) => {
      const last = await db.invoiceLine.findFirst({
        where: {
          bookingId: line.booking.id,
          invoiceId: { not: doc.id },
          revisionId: { not: null },
          invoice: { status: "issued", issuedAt: { lt: before } },
        },
        orderBy: { revision: { number: "desc" } },
        select: { revision: { select: { number: true } } },
      });
      const from = last?.revision?.number ?? 0;
      const upTo = live ? undefined : line.revision?.number;
      const [rows, latest] = await Promise.all([
        // An old system's invoice names no revision: nothing to list.
        !live && upTo === undefined
          ? []
          : db.bookingRevision.findMany({
              // The one before the first, to say what the first changed.
              where: {
                bookingId: line.booking.id,
                number: { gte: Math.max(1, from), lte: upTo },
              },
              orderBy: { number: "asc" },
              select: {
                number: true,
                kind: true,
                summary: true,
                reason: true,
                createdAt: true,
                createdById: true,
                chargedSen: true,
                snapshot: true,
              },
            }),
        db.bookingRevision.findFirst({
          where: { bookingId: line.booking.id },
          orderBy: { number: "desc" },
          select: { snapshot: true },
        }),
      ]);
      const previous = from > 0 ? rows.find((r) => r.number === from) : null;
      const billed = await withDetails(
        rows.filter((r) => r.number > from),
        previous?.snapshot ?? null,
      );
      return {
        bookingId: line.booking.id,
        booking: bookingLabelOf(line.booking),
        contactName: line.booking.contactName,
        status: line.booking.status,
        chargedSen: line.booking.priceTotalSen,
        trips: revisionSnapshotOf(latest?.snapshot)?.trips ?? [],
        revisions: billed.map((r) => ({
          number: r.number,
          kind: r.kind,
          summary: r.summary,
          reason: r.reason,
          at: r.createdAt,
          by: r.by,
          chargedSen: r.chargedSen,
          details: r.details,
        })),
      };
    }),
  );
}

/** A business's open and issued documents, newest first, for its page. */
export function listBusinessInvoices(
  businessId: string,
  now: Date = new Date(),
) {
  return listInvoices({ businessId }, now);
}
