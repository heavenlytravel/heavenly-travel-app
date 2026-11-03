// Usage: pnpm --filter @repo/db db:number-bookings
//
// Run on each database after the schema push that adds booking numbers
// (docs/261102-booking-ops.md, "5. Quotation and invoice numbers"), before
// the merge. Gives every booking without a number one, oldest first, each
// counted in the year it was made in Malaysia, after the highest that year
// already has. Run again, it finds none without a number and changes
// nothing.
import { bookingNumberOf, bookingNumberYear } from "../src/booking-number";
import { db } from "../src/client";

const unnumbered = await db.booking.findMany({
  where: { number: null },
  orderBy: { createdAt: "asc" },
  select: { id: true, reference: true, createdAt: true, confirmedAt: true },
});

const highest = new Map<number, number>();
let done = 0;
for (const booking of unnumbered) {
  const numberYear = bookingNumberYear(booking.createdAt);
  if (!highest.has(numberYear)) {
    const last = await db.booking.aggregate({
      where: { numberYear },
      _max: { number: true },
    });
    highest.set(numberYear, last._max.number ?? 0);
  }
  const number = highest.get(numberYear)! + 1;
  highest.set(numberYear, number);
  await db.booking.update({
    where: { id: booking.id },
    data: { numberYear, number },
  });
  done += 1;
  console.log(
    `${booking.reference} → ${bookingNumberOf({ numberYear, number, confirmedAt: booking.confirmedAt })}`,
  );
}
console.log(
  done === 0 ? "Every booking has a number." : `Numbered ${done} bookings.`,
);
await db.$disconnect();
