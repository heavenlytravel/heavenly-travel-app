# Booking operations: hourly grid, assigning per trip, and what waits on the teams

Status: planned with the user on 2026-11-02, on branch `feat/booking-ops-2611`, to merge as
one PR. Items 1 and 2 are clear to build. Items 3 to 7 wait on answers from the teams,
listed under "To confirm". Nothing here is built unless marked so.

Done on the branch: the sidebar no longer shifts its icons by a pixel on scroll (fixed, not
sticky).

## 1. Hourly rate grid (build)

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

- **Packages are 4, 8 and 12 hours.** A fixed list in code, not a table.
- **An hourly area is a named group of a location's zones** ("Kuah Town / Beach / Pantai
  Kok" is three zones). A zone is in at most one area.
- **A price per area, package and class.** An empty cell means the package is not sold
  there, so 12 hours stays off until it has prices.
- **Hours used** ("max hour usage") is per area and package: the hours the package
  covers. It defaults to the package's hours; the port cruise's 4-hour package covers 5.
  It sets the trip's end (`endsAt`), so the clash checks and the driver's day know it.
- **An additional hour rate per package and class,** the same for every area of the
  location (Sedan RM35 in the 4-hour package, RM30 in the 8-hour one).
- **The customer picks a package and any additional hours.** 7 hours is 4 + 3 or 8: their
  choice (user, 2026-11-02). The trip's hours are the package's hours used plus the
  additional hours.
- **The odd-hours and weekend surcharges still apply** to hourly, as today. To confirm.
- **The receipt keeps** the area, the package, its hours used and price, the additional
  hours and their rate. Receipts written before it still read.
- **The old hourly rate and the minimum hire go** (`hourlyRateSen`, `minHourlyHours`, the
  3-hour floor). "From RM…" uses the cheapest 4-hour cell.
- **Screens:** an Hourly tab on Rates laid out like the sheet (areas and packages down,
  classes across, the additional hour rows, hours used per row); Try a trip prices
  hourly; the website's and `manage.`'s booking forms ask for the package and the
  additional hours.

### Schema (proposal, the user runs `db:push`)

- `HourlyArea`: location, name, order; `Zone.hourlyAreaId` (nullable).
- `HourlyAreaPackage`: area, package hours, hours used.
- `HourlyRate`: area, package hours, class, price.
- `HourlyExtraRate`: location, package hours, class, price per additional hour.
- `TripItemDetails.packageHours` (nullable; `hours` stays the trip's total).

### Production order

Prod is live. The new tables are pushed and Langkawi's grid is entered on prod **before**
the merge, or hourly stops selling where there is no grid. The two old columns are dropped
in the same push only if no deployed code reads them by then; otherwise in a follow-up.

## 2. An Assign page, per trip (build)

Assigning moves from a dialog on the booking to its own page,
`/bookings/[id]/assign`, beside amend. The data is per trip already (`TripPart`).

- One row per trip: Vehicle, Driver, and the amounts per trip as today.
- **"Same for every trip"** per role, on by default: one picker for all. Off, each row has
  its own picker. The amounts keep their own tick.
- The picker greys per row: a driver free on trip 1 but busy on trip 3 is greyed on trip 3.
- Offers stay one per vendor, a part per trip. Changing one trip later starts from the
  trip's card.
- On a phone the rows stack as cards. Built from `@repo/console` parts on the design
  tokens; a Guide column joins when item 4 is confirmed.

## 3. Driver tipping (waits)

On the sheet: Bus only, RM30 for 4 hours, RM50 for 8. Already BL-59. Proposal: a flat tip
per location, class and package, a line of its own on the price ("Driver tip"), left out
of the surcharge percentages, recorded as owed to the driver on top of the vendor's cost.

## 4. Tour guide add-on (waits)

Proposal, agreed in principle by the user:

- **Per trip,** ticked on each trip, with "for every trip".
- **Like a driver:** a `Guide` belongs to a vendor and a location, with languages and a
  licence expiry (MOTAC). A third part role, "guide", so any guide goes with any vehicle
  and driver. The vendor names or is asked to choose; the guide accepts in Connect.
- Connect's sign-up gets "Tour guide" as a service.
- When a booking has a guide, Assign shows a Guide column.

## 5. Quotation and invoice numbers (waits on the formats)

- **`reference` stays** (HT-7K3QZM, random): the booking's id in links and emails, for
  guests and accounts. A running number in a link lets anyone guess other bookings.
- **`quotationNo` and `invoiceNo`,** each from its own counter, taken in the same
  database step as the booking, so no gaps and no duplicates (MyInvois, DR-09).
- A booking entered in `manage.` gets a quotation number when made and an invoice number
  when confirmed. **A website booking gets an invoice number only,** when paid and
  confirmed: it was never quoted.
- A quotation never confirmed keeps its number and never gets an invoice number: a lost
  lead.
- **Continuing their numbers:** a one-time script sets each counter's start at go-live,
  rehearsed on a Neon copy like other prod scripts. No setting screen.
- **No editing** of a number, except an optional "existing number" when entering a booking
  the old system already numbered, checked for duplicates.
- Both are found by the console search.

## 6. Return trips and discounts (waits)

- A return stays **two one-way trips**; the website has no "Add return" button.
- A return could be recognised by the zones, not the addresses: Airport → Hotel and
  7-Eleven beside the hotel → Airport are the same two zones reversed.
- **In `manage.`** a discount is the trip's agreed price today ("Agreed on the phone").
- **On the website** the price is paid at booking, so a discount must be in the quote
  before payment, by a rule, or not at all.

## To confirm

| #   | Question                                                                                                     | Who            | Holds up    |
| --- | ------------------------------------------------------------------------------------------------------------ | -------------- | ----------- |
| H1  | Do the odd-hours and weekend surcharges apply to hourly? Built as yes                                        | Ops            | Nothing     |
| H2  | "Exclude parking": a line on every hourly quote, or nothing?                                                 | Ops            | Nothing     |
| H3  | The 12-hour package's prices and its additional hour rate, for Langkawi                                      | Ops            | Selling 12h |
| H4  | Is there a cap on additional hours (4 + 6)? Built as: the trip at most 24 hours                              | Ops            | Nothing     |
| H5  | A pickup outside every zone: priced as its nearest zone's area (within `maxExtraKm`), no km charge? Built so | Ops            | Nothing     |
| T1  | Driver tip: compulsory or optional for the customer?                                                         | Ops            | Item 3      |
| T2  | Tip on one-way coach trips too, or hourly only?                                                              | Ops            | Item 3      |
| T3  | Tip paid through us, or cash to the driver (then only a note)?                                               | Ops, Finance   | Item 3      |
| G1  | Guide priced how: flat per trip, per package (4/8/12h) or per hour?                                          | Ops            | Item 4      |
| G2  | Guides on hourly trips only?                                                                                 | Ops            | Item 4      |
| G3  | Does the customer pick a language?                                                                           | Ops            | Item 4      |
| G4  | Driver-guides: one person as driver and guide on one trip?                                                   | Ops            | Item 4      |
| G5  | Who picks the guide: the vendor, or named by us and the guide accepts? Proposed: as drivers                  | Ops            | Item 4      |
| N1  | The quotation and invoice formats; how they are told apart; digits; a restart each year?                     | Sales, Finance | Item 5      |
| N2  | The last numbers issued, and the day the old system stops issuing them                                       | Sales, Finance | Item 5      |
| R1  | Is there a return discount at all? How much (RM or %), and does it need the same day?                        | Sales          | Item 6      |
| R2  | On the website, applied automatically before payment, or only by staff in `manage.`?                         | Sales          | Item 6      |
| R3  | Should a discount in `manage.` show the customer a named line ("Return trip discount")?                      | Sales          | Item 6      |
