// Usage: pnpm --filter @repo/db db:set-billing [-- --dry-run]
//
// Run once per database after the schema push of
// docs/261108-billing-and-revisions.md, right before the merge (the code
// still live until then gives invoices the old way), and again if a
// booking was made in between: every step skips what it did already.
//
// 1. Agents leave Vendor: each vendor offering "agent" is copied to a
//    `Business` with the same id (its invoice period becomes its payment
//    terms, 30 days to pay), its bookings point at the business instead.
// 2. Every booking without a number takes the next HTB number, in the
//    order they were made: the first booking ever made is HTB-0001.
// 3. Every invoice number given so far moves into its booking's legacy
//    invoice number, as it read (HTI-1308, HTI-1295-03), so the booking
//    is billed outside the system; the old invoice rows and their payment
//    statuses go (Finance's sheet keeps them).
// 4. The agent-only vendors are deleted; a vendor that also supplies only
//    loses "agent".
// 5. The counters: bookings carry on from the last HTB given; invoices
//    and credit notes start again, so the first issued is HTI-0001 and
//    HTC-0001, unless a document of the new series exists already.
// 6. Every booking's total follows the new rule, what the customer pays
//    now: its live trips and its charges. A cancelled one charged its last
//    total before; it charges its fees alone, none yet, so nothing stale is
//    ever billed for it.
// 7. Every booking without a revision gets its Rev 1, "Booked", from what
//    it holds now.
//
// It ends listing the confirmed bookings left with no legacy number, which
// the app bills from their next change, or Finance bills alone. With
// --dry-run it prints what it would do and writes nothing.
import { logActivity } from "../src/activity";
import { SYSTEM_ACTOR } from "../src/activity-actions";
import { bookingLabelOf, formatDocumentNumber } from "../src/booking-number";
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
 * run does: bookings by their new number, the legacy numbers and totals
 * set, and the closing list of what is left to bill.
 */
const planned = {
  numbers: new Map<string, number>(),
  legacy: new Set<string>(),
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
  const unnumbered = await db.booking.findMany({
    where: { number: null },
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

async function moveOldInvoices() {
  const invoiced = await db.booking.findMany({
    where: { invoiceId: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      legacyInvoiceNumber: true,
      invoiceLine: true,
      invoice: { select: { number: true } },
    },
  });
  for (const booking of invoiced) {
    if (!booking.invoice?.number) continue;
    const legacy =
      booking.legacyInvoiceNumber ??
      oldInvoiceLabel(booking.invoice.number, booking.invoiceLine);
    say(`${labelOf(booking)}: legacy invoice ${legacy}.`);
    if (DRY_RUN) {
      planned.legacy.add(booking.id);
      continue;
    }
    await db.$transaction(async (tx) => {
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
    });
  }
  // The old rows: never issued in the new series, so no issue time.
  const old = await db.invoice.count({
    where: { issuedAt: null, status: "issued" },
  });
  if (old > 0) {
    say(`Deleting the ${old} old invoice rows.`);
    if (!DRY_RUN) {
      await db.invoice.deleteMany({
        where: { issuedAt: null, status: "issued", bookings: { none: {} } },
      });
    }
  }
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

async function listUnbilled() {
  const unbilled = await db.booking.findMany({
    where: {
      legacyInvoiceNumber: null,
      confirmedAt: { not: null },
      invoiceLines: { none: {} },
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      number: true,
      status: true,
      contactName: true,
      priceTotalSen: true,
    },
  });
  const left = unbilled.filter(
    (b) =>
      !planned.legacy.has(b.id) &&
      (planned.totals.get(b.id) ?? b.priceTotalSen) > 0,
  );
  if (left.length === 0) {
    console.log("Every confirmed booking is billed outside the system.");
    return;
  }
  console.log(
    `${plural(left.length, "confirmed booking")} without a legacy invoice number. The app bills each at its next change, or Finance bills it alone:`,
  );
  for (const b of left) {
    console.log(
      `  ${labelOf(b)}  ${b.status}  RM ${formatRinggit(b.priceTotalSen)}  ${b.contactName}`,
    );
  }
}

const agents = await moveAgents();
const lastBooking = await numberBookings();
await moveOldInvoices();
await dropAgentVendors(agents);
await setCounters(lastBooking);
await retotal();
await writeFirstRevisions();
await listUnbilled();
await db.$disconnect();
