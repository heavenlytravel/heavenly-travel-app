// Usage: pnpm --filter @repo/db db:set-booking-numbers -- --invoice-last 1307 [--quote-last 0]
//
// Sets the running numbers: `--invoice-last` is the last invoice number
// given, by hand or by the old system (HT1307), so the next booking
// confirmed takes HTI-1308; `--quote-last` the same for quotations. Either
// may be left out; with neither, it only says where they are. A number
// below one a booking holds already is refused, since the counter would
// come to give that number again. Old invoices typed on New booking
// (HT1223) never move the counter. See docs/261102-booking-ops.md, "5.
// Quotation and invoice numbers".
import { parseArgs } from "node:util";
import { formatBookingNumber } from "../src/booking-number";
import { db } from "../src/client";

const { values } = parseArgs({
  options: {
    "invoice-last": { type: "string" },
    "quote-last": { type: "string" },
  },
});

for (const [kind, text] of [
  ["invoice", values["invoice-last"]],
  ["quote", values["quote-last"]],
] as const) {
  if (text === undefined) continue;
  if (!/^\d+$/.test(text)) {
    throw new Error(`--${kind}-last takes a whole number, not "${text}".`);
  }
  const last = Number(text);
  const { _max } = await db.booking.aggregate({
    _max: { invoiceNumber: true, quoteNumber: true },
  });
  const held =
    (kind === "invoice" ? _max.invoiceNumber : _max.quoteNumber) ?? 0;
  if (held > last) {
    throw new Error(
      `${formatBookingNumber(kind, held)} is a booking's already, so the last ${kind} number given cannot be ${last}.`,
    );
  }
  await db.bookingNumberCounter.upsert({
    where: { kind },
    create: { kind, last },
    update: { last },
  });
}

for (const kind of ["invoice", "quote"] as const) {
  const row = await db.bookingNumberCounter.findUnique({ where: { kind } });
  const last = row?.last ?? 0;
  console.log(
    `${kind === "invoice" ? "Invoices" : "Quotations"}: last given ${last}, next ${formatBookingNumber(kind, last + 1)}.`,
  );
}
await db.$disconnect();
