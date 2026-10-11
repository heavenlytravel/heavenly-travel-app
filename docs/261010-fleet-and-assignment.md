# Fleet and assignment: vehicles, drivers, vendors, and who does the trip

Status: build plan, written on 2026-10-10, agreed on 2026-10-11 and built that day as
`261011-fleet-and-assignment-implementation.md` describes. This is
OP2 from the roadmap (`heavenly-travel-docs/plan/260929-internal-operations-roadmap.md`
§5.3, STATUS rows OP2-01 to OP2-03) plus the first two rows of OP3 (OP3-01 assign,
OP3-02 refuse a double booking) and a thin OP3-03 (the day's job sheet). Where this
document differs from `260923-car-with-driver.md` ("Driver assignment" in future work),
`260930-ops-screens.md` or the dispatch design `05e`, this one wins.

The plan was decided by the developer's agent in a self-run grilling session on
2026-10-10. Every answer is an instinct, not a confirmed fact, so each decision carries a
criticalness grade in "Assumptions" at the end. Read that section before the "go".

## Why this, and why now

The docs repo "Now" list (STATUS.md, 2026-10-07) has five lines. Four wait on people:
staging checks by the Tech Lead, placeholder values from Operation and the CEO. The one
that is code is "Plan OP2, vehicles, drivers and vendors: a design document in the app
repo before any code". So OP2 is next by the agreed order (roadmap §11, row 4).

OP2 on its own is three lists that replace three sheets. Nobody moves a sheet into an app
for the sake of it: the lists earn their keep only when the app reads them. The one reader
is the "assigned" step, which today is a button that says "Mark driver assigned" and
names nobody (`advanceItem` in `packages/db/src/bookings.ts`). The Dashboard already
counts "awaiting driver" items. So this plan takes the three lists and the assign step
together, in that order, and stops before the board, the driver portal and money.

## What is already there

- `BookingItem.status` runs `received -> confirmed -> assigned -> completed`, with
  `ADVANCE_PERMISSIONS.assigned = "bookings.fulfil"` (Operation). The log action
  `booking.item.assigned` exists and is customer visible.
- `BookingItem.startsAt` always; `endsAt` only for hourly hires (`transportation.ts`).
- `VehicleClass` is what the site sells. There is no `Vehicle`.
- `DriverProfile` and `PartnerProfile` are user-linked stubs with `isActive` only. Nothing
  reads them except `getAccess("driver" | "partner")` in `session.ts`, and no page calls
  those areas. They were placed for the portals (B7, AT-D14).
- The Vehicle classes screen is the pattern for a list plus an add/edit page: a pure
  `*-input.ts` module with the field list, labels and checks; a `*.ts` module with the
  readers and writers, each writer logging inside its transaction; a `page.tsx` list with
  `Streamed`; an `[id]/page.tsx` form with history.
- The wall is a flat map in `permissions.ts`; the sidebar hides what the admin may not
  open.

## Decisions

### D1. Scope: three lists, then assign, then a day list

Five PRs, each shippable alone. Nothing here reaches the customer site or the emails.

| PR  | Title (changelog line)                             | What                                                                                               |
| --- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| A   | `docs: add the fleet and assignment plan`          | This file, once agreed                                                                             |
| B   | `feat(admin): vehicles and drivers`                | `Vehicle`, `Driver` (replacing `DriverProfile`), the Fleet screen                                  |
| C   | `feat(admin): vendors`                             | `Vendor`, the Vendors screen                                                                       |
| D   | `feat(admin): assign a driver or vendor to a trip` | Assignment columns on `BookingItem`, the assign form, the conflict check, unassign, Dashboard card |
| E   | `feat(admin): schedule for the day`                | `/schedule`: live items for one day with who does them                                             |

E is the one PR that may be dropped without hurting the rest. B and C could be one PR;
they are kept apart so each is small enough to review in one sitting.

### D2. The records

Plain string columns, no Prisma enums, as everywhere in the schema. Money in sen. Dates
that are "a day", not a moment (expiries), are stored as `DateTime` at midnight Malaysian
time through the same helpers the booking rules use; the screens show the date only.
Nothing is ever deleted: `isActive` off, as vehicle classes do, because bookings point at
these rows.

```
Vehicle
  id, plate (unique, upper-cased, spaces removed), label ("Toyota Alphard 2021, white"),
  vehicleClassId -> VehicleClass, isActive (default true),
  roadTaxExpiresAt?, insuranceExpiresAt?, notes?, createdAt, updatedAt

Driver
  id, name, phone (E.164, the phone helper), isActive (default true),
  licenceExpiresAt?, psvExpiresAt?, notes?,
  userId? (unique) -> User          // for the driver portal, OP5; null until then
  createdAt, updatedAt

Vendor
  id, name (company), contactName?, phone?, email?, isActive (default true),
  rateNotes?   // free text: "Alphard KLIA to KL RM250, per day RM600"
  notes?, createdAt, updatedAt

BookingItem (added)
  driverId?  -> Driver
  vehicleId? -> Vehicle
  vendorId?  -> Vendor
  vendorCostSen?
  assignmentNote?   // "Ali, WXY 1234" for a vendor's driver; anything Operation wants on the job sheet
```

Rules enforced in code, in one place (`assignment.ts`, see D4):

- When `status = "assigned"`, exactly one of these holds: `driverId` and `vehicleId` both
  set, or `vendorId` set. Otherwise all five columns are null.
- `vendorCostSen` may be set only with `vendorId`. It is optional: Operation often knows
  the cost later, and OP6 reads it when money arrives.
- `Vehicle.plate` is the only uniqueness rule. Two drivers may share a name.

What is deliberately not there:

- No home base on a vehicle or driver (the roadmap said "zone"; zones are gone). With a
  fleet of a few vehicles, Operation knows where each one is. A nullable `stateCode`
  can be added later without touching anything else.
- No vendor rate list (OP-Q4). A free-text `rateNotes` field holds what the sheet's rate
  column holds today. If a structured list is ever wanted, it comes after seeing how the
  text is used.
- No driver qualification per vehicle class, no leave, no "usual vehicle" (05e §3). The
  assign form lists every active driver and vehicle; the conflict check is the one filter.
- No vendor driver or vendor vehicle rows. The vendor's driver goes in `assignmentNote`.

### D3. `Driver` replaces `DriverProfile`; `PartnerProfile` stays

A driver is a person Operation assigns, whether or not that person ever signs in. Keeping
`DriverProfile` (keyed on a required `userId`) beside a new `Driver` would be two driver
concepts in one database. So `DriverProfile` is removed and `Driver.userId?` takes its
place: when OP5 arrives, linking an account to a driver is one field, and
`getAccess("driver")` reads `user.driver` and its `isActive`. The change to `session.ts`
is one include and one line.

`PartnerProfile` is left alone. A vendor is a company; a partner user is a person who
signs in for that company, which is OP8. When the portal comes, `PartnerProfile` gets a
`vendorId`. Nothing in this plan touches it.

### D4. Assignment lives on the item, history in the log

One live item has at most one assignment at a time, so the columns go on `BookingItem`
and the activity log holds the history, exactly as price overrides do. No `Assignment`
table and no `Job` table (OP-D6 stands: the app assigns per item). A multi-vehicle
booking is several items, each assigned on its own, as it is confirmed and completed on
its own today.

`packages/db/src/assignment.ts` is the one module that writes these columns:

- `assignItem(actor, itemId, assignment, { force })`. Allowed from `confirmed` or
  `assigned`. Sets the columns, moves `confirmed -> assigned` when needed, logs
  `booking.item.assigned` with `before` and `after` carrying `{ position, driver,
vehicle, vendor, vendorCostSen, assignmentNote }` as names, not ids, so the log reads
  "Assigned item 1 to Ali in WXY 1234" and "Changed item 1 from Ali to Vendor X". A
  reassignment is the same call with new values.
- `unassignItem(actor, itemId)`. Clears the five columns, moves `assigned -> confirmed`,
  logs `booking.item.unassigned` (new action, customer visible, since My bookings shows
  "Driver assigned" and would go back to "Confirmed"). This is the one backward step the
  status machine gets; `NEXT_ITEM_STATUS` is unchanged and `advanceItem` refuses
  `to = "assigned"` from now on, so the old button cannot skip the form.
- `completeItem` stays `advanceItem(..., "completed")`.

Amend keeps its rule: a trip can be amended until a driver is assigned. Unassign first,
then amend, is the path when the trip changes after assignment. Cancelling an assigned
item keeps the columns as a record and the log says who it was.

### D5. The conflict check refuses, with a way through

A driver and a vehicle each occupy a window per live assigned item:

```
window = [startsAt, endsAt ?? startsAt + ONE_WAY_BLOCK_HOURS]
ONE_WAY_BLOCK_HOURS = 3        // booking-rules.ts, next to the other rules, a placeholder
```

Two windows that touch or overlap are a conflict. No turnaround buffer and no distance
estimate (B-O5 is unanswered, and a buffer is one more guessed number). The check runs
inside the assign transaction against items with `status = "assigned"` that share the
driver or the vehicle; it returns the conflicting booking's reference and time, and the
action fails with "Ali is on HT-7K3QZM until 14:30". The form then shows a checkbox
"Assign anyway" that sends `force`, because Operation knows a short airport hop fits
where the window says it does not. The forced assignment is logged with `forced: true`.

Vendors are never checked: a vendor has many cars.

Why refuse rather than warn only: the roadmap's done-when for OP3 is "a double booking is
refused", and a warning that can be clicked past without reading is the same as none.
Why a checkbox rather than a hard refusal: a hard refusal forces Operation to lie in the
data (assign the wrong driver, fix it later) when the rule is wrong, and the rule is a
guess.

### D6. The assign form is on the booking page

No new page for assigning. On the booking's item card, the "Mark driver assigned" button
becomes "Assign", which opens an inline form under the card header (same place the price
override opens): two radio choices, "Our driver" with a driver select and a vehicle
select, or "Vendor" with a vendor select, a cost in ringgit and the note. Active rows
only, each select sorted by name; the vehicle select shows "WXY 1234 · Toyota Alphard 2021
· Executive sedan" so the class is visible. Save, Cancel. Once assigned, the card shows
"Ali · WXY 1234" or "Vendor X · RM 250 · Ali, WXY 1234" as rows, with "Change" (same
form, prefilled) and "Unassign". `bookings.fulfil` gates all of it.

The customer site is not changed: My bookings already shows "Driver assigned" and shows
no names. Whether the customer is told the driver's name and plate is OP5-04 / AT-D16.

### D7. Screens: Fleet, Vendors, Schedule

Three new sidebar items in the Operations group, each behind a permission:

| Item     | Route       | Permission      | Shows                                                                                                                                                                                                                                            |
| -------- | ----------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Fleet    | `/fleet`    | `fleet.manage`  | Two tables on one page: Vehicles, then Drivers. Add buttons per table. Inactive rows dimmed at the end                                                                                                                                           |
| Vendors  | `/vendors`  | `fleet.manage`  | One table                                                                                                                                                                                                                                        |
| Schedule | `/schedule` | `bookings.view` | Live items for one day, Malaysian time, by pick-up time: time, booking, pick-up, drop-off or hours, vehicle class, who does it, status. Unassigned rows carry an "Assign" link to the booking. Yesterday, Today, Tomorrow links and a date field |

`fleet.manage` is a new line in `RULES`, Operation only, so the wall names what it guards
instead of stretching `coverage.manage`. Add and edit are pages, not side sheets, as the
Vehicle classes screen settled (AT7): `/fleet/vehicles/[id]`, `/fleet/drivers/[id]`,
`/vendors/[id]`, each with its history card. The `isActive` switch sits in the list row.

Expiry dates (road tax, insurance, licence, PSV) show in the list with the date, red when
past and amber within 30 days. The Dashboard gets one card for Operation, "Documents
expiring", counting vehicles and drivers with any expiry in the past or the next 30 days.
No emails, no reminders: Operation opens the Dashboard.

Vehicle classes keep their screen. Neither list filters the other: a vehicle's class is a
label for the assign form, not a rule that the booked class must match the vehicle's.
Operation upgrades a customer when they like.

### D8. Validation and the log, the existing way

- `fleet-input.ts` (browser-safe): `VehicleFields`, `DriverFields`, `VendorFields`, their
  labels, `check*Fields`, `parse*Fields` over `fields.ts` helpers. Plate is normalised
  there. Phone goes through `phone.ts`.
- `assignment-input.ts`: `AssignmentFields` and its check (the exactly-one rule, cost
  parsed in ringgit).
- `fleet.ts`: readers and writers for the three tables, each writer logging
  `vehicle.created|updated`, `driver.created|updated`, `vendor.created|updated` with
  changed fields only, `changedFields` as vehicle classes do. New entity types
  `vehicle`, `driver`, `vendor` in `ACTIVITY_ENTITY_TYPES`.
- `schedule.ts`: one query, items for a day with their booking, trip details and
  assignment names.
- Unit tests for the input modules, the window overlap function and the exactly-one rule.
  The overlap function is pure and takes two windows.

### D9. No seed data, no production step beyond `db:push`

Real vehicles, drivers and vendors come from Operation's sheets, typed into the screens.
The dev seed is not extended. `DriverProfile` has no rows in production (nothing created
them), so dropping it loses nothing. The developer runs `pnpm db:push` locally and
`pnpm db:push:prod` after PR B merges, and again after PR D.

## Order of work inside each PR

PR B: schema (`Vehicle`, `Driver`, drop `DriverProfile`), `session.ts`, `fleet-input.ts`
with tests, `fleet.ts`, `fleet.manage` and its permission test, routes, nav, the Fleet
page, the two add/edit pages, activity entity types and action names, the Dashboard
"Documents expiring" card. Lint, types, tests, a local click-through.

PR C: `Vendor`, its fields and checks, the Vendors page and edit page. Small.

PR D: schema (five columns), `assignment-input.ts` and `assignment.ts` with the overlap
test, `ONE_WAY_BLOCK_HOURS`, `advanceItem` refusing `assigned`, the inline form and its
actions on the booking page, the `unassigned` action, the Dashboard "Awaiting driver"
card unchanged.

PR E: `schedule.ts`, the Schedule page, nav item.

## Checks before each merge

- B: add a vehicle, a driver; switch one off; the history shows each change; the
  Dashboard count turns on when an expiry is set to yesterday; a Reservation account
  (wall on) cannot open `/fleet`.
- C: same for a vendor.
- D: assign a confirmed item to a driver and vehicle; My bookings shows "Driver
  assigned"; assign a second item at the same time to the same driver and read the
  refusal; force it; unassign and watch the status return to Confirmed; assign a vendor
  with a cost; the booking's history reads each step in words; the old "Mark driver
  assigned" path is gone.
- E: the day's list shows the two items with who does them and the unassigned one links
  to the booking.
- Every PR: `pnpm lint`, `pnpm check-types`, `pnpm --filter @repo/db test`.

## Assumptions, graded

How critical each instinct is if it turns out wrong. **High**: the schema or the flow
would need rework. **Medium**: a screen or a rule changes, data stays. **Low**: a label,
a column or a default.

| #   | Assumption                                                                                                                     | Grade  | If wrong                                                                                                                                    |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | OP2 plus the assign step is the right next thing, ahead of OP0 values, Sentry, payment or the privacy page                     | High   | A different plan. The other items wait on people or on Stripe, which is why this one                                                        |
| 2   | Assignment is per booking item, not per booking or per job (OP-D6 stands)                                                      | High   | A `Job` table, and every booking screen changes with it                                                                                     |
| 3   | Assignment columns on `BookingItem`, history in the log, no `Assignment` table                                                 | High   | A table and a backfill. Price override set the precedent and has not hurt                                                                   |
| 4   | `Driver` replaces `DriverProfile`; a driver need not have an account                                                           | High   | Keep both and live with two driver concepts. Nothing uses the stub today, so the cost of being wrong is small, the cost of waiting is large |
| 5   | A vendor assignment is the vendor plus an optional cost and a free-text note, no vendor rate list (OP-Q4)                      | Medium | Add a `VendorRate` table later; `vendorCostSen` stays the number that is charged                                                            |
| 6   | Own-fleet assignment needs both a driver and a vehicle                                                                         | Medium | Make `vehicleId` optional, drop the vehicle half of the conflict check                                                                      |
| 7   | Conflict = touching or overlapping windows, one-way block 3 hours, no turnaround buffer, refuse with a force checkbox          | Medium | Change one constant or add a buffer constant. The window function is pure and tested                                                        |
| 8   | Unassign is the only backward status step, and amend still requires unassign first                                             | Medium | Allow amend while assigned, or drop unassign and make the form the only way to change                                                       |
| 9   | No customer email or name shown to the customer on assignment                                                                  | Medium | Add an `assigned` `BookingEvent` and an email; the log already carries the data                                                             |
| 10  | No home base (state) on vehicles and drivers                                                                                   | Medium | Add a nullable `stateCode` and a filter in the assign form                                                                                  |
| 11  | Expiry dates are shown and counted, not emailed                                                                                | Low    | A weekly email is a cron and a query                                                                                                        |
| 12  | Vehicle class on a vehicle is a label, not a rule for the assign form                                                          | Low    | Filter the vehicle select by the booked class, with a "show all" link                                                                       |
| 13  | One `fleet.manage` permission for vehicles, drivers and vendors, Operation only                                                | Low    | Split it, or reuse `coverage.manage`                                                                                                        |
| 14  | Fleet is one page with two tables; Vendors its own page; three new sidebar items in total                                      | Low    | Move a table, rename an item                                                                                                                |
| 15  | Fields: plate, label, class, two expiries, notes; name, phone, two expiries, notes; company, contact, phone, email, rate notes | Low    | Add a column. Nothing reads these beyond the lists and the assign form                                                                      |
| 16  | `PartnerProfile` untouched until OP8                                                                                           | Low    | Add `vendorId` then                                                                                                                         |
| 17  | The Schedule page is a plain day list, not the timeline board from `05e` §2                                                    | Low    | The board is a later screen over the same query                                                                                             |
| 18  | Dropping `DriverProfile` loses no production rows                                                                              | Low    | Check `db:studio:prod` before `db:push:prod`; if rows exist, copy them into `Driver` first                                                  |

## The grilling, in short

The rounds that produced the decisions above, with the question and the chosen answer.
Each answer is the agent's instinct, graded in the table.

**Round 1, the root.** Q: which docs-repo item is next? A: OP2, because it is the only
"Now" line that is code (#1). Q: OP2 alone or with OP3? A: with OP3-01 and OP3-02, since
the lists have no reader otherwise; the board thinly (#17). Q: one design document or
one per PR? A: one, this file. Q: one PR or several? A: five, each shippable (D1).

**Round 2, the model.** Q: where does an assignment live? A: on the item (#2, #3). Q: is a
driver a user? A: no; `Driver` with an optional `userId` replaces the stub (#4). Q: what is
a vendor and what is its rate? A: a company with contacts and a free-text rate note; the
cost is typed per job (#5). Q: driver and vehicle together or either? A: together (#6).
Q: what fields? A: the ones in D2, nothing a screen does not show (#15). Q: home base?
A: none (#10). Q: delete? A: never, `isActive` (vehicle classes precedent).

**Round 3, the flow.** Q: what happens to "Mark driver assigned"? A: it becomes the
Assign form; `advanceItem` refuses `assigned` (D4). Q: reassign and unassign? A: reassign
is the same form; unassign is one action and the only backward step (#8). Q: conflicts,
refuse or warn? A: refuse with a force checkbox, touching windows, one-way block 3 hours,
no buffer (#7). Q: tell the customer? A: not yet (#9). Q: amend after assignment? A:
unchanged, unassign first (#8).

**Round 4, the screens.** Q: how many sidebar items? A: three (#14). Q: permission? A:
new `fleet.manage` for the lists, existing `bookings.fulfil` for assigning (#13). Q:
expiries? A: coloured dates and one Dashboard count (#11). Q: class match? A: label only
(#12). Q: seed? A: none (D9). Q: the day list? A: one query, one table, three day links
and a date field (#17).

**Frontier empty.** Nothing was left silently assumed that the table does not grade.

## Not in this plan

- The driver portal (OP5), reaching the driver, and the customer's live journey state.
- Money: payment status, vendor payables, margin (OP6). `vendorCostSen` is recorded so
  OP6 can read it.
- The timeline board, eligibility with reasons, series assignment for multi-day charters
  (`05e` §2, §3).
- Vendor rate lists, driver pay, leave, qualifications.
- The open questions OP-Q2 (what a vendor is shown) and OP-Q3 (how drivers are paid).
  Neither blocks recording an assignment in the admin.
