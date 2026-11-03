// Usage: pnpm --filter @repo/db db:number-bookings -- --quote-last 1234 --invoice-last 567
//
// Run on each database after the schema push that adds booking numbers
// (docs/261102-booking-ops.md, "5. Quotation and invoice numbers"), before
// the merge. `--quote-last` and `--invoice-last` are the last quotation and
// invoice numbers the old system gave this year: ours carry on after them.
// Either may be left out, and a counter already past the number given is
// kept. Then every booking without its numbers gets them, each counted in
// its own year in Malaysia: a quotation number, in the order they were
// made, for those staff entered; an invoice number, in the order they were
// confirmed, for those ever confirmed. Run again, it finds none to number
// and changes nothing.
import { parseArgs } from "node:util";
import { nextBookingNumber } from "../src/booking-counter";
import {
  bookingNumberYear,
  formatBookingNumber,
  type BookingNumberKind,
} from "../src/booking-number";
import { db } from "../src/client";

const { values } = parseArgs({
  options: {
    "quote-last": { type: "string" },
    "invoice-last": { type: "string" },
  },
});

const year = bookingNumberYear(new Date());
for (const [kind, text] of [
  ["quote", values["quote-last"]],
  ["invoice", values["invoice-last"]],
] as const) {
  if (text === undefined) continue;
  if (!/^\d+$/.test(text)) {
    throw new Error(`--${kind}-last takes a whole number, not "${text}".`);
  }
  await setLast(kind, Number(text));
}

async function setLast(kind: BookingNumberKind, last: number) {
  const now = await db.bookingNumberCounter.findUnique({
    where: { kind_year: { kind, year } },
  });
  if (now && now.last >= last) {
    console.log(
      `The ${kind} counter is at ${formatBookingNumber(kind, year, now.last)} already; kept.`,
    );
    return;
  }
  await db.bookingNumberCounter.upsert({
    where: { kind_year: { kind, year } },
    create: { kind, year, last },
    update: { last },
  });
  console.log(
    `${kind === "quote" ? "Quotations" : "Invoices"} carry on after ${formatBookingNumber(kind, year, last)}.`,
  );
}

// Staff entered it: its "booking.created" entry says so.
const byStaff = await db.activityLog.findMany({
  where: {
    entityType: "booking",
    action: "booking.created",
    after: { path: ["via"], equals: "console" },
  },
  select: { entityId: true },
});
const quotes = await db.booking.findMany({
  where: {
    quoteNumber: null,
    id: { in: byStaff.map((entry) => entry.entityId) },
  },
  orderBy: { createdAt: "asc" },
  select: { id: true, reference: true, createdAt: true },
});
for (const booking of quotes) {
  await db.$transaction(async (tx) => {
    const { year, number } = await nextBookingNumber(
      tx,
      "quote",
      booking.createdAt,
    );
    await tx.booking.update({
      where: { id: booking.id },
      data: { quoteYear: year, quoteNumber: number },
    });
    console.log(
      `${booking.reference} → ${formatBookingNumber("quote", year, number)}`,
    );
  });
}

// Ever confirmed: a trip of it was. A booking cancelled while received
// has a confirmedAt too, but no trip confirmed.
const invoices = await db.booking.findMany({
  where: {
    invoiceNumber: null,
    confirmedAt: { not: null },
    items: { some: { confirmedAt: { not: null } } },
  },
  orderBy: { confirmedAt: "asc" },
  select: { id: true, reference: true, confirmedAt: true },
});
for (const booking of invoices) {
  await db.$transaction(async (tx) => {
    const { year, number } = await nextBookingNumber(
      tx,
      "invoice",
      booking.confirmedAt!,
    );
    await tx.booking.update({
      where: { id: booking.id },
      data: { invoiceYear: year, invoiceNumber: number },
    });
    console.log(
      `${booking.reference} → ${formatBookingNumber("invoice", year, number)}`,
    );
  });
}

console.log(
  quotes.length + invoices.length === 0
    ? "Every booking has its numbers."
    : `Gave ${quotes.length} quotation and ${invoices.length} invoice numbers.`,
);
await db.$disconnect();
