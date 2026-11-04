# Booking operations: hourly grid, assigning per trip, and what waits on the teams

Status: planned with the user on 2026-11-02, on branch `feat/booking-ops-2611`, to merge as
one PR. Items 1 and 2 are built on the branch, not yet tried against a database. Items 3 to
5 wait on answers from the teams, listed under "To confirm". Item 6 is decided: no return
rule.

Done on the branch: the sidebar no longer shifts its icons by a pixel on scroll (fixed, not
sticky).

## 1. Hourly rate grid (built)

Ops prices hourly hire like the zone grid, by where the pickup is. Today it is one hourly
rate per class times the hours, with a 3-hour floor. The Langkawi sheet (2026-11-02):

| From                                              | Hours used (4h / 8h) | Sedan 4h / 8h | Bus 4h / 8h  |
| ------------------------------------------------- | -------------------- | ------------- | ------------ |
| Kuah Town / Beach / Pantai Kok                    | 4 / 8                | RM140 / 250   | RM570 / 950  |
| Datai / Andaman                                   | 4 / 8                | RM180 / 350   | RM900 / 1050 |
| Tg. Rhu / Four Season                             | 4 / 8                | RM180 / 350   | RM750 / 1000 |
| Port cruise excursion (Resort World), port fee in | 5 / 8                | RM230 / 430   | RM650 / 1000 |
| Additional hour                                   | 1                    | RM35 / 30     | RM100 / 100  |

Classes on the sheet: Sedan, Sedan VIP, MPV, MPV VIP, Van, Bus. A 12-hour package exists
too; its prices are not on the sheet.

### Decisions

- **Durations are 4, 8 and 12 hours** ("Duration" on every screen, each "4 hours"; the
  code calls them packages). A fixed list in code, not a table.
- **A row per zone, "Pickup from" it,** as the sheet's "From …" rows; no named groups of
  zones (user, 2026-11-02). Six zones are six rows to fill.
- **A price per zone, package and class.** An empty cell means the package is not sold
  there, so 12 hours stays off until it has prices.
- **Hours used** ("Covers") is per zone and package: the hours the package covers. It
  defaults to the package's hours; the port cruise's 4-hour package covers 5. It sets
  the trip's end (`endsAt`), so the clash checks and the driver's day know it. It is not
  a cap: from the port cruise a customer may book the 4-hour package (5 hours), 4 + 2
  extra (7 hours) or the 8-hour package. Extra hours count from 5 there.
- **An extra hour rate per package and class,** the same from every zone of the location
  (Sedan RM35 after the 4-hour package, RM30 after the 8-hour one).
- **The customer picks a package and any extra hours.** 7 hours is 4 + 3 or 8: their
  choice (user, 2026-11-02).
- **The odd-hours and weekend surcharges still apply** to hourly, as today. To confirm.
- **A pickup outside every zone** is priced from its nearest zone by road that sells
  hourly, within the location's furthest extra road, plus that road past the free km,
  rounded up to the whole km at the class's rate per extra km: the one-way rule for an
  end (user, 2026-11-02). Within the free km nothing is added.
- **The receipt keeps** the zone, the package, its hours covered and price, the extra
  hours and their rate, and the road charged. Receipts written before it still read.
- **The old hourly rate and the minimum hire go** (`hourlyRateSen`, `minHourlyHours`, the
  3-hour floor). "From RM…" is the cheaper of the grid's cheapest cell and the cheapest
  package.
- **A trip runs at most 24 hours**, the package's hours plus at most 12 extra (H4).
- **Screens:** Rates > Hourly Rates in the rate grid's look: "Pickup from", Duration,
  Covers, a price per class; then the extra hour rows; a zone filter; saved whole. Try a
  trip prices hourly too, with the same steps explained. The website's search card and
  planner, and `manage.`'s booking and amend forms, ask for the package and the extra
  hours (`duration` and `extra` in the address). A trip booked before packages amends as
  the biggest package it fills plus the rest as extra hours.
- **Clashes between a booking's trips** are checked again after pricing, with the hours
  each package covers from its zone; while typing, by the package's name (4 + 3 = 7).
- **"Duration", not "Package"** (user, 2026-11-02).

### Schema (as built; the user runs `db:push`)

- `HourlyPackage`: zone, package size (4, 8 or 12), hours it covers.
- `HourlyRate`: package, class, price.
- `HourlyExtraRate`: location, package size, class, price per extra hour.
- No column on the trip: the receipt (`priceBreakdown.hourly`) keeps it all, and
  `TripItemDetails.hours` stays the trip's total.
- `LocationVehicleClass.hourlyRateSen` gets a default of 0 and nothing reads it, nor
  `minHourlyHours`. Both are dropped in a follow-up, once no deployed code reads them.

### Production order

Prod is live. The push only adds tables, a nullable column and a default, so today's code
runs on it unchanged. Before the merge:

1. `pnpm db:push` on development, then try it; then `pnpm db:push:prod`.
2. Enter each location's hourly list on prod (Langkawi from the sheet). The Hourly Rates
   page works on the old deploy only after the merge, so either enter it right after the
   merge, or accept that hourly hire is refused from a location until its list is in.
3. Merge.

After the merge, hourly hire is refused from any location without an hourly list ("We do
not have hourly prices from there yet").

## 2. Assigning per trip, on Operation's Assign page (built)

Decided with the user on 2026-11-02, after three rounds of layouts (a table, two panes,
steps, then cards to drag): keep it simple, per trip, no dragging.

- **The Board becomes Assign,** `/[location]/assign`, Operation's page: every trip from
  today on in a table like Bookings, with figure tiles for To assign (the default),
  Waiting to accept, Assigned, On the road, Done (today) and All. Each row says how soon
  it picks up (red within the day while not assigned) and who does each role or whose
  answer it waits for. The reference opens the booking.
- **Each trip has its own page** (2026-11-03, replacing the dialog), `/[location]/assign/[trip]`:
  the vendor first, then their vehicle or driver or Any ("the vendor will assign it"),
  "Pay vendor (RM)" for a vendor not ours, Answer by per vendor and before the pickup,
  and "Also give the same to" the booking's other open trips. A card per role already
  asked: name, accept, record a decline, Withdraw or Release (undo). The day's reports
  are there too. Vehicles and drivers of another class are not listed.
- **Assigning is Operation's alone:** the booking shows who does each trip, to read, with
  "Open in Assign".
- **"Pay vendor"** replaces "what we owe" on the screens.
- The tour guide joins as a third choice on the trip's page when item 4 is confirmed.

## 3. Driver tipping (waits)

On the sheet: Bus only, RM30 for 4 hours, RM50 for 8. Already BL-59. Proposal: a flat tip
per location, class and package, a line of its own on the price ("Driver tip"), left out
of the surcharge percentages, recorded as owed to the driver on top of the vendor's cost.

## 4. Tour guide add-on (built for coaches, see docs/261103-tour-guide.md)

Proposal, agreed in principle by the user:

- **Per trip,** ticked on each trip, with "for every trip".
- **Like a driver:** a `Guide` belongs to a vendor and a location, with languages and a
  licence expiry (MOTAC). A third part role, "guide", so any guide goes with any vehicle
  and driver. The vendor names or is asked to choose; the guide accepts in Connect.
- Connect's sign-up gets "Tour guide" as a service.
- When a booking has a guide, Assign shows a Guide column.

## 5. Quotation and invoice numbers (built 2026-11-04, `feat/tour-guide`)

- **Two numbers, two counters** (user, 2026-11-04, replacing one number for both):
  **HTQ-YY-NNNNN**, the quotation, and **HTI-YY-NNNNN**, the invoice, each counted per
  year in Malaysia on its own (`BookingNumberCounter`, `src/booking-number.ts`). They
  replace the old system's HT-YYMMDD-XXX quotations and HT-XXX invoices.
- **A booking staff enter gets a quotation number when it is made**, and an invoice
  number when it is first confirmed, kept beside the quotation's. A quotation never
  confirmed (cancelled, or left) keeps only its HTQ number: the leads lost are the
  quotations with no invoice.
- **Paid already (2026-11-04):** staff who may confirm can make a booking "Confirmed,
  paid" above New booking's button. It and every trip are confirmed at once, ready for
  Assign, with an invoice number and no quotation's. The form shows the number the
  booking would take, a guess until it is made.
- **A website booking gets an invoice number only.** With the payment gateway it arrives
  paid and confirmed, so it is invoiced at once. Until then it is invoiced when
  Reservation confirms it, and shows by its reference before that.
- **No gaps:** a number is taken inside the booking's transaction, from a counter row
  locked until it commits, so two bookings at once never share one and a rolled-back
  booking gives its number back.
- **`reference` stays** (HT-7K3QZM, random): the booking's id in links and emails, the
  customer's way to look a guest booking up, and what Connect shows vendors and
  drivers. A running number in a link lets anyone guess other bookings.
- **Manage shows the number first:** the invoice number once there is one, else the
  quotation number, else the reference. The bookings list has the quotation and the
  reference under it, the booking's summary both numbers, its line the reference. Ctrl+K
  finds "HTQ-26-00042", "HTI-26-42", or "26-42" of either kind.
- **Switching over:** by hand in SQL, after the schema push: a `BookingNumberCounter`
  row per kind (`quote`, `invoice`) for year 26 with `last` at the old system's last
  number this year (N2), so ours carry on after it; and the bookings from before their
  numbers. No script: production has live data, and the developer sets them directly.
- Other formats considered: `HTQ2600042` (no dashes), `HT-Q-2611-0042` (monthly),
  `Q26-00042` / `INV26-00042`. The user kept HTQ-YY-NNNNN / HTI-YY-NNNNN (2026-11-04).

## 6. Return trips and discounts (decided: no rule)

- A return stays **two one-way trips** on the rate grid; the website has no "Add return"
  button (user, 2026-11-02).
- **No return detection.** A loop such as A-B, B-C, C-A shows how quickly it gets
  unclear.
- **A discount is a trip's agreed price in `manage.`**, as today ("Agreed on the
  phone"). A website booking is paid at its quoted price.

## To confirm

| #   | Question                                                                                    | Who            | Holds up        |
| --- | ------------------------------------------------------------------------------------------- | -------------- | --------------- |
| H1  | Do the odd-hours and weekend surcharges apply to hourly? Built as yes                       | Ops            | Nothing         |
| H2  | "Exclude parking": a line on every hourly quote, or nothing?                                | Ops            | Nothing         |
| H3  | The 12-hour package's prices and its additional hour rate, for Langkawi                     | Ops            | Selling 12h     |
| H4  | Is there a cap on additional hours (4 + 6)? Built as: the trip at most 24 hours             | Ops            | Nothing         |
| A1  | (Settled 2026-11-02: per trip, Assign page in place of Board, no dragging)                  | User           | Nothing         |
| T1  | Driver tip: compulsory or optional for the customer?                                        | Ops            | Item 3          |
| T2  | Tip on one-way coach trips too, or hourly only?                                             | Ops            | Item 3          |
| T3  | Tip paid through us, or cash to the driver (then only a note)?                              | Ops, Finance   | Item 3          |
| G1  | Guide priced how: flat per trip, per package (4/8/12h) or per hour?                         | Ops            | Item 4          |
| G2  | Guides on hourly trips only?                                                                | Ops            | Item 4          |
| G3  | Does the customer pick a language?                                                          | Ops            | Item 4          |
| G4  | Driver-guides: one person as driver and guide on one trip?                                  | Ops            | Item 4          |
| G5  | Who picks the guide: the vendor, or named by us and the guide accepts? Proposed: as drivers | Ops            | Item 4          |
| N2  | The last numbers issued, and the day the old system stops issuing them                      | Sales, Finance | Continuing them |
