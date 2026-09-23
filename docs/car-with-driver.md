# Car with driver: the first bookable product

Status: plan, agreed on 2026-09-23. Steps 1 (schema, seed, domain) and 2 (places
package) of the build order are built; the rest is not.

Car with driver is the first product on the home page search card to become a real
booking instead of a WhatsApp message. The pieces that are the same for every product
(auth gate, confirm step, statuses, reference, emails, my bookings, admin list) are built
generically so coach charter reuses them. The pieces that differ (search fields, options
screen, pricing) are built for cars only.

## Decisions

### Customer flow

1. **Search** on the home page: pickup, drop-off, date, pickup time, one-way or by the
   hour. Submitting goes to `/booking/car-with-driver` with the search in query
   parameters, so the page is shareable, the back button works, and the search survives
   the sign-in redirect.
2. **Options**: vehicle classes with an instant price each, passengers, hours (hourly
   only), flight number, child seats, notes to the driver.
3. **Proceed** requires a session. Signed-out visitors go to sign-in (or sign-up) with a
   return URL back to the confirm step. The trip is never lost.
4. **Confirm** shows the snapshot price, asks for a phone number if the user has none,
   and creates the booking. The customer lands on a success page with the reference.
5. **My bookings** under `/account/bookings` lists the user's bookings with status.
   Self-service cancel is allowed while the booking is `received` or `confirmed` and the
   pickup is further away than the cancellation cutoff. Inside the cutoff the page shows
   the cancel button disabled with the hint "Cannot cancel within 24 hours of pickup".

Other home page products (coach, attractions, hotels, car rental, packages) are disabled
on the search card until they are built. No WhatsApp fallback for them.

### Pricing

Instant, computed on the server, never trusted from the client.

| Mode    | Formula                                                                              |
| ------- | ------------------------------------------------------------------------------------ |
| One-way | max(minimumFare, baseFare + perKm × roadDistanceKm) × pickup zone multiplier         |
| Hourly  | hourlyRate × hours × pickup zone multiplier, hours ≥ business minimum (3), no km cap |

Rates live per vehicle class. The multiplier lives per zone. Road distance comes from the
Google Routes API. The computed price, the rates used and the class name are copied onto
the booking, so later rate changes and retired classes never alter an existing booking.

Money is stored as integer **sen** (`Int`), never `Decimal`. Prisma's `Decimal` comes
back as a Decimal.js object, which cannot cross into client components or JSON without
conversion at every call site. Integer sen keeps arithmetic exact and the rows plain.
The multiplier and distance are `Float`. Totals are rounded to the nearest sen after the
multiplier is applied.

Deferred: tolls, night surcharge, hourly distance allowance, quotes by hand, payment.

### Service area

A **zone** is a named area where drivers and vehicles are based, defined as a set of
Malaysian districts. A place resolves to a zone by matching the district from the
geocode's address components. No polygons.

A zone is neither a state nor a home page location card. It sits below a state and may
cross state lines: Klang Valley is Kuala Lumpur plus five Selangor districts, Cameron
Highlands is one district of Pahang, and Kedah has a Langkawi zone but no Alor Setar zone
until ops adds that district.

- Pickup must resolve to an active zone. Otherwise the page says the area is not served
  yet and stops.
- Drop-off can be anywhere in Malaysia. Distance pricing covers it.
- Each zone carries what varies by location: `multiplier`, `minLeadHours`,
  `maxHorizonDays`. Global defaults apply when a zone leaves them empty.

### Business rules (global, not per zone)

| Rule                | Default                                                    | Where                          |
| ------------------- | ---------------------------------------------------------- | ------------------------------ |
| Minimum lead time   | 4 hours                                                    | zone override, else this       |
| Maximum horizon     | 12 months                                                  | zone override, else this       |
| Cancellation cutoff | 24 hours                                                   | global only                    |
| Minimum hourly hire | 3 hours                                                    | global only                    |
| Inventory limit     | none, ever                                                 | there is no availability check |
| Time zone           | Asia/Kuala_Lumpur for all input and display, stored as UTC | global only                    |

Validation on create: pickup inside the window, pickup zone active, drop-off present for
one-way, hours ≥ minimum for hourly, passengers within the class range, class active.

### Booking lifecycle

A booking is an order. It holds one or more **items**, each item being one product on
one day: a car with driver on day one, a coach on day two, an attraction along the way.
The first release always creates a booking with exactly one car item, but the shape is
the package shape from the start, so packages later add items without a migration.

Statuses are strings validated against a const array (no Prisma enums, matching the
`AdminLevel` pattern in `roles.ts`). Fulfilment happens per item, because a driver is
assigned to a car item, not to a package. The booking carries a summary status derived
from its items and stored for list filtering.

```
item:     received ──▶ confirmed ──▶ assigned ──▶ completed
              │             │              │
              └─────────────┴──────────────┴──▶ cancelled

booking:  received | confirmed | completed | cancelled  (derived)
```

- Item `received`: created by the customer. Booking `received` emails the customer and
  booking@heavenlytravel.my once, for the whole order.
- Item `confirmed`: set by any admin. When every live item is confirmed the booking is
  `confirmed` and the customer gets one email.
- Item `cancelled`: by the customer (before cutoff) or by any admin. Customer cancel
  cancels the whole booking. Admin can cancel one item or all; a customer email goes out
  either way. A booking is `cancelled` when every item is.
- Item `assigned` and `completed`: set by any admin with a button, one step at a time,
  while drivers are managed outside the app. The driver feature later attaches a driver
  to `assigned`. No email. A booking is `completed` when every live item is.

Derivation lives in one function, `bookingStatusOf(items)`, called after every item
change. Live items are the ones not cancelled. The booking is `cancelled` when there are
no live items, `received` when any live item is still `received`, `completed` when every
live item is `completed`, and otherwise `confirmed`: `assigned` counts as confirmed or
beyond, and a mix of `confirmed`, `assigned` and `completed` items is a confirmed
booking. The cancellation cutoff is measured against the earliest live item's start time.

Every booking has a cuid `id` for relations and a short human-readable `reference`
(for example `HT-7K3QZM`) for emails, WhatsApp and the success page. The reference is
random, unique and never sequential. Items are addressed as `HT-7K3QZM` item 1, 2, 3.

### Identity and contact

Clerk stays the identity source. Phone number is ours: a nullable `phone` column on
`User`, required at the confirm step and stored for next time. Name comes from Clerk
already. Each booking also copies the contact name and phone used, so a later profile
change does not rewrite history.

## Data model

Additions to `packages/db/prisma/schema.prisma`. Field lists are the intent, not final
syntax.

```
User            + phone String?

Zone            id, slug @unique, name, isActive,
                multiplier Float, minLeadHours Int?, maxHorizonDays Int?,
                districts ZoneDistrict[]

ZoneDistrict    id, zoneId, state, district   @@unique([state, district])
                (state and district as Google spells them in address components)

VehicleClass    id, slug @unique, name, description, isActive, sortOrder,
                minPassengers Int, maxPassengers Int, luggage String,
                baseFareSen, perKmSen, hourlyRateSen, minimumFareSen  (Int, MYR sen)

Booking         id, reference @unique, userId, status String (derived),
                contactName, contactPhone,
                priceTotalSen Int (sum of live items), currency "MYR",
                startsAt DateTime (earliest live item, for sorting and cutoff),
                cancelledAt?, cancelledBy? ("customer" | "admin"),
                confirmedAt?, createdAt, updatedAt,
                items BookingItem[]
                @@index([userId, createdAt]) @@index([status, startsAt])

BookingItem     id, bookingId, position Int (1, 2, 3 within the booking),
                product String ("car-with-driver"; later "coach-charter", ...),
                status String, startsAt DateTime, zoneId?,
                priceTotalSen Int, priceBreakdown Json,
                cancelledAt?, confirmedAt?, createdAt, updatedAt,
                carDetails CarItemDetails?
                @@unique([bookingId, position]) @@index([status, startsAt])

CarItemDetails  id, itemId @unique, vehicleClassId,
                vehicleClassName (snapshot), mode ("oneway" | "hourly"),
                pickupPlace Json, dropoffPlace Json?, hours Int?,
                distanceKm Float?, passengers Int, childSeats Int,
                flightNumber String?, notes String?
```

Each product adds one details table hanging off `BookingItem`, and `product` says
which one to read. Exactly one details row exists per item, enforced in the create
function. The shared screens (admin list, my bookings, emails, transitions) read only
`Booking` and `BookingItem`.

`pickupPlace` and `dropoffPlace` hold the resolved place: Google place id, formatted
address, lat, lng, state, district. Stored as JSON because they are a snapshot of an
external record, never queried by field.

`priceBreakdown` on the item records the inputs: mode, rates used, distance or hours,
multiplier. It is the receipt. The booking total is the sum of its live items.

Vehicle classes and zones are never deleted, only `isActive = false`.

### Seed data

`packages/db/prisma/seed.ts`, run with `pnpm --filter @repo/db db:seed`, idempotent
(upsert by slug). Seeds the vehicle classes already described in
`apps/web/app/_lib/content.ts` (sedan, MPV, van) with placeholder rates, and the first
zones with their districts: Klang Valley, Langkawi, Penang, Melaka, Johor Bahru,
Cameron Highlands. Rates and districts are confirmed with ops before the first push.

Global business rules are constants in `packages/db/src/booking-rules.ts` until an admin
settings screen exists.

## Module boundaries

New domain code lives in `packages/db/src`, next to `admins.ts`, so both apps share one
implementation. Modules that touch the database or the session are `server-only`. The
pure modules (`booking-rules.ts`, `pricing.ts`, `references.ts`) must not import
`server-only`, because that import throws outside a React server context and the unit
tests run under plain Node. Tests use Node's built-in runner through `tsx`
(`pnpm --filter @repo/db test`), so no test framework is added.

| Module               | Responsibility                                                                                                                                                                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `booking-rules.ts`   | Global constants and the window, cutoff and hours checks. Pure.                                                                                                                                                                                                                                         |
| `zones.ts`           | `resolveZone(state, district)`, active zone list. Google's Malaysian address components often carry the district in `locality` and omit `administrative_area_level_2`, so the caller tries level 2 first and then locality; verified against real geocodes at the start of step 2.                      |
| `vehicle-classes.ts` | Active classes, class lookup, passenger fit.                                                                                                                                                                                                                                                            |
| `pricing.ts`         | `priceCarTrip(input) -> { total, breakdown }`. Pure, unit-testable.                                                                                                                                                                                                                                     |
| `references.ts`      | Reference generation with collision retry.                                                                                                                                                                                                                                                              |
| `bookings.ts`        | `createBooking(items)`, `listBookingsForUser`, `listBookings` (admin), item transitions `confirmItem`, `assignItem`, `completeItem`, `cancelItem(by)`, `cancelBooking(by)`, and `bookingStatusOf(items)`. Each transition checks the current status and the rules, then recomputes the booking summary. |

Two new workspace packages:

| Package           | Responsibility                                                                                                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/places` | `searchPlaces(query)`, `resolvePlace(placeId)`, `roadDistance(from, to)` (km and minutes). Google implementation behind one interface, Malaysia-only, one server-side key. A `null` provider for local development without a key keeps hourly working and marks one-way unavailable. |
| `packages/email`  | Resend client and the three templates (received, confirmed, cancelled). Sender `booking@heavenlytravel.my`. Falls back to logging when the key is missing.                                                                                                                           |

Autocomplete calls go through a web app route handler so the Google key never reaches
the browser. Responses are cached per query for a short time.

As built in step 2:

- `@repo/places` exports browser-safe types; `@repo/places/server` picks the provider
  once per process from `GOOGLE_MAPS_SERVER_KEY`. Providers log upstream failures and
  return empty results, never throw.
- Google: Places API (New) autocomplete and details, Routes API for distance. Details
  responses carry address components, so the Geocoding API is not needed. Results are
  memoised in process: autocomplete one minute, details and routes ten minutes.
- The null provider offers the seeded zone districts as places (`local:` ids, zero
  coordinates), so a pickup resolves to a zone and hourly bookings work end to end
  without a key. It cannot route.
- The place field mints a Google autocomplete session token per selection and sends it
  with every keystroke and the details call, so a session bills as one request.
- `SearchValues` gained `placeIds`, filled only when a suggestion was picked. A place
  field with text but no id is unresolved; step 3 decides what to do with it.
- Zone resolution against real Google address components is still unverified; the key
  did not exist when step 2 was built. Check the first real geocodes for Klang Valley,
  Langkawi and Cameron Highlands against `ZoneDistrict` before step 3 ships.

## Web app

| Route                              | Purpose                                                                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `/`                                | Search card submits to `/booking/car-with-driver`. Other product tabs disabled.                                         |
| `/booking/car-with-driver`         | Options: resolves places and zone, lists classes with prices. Server component; price computed per class on the server. |
| `/booking/car-with-driver/confirm` | Requires session (`getAccess("user")`, redirect with return URL). Phone, final price, create.                           |
| `/booking/[reference]`             | Success page. Owner only.                                                                                               |
| `/account/bookings`                | List. `/account/bookings/[reference]` detail with cancel action.                                                        |
| `/api/places/search`               | Autocomplete proxy, signed-in or not.                                                                                   |

The home page renders `ServiceTabsSearch`, whose state is `SearchValues` from
`_lib/search.ts` (via `useSearch`). The
`car` product in `search.ts` gains a one-way or hourly mode and an hours field (hourly
only, options from the business minimum upward). The `to` and `from` fields become
resolved places (place id plus label) with an autocomplete field in
`_components/search/fields.tsx`. Everything below the search card is new.

Pickup date and time are combined as `${date}T${time}:00+08:00`. Malaysia has no
daylight saving, so no time zone library is needed. Clerk's `SignIn` honours a
`redirect_url` query parameter, which carries the return to the confirm step.

## Admin app

| Route            | Purpose                                                                                                                                               |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/bookings`      | Table, newest first, filter by status. Sidebar entry.                                                                                                 |
| `/bookings/[id]` | Detail: trip, contact, price breakdown, timeline. Confirm, assign, complete and cancel actions with `getAdmin()` re-check, as in `admins/actions.ts`. |

All admin levels. The existing Locations screen keeps its sample data; wiring it to the
`Zone` table is the later ops feature.

## Emails

| Event              | To                                  | Content                                                                       |
| ------------------ | ----------------------------------- | ----------------------------------------------------------------------------- |
| received           | customer, booking@heavenlytravel.my | reference, trip, price, "we will confirm"; admin copy links to the admin page |
| confirmed          | customer                            | reference, trip, pickup time, ops WhatsApp                                    |
| cancelled by admin | customer                            | reference, reason if given, ops WhatsApp                                      |

Sent after the database write, never inside the transaction. A failed send is logged and
does not fail the booking.

## Build order

Each step is one PR into `main`, passing `pnpm lint` and `pnpm check-types`, and each
leaves the site working.

1. **Schema, seed, domain** (`feat(db)`): models above, seed script, rules, pricing,
   references, bookings module. Unit tests for `pricing.ts` and `booking-rules.ts`.
   Developer runs `pnpm db:push` on development.
2. **Places package** (`feat`): interface, Google provider, null provider, autocomplete
   route handler and field. Works without a key.
3. **Web booking flow** (`feat(web)`): `/booking/car-with-driver`, confirm, success,
   search card submit, other tabs disabled.
4. **My bookings** (`feat(web)`): list, detail, cancel.
5. **Admin bookings** (`feat(admin)`): list, detail, confirm, assign, complete, cancel.
6. **Email package** (`feat`): Resend, templates, hooked into the three transitions.

Step 6 can land with Resend unconfigured. Real emails switch on the day the key
arrives, with no code change.

## Setup outside the repo

Owned by the developer, needed before the matching step goes to production.

- **Google Cloud** (account exists; before step 3 goes to production): enable Places
  API (New) and Routes API, one server key restricted to those APIs. Env var
  `GOOGLE_MAPS_SERVER_KEY` in `apps/web/.env.local` and Vercel Preview and Production.
  Every new env var is also listed in `globalEnv` in `turbo.json` and in each app's
  `.env.example`, otherwise turbo's build cache ignores it.
- **Resend** (before step 6): account, verify `heavenlytravel.my` (DKIM record, SPF on
  Resend's send subdomain, DMARC if none exists; none of these touch Google Workspace's
  records), API key as `RESEND_API_KEY` in both apps. Create `booking@` as a Google
  Workspace group with a collaborative inbox so it can receive the ops copy.

## Future work, on record

- Driver assignment: `assigned` status, driver relation, driver portal, and handling of
  unserved pickups.
- Packages: several items in one booking, built on the item model above, with a
  package options screen. Two calls made for single-item bookings are open for review
  when packages arrive: emails are sent once per booking, not per item, and a
  customer cancel is all-or-nothing while admin can cancel a single item.
- Payment: B2C card checkout with paid state and refunds; B2B accounts on invoice.
- Quote flow for requests that cannot be priced instantly.
- Admin UI for zones, districts, vehicle classes, rates and business rules.
- Polygons as an override for zones finer than a district.
- Tolls, night surcharge, hourly distance allowance.
- Landing fleet cards read from `VehicleClass`.
- Coach charter as the second product: its own item details table and options screen on the
  same booking core.
