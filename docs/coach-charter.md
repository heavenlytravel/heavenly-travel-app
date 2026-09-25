# Coach charter: the second fleet on the transportation product

Status: planned. Decisions agreed on 2026-09-25. Nothing built yet.

Coach charter is the second tab on the home page search card to become a real booking.
It is not a second product. Car with driver and coach charter are the same trip: a
pickup, a drop-off or a number of hours, a vehicle class, a price from the same formula.
The only thing that differs is which vehicle classes are offered, and that is decided by
a category on the class and by how many passengers fit. So the product becomes
`transportation`, the vehicle class gains a category, and everything built for cars in
`car-with-driver.md` serves coaches without a fork.

Where this document differs from `car-with-driver.md`, this one wins. That document
still describes the flow, the pricing formula, the lifecycle and the module layout.

## Decisions

### One product, two categories

- `BookingItem.product` is `transportation` for cars and coaches alike. Products with a
  different shape later (attractions, hotels, packages) still get their own product
  value and their own details table, as the car document says. Only vehicles with a
  driver share.
- `VehicleClass.category` is `"car"` or `"coach"`. The home page tab and the URL pick
  the category; the options page lists only that category's classes.
- Fit is by `maxPassengers` only. `minPassengers` stays on the class as information
  ("from 15 seats") and never refuses a booking: a group of 2 may book a minibus, as a
  group of 2 may book a van today. Choosing 30 passengers hides every class smaller
  than that.
- There is no passenger cutoff number in code. The cutoff between cars and coaches is
  whatever the class maximums say, so ops moves a class between categories by editing a
  row, never by a deploy.

### Customer flow

Unchanged from the car document, with these adjustments.

1. **Search**: the Coach charter tab becomes bookable with the same fields as the car
   tab: pickup, drop-off, date, pickup time, one-way or by the hour, hours, group size,
   flight number, notes. Child seats stay on the car tab only. The coach tab loses its
   Return date; multi-day hire is future work. Group size defaults to 1 on the car tab
   and 15 on the coach tab, and either tab accepts any number.
2. **URLs**: `/booking/transportation/car-with-driver` and
   `/booking/transportation/coach-charter`, with the confirm step under each. One
   implementation behind a category route segment. The current
   `/booking/car-with-driver` pages move; nothing links to the old path outside the
   repo yet.
3. **Options**: the page lists the chosen category's classes that fit the group size,
   priced. A class that fits but fails its notice rule is shown disabled with "Needs
   N hours notice", not hidden, so the customer sees why. When no class fits, the page
   says so and links to the other category with the same search: a group of 12 on the
   car page is sent to coaches, a group of 5 on the coach page may go either way.
4. **Confirm, success, my bookings, cancel**: as built for cars. The cancel cutoff now
   comes from the item's class rather than a global constant.

### Rules live on the vehicle class

Ops thinks per vehicle: "this class needs 24 hours notice, can be cancelled up to
48 hours before, and is hired for at least 4 hours". So those three numbers move onto
`VehicleClass`, where the Fleet screen (follow-up below) edits them, and the two
override columns on `Zone` go away, because no zone ever set them and a second place to
configure the same rule is what makes configuration hard for a non-technical admin.

| Rule                | Where                                  | Car classes       | Coach classes (placeholder) |
| ------------------- | -------------------------------------- | ----------------- | --------------------------- |
| Minimum lead time   | `VehicleClass.minLeadHours`            | 4 h               | 24 h                        |
| Cancellation cutoff | `VehicleClass.cancellationCutoffHours` | 24 h              | 48 h                        |
| Minimum hourly hire | `VehicleClass.minHourlyHours`          | 3 h               | 4 h                         |
| Maximum horizon     | global constant                        | 12 months         | 12 months                   |
| Maximum hourly hire | global constant                        | 12 h              | 12 h                        |
| Time zone           | global constant                        | Asia/Kuala_Lumpur | same                        |

The coach values are placeholders until the operations team confirms them. A booking
with several items (packages, later) uses the strictest item for its cancellation
cutoff.

### Pricing

Unchanged: one-way is `max(minimumFare, baseFare + perKm × km) × multiplier`, hourly
is `hourlyRate × hours × multiplier`, rates per class, multiplier per pickup zone,
integer sen. Coach classes carry the same four rate columns. Every active zone serves
both categories at the same multiplier; a per-category flag on the zone arrives only
when ops names a zone with no coach.

### What ops and the customer see

With one product, the class name alone no longer says what was booked. The shared row
helpers print the class with its category, "Coach · Minibus", on the admin list and
detail, on the customer pages and in every email.

## Data model

Changes to `packages/db/prisma/schema.prisma`. Nothing exists in the development or
production databases that needs keeping, so renames are plain renames and the product
value is changed in place; no data migration.

```
BookingItem     product = "transportation" (was "car-with-driver")
                + endsAt DateTime?   (startsAt + hours for hourly, null for one-way;
                                      multi-day fills it later)
                tripDetails TripItemDetails?   (was carDetails)

TripItemDetails renamed from CarItemDetails, same columns; childSeats and
                flightNumber stay nullable and the coach form never asks for child seats

VehicleClass    + category String                ("car" | "coach")
                + minLeadHours Int
                + cancellationCutoffHours Int
                + minHourlyHours Int
                minPassengers stays, informational only
                @@index([category, isActive])

Zone            - minLeadHours, - maxHorizonDays   (unused; multiplier stays)
```

### Seed

`packages/db/prisma/seed.ts`, still idempotent by slug.

| Slug       | Category | Name            | Seats    | Typical vehicle             |
| ---------- | -------- | --------------- | -------- | --------------------------- |
| sedan      | car      | Executive sedan | up to 3  |                             |
| mpv        | car      | Premium MPV     | up to 6  |                             |
| van        | coach    | Passenger van   | up to 10 | moved from cars             |
| minibus    | coach    | Minibus         | 15 to 24 | Toyota Coaster              |
| midi-coach | coach    | Midi coach      | 25 to 30 | Mitsubishi Rosa, Hino       |
| coach      | coach    | Coach           | 31 to 44 | Scania or Volvo 44-seater   |
| vip-coach  | coach    | VIP coach       | 15 to 27 | executive coach, wide seats |

Car classes seed with today's rules, coach classes with the placeholder rules above,
and placeholder rates. The fleet is refined with ops later, for example a Hyundai
Starex up to 11 belongs with cars; that is a seed row, not code.

## Module changes

| Module                                 | Change                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `booking-rules.ts`                     | Keeps the global constants (horizon, maximum hours, time zone). The lead, cutoff and minimum-hours checks take the class's values as input instead of reading a constant or a zone.         |
| `vehicle-classes.ts`                   | `listActiveVehicleClasses(category)`. Fit by maximum only.                                                                                                                                  |
| `car-with-driver.ts`                   | Becomes the transportation item preparation, taking the category. Validates the class is active and in the category, the group fits, and the class's own rules pass.                        |
| `car-trip-view.ts` → `trip-view.ts`    | Row helpers print class with category. `tripViewOfItem` reads `tripDetails`.                                                                                                                |
| `booking-status.ts`                    | `checkCustomerCancel` takes the cutoff from the earliest live item's class, strictest across items.                                                                                         |
| `bookings.ts`                          | `PreparedItem` becomes a union keyed by `product`, so a later product with its own details table is added without touching `createBooking`'s callers. Only `transportation` exists for now. |
| `apps/web/app/_lib/search.ts`          | Coach tab bookable, fields as above, Return removed, group size default 15.                                                                                                                 |
| `apps/web/app/_lib/car-booking.ts`     | Category-aware URL helper. The card, options page, confirm page and action still never trust each other.                                                                                    |
| `apps/web/.../booking/transportation/` | `[category]` route segment with the options, confirm and action; `loadCarTrip` becomes category-aware and gains the notice-rule check per class.                                            |
| `apps/admin`, `packages/email`         | Read `tripDetails` and the new row helpers. No new screens.                                                                                                                                 |

## Build order

Each step is one PR into `main`, passing `pnpm lint` and `pnpm check-types`, and each
leaves the site working.

1. **Schema, seed, domain** (`feat(db)`): the model changes above, seed rows, rules
   read from the class, `PreparedItem` union, renamed trip view. Unit tests updated.
   Developer runs `pnpm db:push` on development.
2. **Web transportation flow** (`feat(web)`): move the pages under
   `/booking/transportation/[category]`, coach tab bookable, category-filtered options
   with disabled rows for the notice rule, handover link between categories.
3. **Admin and emails** (`feat`): category shown on every row, cutoff from the class,
   fixtures and previews updated.

## Follow-up: ops screens

Its own short document and PR after step 3. Wire the admin Locations screen, today
sample data in `LocationsManager.tsx`, to the `Zone` and `ZoneDistrict` tables, and add
a Fleet screen for `VehicleClass`: name, category, seats, luggage, rates, and the three
rules headed "Notice needed", "Cancel up to" and "Minimum hours". A new class is
pre-filled with its category's usual values so ops can accept the defaults.

## Future work, on record

- Multi-day charter: the Return date comes back, `endsAt` holds it, and the price adds
  a per-day rate and a driver overnight allowance.
- Per-category zone coverage, when a zone has no coach.
- Everything listed under future work in `car-with-driver.md`.
