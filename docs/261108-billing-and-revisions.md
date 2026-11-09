# Billing: agents, invoices, payments and booking revisions

Decided with the developer on 2026-11-04 to 2026-11-08, across three threads (booking amendment
pricing, agent bookings and Biz, and this one). The page for staff is
`../heavenly-travel-docs/presentations/261108-bookings-invoices-payments.html`; it shows the
same rules with scenarios. This plan says how to build them.

One pull request covers three parts, in this order inside the branch:

1. **Agents out of Vendor**, into a `Business` record, the base for Biz later.
2. **New invoicing**: booking numbers, invoices and credit notes, payments, the month-end run,
   the Finance list, legacy numbers.
3. **Booking revisions**: every change is a revision, stops on a trip, driver pay as lines,
   and billing that follows a revision on its own.

HitPay is a separate pull request, built on this one (`docs/261028-payment.md`, in worktree
`t3-b091d10a`). Biz itself is not built: see `docs/261105-biz-business-accounts.md` (worktree
`t3-09a8061e`), whose `Business` model this plan takes, smaller.

## Decisions

1. **One number per document type**, four digits that grow to five, no year:
   `HTB-1042` booking, `HTI-1310` invoice, `HTC-0001` credit note. `HTQ` waits for Quotes.
   The team may change the formats later; keep them in one place (`booking-number.ts`).
2. **The booking number is the booking's ID everywhere**: Manage, the website, emails, the
   phone. The invoice number is never the booking's ID.
3. **The random reference (`HT-7K3QZM`) is removed.** No guest link. Website booking pages
   are `/booking/HTB-1042`, owner only, as now. A guest reads the booking in the email, or
   signs in with the same email (sign-up claims the guest's bookings, `sync.ts`). Old
   reference links stop working; My bookings still has them.
4. **Three statuses, never mixed.** Booking: received, confirmed, completed, cancelled
   (unchanged). Invoice: draft, issued, void. Payment state: worked out from the payments,
   never set by hand. Confirmed does not mean paid. `PAYMENT_STATUSES` and "Pay later" go.
5. **When a booking is billed:** when it is confirmed, unless its business is on credit terms.
   Website (until HitPay): when Reservation confirms. Admin booking: at once, since it is
   confirmed at once, with nothing paid yet if so. No-credit agent: per booking, like a
   direct customer. Credit agent: the month-end run, or billed alone by Finance.
6. **Billed to:** the business for every agent booking, credit or not; otherwise the
   booking's contact. The invoice keeps a snapshot of who it is billed to.
7. **An issued invoice never changes.** More to pay: a new invoice for the difference. Less to
   pay: a credit note against an invoice. No child numbers (`HTI-1305-02`): the booking page
   lists all of its invoices.
8. **Billing follows the revision.** Staff never add an invoice by hand. Saving a revision on a
   non-credit booking that is already billed issues the new invoice or credit note at once;
   the save shows which first, as the invoice preview does today. On a credit booking the
   difference waits for the next run, or Finance bills it alone; a reduction after its month
   is issued is a credit note at once.
9. **Month-end run, draft first.** Finance creates the draft after the period ends; it ticks
   the period's bookings (by first pick-up, Malaysia's calendar) and lists earlier unbilled
   amounts unticked. Finance unticks, then issues; only issuing gives the number.
10. **Mistakes.** Wrong billed-to, agent or bookings: void with a reason and reissue; the void
    number stays listed. Wrong amount: a correction revision on the booking. Wrong payment
    entry: reversed with a reason, never deleted.
11. **Refunds only**, as payment records with a minus amount, against a credit note. Carrying
    credit to a later invoice comes later.
12. **Payment terms** (`none`, `month`, `half-month`) are chosen when an agent is added and
    change only going forward, by Finance or SUPER, with a reason. **Days to pay** sets the
    due date and Overdue.
13. **Legacy invoice number**: free text on a booking, not unique, for admin's reference. A
    booking with one counts as billed: no HTI is given, it is left out of runs and "Not
    invoiced yet", and revisions on it bill nothing (the page says "Billed outside the
    system"). Prod: every current invoice number moves into it; current payment statuses are
    dropped; the HTI counter carries on (next HTI-1307 or wherever prod stands).
14. **Revisions belong to bookings.** Every change to what we deliver, charge or pay is one:
    trip details, stops, add-ons, late charges, discounts, corrections, cancelling a trip,
    driver pay. Not revisions: notes, contact fixes, assigning, payments, status steps.
    Allowed while received, confirmed, during the trip and after completed (late charges);
    not once cancelled.
15. **Price rule:** suggested price = what the customer pays now + (new quote − old quote).
    Staff may agree another number, with a reason. The agreed price is no longer dropped by
    an amend.
16. **An amend never lets go of the vendors or the driver.** When the change no longer fits
    what is assigned (class, time), the save warns; Operation changes it on Assign.
17. **A stop stays on the trip.** A → C with a stop at B is still one trip; its quote is the
    legs priced on their own and added (A → B + B → C). Connect shows A → B → C.
18. **Driver pay is lines**: the base from the offer plus each addition with its reason, tied
    to the revision that made it. The app suggests a stop's charge and the driver's stop pay;
    staff can change both.
19. **Customers see a change list** (date, what changed, amount, new total), never reasons or
    quoted-versus-agreed.
20. **Finance only** creates, issues and voids invoices and records payments
    (`invoices.manage`). Every admin in prod is SUPER today, so this costs nothing yet.

## Schema

Additive first (prod schema order), drops in the next schema change. Sketch; names may
change in the build.

```prisma
/// A business we sell to on account. Only agents for now; corporates and
/// Biz members come with Biz (docs/261105-biz-business-accounts.md).
model Business {
  id             String   @id @default(cuid())
  /// BUSINESS_KINDS: "agent"
  kind           String
  name           String
  /// "active" | "inactive": inactive takes no new bookings, is still billed.
  status         String   @default("active")
  registrationNo String   @default("")
  contactName    String
  contactPhone   String
  contactEmail   String
  address        String   @default("")
  /// PAYMENT_TERMS: "none" | "month" | "half-month"
  paymentTerms   String
  daysToPay      Int      @default(30)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  bookings Booking[]
  invoices Invoice[]
}

model Booking {
  // new
  number              Int      @unique   // HTB-1042, BookingNumberCounter "booking"
  businessId          String?
  legacyInvoiceNumber String?
  revisions           BookingRevision[]
  invoiceLines        InvoiceLine[]
  // dropped next schema change: reference, quoteNumber, invoiceId, invoiceLine,
  // agentId, invoiceNumber
}

/// One state of a booking, append only. Rev 1 is the booking as made.
model BookingRevision {
  id         String   @id @default(cuid())
  bookingId  String
  number     Int                       // 1, 2, 3 within the booking
  /// REVISION_KINDS: "booked" | "change" | "stop" | "add-on" | "late-charge"
  /// | "discount" | "correction" | "cancel"
  kind       String
  reason     String?                   // staff only
  /// The customer's line: "Stop at B added".
  summary    String
  /// Every item as it stood: trip, stops, receipt, agreed price, status.
  snapshot   Json
  quotedSen  Int                       // sum of the items' receipts
  chargedSen Int                       // what the customer pays at this revision
  createdById String?
  createdAt  DateTime @default(now())
  @@unique([bookingId, number])
}

/// An invoice or a credit note. Number null while a draft.
model Invoice {
  id          String    @id @default(cuid())
  /// "invoice" | "credit"
  type        String
  number      Int?                      // per type: HTI / HTC counters
  /// "draft" | "issued" | "void"
  status      String
  businessId  String?
  /// Who it is billed to, as at issue: name, email, phone, address, registration.
  billTo      Json
  /// A month-end run's period; null on a single booking's invoice.
  periodStart DateTime? @db.Date
  periodEnd   DateTime? @db.Date
  /// A credit note's invoice.
  creditsId   String?
  /// The invoice a void one was replaced by.
  replacedById String?
  totalSen    Int                       // frozen at issue; negative on a credit note
  issuedAt    DateTime?
  dueAt       DateTime?
  voidedAt    DateTime?
  voidReason  String?
  lines       InvoiceLine[]
  payments    Payment[]
  @@unique([type, number])
}

/// What one booking adds to an invoice: its first bill, or a revision's difference.
model InvoiceLine {
  id         String  @id @default(cuid())
  invoiceId  String
  bookingId  String
  revisionId String?
  description String                    // "HTB-1042 Rev 3: stop at B"
  amountSen  Int
}

/// Money in (positive) or a refund out (negative). Reversed, never deleted.
model Payment {
  id           String    @id @default(cuid())
  invoiceId    String
  amountSen    Int
  /// PAYMENT_METHODS: "transfer" | "cash" | "cash-to-driver" | "card" | ...
  method       String
  paidAt       DateTime
  note         String?
  recordedById String?
  reversedAt   DateTime?
  reversedById String?
  reverseReason String?
  createdAt    DateTime  @default(now())
}

/// One addition to a trip part's pay, from a revision: "+RM40 stop at B".
model PartPayLine {
  id         String @id @default(cuid())
  partId     String
  revisionId String
  amountSen  Int
  reason     String
}
```

- `TripItemDetails.stops Json` (ordered places, `[]` by default) for stops.
- `TripPart.costSen` stays the base; a part's pay is `costSen + Σ PartPayLine`.
- `BookingNumberCounter` gains kinds `booking` and `credit`; `quote` stays unused until
  Quotes, and `invoice` carries on.
- `Vendor.invoicePeriod`, `agentBookings`, `agentInvoices` and `"agent"` in
  `VENDOR_SERVICES` go.

## Billing rules in code

A new module, `packages/db/src/billing.ts`, owns every rule below, so Manage, Connect, the
web and the HitPay PR never compute money themselves.

- **Billed amount** of a booking = Σ its lines on issued invoices + Σ its lines on issued
  credit notes. **Not invoiced yet** = the latest revision's `chargedSen` − billed amount.
  Legacy bookings: always 0.
- **On confirmation** (first time, non-credit, no legacy): issue an invoice for the charged
  total. Replaces `invoiceFor` in `refreshBooking`.
- **On saving a revision** (non-credit, already billed): difference > 0 issues an invoice;
  < 0 issues a credit note against the booking's latest issued invoice. Credit booking:
  > 0 waits; < 0 after its invoice is issued gives a credit note against it. The same
  function returns the preview for the save dialog (`billingPreviewOf`), as
  `previewInvoice` does now.
- **Month-end run** (`createPeriodDraft`): refused before the period ends, and when a draft
  for that business and period exists (lock the business row). Lines: each booking of the
  business with a non-zero "Not invoiced yet" and first pick-up in the period, ticked;
  earlier ones unticked. Cancelled bookings only with a fee. A booking is on at most one
  draft.
- **Issue**: takes the next number for the type inside the transaction (counter row lock, as
  `nextBookingNumber`), freezes `totalSen` and `billTo`, sets `dueAt` from `daysToPay`
  (0 days for a customer).
- **Void**: Finance, with a reason. Its lines stop counting, so the bookings are unbilled
  again. With payments on it, it must be voided **with** its replacement: same lines, the
  corrected billed-to, payments moved, issued in the same transaction.
- **Payment state** of an invoice (credit notes fold into the invoice they credit):
  net = total + Σ its credit notes; paid = Σ live payments on it and on its credit notes.
  Balance > 0 and nothing paid: Unpaid, Overdue past `dueAt`. Some paid: Partially paid.
  Balance 0: Paid, or Nothing due when net and paid are both 0. Balance < 0: Refund due.
  A booking's state is the same sum across its invoices.
- **Payment terms change**: logged with the reason, applies to what is not billed yet; no
  documents made by the change itself.

## Revisions in code

- `createBooking` writes Rev 1 (`booked`) and gives the HTB number.
- `amendItem`, `addItem`, `cancelItem`, `cancelBookingAsAdmin`, the customer's cancels and
  `overrideItemPrice` each write a revision and then call billing. `amendItem` no longer calls
  `releaseParts`; it keeps the agreed price by the price rule (decision 15) and returns
  warnings for parts that no longer fit.
- New actions: **Add stop** (place, wait, suggested charge and driver pay), **Add charge**
  (late charge, toll, parking, overtime: customer amount and the driver's reimbursement or
  pay), **Correction** and **Discount** (a new agreed price with a reason).
- **Stop pricing**: price each leg with the trip's own rules (zone grid, per km, weekend) and
  add them; the quote's difference feeds the price rule. **Stop pay** suggestion: extra km ×
  a driver pay per km plus a stop fee, from new per-location pay settings that Operation
  enters; with none entered, there is no suggestion and staff type it.
- The snapshot is written from the same data the booking page reads, so a revision page can
  render it with the booking's own components, read only.

## Screens

**Manage**
- **Agents** (new menu item, out of Fleet): list, Add agent (as Add vendor, with payment
  terms and days to pay), agent page: profile, its bookings (HTB numbers), Not invoiced yet
  with the total, its invoices, Create invoice for the last period (credit terms only).
  Changing terms: Finance or SUPER, with a reason. New booking's Add agent (PR #71) adds a
  `Business`.
- **Invoices** (new, Finance): every HTI and HTC with billed to, type, period, total, paid,
  balance, due, state; filters by state, business, period, overdue. Invoice page: lines,
  payments, credit notes, Record payment, Reverse payment, Record refund, Void (and
  reissue). The draft page: tick, untick, total, Issue.
- **Booking page**: titled `HTB-1042`. Invoices list (number, what, amount, state, total,
  paid, due). Revisions list (Rev, when, kind, summary, price, by whom), each opening its
  snapshot. One **Change booking** menu: amend, add trip, add stop, add charge, discount,
  correction, cancel; each save shows its billing preview. Legacy number shown, editable,
  and "Billed outside the system".
- **New booking**: the invoice field from PR #72 becomes the legacy invoice number field;
  the preview shows what confirming will bill.
- **Bookings table and search**: HTB number first; search finds HTB, HTI, HTC and legacy
  text. The Agent column and filter read the business.
- **Assign**: shows a part's pay as base plus lines, and the amend warnings.

**Connect**: the driver's job shows stops in order, with a map link through them, and pay as
a total with its lines. No customer prices.

**Website**: `[reference]` routes become the booking number (`/booking/HTB-1042`,
`/account/bookings/HTB-1042`, `/booking/received/HTB-1042`), still owner only; the received
page still reads nothing. The booking shows its change list and total. Emails use the HTB
number. `references.ts` goes.

## Production order

Follows `docs/` prod rules (rehearse on a Neon copy, back up to a branch).

1. Push the additive schema.
2. Run, in order, each rehearsed and safe to run twice:
   - `db:set-businesses`: copy each agent vendor to a `Business` with the same id
     (`invoicePeriod` to terms; days to pay 30); repoint `Booking.businessId`; remove
     `"agent"` from vendors that also supply, delete agent-only vendors.
   - `db:set-booking-numbers`: give every booking an HTB number by `createdAt`, set the
     counter.
   - `db:set-legacy-invoices`: write each booking's current invoice number (as shown, e.g.
     `HTI-1295-03`) into `legacyInvoiceNumber`, delete today's invoice rows, keep the HTI
     counter. Every booking confirmed before the merge is therefore "billed outside".
     Run it last, right before the merge, because old code still gives invoices until then.
   - Write Rev 1 for every booking from its current state.
3. Merge.
4. Next schema change: drop the old columns (decision list under Schema), with
   `VehicleClass.imageUrl` and `Booking.invoiceNumber` already waiting.

## Tests

Domain tests in `packages/db` for: the price rule, billed and unbilled amounts, billing on
confirm and on revision for each customer type, the run (period edges at 23:30 Malaysia
time, half-month, earlier unbilled, cancelled with a fee, refused before the period ends,
one draft), issue numbering under concurrency, void with replacement and moved payments, the
payment state table (each state, credit notes folded in, refunds, reversed payments),
legacy bookings billing nothing, terms changes applying forward.

## To confirm with the team

- An add-on paid by an agent's guest during the trip: may that invoice be billed to the guest?
- Biz bookings: confirmed at once on credit terms, or confirmed by Reservation?
- Numbered official receipts per payment, or is a paid invoice enough?
- MyInvois: does the company have to submit yet?
- The HTB series' first number, and the driver pay per km and stop fee for each location.

## Not in this PR

- HitPay: payment records from the gateway, invoice and confirmation at payment, expiry of
  unpaid website bookings, emails on payment.
- Driver stop request from Connect (BL-123).
- Biz, corporates, members, tiers; Quotes; credit carried to a later invoice; statements;
  vendor and driver payouts.

## Decisions taken in the build (2026-11-08)

Where the build differs from the plan above, and why. Each can be revisited.

1. **New invoices start at HTI-0001 and HTC-0001**, as the developer asked, not "carry on
   from HTI-1307". From about HTI-1149 the new series repeats numbers already printed in
   the legacy field (HT1149, HTI-1259 to HTI-1312). Search labels the old ones "Legacy".
   Finance to agree; the staff page in the docs repo still says "carries on".
2. **Additive schema.** `Booking.number` and `Booking.reference` are nullable until the
   next schema change. The old `Invoice` table is extended in place (new columns with
   defaults, `number` nullable, unique on `(type, number)`); its old columns stay until the
   drop. `prisma db push` warns that the new `(type, number)` unique index might lose data.
   It cannot: every old row has `type = 'invoice'` and a unique number. Accepting the
   warning is the developer's call.
3. **Charges live in `BookingCharge`** (add-ons, late charges, a cancelled trip's fee). A
   booking's total is its live trips plus its charges, so a cancelled booking charges its
   fees alone.
4. **Driver pay lines (`ItemPayLine`) belong to the trip and the role**, not the part, so a
   new driver keeps a stop's pay when a part is released.
5. **Credit notes go newest invoice first**, one per invoice, each capped at what that
   invoice still nets for the booking.
6. **Draft lines hold no amounts.** Issuing writes each ticked booking's unbilled amount as
   it then stands.
7. **A direct customer's invoice is due at the first pick-up**, or at issue if that has
   passed. A business's is due its days to pay after issue.
8. **One switch-over script, `db:set-billing`** (and `:prod`), run right before the merge
   and safe to run again: agents to businesses (agent-only vendors deleted), HTB numbers by
   `createdAt` from HTB-0001, legacy invoice numbers, the old invoice rows deleted,
   counters, every total re-totalled by the new rule, then Rev 1.
9. **The Agents and Invoices screens sit in a "Billing" section** under Selling. The
   bookings list loses its Payment filter (Finance works from Invoices); its Invoice column
   shows HTI numbers or the legacy one.
10. **Permissions:** `bookings.payment` is replaced by `invoices.manage` (Finance) and
    `agents.manage` (Reservation, Sales, Finance). Operation may add stops and charges
    (`bookings.fulfil`).

Known limits: amending a trip that has stops prices it pickup to drop-off again and keeps
the stops' earlier additions; there are no database-level tests (concurrency, run edges).
The flows were rehearsed end to end on a throwaway Neon copy of the development database.

### Production order for this PR

1. `pnpm db:push:prod --accept-data-loss`. The warning is the new unique indexes
   (`Invoice (type, number)`, `Booking.number`, `Invoice.replacedById`); the only thing
   dropped is the index `Invoice_number_key`. No row or column is lost.
2. Right before the merge: `pnpm --filter @repo/db db:set-billing:prod` (it rehearses on a
   copy, asks for "production", backs up, then runs).

Rehearsed on 2026-11-08 on a fresh copy of production (61 bookings, 11 old invoice rows,
counter at 1307, 10 agent vendors): the push applied and left no difference; the script
gave HTB-0001 to HTB-0061 in the order made, moved 60 old numbers into the legacy field
(HTB-0001 is HTI-1149, HTB-0061 is HTI-1303-06), made the 10 agents businesses with their
57 bookings, deleted the 11 old rows and the 10 agent vendors, set the next numbers to
HTB-0062, HTI-0001 and HTC-0001, and wrote Rev 1 for all 61. HTB-0054, cancelled and never
invoiced, is the one booking with no legacy number; its total went from RM 420.00 to
RM 0.00 (a cancel charges only its fees), so nothing is left to bill. A second run changed
nothing.
3. Merge.
4. Next schema change: drop `Booking.reference`, `quoteNumber`, `invoiceId`, `invoiceLine`,
   `agentId` and `invoiceNumber`; `Invoice.agentId`, `paymentStatus` and the old relation;
   `Vendor.invoicePeriod`, `agentBookings` and `agentInvoices`; and `VehicleClass.imageUrl`.
   Make `Booking.number` required.
