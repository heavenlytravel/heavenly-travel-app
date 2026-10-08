# Admin teams and access: levels, teams, the wall and the activity log

Status: all twelve steps built; PR F (steps 10 and 11) built on 2026-10-01, see "As
built in PR F". Decisions agreed on 2026-09-30. The ops
screens of steps 6 and 7 are designed in `260930-ops-screens.md` and, for coverage,
`260930-coverage.md`. Steps 8 to 12 are designed under "Staff booking tools" below,
which wins over `260923-car-with-driver.md` and `260928-coach-charter.md` where they
differ. This is the implementation
plan for the first two phases of the internal operations roadmap, OP4 (staff booking
tools) and OP1 (coverage and pricing setup). The roadmap, the task list and the decision
record (AT-D1 to AT-D16) live in the `heavenly-travel-docs` repository under `plan/`.
The steps here are numbered 1 to 12 and are AT1 to AT12 there. They ship in six PRs,
A to F, listed under "Build order".

Today every admin opens every screen and does every action, and nothing records who did
it. The team is five people in four departments: Sales, Reservation, Operation and
Finance. This plan gives each admin a level and one or more teams, builds a wall so each
team reaches only its own screens and actions, and records every action. With that in
place it builds the screens that let Operation change zones and rates, then the tools
that let staff enter bookings that arrive by WhatsApp, email and phone.

Where this document differs from `260918-auth-and-database.md`, this one wins. That
document is updated in each step that changes what it describes.

## Decisions

### Two levels, four teams

- The level is `SUPER` or `REGULAR`. `OPS` is removed: it was the Operation team under
  another name, and it never differed from `REGULAR` in code.
- The level says who manages staff. The team says which work is theirs. They are two
  separate fields, not one.
- The teams are `OPERATION`, `RESERVATION`, `SALES` and `FINANCE`. An admin can hold
  several, because people cover for each other.
- `SUPER` reaches everything and needs no team.
- A `REGULAR` admin with no team reaches only the Dashboard. The Admins page asks for
  at least one team when it promotes a `REGULAR` admin, and flags an existing admin
  who has none.
- The rule that at least one `SUPER` admin always remains is unchanged.

### The wall

The wall has two layers, screens and actions.

| Screen or action                               | Operation | Reservation | Sales | Finance |
| ---------------------------------------------- | --------- | ----------- | ----- | ------- |
| Dashboard                                      | yes       | yes         | yes   | yes     |
| Bookings: list and detail                      | yes       | yes         | yes   | yes     |
| Confirm, amend and cancel a booking            |           | yes         | yes   |         |
| Manual booking and price override              |           | yes         | yes   |         |
| Assign and complete                            | yes       |             |       |         |
| Internal notes                                 | yes       | yes         | yes   | yes     |
| Coverage and Vehicle classes                   | yes       |             |       |         |
| Payments (OP6, not in this plan)               |           |             |       | yes     |
| Admins, the wall switch, the full activity log | `SUPER`   |             |       |         |

- The whole map lives in one module in `packages/db`, next to `getAccess`. Pages and
  server actions ask it. No page holds its own rule.
- Checks stay in pages and server actions, not in `proxy.ts` or layouts, as today.
  Server actions check again because they are reachable by direct POST.
- A screen the admin cannot reach is hidden from the sidebar. Its URL opens a new page
  for staff, `/restricted`, that says the screen belongs to another team. `/no-access`
  stays what it is: the page for a signed-in person who is not staff.
- An action the admin cannot do has no button, and the server action refuses it.

### The wall switch

- One switch for the whole app, flipped by a `SUPER` admin only.
- It ships off. The developer assigns teams to every admin, then turns it on.
- With the wall off, every admin reaches every team screen and action. Admins, the
  switch and the full activity log stay `SUPER` only in both states.
- Every flip is written to the activity log.

### The Dashboard is the same for everyone

One Dashboard for every admin, `SUPER` included, with status cards only. Each team sees
a short view of the other teams' work. The fixed "Drivers on duty" number goes away
until vehicles and drivers exist (OP2). Sales and Finance get cards when their features
are built; no invented numbers are shown.

### The activity log

- It records every admin action, on bookings and on settings, and every customer
  action on a booking (book, cancel), so a booking's history is complete.
- An entry holds the actor, the action, the record it touched, the values before and
  after, and the time. Entries are never edited or deleted.
- The entry is written in the same transaction as the change. A change that is not
  logged does not happen.
- The history of one booking shows on the booking page to anyone who can open that
  booking. The full log across the app is a `SUPER` only screen.
- Each entry carries `customerVisible`. Internal notes, price override reasons and
  staff names never reach a customer. The customer page that shows the history is
  future work; the column exists from the start so old entries are already marked.
- The log is built before the ops screens, so every change to a rate or a district is
  recorded from the first day.

### Names

- The screens are "Coverage" and "Vehicle classes". `VehicleClass` stays in the code and
  the database. "Fleet", the vehicle units, is a later phase.
- The sample Locations screen is removed. The Coverage screen takes its place.

### Driver and partner areas

Left as they are: any admin passes the `driver` and `partner` checks, and no page uses
them. The driver and partner portals will be a separate deployment on another
subdomain, and their access is decided then.

## Data model

Changes to `packages/db/prisma/schema.prisma`, by step. No Prisma enums: values are
strings checked against const arrays in `roles.ts`.

```
Step 1
AdminProfile    level String        ("SUPER" | "REGULAR"; "OPS" is removed)
                + teams String[] @default([])

Step 2
AppSetting      new, one row
                id String @id       (always "app")
                wallActive Boolean @default(false)
                updatedAt DateTime @updatedAt

Step 3
ActivityLog     new
                id String @id @default(cuid())
                createdAt DateTime @default(now())
                actorId String?     (User; null for the system)
                actorKind String    ("admin" | "customer" | "system")
                action String       ("booking.item.confirmed", "zone.updated", ...)
                entityType String   ("booking" | "zone" | "vehicle-class" |
                                     "admin" | "setting")
                entityId String     (an item action logs against its booking)
                before Json?
                after Json?
                customerVisible Boolean @default(false)
                @@index([entityType, entityId, createdAt])
                @@index([actorId, createdAt])
                @@index([createdAt])
```

### Pushing the schema

The developer does this by hand, development first, production right before the merge.
Every change here only adds a column or a table, so no data is lost and the site stays
up.

One push for each PR that changes the schema, whatever number of steps it holds.

| PR  | Steps | Commands                                                                                                                                    |
| --- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| A   | 1, 2  | `pnpm db:push`, then `pnpm --filter @repo/db db:migrate-admin-levels`. Production: `pnpm db:push:prod`, then `db:migrate-admin-levels:prod` |
| B   | 3     | `pnpm db:push`, `pnpm db:push:prod`                                                                                                         |
| E   | 8     | `pnpm db:push`, `pnpm db:push:prod`                                                                                                         |

The step 1 script turns `OPS` into `REGULAR` with the team `OPERATION` and leaves the
other rows alone. It can be run more than once. Until it runs, the code reads an
unknown level as `REGULAR`, so nobody is locked out between the push and the script.

## Module changes

| Module                                  | Change                                                                                                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `roles.ts`                              | `ADMIN_LEVELS` is `SUPER`, `REGULAR`. Gains `ADMIN_TEAMS`, its guard and its labels.                                                                              |
| `admins.ts`                             | `setAdminLevel` becomes `setAdmin(email, level, teams)`. Refuses a `REGULAR` admin with no team. The last `SUPER` rule stays.                                     |
| `scripts/promote-admin.ts`              | Takes the teams after the level. New `scripts/migrate-admin-levels.ts`.                                                                                           |
| `permissions.ts`, new (step 2)          | The map above as data, and one pure function that answers "may this admin do this, with the wall on or off". Unit-tested.                                         |
| `settings.ts`, new (step 2)             | Reads and writes the one `AppSetting` row. Read once per request.                                                                                                 |
| `activity-actions.ts`, new (step 3)     | Browser-safe: the actor kinds, the actions with their record type and `customerVisible`, and `describeActivity`, the sentence an entry reads as.                  |
| `activity.ts`, new (step 3)             | `logActivity(tx, actor, entry)` and the readers for one record and for the full log, with actors and records named.                                               |
| `bookings.ts` (step 3)                  | `advanceItem`, `cancelItem`, `cancelBookingAsAdmin`, `createBooking` and `cancelBookingAsCustomer` take the actor and log inside their transaction.               |
| `admins.ts`, `settings.ts` (step 3)     | `setAdmin`, `revokeAdmin` and `setWallActive` take the actor and log inside their transaction. A change to the same values logs nothing.                          |
| `dashboard.ts`, new (step 4)            | `dashboardCounts()`: the Dashboard's numbers, one count each.                                                                                                     |
| `apps/admin/app/_lib/access.ts`         | `requireAdmin` and `getAdmin` take the screen or action they guard. `requireAdmin` sends a blocked admin to `/restricted`.                                        |
| `apps/admin/app/_components/nav.ts`     | Each item names the permission it needs. The sidebar and header show only what the admin may open.                                                                |
| `apps/admin/.../admins`                 | Teams shown and set per admin. The wall switch. Admins with no team flagged.                                                                                      |
| `apps/admin/.../bookings/[id]`          | Buttons shown by permission. The history section.                                                                                                                 |
| `apps/admin/.../activity`, new (step 3) | The full log, `SUPER` only.                                                                                                                                       |
| `apps/admin/.../locations`              | Removed in step 6. `zones` and `vehicle-classes` take its place.                                                                                                  |
| `prisma/seed.ts` (step 5)               | Stops replacing the districts and rates of a record that already exists. Reports how an existing zone's districts differ; `--replace-districts` applies the list. |
| `packages/places/scripts` (step 5)      | `check-coverage`: geocodes real places in and around every zone and reports the zone each resolves to.                                                            |

## Build order

Twelve steps in six PRs into `main`. Each PR passes `pnpm lint` and
`pnpm check-types` and leaves both apps working. Steps that change the same files, or
that need the same schema push, share a PR.

| PR  | Steps    | Title                                             | Type          |
| --- | -------- | ------------------------------------------------- | ------------- |
| A   | 1, 2     | Levels, teams and the wall                        | `feat`        |
| B   | 3, 4     | Activity log and Dashboard cards                  | `feat`        |
| C   | 5        | Ops screens design, coverage and seed             | `fix`         |
| D   | 6, 7     | Zones and Vehicle classes screens                 | `feat(admin)` |
| E   | 8, 9, 12 | Internal notes, manual booking and price override | `feat`        |
| F   | 10, 11   | Amend a booking and several vehicles              | `feat`        |

- A and B stay apart: A changes every page and server action, B changes every booking
  transaction. Admin changes and wall flips made between the two merges are not logged.
- C stays alone: its design document is agreed before the screens in D are built.
- E and F may be grouped differently once steps 8 to 12 are designed.

The steps:

1. **Levels and teams** (`feat`): the schema change, `roles.ts`, `setAdmin`, the Admins
   page, the `promote-admin` script and the migration script. No access changes yet.
2. **The wall** (`feat`): `permissions.ts` with its tests, `AppSetting`, the switch on
   the Admins page, the guards in every page and server action, the sidebar filter and
   `/restricted`. Ships with the wall off.
3. **Activity log** (`feat`): the table, the actor on every booking action, the
   history on the booking page, the full log screen. Admin changes and wall flips from
   steps 1 and 2 are logged from here on.
4. **Dashboard cards** (`feat(admin)`): real numbers per team, the fixed number removed.
5. **Ops screens design, coverage and seed** (`fix`): a dated design document for the
   ops screens, real addresses tested in every zone against Google, district names
   corrected, the seed fix.
6. **Coverage screen** (`feat(admin)`): switch a district on or off, set a state's
   multiplier, test an address. The sample Locations screen is removed. Designed in
   `260930-coverage.md`.
7. **Vehicle classes screen** (`feat(admin)`): name, category, seats, luggage, rates
   and the three rules.
8. **Internal notes** (`feat`): notes on a booking that the customer never sees.
9. **Manual booking** (`feat`): staff enter a booking for a customer, through the same
   pricing and the same `createBooking` as the website.
10. **Amend a booking** (`feat`): time, pickup, vehicle or passengers, priced again.
11. **Several vehicles in one booking** (`feat`).
12. **Price override with a reason** (`feat`).

Steps 1 to 7 are in a fixed order. Steps 8 to 12 are designed under "Staff booking
tools" below. The grouping holds: E is steps 8, 9 and 12, F is steps 10 and 11.

## Staff booking tools: steps 8 to 12

Bookings arrive by WhatsApp, email and phone as well as through the website. These
five steps let Reservation and Sales enter such a booking, agree a price that the
rates did not produce, change a booking after the customer asks, and keep notes the
customer never sees. Designed on 2026-09-30, before PR E started.

### A booking can belong to nobody

Most people who book by phone have no account and never will. A booking therefore no
longer needs a `User`: `Booking.userId` becomes nullable, and the booking carries its
own `contactEmail` next to the contact name and phone it already copies. The website
fills all three from the account. Staff fill what the customer gave; the email may be
blank, in which case the customer gets no email and the ops copy is the only one.

- When staff enter an email that belongs to an existing account, the booking is
  linked to that account, so it appears under My bookings. A guest who signs up later
  with the same email inherits their old bookings: the claim runs once, when the
  `User` row is created, by `contactEmail`. See `261008-guest-booking.md`, which also
  makes the email required of every new booking and lets a visitor book on the
  website without an account.
- Every reader that named the customer through the account (`booking.user.email`)
  reads `customerEmailOf(booking)` instead: the contact email, then the account's
  email for bookings made before the column existed, then null.
- The customer's own pages and cancel action are unchanged: they find a booking by
  its reference and the signed-in user's id, which a guest booking never matches.

This replaces "Identity and contact" in `260923-car-with-driver.md` where the two
differ.

### Step 8: Internal notes

- A `BookingNote` row: the booking, the author (a `User`, kept as an id that survives
  the user's deletion), the text and the time. Notes are append-only, like the log: a
  wrong note is followed by a correcting one. Editing and deleting are future work if
  a team asks.
- Permission `bookings.notes`, every team. The booking page shows a Notes card to
  anyone who can open the booking, oldest first, with the author and the time, and
  a field to add one. A note is at most 2,000 characters.
- Adding a note logs `booking.note.added` against the booking with the note's id,
  `customerVisible` false. The sentence reads "Added a note"; the text stays in the
  Notes card, never in the log.
- Nothing customer-facing reads notes: the customer pages and the emails read the
  booking and its items, and the notes are a separate table.

### Step 12: Price override with a reason

- Permission `bookings.create`, Reservation and Sales, as the wall table says.
- The override is per item, because the price is: `BookingItem` gains
  `priceOverrideSen` and `priceOverrideReason`, both null when the rates' price
  stands. `priceTotalSen` is the override when set, otherwise the receipt's total;
  the receipt in `priceBreakdown` is never changed, so the quoted price stays on
  record next to the agreed one. The booking's total is recomputed as after any item
  change.
- Allowed while the item is received, confirmed or assigned. A completed or cancelled
  item keeps its price.
- The item card shows "Change price" to an admin who may: the agreed total in RM and
  a reason, both required, and "Remove override" once one is set. The price rows then
  read the receipt, "Quoted price", "Agreed price" with the reason under it, and the
  total.
- Logged as `booking.item.priced` with the position and the price before and after,
  and the reason in `after`. `customerVisible` false, because the reason is inside.
  The sentence reads "Set the price of item 2 to RM 300.00" or "Reset the price of
  item 2 to RM 250.00".
- No email is sent for an override alone. The agreed price is the outcome of a
  conversation with the customer, and the confirmed email carries the final total. A
  "Booking updated" email for a price change after confirmation is future work.
- A manual booking (step 9) may carry an override from the start; it is stored and
  logged the same way, so an agreed price is never a special case.

### Step 9: Manual booking

- Permission `bookings.create`. A "New booking" button on the Bookings list opens
  `/bookings/new`.
- One page, in the order staff take a call: the trip (category, one-way or by the
  hour, pickup, drop-off or hours, date and time), then "Get prices". The server
  resolves the places, fetches the road distance and prices every active class of the
  category through `quoteTrip`, exactly as the options page does. The page then lists
  the classes with their prices and, where a class refuses the trip, the reason; a
  class the group does not fit cannot be chosen. Then passengers, child seats for a
  car, flight number and notes for the driver; the customer's name, phone and email;
  and an optional agreed price with its reason. "Create booking" prices the trip
  again on the server, never trusting the browser, and goes to the booking's page.
- The same rules as the website apply: a pickup sooner than the class's notice, a
  district that is off or a group too large is refused with the same message. Staff
  do not bypass the rules; if a phone booking needs to, that is a decision for later
  and is on record under future work.
- The booking is created through `createBooking` as `received`, with the admin as
  the actor, so the log reads "Entered the booking" under the staff name. Reservation
  confirms it as it confirms any other; a booking agreed on the phone is confirmed
  right after with the same button.
- The received emails go out as for a website booking: the customer copy when there
  is an email, the ops copy always, so the inbox stays the team's complete record.
- What the two apps share moves to the packages, so the console never re-implements
  the website's flow:
  - `trip-input.ts` in `@repo/db`: the query parameter names, the limits, and
    `parseTripSearch`, `parseTripOptions`, `parsePassengers`, `tripSearchParams`,
    from `apps/web/app/_lib/transportation-booking.ts`. The web module keeps only
    what is the website's: its paths, `bookableCategory` and the search card's
    values.
  - `resolveTrip` in `@repo/places/server`: from a parsed search to a `TripRequest`
    with the places resolved and the distance fetched, from `apps/web/.../trip.ts`.
  - The console's form posts the same field names the website's URLs carry, so one
    parser reads both.
- The form is built as parts the amend screen of step 10 reuses: the trip fields, the
  priced class list, and the item details.

### Step 10: Amend a booking (PR F)

- Permission `bookings.manage`. "Amend" on an item card, while the item is received or
  confirmed, opens the item in the manual booking's trip and details form, filled in.
  The category cannot change; the class can.
- Saving prices the trip again through `prepareTripItem` and replaces the item's trip
  details, dates, district and receipt in one transaction. An override is cleared by
  an amend, because the quoted price changed; the form offers to set a new one.
- Logged as `booking.item.amended` with the fields that changed before and after
  (places by their labels, the time, the class name, the passengers, the price),
  `customerVisible` true. The driver notes and the override reason are not in it.
- The customer gets a "Booking updated" email with every item and the new total, the
  message the partial cancel already sends, so the change reaches them in writing.

### Step 11: Several vehicles in one booking (PR F)

- The manual booking page gains "Add another vehicle": each item has its own trip,
  class and details, priced on its own; the customer, the contact and the agreed
  price per item stay as they are. `createBooking` already takes several items and
  the emails, the lists and the history already show them.
- The website keeps one item per booking. A customer who needs two vehicles books
  twice or calls, as today.

### Data model for PR E

```
Booking        userId String?        (was required)
               + contactEmail String?
BookingItem    + priceOverrideSen Int?
               + priceOverrideReason String?
BookingNote    new
               id String @id @default(cuid())
               bookingId String      (Booking, cascade)
               authorId String?      (User, set null on delete)
               body String
               createdAt DateTime @default(now())
               @@index([bookingId, createdAt])
```

Every change adds a column or a table or loosens one, so `pnpm db:push` and
`pnpm db:push:prod` apply it with no data loss, as the table under "Pushing the
schema" says.

### Module changes for PR E

| Module                         | Change                                                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `trip-input.ts`, new           | The trip query vocabulary and its parsers, from the web app. Unit-tested.                                                                               |
| `booking-input.ts`, new        | `parseNoteBody`, `parsePriceOverride` and their limits. Unit-tested.                                                                                    |
| `booking-contact.ts`, new      | `customerEmailOf(booking)`.                                                                                                                             |
| `users.ts`, new                | `findUserByEmail`, for linking a manual booking to an account.                                                                                          |
| `booking-notes.ts`, new        | `listBookingNotes` and `addBookingNote`, logged.                                                                                                        |
| `bookings.ts`                  | `createBooking` takes a nullable user, the contact email and items with an optional override; `overrideItemPrice`. The `user` on a booking is nullable. |
| `activity-actions.ts`          | `booking.note.added`, `booking.item.priced`; "Entered the booking" for a booking made by staff.                                                         |
| `@repo/places/server`          | `resolveTrip`, from the web app.                                                                                                                        |
| `@repo/email`                  | Reads `customerEmailOf`; a booking with no email gets no customer copy.                                                                                 |
| `apps/web`                     | `transportation-booking.ts` keeps the website's part; the confirm action copies the account's email onto the booking.                                   |
| `apps/admin/.../bookings/new`  | The manual booking page, its quote and create actions.                                                                                                  |
| `apps/admin/.../bookings/[id]` | The Notes card, the price override control, the customer card for a guest.                                                                              |

### As built in PR E

- `booking-contact.ts` also holds `parseContact` (name, phone, optional email), so the
  website's confirm action and the console's create action check the contact the same
  way; the website then writes the account's email over the parsed one.
- `resolveTrip` is `tripResolver(provider)` in `@repo/places`, bound to the app's
  provider in `server.ts` as the search handler is, so the module has no import cycle.
- `createBooking` logs `booking.created` with `via: "console" | "website"` from the
  actor's kind; that is what makes the sentence read "Entered the booking".
- `overrideItemPrice` refuses a completed or cancelled item, needs a readable receipt
  to go back to, and writes and logs nothing when the values are already there.
- The manual booking form keeps the trip in React state and mirrors the two place ids
  into hidden inputs under the website's names; the visible place fields are the
  shared `PlaceInput`. Any change to the trip clears the priced list.
- The customer card always shows an "Account" row: the account's name or email, or
  "None, entered by staff" for a guest. The Bookings list shows the phone where a
  guest has no email.

### Module changes for PR F

| Module                                | Change                                                                                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `booking-rules.ts`                    | `localDateTimeInputs`, the inverse of `pickupInstant`, for a form that starts from a stored trip. Unit-tested.                                                           |
| `trip-input.ts`                       | `tripSearchOf(trip)`, a stored trip back as its search; `tripItemField`, `tripItemIndexes` and `tripItemParams`, one form carrying several trips. Unit-tested.           |
| `activity-actions.ts`                 | `booking.item.amended`, `customerVisible`; `AmendedFields` and their labels; the sentence "Changed the pick-up and the vehicle of item 2". Unit-tested.                  |
| `bookings.ts`                         | `amendItem(actor, itemId, { item, override })`; `BookingEvent` gains `amended`.                                                                                          |
| `@repo/email`                         | The `amended` event: "Booking updated" to the customer, sharing its shape with the partial cancel.                                                                       |
| `apps/admin/.../bookings/_lib`        | `trip-form.ts`: the field names, the quote view and `ItemDraft`, browser-safe. `trip-server.ts`: `quoteTripView` and `prepareFormItem`. `quote-action.ts`: "Get prices". |
| `apps/admin/.../bookings/_components` | `ItemEditor`: one vehicle's trip, priced list, details and agreed price, the part both forms share.                                                                      |
| `apps/admin/.../bookings/new`         | One `ItemEditor` per vehicle and "Add another vehicle"; the create action prepares every item.                                                                           |
| `apps/admin/.../bookings/[id]`        | "Amend" on an item card; `amendItemAction`; the amend page under `amend/[itemId]`.                                                                                       |

### As built in PR F

- The manual booking form of PR E is split into the parts the plan named: the
  `ItemEditor` holds one vehicle's trip fields, "Get prices", the priced class list,
  the details and the agreed price, and its state (`ItemDraft`) belongs to the form
  around it, so the manual booking holds a list of them and the amend screen holds
  one. Every input is named under the item's index (`item0.pickup`); the actions cut
  one item's fields out with `tripItemParams` and read them with the website's
  parsers, unchanged.
- The amend page prices the stored trip on the server before it renders, so the class
  list is there at once with the current class chosen when the list still offers it.
  Where the stored place can no longer be resolved, the editor shows why and staff
  pick the place again.
- `amendItem` keeps the item's status: a confirmed item stays confirmed, and the
  customer hears about the change through the "Booking updated" email whatever the
  status. It compares the `AmendedFields`, the notes and the override, and writes
  and logs nothing when everything is already there. A new agreed price with the
  amend is logged as `booking.item.priced` after the amended entry, as at creation.
- The category is posted by the form and checked against the item's on the server;
  changing it is refused with "Cancel it and add one".
- "Get prices" is one server action for both forms, open to `bookings.create` or
  `bookings.manage`. The agreed price fields on the amend page show only with
  `bookings.create`, and the amend action checks that permission again when one is
  posted.
- The website is unchanged: it still books one item at a time.

## Future work, on record

- A customer page with the history of their booking, read from the entries marked
  `customerVisible`, with "Heavenly Travel" in place of the staff name.
- The live state of a job for the customer ("driver arrived", "at stop 1"), with the
  driver portal (OP5) and the partner portal (OP8).
- Read-only views of Zones and Vehicle classes for the other teams, if a team asks.
- Access rules for the driver and partner areas, with the driver portal.
- Vehicles, drivers and vendors (OP2), then assignment and the daily schedule (OP3).
