// Usage: pnpm --filter @repo/db db:set-billing [-- --dry-run]
//
// Run once per database after the schema push of
// docs/261108-billing-and-revisions.md, right before the merge (the code
// still live until then gives invoices the old way), and again right
// after the deploy, for any booking made or confirmed in between: every
// step skips what it did already.
//
// 1. Agents leave Vendor: each vendor offering "agent" is copied to a
//    `Business` with the same id (its invoice period becomes its payment
//    terms, 30 days to pay), its bookings point at the business instead.
// 2. Every booking without a number takes the next HTB number, in the
//    order they were made: the first booking ever made is HTB-0001.
// 3. Every booking's total follows the new rule, what the customer pays
//    now: its live trips and its charges. A cancelled one charged its last
//    total before; it charges its fees alone, none yet, so nothing stale is
//    ever billed for it.
// 4. Every booking without a revision gets its Rev 1, "Booked", from what
//    it holds now.
// 5. The counters: bookings carry on from the last HTB given; invoices
//    and credit notes start again, so the first issued is HTI-0001 and
//    HTC-0001, unless a document of the new series exists already.
// 6. Each old invoice row is issued again in the new series, oldest
//    first, dated as it was: a line per booking for its total now, billed
//    to its agent or contact. The old number (HTI-1308, HTI-1295-03) stays
//    on the booking as its old invoice number, a note. A row marked fully
//    paid gets a payment for its total; partly paid and pending ones stay
//    owed, listed for Finance to record. The old row goes.
// 7. The agent-only vendors are deleted; a vendor that also supplies only
//    loses "agent".
// 8. Every other confirmed booking billed nothing yet follows the rules:
//    its own open invoice while it is live, issued at once when it has
//    ended; a credit agent's, a line of the agent's open month-end
//    invoice for its period.
//
// See docs/261108-billing-and-revisions.md, "Open invoices, month-end
// too, and amendments". With --dry-run it prints what it would do and writes nothing.
import { logActivity } from "../src/activity";
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { bookingLabelOf, formatDocumentNumber } from "../src/booking-number";
import { issueOldInvoice, settleBilling } from "../src/billing";
import { isCredit } from "../src/billing-rules";
import { db } from "../src/client";
import { formatRinggit } from "../src/money";
import {
  chargedSenOf,
  REVISION_KIND_LABELS,
  snapshotOf,
} from "../src/revision-rules";
import { itemHeading } from "../src/trip-view";

const DRY_RUN = process.argv.includes("--dry-run");
const say = (line: string) => console.log(DRY_RUN ? `[dry run] ${line}` : line);

/**
 * What a dry run would have written, so its later steps read as the real
 * run does: bookings by their new number, their totals set, and the
 * bookings an old invoice bills.
 */
const planned = {
  numbers: new Map<string, number>(),
  reissued: new Set<string>(),
  totals: new Map<string, number>(),
};

function labelOf(booking: { id: string; number: number | null }) {
  return bookingLabelOf({
    id: booking.id,
    number: booking.number ?? planned.numbers.get(booking.id) ?? null,
  });
}

const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

/** The old invoice number as the app showed it: HTI-1308, or HTI-1295-03 for an agent's line. */
function oldInvoiceLabel(number: number, line: number | null) {
  const invoice = `HTI-${String(number).padStart(4, "0")}`;
  return line === null
    ? invoice
    : `${invoice}-${String(line).padStart(2, "0")}`;
}

async function moveAgents() {
  const agents = await db.vendor.findMany({
    where: { services: { has: "agent" } },
  });
  for (const agent of agents) {
    const exists = await db.business.findUnique({ where: { id: agent.id } });
    const terms = agent.invoicePeriod === "half-month" ? "half-month" : "month";
    if (!exists) {
      say(`Agent ${agent.name}: a business, ${terms}, 30 days to pay.`);
      if (!DRY_RUN) {
        await db.$transaction(async (tx) => {
          const fields = {
            kind: "agent",
            name: agent.name,
            status: agent.status === "active" ? "active" : "inactive",
            registrationNo: agent.registrationNo,
            contactName: agent.contactName,
            contactPhone: agent.contactPhone,
            contactEmail: agent.contactEmail,
            address: agent.address,
            paymentTerms: terms,
            daysToPay: 30,
          };
          // The same id and the day it was added, so it reads as the agent it was.
          await tx.business.create({
            data: { id: agent.id, createdAt: agent.createdAt, ...fields },
          });
          await logActivity(tx, SYSTEM_ACTOR, {
            action: "business.created",
            entityId: agent.id,
            after: fields,
          });
        });
      }
    }
    const bookings = await db.booking.count({ where: { agentId: agent.id } });
    if (bookings > 0) {
      say(
        `Agent ${agent.name}: ${plural(bookings, "booking")} point at the business.`,
      );
      if (!DRY_RUN) {
        await db.booking.updateMany({
          where: { agentId: agent.id },
          data: { businessId: agent.id, agentId: null },
        });
      }
    }
  }
  return agents;
}

async function numberBookings() {
  const last =
    (await db.booking.aggregate({ _max: { number: true } }))._max.number ?? 0;
  // A quotation (HTQ) waits for its HTB until it is confirmed: never
  // numbered here (docs/261111-catalogue-booking-flow-and-ops.md, part F).
  const unnumbered = await db.booking.findMany({
    where: { number: null, quoteNumber: null },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (unnumbered.length === 0) return last;
  say(
    `Numbering ${unnumbered.length} bookings ${formatDocumentNumber("booking", last + 1)} to ${formatDocumentNumber("booking", last + unnumbered.length)}, oldest first.`,
  );
  if (DRY_RUN) {
    unnumbered.forEach((b, index) =>
      planned.numbers.set(b.id, last + index + 1),
    );
  } else {
    await db.$transaction(
      unnumbered.map((booking, index) =>
        db.booking.update({
          where: { id: booking.id },
          data: { number: last + index + 1 },
        }),
      ),
    );
  }
  return last + unnumbered.length;
}

/** Old rows owed in part or in full, for Finance to record what came in. */
const owed: string[] = [];

async function billOldInvoices() {
  // The old rows: never issued in the new series, so no issue time.
  const rows = await db.invoice.findMany({
    where: { issuedAt: null, status: "issued" },
    orderBy: [{ createdAt: "asc" }, { number: "asc" }],
    select: {
      id: true,
      number: true,
      createdAt: true,
      updatedAt: true,
      paymentStatus: true,
      bookings: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          number: true,
          legacyInvoiceNumber: true,
          invoiceLine: true,
          priceTotalSen: true,
        },
      },
    },
  });
  for (const row of rows) {
    const oldNumber = new Map(
      row.bookings.map((b) => [
        b.id,
        b.legacyInvoiceNumber ??
          oldInvoiceLabel(row.number ?? 0, b.invoiceLine),
      ]),
    );
    const names = row.bookings.map((b) => labelOf(b)).join(", ") || "none";
    const paid = row.paymentStatus === "paid";
    if (DRY_RUN) {
      const total = row.bookings.reduce(
        (sum, b) =>
          sum + Math.max(0, planned.totals.get(b.id) ?? b.priceTotalSen),
        0,
      );
      say(
        `Old ${oldInvoiceLabel(row.number ?? 0, null)} (${names}): issued again for RM ${formatRinggit(total)}${paid ? ", paid" : ""}.`,
      );
      if (!paid && total > 0) owed.push(`${names} (${row.paymentStatus})`);
      for (const b of row.bookings) planned.reissued.add(b.id);
      continue;
    }
    await db.$transaction(async (tx) => {
      for (const booking of row.bookings) {
        const legacy = oldNumber.get(booking.id)!;
        await tx.booking.update({
          where: { id: booking.id },
          data: {
            legacyInvoiceNumber: legacy,
            invoiceId: null,
            invoiceLine: null,
          },
        });
        if (booking.legacyInvoiceNumber === null) {
          await logActivity(tx, SYSTEM_ACTOR, {
            action: "booking.legacy.changed",
            entityId: booking.id,
            before: { legacyInvoiceNumber: null },
            after: { legacyInvoiceNumber: legacy },
          });
        }
      }
      // The old row goes first: one main's code numbered after the first
      // run's counters holds the number the new series gives next.
      await tx.invoice.delete({ where: { id: row.id } });
      const issued = await issueOldInvoice(tx, SYSTEM_ACTOR, {
        bookingIds: row.bookings.map((b) => b.id),
        oldNumber,
        issuedAt: row.createdAt,
        paid: paid ? { at: row.updatedAt } : null,
      });
      say(
        issued
          ? `Old ${oldInvoiceLabel(row.number ?? 0, null)} (${names}): ${issued.label} for RM ${formatRinggit(issued.totalSen)}${paid ? ", paid" : ""}.`
          : `Old ${oldInvoiceLabel(row.number ?? 0, null)} (${names}): charges nothing now, no invoice.`,
      );
      if (issued && !paid)
        owed.push(`${issued.label} ${names} (${row.paymentStatus})`);
    });
  }
}

/**
 * Every other confirmed booking billed nothing yet: its own open invoice
 * while live, issued once ended; a credit agent's, a line of the agent's
 * open month-end invoice for its period, for Finance to issue.
 */
async function billTheRest() {
  const bookings = await db.booking.findMany({
    where: {
      confirmedAt: { not: null },
      invoiceLines: { none: {} },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      status: true,
      priceTotalSen: true,
      business: { select: { paymentTerms: true } },
    },
  });
  for (const booking of bookings) {
    if (planned.reissued.has(booking.id)) continue;
    if ((planned.totals.get(booking.id) ?? booking.priceTotalSen) === 0)
      continue;
    if (DRY_RUN) {
      say(
        `${labelOf(booking)} (${booking.status}): ${booking.business && isCredit(booking.business.paymentTerms) ? "agent's month-end invoice" : booking.status === "completed" || booking.status === "cancelled" ? "issued now" : "open invoice"}.`,
      );
      continue;
    }
    const billed = await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "Booking" WHERE id = ${booking.id} FOR UPDATE`;
      return settleBilling(tx, SYSTEM_ACTOR, booking.id, new Date());
    });
    say(
      `${labelOf(booking)} (${booking.status}): ${billed.length > 0 ? billed.join(", ") : "open invoice"}.`,
    );
  }
}

function reportOwed() {
  if (owed.length === 0) {
    console.log("Every old invoice issued again was marked fully paid.");
    return;
  }
  console.log(
    `${plural(owed.length, "old invoice")} not marked fully paid: Finance records what came in.`,
  );
  for (const line of owed) console.log(`  ${line}`);
}

async function dropAgentVendors(
  agents: { id: string; name: string; services: string[] }[],
) {
  for (const agent of agents) {
    const others = agent.services.filter((s) => s !== "agent");
    if (others.length === 0) {
      say(`Vendor ${agent.name}: deleted, it was an agent only.`);
      if (!DRY_RUN) await db.vendor.delete({ where: { id: agent.id } });
    } else {
      say(`Vendor ${agent.name}: no longer offers "agent".`);
      if (!DRY_RUN) {
        await db.vendor.update({
          where: { id: agent.id },
          data: { services: others },
        });
      }
    }
  }
}

async function setCounters(lastBooking: number) {
  const counters: [string, number][] = [["booking", lastBooking]];
  for (const type of ["invoice", "credit"] as const) {
    const max =
      (
        await db.invoice.aggregate({
          where: { type, number: { not: null }, issuedAt: { not: null } },
          _max: { number: true },
        })
      )._max.number ?? 0;
    counters.push([type, max]);
  }
  for (const [kind, last] of counters) {
    say(
      `Counter ${kind}: last ${last}, next ${formatDocumentNumber(kind as "booking", last + 1)}.`,
    );
    if (!DRY_RUN) {
      await db.bookingNumberCounter.upsert({
        where: { kind },
        create: { kind, last },
        update: { last },
      });
    }
  }
}

async function retotal() {
  const bookings = await db.booking.findMany({
    select: {
      id: true,
      number: true,
      priceTotalSen: true,
      items: { select: { status: true, priceTotalSen: true } },
      charges: { select: { amountSen: true } },
    },
  });
  for (const booking of bookings) {
    const total = chargedSenOf(booking);
    if (total === booking.priceTotalSen) continue;
    say(
      `${labelOf(booking)}: total RM ${formatRinggit(booking.priceTotalSen)} to RM ${formatRinggit(total)}, by the new rule.`,
    );
    if (DRY_RUN) {
      planned.totals.set(booking.id, total);
    } else {
      await db.booking.update({
        where: { id: booking.id },
        data: { priceTotalSen: total },
      });
    }
  }
}

async function writeFirstRevisions() {
  const bookings = await db.booking.findMany({
    where: { revisions: { none: {} } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      createdAt: true,
      status: true,
      items: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          position: true,
          status: true,
          startsAt: true,
          priceTotalSen: true,
          priceBreakdown: true,
          priceOverrideReason: true,
          tripDetails: {
            select: {
              vehicleClassCategory: true,
              vehicleClassName: true,
              vehicleModelName: true,
              mode: true,
              pickupPlace: true,
              stops: true,
              dropoffPlace: true,
              hours: true,
              distanceKm: true,
              passengers: true,
              guideLanguage: true,
            },
          },
        },
      },
      charges: { select: { itemId: true, label: true, amountSen: true } },
    },
  });
  if (bookings.length === 0) return;
  say(`Writing Rev 1 for ${bookings.length} bookings.`);
  if (DRY_RUN) return;
  for (const booking of bookings) {
    const snapshot = snapshotOf(booking, itemHeading);
    const made = await db.activityLog.findFirst({
      where: {
        entityType: "booking",
        entityId: booking.id,
        action: "booking.created",
      },
      select: { actorId: true },
    });
    await db.bookingRevision.create({
      data: {
        bookingId: booking.id,
        number: 1,
        kind: "booked",
        summary: REVISION_KIND_LABELS.booked,
        snapshot,
        quotedSen: snapshot.quotedSen,
        chargedSen: snapshot.chargedSen,
        createdById: made?.actorId ?? null,
        createdAt: booking.createdAt,
      },
    });
  }
}

const agents = await moveAgents();
const lastBooking = await numberBookings();
await retotal();
await writeFirstRevisions();
await setCounters(lastBooking);
await billOldInvoices();
await dropAgentVendors(agents);
await billTheRest();
reportOwed();
await db.$disconnect();
