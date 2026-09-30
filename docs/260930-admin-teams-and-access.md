# Admin teams and access: levels, teams, the wall and the activity log

Status: steps 1 to 7 built, the rest agreed. Decisions agreed on 2026-09-30. The ops
screens of steps 6 and 7 are designed in `260930-ops-screens.md` and, for coverage,
`260930-coverage.md`. This is the implementation
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

Steps 1 to 7 are in a fixed order. Steps 8 to 12 are designed in this document, each
in its own section, before they start, and their order and their PRs may change then.

## Future work, on record

- A customer page with the history of their booking, read from the entries marked
  `customerVisible`, with "Heavenly Travel" in place of the staff name.
- The live state of a job for the customer ("driver arrived", "at stop 1"), with the
  driver portal (OP5) and the partner portal (OP8).
- Read-only views of Zones and Vehicle classes for the other teams, if a team asks.
- Access rules for the driver and partner areas, with the driver portal.
- Vehicles, drivers and vendors (OP2), then assignment and the daily schedule (OP3).
