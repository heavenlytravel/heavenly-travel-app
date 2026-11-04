// Usage: pnpm --filter @repo/db db:number-bookings -- \
//   --set HT-AYST7B=HTQ-26-00012 --set HT-AYST7B=HTI-26-00030 \
//   --quote-last 1234 --invoice-last 567
//
// Run on each database after the schema push that adds booking numbers
// (docs/261102-booking-ops.md, "5. Quotation and invoice numbers"), before
// the merge. Every part is optional, and they run in this order:
//
// 1. `--set`, as often as needed: a booking, by its reference, gets the
//    number given, as the old system gave it. Every one is checked before
//    any is written: a whole number of either kind, a booking that
//    exists, no number given twice or already another booking's. A
//    booking that has that number already is left as it is.
// 2. Each counter is moved on to the highest number given of its kind and
//    year, so the next booking made carries on after it.
// 3. `--quote-last` and `--invoice-last` are the last quotation and
//    invoice numbers the old system gave this year: ours carry on after
//    them. A counter already past the number given is kept.
// 4. Every booking still without its numbers gets them, each counted in
//    its own year in Malaysia: a quotation number, in the order they were
//    made, for those staff entered; an invoice number, in the order they
//    were confirmed, for those ever confirmed.
//
// Run again, it finds nothing to do and changes nothing.
import { parseArgs } from "node:util";
import { nextBookingNumber } from "../src/booking-counter";
import {
  bookingNumberYear,
  formatBookingNumber,
  parseBookingNumber,
  type BookingNumberKind,
} from "../src/booking-number";
import { db } from "../src/client";

const { values } = parseArgs({
  options: {
    set: { type: "string", multiple: true },
    "quote-last": { type: "string" },
    "invoice-last": { type: "string" },
  },
});

/** A number the old system gave a booking, to keep. */
type Given = {
  reference: string;
  kind: BookingNumberKind;
  year: number;
  number: number;
};

const NUMBER_FIELDS = {
  quote: { year: "quoteYear", number: "quoteNumber" },
  invoice: { year: "invoiceYear", number: "invoiceNumber" },
} as const;

const given = (values.set ?? []).map(parseSet);
await checkGiven(given);
for (const entry of given) await setGiven(entry);
for (const entry of highestGiven(given).values()) {
  await moveCounter(entry.kind, entry.year, entry.number);
}

const year = bookingNumberYear(new Date());
for (const [kind, text] of [
  ["quote", values["quote-last"]],
  ["invoice", values["invoice-last"]],
] as const) {
  if (text === undefined) continue;
  if (!/^\d+$/.test(text)) {
    throw new Error(`--${kind}-last takes a whole number, not "${text}".`);
  }
  await moveCounter(kind, year, Number(text));
}

/** "HT-AYST7B=HTQ-26-00012", read; the kind's letter is required. */
function parseSet(text: string): Given {
  const [reference, number, ...rest] = text.split("=");
  const parsed = number ? parseBookingNumber(number) : null;
  if (!reference || rest.length > 0 || !parsed || !parsed.kind) {
    throw new Error(
      `--set takes a reference and a whole number, as HT-AYST7B=HTQ-26-00012, not "${text}".`,
    );
  }
  return {
    reference: reference.trim().toUpperCase(),
    kind: parsed.kind,
    year: parsed.year,
    number: parsed.number,
  };
}

/** Refuses the whole run, before anything is written, for any number that cannot be given. */
async function checkGiven(entries: readonly Given[]) {
  const problems: string[] = [];
  const seen = new Map<string, string>();
  for (const entry of entries) {
    const label = formatBookingNumber(entry.kind, entry.year, entry.number);
    const twice = [`${entry.reference} ${entry.kind}`, label];
    for (const key of twice) {
      if (seen.has(key)) problems.push(`${key} is given twice.`);
      seen.set(key, entry.reference);
    }
    const booking = await db.booking.findUnique({
      where: { reference: entry.reference },
      select: { id: true, quoteNumber: true, invoiceNumber: true },
    });
    if (!booking) {
      problems.push(`No booking has the reference ${entry.reference}.`);
      continue;
    }
    const fields = NUMBER_FIELDS[entry.kind];
    const holder = await db.booking.findFirst({
      where: {
        [fields.year]: entry.year,
        [fields.number]: entry.number,
        id: { not: booking.id },
      },
      select: { reference: true },
    });
    if (holder) problems.push(`${label} is ${holder.reference}'s already.`);
    const current =
      entry.kind === "quote" ? booking.quoteNumber : booking.invoiceNumber;
    if (current !== null && current !== entry.number) {
      problems.push(
        `${entry.reference} has a ${entry.kind} number already; clear it first to give it ${label}.`,
      );
    }
  }
  if (problems.length > 0) {
    throw new Error(`Nothing was changed:\n- ${problems.join("\n- ")}`);
  }
}

async function setGiven(entry: Given) {
  const fields = NUMBER_FIELDS[entry.kind];
  const label = formatBookingNumber(entry.kind, entry.year, entry.number);
  const { count } = await db.booking.updateMany({
    where: { reference: entry.reference, [fields.number]: null },
    data: { [fields.year]: entry.year, [fields.number]: entry.number },
  });
  console.log(
    count > 0
      ? `${entry.reference} → ${label}`
      : `${entry.reference} has ${label} already; kept.`,
  );
}

/** The highest number given of each kind and year. */
function highestGiven(entries: readonly Given[]): Map<string, Given> {
  const highest = new Map<string, Given>();
  for (const entry of entries) {
    const key = `${entry.kind} ${entry.year}`;
    const now = highest.get(key);
    if (!now || entry.number > now.number) highest.set(key, entry);
  }
  return highest;
}

/** Moves a year's counter on to `last`, so the next number is after it; never back. */
async function moveCounter(
  kind: BookingNumberKind,
  year: number,
  last: number,
) {
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
