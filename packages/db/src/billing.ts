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
  lastEndedPeriod,
  localDayStart,
  periodEndInstant,
  periodHasEnded,
  periodLabel,
  sumMoney,
  type BilledInvoice,
  type BillingPeriod,
  type BillingPlan,
  type BillTo,
  type InvoiceMoney,
  type InvoiceStatus,
  type InvoiceType,
  type PaymentMethod,
  type PaymentState,
} from "./billing-rules";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import type { Prisma } from "./generated/prisma/client";
import { latestRevisionOf } from "./revisions";

type Tx = Prisma.TransactionClient;

/**
 * Billing: the invoices and credit notes a booking's changes make, the
 * month-end run, voids, and payments. Every rule is in ./billing-rules;
 * this reads and writes them. Staff never type an amount on an invoice:
 * the amounts come from the bookings, and an issued document never
 * changes. Finance's (`invoices.manage`), except what follows a booking's
 * own change, which bills inside that change's transaction. See
 * docs/261108-billing-and-revisions.md, "Billing rules in code".
 */

/** What billing reads of a booking. */
const BILLED_BOOKING = {
  id: true,
  number: true,
  status: true,
  confirmedAt: true,
  priceTotalSen: true,
  startsAt: true,
  legacyInvoiceNumber: true,
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

/** What billing plans for a booking were it to charge `chargedSen`. */
async function planFor(
  client: Tx,
  booking: BilledBooking,
  chargedSen: number,
): Promise<BillingPlan> {
  return billingPlanOf({
    legacy: booking.legacyInvoiceNumber !== null,
    confirmed: booking.confirmedAt !== null,
    credit: booking.business ? isCredit(booking.business.paymentTerms) : false,
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
  await logActivity(tx, actor, {
    action: "invoice.issued",
    entityId: created.id,
    after: { document: label, totalSen, billTo: input.billTo.name },
  });
  for (const line of input.lines) {
    await logActivity(tx, actor, {
      action: "booking.billed",
      entityId: line.bookingId,
      after: { document: label, amountSen: line.amountSen },
    });
  }
  return { id: created.id, label };
}

/** A booking's line on an invoice: its first bill names the booking, a later one its revision. */
async function lineDescription(
  tx: Tx,
  booking: { id: string; number: number | null },
  revision: { number: number; summary: string } | null,
) {
  const label = bookingLabelOf(booking);
  const billedBefore = await tx.invoiceLine.count({
    where: { bookingId: booking.id, invoice: { status: "issued" } },
  });
  if (!revision || (billedBefore === 0 && revision.number === 1)) return label;
  return `${label} Rev ${revision.number}: ${revision.summary}`;
}

/**
 * Bills what a booking's change asks, inside the change's transaction,
 * after the booking is refreshed and its revision written: the first
 * invoice when it is confirmed, then an invoice for more to pay, or
 * credit notes for less (`billingPlanOf`). Nothing on credit terms until
 * the run, except a credit note; nothing for a legacy booking. Answers
 * the documents issued, for the save's message.
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
  if (plan.kind !== "invoice" && plan.kind !== "credit") return [];
  // A booking on a draft is billed when the draft is issued.
  if (plan.kind === "invoice" && (await draftLineOf(tx, bookingId))) return [];
  const revision = await latestRevisionOf(tx, bookingId);
  const description = await lineDescription(tx, booking, revision);
  const billTo = billToOfBooking(booking);
  if (plan.kind === "invoice") {
    const issued = await issueDocument(
      tx,
      actor,
      {
        type: "invoice",
        billTo,
        lines: [
          {
            bookingId,
            revisionId: revision?.id ?? null,
            description,
            amountSen: plan.amountSen,
          },
        ],
        dueAt: dueOf(booking, now),
      },
      now,
    );
    return [issued.label];
  }
  const labels: string[] = [];
  for (const note of plan.notes) {
    const issued = await issueDocument(
      tx,
      actor,
      {
        type: "credit",
        billTo,
        creditsId: note.invoiceId,
        lines: [
          {
            bookingId,
            revisionId: revision?.id ?? null,
            description,
            amountSen: note.amountSen,
          },
        ],
        dueAt: null,
      },
      now,
    );
    labels.push(issued.label);
  }
  return labels;
}

/** The draft a booking is a line of, if any. */
function draftLineOf(client: Tx, bookingId: string) {
  return client.invoiceLine.findFirst({
    where: { bookingId, invoice: { status: "draft" } },
    select: { invoiceId: true },
  });
}

/** What saving a change would bill, in a sentence, for the save to show first. */
export type BillingPreview = { plan: BillingPlan; sentence: string };

async function previewOf(client: Tx, plan: BillingPlan, verb?: string) {
  const [invoice, credit] = await Promise.all([
    lastBookingNumber(client, "invoice"),
    lastBookingNumber(client, "credit"),
  ]);
  return billingPlanSentence(
    plan,
    {
      invoice: formatDocumentNumber("invoice", invoice + 1),
      credit: (index) => formatDocumentNumber("credit", credit + 1 + index),
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
  const plan = await planFor(
    db,
    confirms
      ? { ...booking, confirmedAt: booking.confirmedAt ?? new Date() }
      : booking,
    chargedSen,
  );
  return {
    plan,
    sentence: await previewOf(db, plan, confirms ? "Confirming" : undefined),
  };
}

/**
 * What making a booking in Manage bills, confirmed at once: an invoice
 * for its total, unless its business is on credit or a legacy number is
 * typed.
 */
export async function newBookingBillingPreview(input: {
  businessId: string | null;
  legacy: boolean;
  chargedSen: number;
}): Promise<BillingPreview> {
  const business = input.businessId
    ? await db.business.findUnique({
        where: { id: input.businessId },
        select: { paymentTerms: true },
      })
    : null;
  const plan = billingPlanOf({
    legacy: input.legacy,
    confirmed: true,
    credit: business ? isCredit(business.paymentTerms) : false,
    chargedSen: input.chargedSen,
    billed: [],
  });
  return { plan, sentence: await previewOf(db, plan, "Creating the booking") };
}

/* A booking's billing, for its page */

const DOCUMENT_MONEY = {
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
  payments: { where: { reversedAt: null }, select: { amountSen: true } },
  creditNotes: {
    where: { status: "issued" },
    select: {
      totalSen: true,
      payments: { where: { reversedAt: null }, select: { amountSen: true } },
    },
  },
} as const satisfies Prisma.InvoiceSelect;

type DocumentRow = Prisma.InvoiceGetPayload<{ select: typeof DOCUMENT_MONEY }>;

/** An issued invoice's money, its credit notes folded in; a credit note's own refunds alone. */
function moneyOf(doc: DocumentRow, now: Date): InvoiceMoney | null {
  if (doc.status !== "issued") return null;
  const paid = (rows: readonly { amountSen: number }[]) =>
    rows.reduce((sum, p) => sum + p.amountSen, 0);
  if (doc.type === "credit") return null;
  return invoiceMoneyOf({
    totalSen: doc.totalSen,
    creditSen: doc.creditNotes.reduce((sum, c) => sum + c.totalSen, 0),
    paidSen:
      paid(doc.payments) +
      doc.creditNotes.reduce((sum, c) => sum + paid(c.payments), 0),
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
  /** What it bills or credits this booking; the whole document's total beside it. */
  amountSen: number;
  totalSen: number;
  /** The line: "HTB-0042 Rev 3: Stop at Pantai Cenang added". */
  description: string;
  issuedAt: Date | null;
  dueAt: Date | null;
  /** An invoice's money, credit notes folded in; null for a credit note, a draft or a void one. */
  money: InvoiceMoney | null;
  /** A credit note's invoice. */
  credits: string | null;
  /** A month-end run's period. */
  period: string | null;
};

/** A booking's billing at a glance, for its page. */
export type BookingBilling = {
  documents: BookingDocument[];
  /** Billed outside the system: its legacy number. */
  legacy: string | null;
  /** On credit terms: billed by the run. */
  credit: boolean;
  billedSen: number;
  /** What it charges less what is billed: 0 for a legacy booking. */
  unbilledSen: number;
  /** The draft it is ticked or unticked on, if any. */
  draft: { id: string; period: string | null } | null;
  /** Its invoices' money together; null before any. */
  money: InvoiceMoney | null;
};

function periodOfRow(row: {
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
      legacyInvoiceNumber: true,
      business: { select: { paymentTerms: true } },
      invoiceLines: {
        select: {
          amountSen: true,
          description: true,
          invoice: { select: DOCUMENT_MONEY },
        },
      },
    },
  });
  if (!booking) return null;
  const labels = new Map(
    booking.invoiceLines.map((l) => [l.invoice.id, documentLabelOf(l.invoice)]),
  );
  const documents: BookingDocument[] = booking.invoiceLines
    .filter((l) => l.invoice.status !== "draft")
    .map((line) => ({
      id: line.invoice.id,
      type: (line.invoice.type === "credit"
        ? "credit"
        : "invoice") as InvoiceType,
      label: documentLabelOf(line.invoice),
      status: (line.invoice.status === "void"
        ? "void"
        : "issued") as InvoiceStatus,
      amountSen: line.amountSen,
      totalSen: line.invoice.totalSen,
      description: line.description,
      issuedAt: line.invoice.issuedAt,
      dueAt: line.invoice.dueAt,
      money: moneyOf(line.invoice, now),
      credits: line.invoice.creditsId
        ? (labels.get(line.invoice.creditsId) ?? null)
        : null,
      period: periodOfRow(line.invoice),
    }))
    .sort(
      (a, b) => (a.issuedAt?.getTime() ?? 0) - (b.issuedAt?.getTime() ?? 0),
    );
  const billedSen = booking.invoiceLines
    .filter((l) => l.invoice.status === "issued")
    .reduce((sum, l) => sum + l.amountSen, 0);
  const legacy = booking.legacyInvoiceNumber;
  const draft = booking.invoiceLines.find((l) => l.invoice.status === "draft");
  const live = documents.flatMap((d) => (d.money ? [d.money] : []));
  return {
    documents,
    legacy,
    credit: booking.business ? isCredit(booking.business.paymentTerms) : false,
    billedSen,
    unbilledSen:
      legacy !== null || booking.confirmedAt === null
        ? 0
        : booking.priceTotalSen - billedSen,
    draft: draft
      ? { id: draft.invoice.id, period: periodOfRow(draft.invoice) }
      : null,
    money: sumMoney(live, now),
  };
}

/* Finance's own billing */

/**
 * Bills one booking's unbilled amount on its own, now: a credit agent's
 * booking Finance does not want to wait for the run, or one whose invoice
 * was voided. Refused for a legacy booking, one not confirmed, one with
 * nothing to bill, and one on a draft (untick it there first).
 */
export async function billBookingAlone(
  actor: Actor,
  bookingId: string,
  now: Date = new Date(),
): Promise<{ ok: true; id: string; label: string } | Refusal> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Booking" WHERE id = ${bookingId} FOR UPDATE`;
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      select: BILLED_BOOKING,
    });
    if (!booking) return refuse("This booking was deleted meanwhile.");
    if (booking.legacyInvoiceNumber !== null) {
      return refuse("This booking is billed outside the system.");
    }
    if (booking.confirmedAt === null) {
      return refuse("Only a confirmed booking is billed.");
    }
    if (await draftLineOf(tx, bookingId)) {
      return refuse(
        "This booking is on a month-end draft. Untick it there first, or issue the draft.",
      );
    }
    const unbilled = booking.priceTotalSen - (await billedSenOf(tx, bookingId));
    if (unbilled <= 0)
      return refuse("Nothing on this booking waits to be billed.");
    const revision = await latestRevisionOf(tx, bookingId);
    const issued = await issueDocument(
      tx,
      actor,
      {
        type: "invoice",
        billTo: billToOfBooking(booking),
        lines: [
          {
            bookingId,
            revisionId: revision?.id ?? null,
            description: await lineDescription(tx, booking, revision),
            amountSen: unbilled,
          },
        ],
        dueAt: dueOf(booking, now),
      },
      now,
    );
    return { ok: true, id: issued.id, label: issued.label };
  });
}

/** A booking a business has not been billed for in full, for its page and the run. */
export type UnbilledBooking = {
  id: string;
  label: string;
  contactName: string;
  startsAt: Date;
  status: string;
  chargedSen: number;
  unbilledSen: number;
  /** The draft it is on, if any. */
  draftId: string | null;
};

/** The confirmed, non-legacy bookings of a business with something not billed yet, first pick-up first. */
export async function listUnbilled(
  businessId: string,
  client: Tx = db,
): Promise<UnbilledBooking[]> {
  const bookings = await client.booking.findMany({
    where: {
      businessId,
      legacyInvoiceNumber: null,
      confirmedAt: { not: null },
    },
    orderBy: { startsAt: "asc" },
    select: {
      id: true,
      number: true,
      contactName: true,
      startsAt: true,
      status: true,
      priceTotalSen: true,
      invoiceLines: {
        select: {
          amountSen: true,
          invoice: { select: { id: true, status: true } },
        },
      },
    },
  });
  return bookings.flatMap((b) => {
    const billed = b.invoiceLines
      .filter((l) => l.invoice.status === "issued")
      .reduce((sum, l) => sum + l.amountSen, 0);
    const unbilledSen = b.priceTotalSen - billed;
    if (unbilledSen === 0) return [];
    return [
      {
        id: b.id,
        label: bookingLabelOf(b),
        contactName: b.contactName,
        startsAt: b.startsAt,
        status: b.status,
        chargedSen: b.priceTotalSen,
        unbilledSen,
        draftId:
          b.invoiceLines.find((l) => l.invoice.status === "draft")?.invoice
            .id ?? null,
      },
    ];
  });
}

/**
 * The month-end run's draft for a business and its last ended period:
 * every booking with something not billed whose first pick-up is in the
 * period, ticked, and those of earlier periods, unticked, for Finance to
 * tick. Refused for a business not on credit, before the period ends,
 * when a draft or an issued run for it exists, and when there is nothing
 * to bill. The business's row is held, so two runs at once never make two
 * drafts. A booking already on another draft is left off.
 */
export async function createPeriodDraft(
  actor: Actor,
  businessId: string,
  now: Date = new Date(),
): Promise<Created> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Business" WHERE id = ${businessId} FOR UPDATE`;
    const business = await tx.business.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        name: true,
        paymentTerms: true,
        contactEmail: true,
        contactPhone: true,
        address: true,
        registrationNo: true,
      },
    });
    if (!business) return refuse("This agent was deleted meanwhile.");
    if (!isCredit(business.paymentTerms)) {
      return refuse(
        `${business.name} has no credit: each booking is billed when it is confirmed.`,
      );
    }
    const period = lastEndedPeriod(now, business.paymentTerms);
    if (!periodHasEnded(period, now)) {
      return refuse(`${periodLabel(period)} has not ended yet.`);
    }
    const periodStart = new Date(`${period.start}T00:00:00Z`);
    const existing = await tx.invoice.findFirst({
      where: {
        businessId,
        type: "invoice",
        periodStart,
        status: { in: ["draft", "issued"] },
      },
      select: { status: true, number: true, type: true },
    });
    if (existing) {
      return refuse(
        existing.status === "draft"
          ? `${business.name}'s draft for ${periodLabel(period)} exists already. Open it under Invoices.`
          : `${business.name}'s invoice for ${periodLabel(period)} is ${documentLabelOf(existing)}. Later bookings go in the next run.`,
      );
    }
    const end = periodEndInstant(period);
    const open = (await listUnbilled(businessId, tx)).filter(
      (b) => b.draftId === null && b.unbilledSen > 0 && b.startsAt < end,
    );
    if (open.length === 0) {
      return refuse(
        `${business.name} has nothing to bill for ${periodLabel(period)}.`,
      );
    }
    const from = localDayStart(period.start);
    const draft = await tx.invoice.create({
      data: {
        type: "invoice",
        status: "draft" satisfies InvoiceStatus,
        businessId,
        billTo: {
          name: business.name,
          email: business.contactEmail,
          phone: business.contactPhone,
          address: business.address,
          registrationNo: business.registrationNo,
          businessId,
        },
        periodStart,
        periodEnd: new Date(`${period.end}T00:00:00Z`),
        createdById: "userId" in actor ? actor.userId : null,
        lines: {
          create: open.map((b) => ({
            bookingId: b.id,
            ticked: b.startsAt >= from,
          })),
        },
      },
      select: { id: true },
    });
    await logActivity(tx, actor, {
      action: "invoice.drafted",
      entityId: draft.id,
      after: {
        business: business.name,
        period: periodLabel(period),
        bookings: open.length,
      },
    });
    return { ok: true, id: draft.id };
  });
}

/** Ticks or unticks a booking on a draft. */
export async function setDraftLine(
  invoiceId: string,
  bookingId: string,
  ticked: boolean,
): Promise<Change> {
  const line = await db.invoiceLine.findUnique({
    where: { invoiceId_bookingId: { invoiceId, bookingId } },
    select: { id: true, ticked: true, invoice: { select: { status: true } } },
  });
  if (!line || line.invoice.status !== "draft") {
    return refuse("This draft was issued or deleted meanwhile. Reload it.");
  }
  if (line.ticked === ticked) return { ok: true };
  await db.invoiceLine.update({ where: { id: line.id }, data: { ticked } });
  return { ok: true };
}

/** Deletes a draft, its bookings free for another run or to bill alone. Nothing was numbered. */
export async function deleteDraft(
  actor: Actor,
  invoiceId: string,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const draft = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, business: { select: { name: true } } },
    });
    if (!draft || draft.status !== "draft") {
      return refuse("This draft was issued or deleted meanwhile.");
    }
    await tx.invoice.delete({ where: { id: invoiceId } });
    await logActivity(tx, actor, {
      action: "invoice.draft.deleted",
      entityId: invoiceId,
      before: { business: draft.business?.name ?? "" },
    });
    return { ok: true };
  });
}

/**
 * Issues a draft: each ticked booking's line takes what the booking has
 * not been billed yet as it now stands, and its latest revision; the
 * unticked ones leave it, for the next run or to bill alone. Refused when
 * nothing ticked has anything to bill. Only issuing gives the number.
 */
export async function issueDraft(
  actor: Actor,
  invoiceId: string,
  now: Date = new Date(),
): Promise<{ ok: true; id: string; label: string } | Refusal> {
  return db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT id FROM "Invoice" WHERE id = ${invoiceId} FOR UPDATE`;
    const draft = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        status: true,
        billTo: true,
        businessId: true,
        periodStart: true,
        periodEnd: true,
        business: { select: { daysToPay: true } },
        lines: { select: { id: true, bookingId: true, ticked: true } },
      },
    });
    if (!draft || draft.status !== "draft") {
      return refuse("This draft was issued or deleted meanwhile. Reload it.");
    }
    const lines: IssueInput["lines"] = [];
    for (const line of draft.lines.filter((l) => l.ticked)) {
      await tx.$executeRaw`SELECT id FROM "Booking" WHERE id = ${line.bookingId} FOR UPDATE`;
      const booking = await tx.booking.findUniqueOrThrow({
        where: { id: line.bookingId },
        select: BILLED_BOOKING,
      });
      if (booking.legacyInvoiceNumber !== null) continue;
      const unbilled =
        booking.priceTotalSen - (await billedSenOf(tx, line.bookingId));
      if (unbilled <= 0) continue;
      const revision = await latestRevisionOf(tx, line.bookingId);
      lines.push({
        bookingId: line.bookingId,
        revisionId: revision?.id ?? null,
        description: await lineDescription(tx, booking, revision),
        amountSen: unbilled,
      });
    }
    if (lines.length === 0) {
      return refuse(
        "Nothing ticked has anything to bill. Tick a booking, or delete the draft.",
      );
    }
    // The draft gives way to the issued invoice, numbered now.
    await tx.invoice.delete({ where: { id: invoiceId } });
    const period =
      draft.periodStart && draft.periodEnd
        ? {
            start: draft.periodStart.toISOString().slice(0, 10),
            end: draft.periodEnd.toISOString().slice(0, 10),
          }
        : null;
    const issued = await issueDocument(
      tx,
      actor,
      {
        type: "invoice",
        billTo: billToOf(draft.billTo),
        lines,
        period,
        dueAt: dueAtOf(now, { daysToPay: draft.business?.daysToPay ?? 30 }),
      },
      now,
    );
    return { ok: true, id: issued.id, label: issued.label };
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
    if (!input.reissue) return { ok: true, replacement: null };

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
};

/**
 * Records money in against an issued invoice, or a refund out (a minus
 * amount) against an issued credit note. One transfer paying three
 * invoices is three records.
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
    const doc = await tx.invoice.findUnique({
      where: { id: invoiceId },
      select: { type: true, number: true, status: true },
    });
    if (!doc || doc.status !== "issued") {
      return refuse("Payments go on an issued invoice. Reload it.");
    }
    const refund = input.amountSen < 0;
    if (refund !== (doc.type === "credit")) {
      return refuse(
        refund
          ? "A refund is recorded against a credit note."
          : "A payment is recorded against an invoice.",
      );
    }
    const payment = await tx.payment.create({
      data: {
        invoiceId,
        amountSen: input.amountSen,
        method: input.method,
        paidAt: new Date(`${input.paidOn}T00:00:00Z`),
        note: input.note,
        recordedById: "userId" in actor ? actor.userId : null,
      },
      select: { id: true },
    });
    await logActivity(tx, actor, {
      action: refund ? "payment.refunded" : "payment.recorded",
      entityId: invoiceId,
      after: {
        document: documentLabelOf(doc),
        amountSen: input.amountSen,
        method: input.method,
        paidOn: input.paidOn,
        payment: payment.id,
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
  /** HTI-0012, HTC-0003, a booking's HTB number, or billed-to text. */
  search?: string;
};

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
  bookings: string[];
};

const LIST_SELECT = {
  ...DOCUMENT_MONEY,
  createdAt: true,
  credits: { select: { type: true, number: true } },
  lines: {
    select: { booking: { select: { id: true, number: true } } },
    orderBy: { booking: { startsAt: "asc" } },
  },
} as const satisfies Prisma.InvoiceSelect;

function rowOf(
  doc: Prisma.InvoiceGetPayload<{ select: typeof LIST_SELECT }>,
  now: Date,
): InvoiceRow {
  return {
    id: doc.id,
    type: doc.type === "credit" ? "credit" : "invoice",
    label: documentLabelOf(doc),
    status: (["draft", "issued", "void"] as const).find(
      (s) => s === doc.status,
    )!,
    billTo: billToOf(doc.billTo),
    period: periodOfRow(doc),
    totalSen: doc.totalSen,
    issuedAt: doc.issuedAt,
    dueAt: doc.dueAt,
    createdAt: doc.createdAt,
    money: moneyOf(doc, now),
    credits: doc.credits ? documentLabelOf(doc.credits) : null,
    bookings: doc.lines.map((l) => bookingLabelOf(l.booking)),
  };
}

/**
 * Every document of the new series, newest first: drafts, invoices and
 * credit notes, narrowed by the filter. The payment state is worked out
 * here from the payments, so a state's filter reads every row of the
 * other filters; there are hundreds, not millions.
 */
export async function listInvoices(
  filter: InvoiceFilter = {},
  now: Date = new Date(),
): Promise<InvoiceRow[]> {
  const where: Prisma.InvoiceWhereInput = {
    // The old system's rows wait for db:set-billing to move them.
    agentId: null,
    OR: [{ status: "draft" }, { number: { not: null } }],
  };
  if (filter.type) where.type = filter.type;
  if (filter.status) where.status = filter.status;
  if (filter.businessId) where.businessId = filter.businessId;
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
  const rows = (
    await db.invoice.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      select: LIST_SELECT,
    })
  ).map((doc) => rowOf(doc, now));
  return rows.filter(
    (row) =>
      (!filter.state || row.money?.state === filter.state) &&
      (!filter.overdue || row.money?.overdue === true),
  );
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
          ticked: true,
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
        },
      },
    },
  });
  if (!doc) return null;
  const live = (
    rows: readonly { amountSen: number; reversedAt?: Date | null }[],
  ) =>
    rows.filter((r) => !r.reversedAt).reduce((sum, r) => sum + r.amountSen, 0);
  const money =
    doc.status === "issued" && doc.type === "invoice"
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
  // A draft's lines show what issuing would bill each booking now.
  const unbilled =
    doc.status === "draft"
      ? new Map(
          await Promise.all(
            doc.lines.map(
              async (line) =>
                [
                  line.booking.id,
                  line.booking.priceTotalSen -
                    (await billedSenOf(db, line.booking.id)),
                ] as const,
            ),
          ),
        )
      : null;
  return {
    id: doc.id,
    type: (doc.type === "credit" ? "credit" : "invoice") as InvoiceType,
    label: documentLabelOf(doc),
    status: doc.status as InvoiceStatus,
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
      amountSen: unbilled?.get(line.booking.id) ?? line.amountSen,
      ticked: line.ticked,
    })),
    payments: doc.payments,
    money,
  };
}

export type InvoicePage = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;

/** A business's issued and draft documents, newest first, for its page. */
export function listBusinessInvoices(
  businessId: string,
  now: Date = new Date(),
) {
  return listInvoices({ businessId }, now);
}

/** The run's period a business would bill now, by its terms; null without credit. */
export function businessRunPeriod(
  paymentTerms: string,
  now: Date = new Date(),
): BillingPeriod | null {
  return isCredit(paymentTerms) ? lastEndedPeriod(now, paymentTerms) : null;
}
