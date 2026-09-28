# Coach charter: the second fleet on the transportation product

Status: in progress. Decisions agreed on 2026-09-25, reviewed against the code and
refined on 2026-09-28. Steps 1 (schema, seed, domain) and 2 (web route and editable
trip, cars only) of the build order are built.

Coach charter is the second tab on the home page search card to become a real booking.
It is not a second product. Car with driver and coach charter are the same trip: a
pickup, a drop-off or a number of hours, a vehicle class, a price from the same formula.
The only thing that differs is which vehicle classes are offered, and that is decided by
a category on the class. So the product becomes `transportation`, the vehicle class
gains a category, and everything built for cars in `car-with-driver.md` serves coaches
without a fork.

Where this document differs from `car-with-driver.md`, this one wins. That document
still describes the pricing formula, the lifecycle and the module layout.

## Decisions

### One product, two categories

- `BookingItem.product` is `transportation` for cars and coaches alike. Products with a
  different shape later (attractions, hotels, packages) still get their own product
  value and their own details table, as the car document says. Only vehicles with a
  driver share.
- The category is `car-with-driver` or `coach-charter`, spelled the same everywhere: in
  `VehicleClass.category`, in the URL, in the snapshot on the booking and as the key of
  the search card tab. There is no mapping between spellings. The vocabulary, its guard
  and its labels ("Car with driver", "Coach charter") live in `booking-status.ts` next
  to `PRODUCTS`.
- Fit is by `maxPassengers` only. `minPassengers` stays on the class as information
  ("from 15 seats") and never refuses a booking: a group of 2 may book a minibus, as a
  group of 2 may book a van today.
- No seat number lives in code. The most passengers a category accepts is the largest
  `maxPassengers` among its active classes, read from the database, so ops changes it by
  editing a row, never by a deploy.

### A booking is a receipt

Whatever the customer chose and successfully booked is what they get, even if ops
changes or retires the class a minute later. The item already snapshots the price
breakdown and the class name; it now also snapshots the class category and the
cancellation cutoff that applied. Nothing on a booking is read back through the
`VehicleClass` relation. Changing an existing booking is a conversation between the
customer and the team; an admin amend feature is future work.

### Customer flow

Unchanged from the car document, with these adjustments.

1. **Search**: the Coach charter tab becomes bookable with the same fields as the car
   tab: one-way or by the hour, pickup, drop-off, hours, date, pickup time. Passengers
   leaves the card on both tabs and is asked on the options page. The coach tab loses
   its Return date; multi-day hire is future work. The home page stays static: it reads
   nothing from the database and checks no notice rule. The two tab notes in
   `search.ts`, which no screen shows today, are reworded without seat numbers: "Sedan,
   MPV or van" and "Minibus or coach for groups".
2. **URLs**: `/booking/transportation/car-with-driver` and
   `/booking/transportation/coach-charter`, with the confirm step under each. One
   implementation behind a `[category]` route segment, which is refused unless it is a
   known category. The current `/booking/car-with-driver` pages move and the old path is
   not redirected; nobody uses the site yet.
3. **Options**: the trip at the top can be edited (next section). Below it the page
   lists every active class in the category, priced. Each class has an availability
   state computed by the domain: available, needs more notice, or needs more hours. A
   class that is not available is greyed out with the reason, "Needs 24 hours notice" or
   "Minimum 4 hours", not hidden, so the customer sees why and can change the trip. A
   class the group does not fit is greyed out as today, and the list updates as the
   passenger count changes.
4. **Passengers**: asked on the options page, starting at 1, and the field accepts no
   more than the category's largest class. Under it a line tells a larger group where to
   go. On the car page: "Up to 10 passengers. Larger group? See coach charter", linking
   to the coach page with the same trip. On the coach page: "Up to 44 passengers. Larger
   group? Contact us". The numbers come from the classes the page already loaded.
5. **Other details**: child seats, flight number and notes stay on the options page as
   built. Child seats are not asked for a coach.
6. **Confirm, success, my bookings, cancel**: as built for cars. The item heading reads
   "Car with driver" or "Coach charter" from the snapshot category.

### The trip can be edited on the options page

The "Your trip" panel becomes a summary bar: pickup, drop-off or hours, date and time,
with an Edit button. Edit opens the same fields the home card shows for that category,
built from the same field definitions and the same inputs, filled in with the current
trip. Saving loads the options page again with the new trip in the URL, so the prices
and the availability of every class are computed again by the server.

- The category cannot be changed here. The line under the passengers field is the only
  bridge between the two.
- A changed trip clears the chosen vehicle, because the prices changed. The passenger
  count is carried over.
- This is what makes a greyed-out class useful: a customer who asked for 3 hours and
  sees "Minimum 4 hours" changes the hours in place.

The idea is taken from Blacklane's booking page. Its vehicle photos and route map are
future work.

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
| Hourly floor        | global constant                        | 3 h               | same                        |
| Maximum hourly hire | global constant                        | 12 h              | 12 h                        |
| Maximum horizon     | global constant                        | 12 months         | 12 months                   |
| Time zone           | global constant                        | Asia/Kuala_Lumpur | same                        |

The hourly floor is the lowest minimum any class may set, and the Fleet screen refuses a
lower one. The Hours list on the card and in the trip editor, and the URL parser, run
from the floor to the maximum, because they do not know the class; the class's own
minimum is applied on the options page as an availability state. The horizon stays a
trip-level check, so a pickup beyond it stops the page as today.

The availability state is decided by a pure function in `booking-rules.ts` that takes
the class's rules, the trip and the current time. It has unit tests for every state and
both edges of each rule, as the lead and cutoff rules have today. `quoteTrip` calls it
once per class.

The coach values are placeholders until the operations team confirms them.

### Cancellation with several items

`checkCustomerCancel` stays pure and reads only `Booking` and `BookingItem`. The
deadline is the earliest of each live item's start minus that item's snapshot cutoff;
the customer may cancel while now is before that deadline. With one item this is the
car rule with the class's number.

The hint names the deadline as a date and time, never a number of hours, so it reads the
same with one item or several: "Free cancellation until Sat, 3 Oct 2026, 09:30", and
once it has passed, "Free cancellation ended on Sat, 3 Oct 2026, 09:30".

### Pricing

Unchanged: one-way is `max(minimumFare, baseFare + perKm × km) × multiplier`, hourly
is `hourlyRate × hours × multiplier`, rates per class, multiplier per pickup zone,
integer sen. Coach classes carry the same four rate columns. Every active zone serves
both categories at the same multiplier; a per-category flag on the zone arrives only
when ops names a zone with no coach.

### What ops and the customer see

With one product, the class name alone no longer says what was booked. One shared
function gives the item heading from the snapshot category, and the shared row helpers
print the class under it, on the admin list and detail, on the customer pages and in
every email. It replaces the three copies written by hand today: the product name map
in the admin booking page, the heading in `BookingDetail.tsx` and the email fixtures.

### Names

The domain is renamed with the product, so the code never carries a mix of "car" and
"trip" names for the same thing. Each name is changed once: the `packages/db` names in
step 1, with only the import lines patched in the apps so they compile, and the web
names in step 2, as the files move to the new route.

| Today                                                                  | After                                                                  | Step |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---- |
| `car-with-driver.ts`, `quoteCarTrip`, `prepareCarItem`                 | `transportation.ts`, `quoteTrip`, `prepareTripItem`                    | 1    |
| `car-trip-view.ts`, `carDetailRows`                                    | `trip-view.ts`, `tripDetailRows`                                       | 1    |
| `CarMode`, `CAR_MODES`, `CAR_MODE_LABELS`, `isCarMode`                 | `TripMode`, `TRIP_MODES`, `TRIP_MODE_LABELS`, `isTripMode`             | 1    |
| `priceCarTrip`, `CarRates`, `CarPriceBreakdown`, `isCarPriceBreakdown` | `priceTrip`, `TripRates`, `TripPriceBreakdown`, `isTripPriceBreakdown` | 1    |
| `CarTripRequest`, `CarItemRequest`, `CarQuote*`                        | `TripRequest`, `TripItemRequest`, `TripQuote*`                         | 1    |
| `apps/web/app/_lib/car-booking.ts`, `CAR_*` constants                  | `transportation-booking.ts`, `TRIP_*` constants                        | 2    |
| `loadCarTrip`, `CarOptionsForm`, `createCarBookingAction`              | `loadTrip`, `TripOptionsForm`, `createTripBookingAction`               | 2    |
| Search tab keys `car`, `coach`                                         | `car-with-driver`, `coach-charter`                                     | 2    |

## Data model

Changes to `packages/db/prisma/schema.prisma`. Nothing in the development or production
database needs keeping except the users and their access, so the change is made
directly: no defaults added for the sake of old rows, no table kept under an old name,
no data migration.

```
BookingItem     product = "transportation" (was "car-with-driver")
                + endsAt DateTime?   (startsAt + hours for hourly, null for one-way;
                                      multi-day fills it later)
                + cancellationCutoffHours Int   (snapshot of the class rule at booking)
                tripDetails TripItemDetails?   (was carDetails)

TripItemDetails renamed from CarItemDetails, same columns, plus
                + vehicleClassCategory String   (snapshot, next to vehicleClassName)
                childSeats and flightNumber stay nullable; the coach form never asks
                for child seats

VehicleClass    + category String   ("car-with-driver" | "coach-charter")
                + minLeadHours Int
                + cancellationCutoffHours Int
                + minHourlyHours Int
                minPassengers stays, informational only
                @@index([category, isActive])

Zone            - minLeadHours, - maxHorizonDays   (unused; multiplier stays)
```

The comment on `Booking.startsAt` loses "and the cancellation cutoff": it is for sorting
only once the deadline is computed from the items.

### Pushing the schema

The developer does this by hand, once per database, in this order.

1. Empty the booking and fleet tables. `User` and the three profile tables are not
   named, and nothing in them refers to these tables, so users and admin access are
   untouched:

   ```sql
   TRUNCATE "Booking", "BookingItem", "CarItemDetails",
            "VehicleClass", "Zone", "ZoneDistrict" CASCADE;
   ```

2. Push the schema: `pnpm db:push`, or `pnpm db:push:prod`. Prisma reports the dropped
   table and columns as data loss and asks to go on; that is expected.
3. Seed: `pnpm --filter @repo/db db:seed`, or `db:seed:prod`.

On production this happens right before step 1 of the build order is merged. The code
running until the deploy finishes reads the table and the columns that were just
dropped, so the booking flow is down for those few minutes. After the deploy, price one
trip on the site to confirm.

### Seed

`packages/db/prisma/seed.ts`, still idempotent by slug.

| Slug       | Category        | Name            | Seats    | Typical vehicle             |
| ---------- | --------------- | --------------- | -------- | --------------------------- |
| sedan      | car-with-driver | Executive sedan | up to 3  |                             |
| mpv        | car-with-driver | Premium MPV     | up to 6  |                             |
| van        | car-with-driver | Passenger van   | up to 10 |                             |
| minibus    | coach-charter   | Minibus         | 15 to 24 | Toyota Coaster              |
| midi-coach | coach-charter   | Midi coach      | 25 to 30 | Mitsubishi Rosa, Hino       |
| coach      | coach-charter   | Coach           | 31 to 44 | Scania or Volvo 44-seater   |
| vip-coach  | coach-charter   | VIP coach       | 15 to 27 | executive coach, wide seats |

Car classes seed with today's rules, coach classes with the placeholder rules above,
and placeholder rates. The van stays a car class with the car rules, so a group of 8
books as it does today. The fleet is refined with ops later; moving a class to the other
category or changing its rules is a row, not code.

## Module changes

| Module                                        | Change                                                                                                                                                                                                                                                    |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `booking-rules.ts`                            | Keeps the global constants (horizon, hourly floor and maximum, time zone). Gains the pure availability function. The horizon check stands alone, the deadline function takes the cutoff hours as input. `ZoneRules` and `rulesFor` go away.               |
| `booking-status.ts`                           | `PRODUCTS` is `transportation`. Gains the category vocabulary, guard and labels. `checkCustomerCancel` takes the booking with its items, uses each live item's snapshot cutoff, earliest deadline wins, and returns the deadline for the hint.            |
| `vehicle-classes.ts`                          | `listActiveVehicleClasses(category)`, `fitsPassengers` by maximum only.                                                                                                                                                                                   |
| `car-with-driver.ts` → `transportation.ts`    | `quoteTrip(category, request)` prices every active class in the category and gives each an availability state (available, too soon, too few hours). `prepareTripItem` refuses a class that is not available or does not fit, and fills the two snapshots. |
| `car-trip-view.ts` → `trip-view.ts`           | Row helpers print the class, the shared function gives the item heading from the snapshot category. `tripViewOfItem` reads `tripDetails`.                                                                                                                 |
| `bookings.ts`                                 | `PreparedItem` becomes a union keyed by `product`, so a later product with its own details table is added without touching `createBooking`'s callers. Only `transportation` exists for now. `cancelBookingAsCustomer` loads the items.                    |
| `apps/web/app/_lib/search.ts`                 | Tab keys renamed to the categories. Coach tab bookable with the car tab's fields, Return removed. Passengers removed from both tabs. Tab notes reworded without numbers.                                                                                  |
| `apps/web/app/_lib/transportation-booking.ts` | Category-aware URL helper. Passengers is no longer part of the search, only of the options. The card, options page, confirm page and action still never trust each other.                                                                                 |
| `apps/web/.../booking/transportation/`        | `[category]` route segment with the options, confirm and action. `loadTrip` is category-aware. The trip summary bar and its editor. The options form greys out classes by fit and by availability state, caps passengers and shows the larger group line. |
| `apps/admin`, `packages/email`                | Read `tripDetails` and the new row helpers. Item headings from the shared function. A coach sample in the email fixtures and previews. No new screens.                                                                                                    |

## Build order

Each step is one PR into `main`, passing `pnpm lint` and `pnpm check-types`, and each
leaves the site working.

1. **Schema, seed, domain** (`feat`): the model changes above, seed rows, rules read
   from the class, the availability function with its tests, availability states on the
   quote, snapshots on the item, the cancel deadline from the items, `PreparedItem`
   union, the step 1 renames, and the import lines in web, admin and email that those
   renames force, so every app compiles. Cars keep working on the current URL. The
   developer pushes the schema as described above, development first, production right
   before the merge.
2. **Web route and editable trip, cars only** (`feat(web)`): move the pages under
   `/booking/transportation/[category]`, the step 2 renames, the trip summary bar and
   editor, passengers off the card and capped on the options page, greyed-out rows for
   fit and availability, the cancel hint as a date. The coach tab stays disabled.
3. **Coach tab bookable** (`feat(web)`): the coach tab and its fields, child seats
   hidden for coaches, the larger group line on both pages, tab notes reworded.
4. **Admin and emails** (`feat`): item headings and rows from the snapshot category on
   every screen and email, a coach sample in the fixtures and previews.

As built in step 2:

- A category is open when its search card tab is `bookable`. `bookableCategory` in
  `transportation-booking.ts` reads that flag for the route segment and for the create
  action, so step 3 opens the coach tab and its pages with one change.
- The passenger count is not part of the search, but the options page URL may carry
  `passengers` as a starting value. The trip editor and the Change link on the confirm
  page send it, which is how the count survives a changed trip.
- The options form gets the trip as its React `key`, so a changed trip is a new form
  and the chosen vehicle is cleared.
- When the trip resolves but cannot be priced (area not served, too far ahead, no
  route), the trip bar stays above the message so the trip can be changed in place.
- The home card and the trip editor send through one hook, `useTripSubmit`.
- The URL parser refuses a passenger count above 999 as nonsense. That is not a seat
  number: the cap on the field is `largestGroup` of the classes the page loaded.

## Follow-up: ops screens

Its own short document and PR after step 4. Wire the admin Locations screen, today
sample data in `LocationsManager.tsx`, to the `Zone` and `ZoneDistrict` tables, and add
a Fleet screen for `VehicleClass`: name, category, seats, luggage, rates, and the three
rules headed "Notice needed", "Cancel up to" and "Minimum hours". A new class is
pre-filled with its category's usual values so ops can accept the defaults. The screen
refuses a minimum below the hourly floor.

## Future work, on record

- Multi-day charter: the Return date comes back, `endsAt` holds it, and the price adds
  a per-day rate and a driver overnight allowance.
- Several items in one booking chosen by the customer, so a group too large for one
  vehicle books two.
- Vehicle photos on the class cards and a route map on the options page.
- A notice check on the home page card, read from the database through a cache, if the
  greyed-out rows on the options page prove too late a place to say it.
- Amending an existing booking from the admin console, after the customer and the team
  agree a change.
- Per-category zone coverage, when a zone has no coach.
- Everything listed under future work in `car-with-driver.md`.
