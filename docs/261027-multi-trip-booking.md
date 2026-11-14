# Multi-trip booking: one booking, many trips, one vehicle

Status: designed with the user from 2026-10-25 to 2026-10-27 in a clickable example at
`/booking-example`, on branch `feat/multi-item-booking`. Simplified on 2026-10-27: no
Return, no Days, no link lines; one Continue per vehicle; the confirm page only shows the
trips; trips clash only at the same time or during a hire. Built on 2026-10-27 on the
same branch, with the open questions answered (see "As built"); the example was deleted
before the merge and was never part of the site.

This supersedes one line of docs/260930-admin-teams-and-access.md, Step 11: "The website
keeps one item per booking." The website now books any number of trips in one booking.

A customer staying in Langkawi wants the airport transfer, a driver for two days and the
way back to the airport. Today each is a booking of its own, typed and confirmed three
times, each with its own vehicle. Here they are one booking: typed in one card, priced
together, one vehicle chosen once, confirmed once.

## Decisions

### The rules

- **A booking holds any number of trips.** Each trip is one booking item, with its own
  day, time, places, kind, price, status, driver and cancellation time.
- **Two kinds of trip: one-way and hourly.** A return is two one-way trips, and a hire
  over several days one hourly trip a day, each added on its own. "Hourly" replaces "By
  the hour" as the label everywhere. It is a label only: the stored values stay `oneway`
  and `hourly`, so the schema does not change. The label is `TRIP_MODE_LABELS` in
  `packages/db/src/booking-status.ts`, which the site, the emails and the console share.
- **One vehicle class for every trip,** chosen once. No vehicle per trip and no second
  vehicle: those are bookings of their own. A group too large for one car is sent to
  coach charter, as today.
- **No two trips at once.** A trip may not start at the same day and time as another, or
  during an hourly hire (a hire past midnight runs into the next day). A one-way trip has
  no length in this rule: how long the drive takes is not known when it is typed, so trips
  close together are allowed and the team plans the gap. Checked as each trip is typed and
  again when booking. Tight gaps get no warning (asked and dropped).
- **Passengers once for the booking:** the most on any trip. The class must seat them.
- **Flights and a note once for the booking.** "Arriving flight" shows when a trip picks up
  at an airport, "Departing flight" when one drops off at an airport, and one "Notes for
  the driver". When booked they are copied onto the items they are for; the database keeps
  them per item, as now.
- **Child seats are not asked for now.** `TripItemDetails.childSeats` stays.
- **A new search in place of trips the customer has asks first** ("Start a new booking?"),
  and says the flight numbers and notes go too.

### The search card (home, location and service hub pages)

Redesigned on 2026-11-13 (`_components/search/SearchCard.tsx`); what it replaced, a form
with "Your trips" and Save trip, is under "Tried and dropped".

- **The services are a dock** of the brand's blue glass (`--brand`, the buttons' blue,
  since 2026-11-14; navy before) over the hero photo, an icon over
  each name, a white tile sliding under the chosen one. Only Car with Driver and Coach
  Charter are booked online; the other four are marked "Soon" and cannot be chosen. On a
  phone the dock shows the first three and "More", which opens the other three under them.
- **The trips are a panel of the same glass,** a row each, every row open. A row's boxes
  are joined in one white frame: "Trip" (Transfer or By the Hour, two radios), Pick-up,
  Drop-off, a hire's Duration (4, 8 or 12 hours) and When. A hire asks its drop-off only
  when "Drop off elsewhere", beside the Pick-up label, is ticked. (Tried and dropped on
  2026-11-14: one Trip list holding the hours, an always-shown optional drop-off, the tick
  alone in the Drop-off box, and Passengers inside the When picker.)
- **From 64rem of card (about a 1200px screen) a trip is one line,** every kind
  alike; narrower its boxes stand one under the other, as on a phone. When (200px) and
  Duration (124px) are as wide as what they show, so the places keep the room. (A
  two-line layout between the two was tried and dropped on 2026-11-14.)
- **Passengers starts at none,** so the customer gives the real number; "Search" with
  none says "Enter how many passengers are travelling." With one trip it is the row's
  last box, and the row ends with "Search".
- **"Add Another Trip" floats under the panel** (where the boxes stand one under the
  other it comes after the last trip, before Passengers and "Search") and adds an empty row straight away,
  whatever the others hold; nothing is saved along the way. From the second trip each row
  is numbered beside "Trip" and has a bin to remove it (at the row's end on a wide card,
  in its first box's corner on a phone), and Passengers moves down beside "Search": the
  group is asked once for the booking.
- **Checks happen on "Search":** every row is a trip, so an empty row says what it
  misses under itself as a half-typed one does, until it is filled or removed (before
  2026-11-14 an empty row was left out, and the search went on without it); and two trips that cannot share the vehicle say so as
  soon as both times are set.
- **Where no photo lies behind the glass** (the bar under the header, the booking steps)
  the panel brings the brand photo along, melted and tinted as the card's backdrop does,
  so it looks the same; a plain tint over a pale page only looked pale.
- **Once the card scrolls away a bar of the same glass follows the page** under the header
  ("Plan a Trip · Where and when", or the trips and days, and the passengers). Its sheet
  holds the same rows over the same trips, so what is typed in one is in the other.
  Adding or removing a trip in the sheet keeps it open: the page is held where it was
  while the card above grows or shrinks.
- **On a phone the hero photo runs behind the whole card,** which stands tall there; the
  glass needs the photo under it.
- **The trips and the group live in `SearchProvider`,** so on a location's pages they stay
  while the customer moves between them, and a place's "Take Me Here" fills the last
  trip's drop-off.

### The vehicle page (`/booking/transportation/[category]`)

- **"Your Trips" at the top are the search card's rows** (since 2026-11-14,
  `PlanTrips` over `TripSearchPanel`), in the same glass, on the vehicle, add-ons and
  confirm steps alike. On the add-ons and confirm steps "Search" goes back to the vehicle
  page, where the new prices and the vehicle are seen again. Every trip is open to change; "Search" checks them and prices
  the plan again with them and the group, with a toast. Why a trip cannot be priced
  shows under its row. This replaced the list of trips with a price each, the form that
  opened one at a time, Undo on removing, and the phone's folded line.
- **The same bar under the header** as the search card's once the trips scroll away, with
  the group, the vehicle and the total.
- **Vehicle cards like the location page's class cards,** three across: photo, name,
  blurb, models, seats and bags, and the late-night line.
- **Each card has its own button, "Continue · RM 950",** with the total for all the
  trips. Pressing it chooses that vehicle and goes to the confirm page: there is no
  selecting first. The vehicle chosen before is marked "Your choice".
- **A class too small for the group is not shown.** A line says which ("Not shown:
  Sedan, for fewer than 5"). No stock is kept, so a class is never "none free" on a day.
- **Passengers** is the search card's, beside "Search"; a group larger than any car gets the coach charter link.
- **Gone from the page:** the side "Your details" card, child seats, radios, and the list
  of trip prices inside each card (the list above shows them).

### The confirm page

- **The trips at the top in the search card's rows** (since 2026-11-14, as on the vehicle
  and add-ons steps); "Search" there goes back to the vehicle page. The list of trips
  with a price each is gone from the page.
- **Laid out as B under them:** the vehicle on the left, "Your details" on the right.
  The left side stays in view while the details scroll with the page, unless it is the
  taller side; nothing scrolls on its own.
- **On a phone the vehicle folds into one line** ("2 trips · 3 Nov to 6 Nov", the vehicle
  and the group under it) above the details, so the form comes first. It pins under the
  header as the page scrolls, opens as a sheet over the page and opens by itself when a
  trip turns red. Open, it shows the vehicle with one "Change Vehicle" button.
- **A trip that cannot be booked says so under its row:** it is too soon to book online,
  the vehicle is not offered for it, or it is at the same time as another trip or during
  a hire. A price changed since the trip was added is said under the vehicle.
- **"Your vehicle":** the class pictured at the vehicle cards' size, its blurb,
  passengers and "Change" (to the vehicle page). The models are not named (since
  2026-11-04: they were "Honda City, Nissan Almeera or Toyota Vios, or similar", with
  their photos). No model
  is chosen: any of them is sent, whichever is free on the day (see Future work).
- **"Your details":** name, phone, email, the flights when they apply, the note for the
  driver, then the page's one button, "Confirm booking · RM 950", with free cancellation
  per trip and pay nothing now under it, on a phone too. It waits while a trip is red,
  naming the trips to fix, and while the name, phone or email is empty, saying which to
  fill in.

### Tried and dropped (2026-10-27)

So nobody brings them back without a new reason:

- **Return as a trip type,** asking the day back in the same row. It added two linked
  trips, and a return chosen as one trip was hard to show as two.
- **Days on an hourly trip,** adding one trip a day. Each day still had to change on its
  own.
- **Lines and tags joining a return's two trips or a hire's days** in the list.
- **"Add the way back"** after a one-way trip.
- **Radios to select a vehicle before Continue,** and disabled cards for classes too
  small.
- **The total, the terms and the products coming later in "Your vehicle"** (review,
  2026-10-27). The total is on the button, the terms under it; hotel, tickets and a
  pasted itinerary marked Soon added nothing to the booking.
- **A second button on a phone** in a bar at the foot that only scrolled to the details,
  while the button under the form booked. Only one of them showed what was missing.
- **The one button in a bar at the foot of a phone's screen,** with the total (review,
  2026-10-27). It covered the form's last fields; the button sits under the details as
  on a wide screen.
- **The search card's trips folded into a line, and a trips bar on the confirm page**
  (review, 2026-10-27). The card keeps its list open; the confirm page's left side stays
  in view itself, and the details no longer scroll inside their own box.
- **The form always open with an "Add trip" button, and passengers as a tall box or a
  chip at the top of the card** (options A and B of the review's mock-up, 2026-10-27).
  The card is short once a trip is in, with "Add another trip", and passengers sits
  beside "Get prices".
- **The phone's fold opening in the page,** scrolling back up to where the line sits
  (review, 2026-10-27). Choosing a pinned line threw the customer back up the page, and
  the open trips stayed open while they scrolled on.
- **A one-way trip lasting an hour in the overlap rule.** It refused a trip at 11:00 after
  one at 10:30. Without a real drive time, only the same start time counts.
- **Editing and adding trips on the confirm page,** and two layouts for it (A: trips
  across the top).
- **Planning day by day** (a stay's days as cards).
- **The search card's "Your trips" list with Save trip and Cancel** (replaced 2026-11-13).
  A trip had to be complete before the next could start, and the white card with tabs
  gave way to the dock and the glass panel, a row per trip, every row open.

## What the code has today

Mapped on 2026-10-27.

- **One trip, carried in the URL.** The card (`ServiceTabsSearch`, `SearchProvider`,
  `_lib/useSearch.ts`) sends the `TRIP_PARAM` search params to
  `/booking/transportation/{category}`: `mode`, `pickup`, `dropoff`, `date`, `time`,
  `hours`, `passengers`, `class`, `model`, `childSeats`, `flight` and `notes`.
  `parseTripSearch` reads them back.
- **Pricing is server-rendered from the URL.** The options page runs `resolveTrip`
  (`@repo/places`) then `quoteTrip` (`packages/db/src/transportation.ts`). There is no web
  server action for prices. "Update prices" in `TripBar` reloads the page with a new URL.
  The console's `quoteTripAction` is a pattern to follow.
- **Booking creates one item.** `createTripBookingAction` (confirm `actions.ts`) runs the
  honeypot, `parseContact`, `isBookingRateLimited`, `resolveTrip`, `prepareTripItem`, then
  `createBooking(actor, { items: [prepared.item] })`.
- **Already ready for several items:**
  - `createBooking` takes a list of items.
  - `BookingDetail` (customer pages) and the console's `BookingScreen` loop the items.
  - The booking emails' `itemBlocks` list every item.
  - Item actions (`advanceItem`, `cancelItem`, `overrideItemPrice`, `amendItem`) work
    item by item.
  - The console's manual booking action reads `itemN.*` fields through `tripItemField`,
    `tripItemIndexes` and `tripItemParams` in `trip-input.ts`. The website can use the
    same format.
  - Since 2026-10-29 the console's New booking has the same trip list ("Add another
    trip"), with the same rules from `packages/db/src/trip-plan.ts` and
    `maxTripsPerBooking`: one vehicle for every trip, no two trips at once, at most 20.
  - Since 2026-11-04 (user) each trip of the console's New booking is a step with its own
    category, vehicle, group, flight, child seats, note and tour guide. "Same vehicle for
    every trip", on to start with, keeps the old rules: trip 1 chooses the vehicle for
    them all, every trip takes its category, no two trips at once. Off, each trip chooses
    its own, a car and a coach in one booking, at the same time if need be; Assign still
    keeps one vehicle or driver from two jobs at once. The website keeps one vehicle for
    every trip. The full list of rules on both sides is in the docs repo,
    `plan/261104-booking-rules.md`.
- **Still written for one trip:**
  - The received page says "the trip".
  - The account list shows one "Pick-up" time.
  - The emails' `headline()` uses the first trip, and the confirmed email names one
    pick-up time.
- **Customers cancel the whole booking only.** `cancelBookingAsCustomer` and
  `checkCustomerCancel` use the earliest live item's deadline. The example promises
  "cancel any trip on its own": see the open questions.
- **A trip is priced by its pickup's location.** One class for every trip means the class
  must be offered at every trip's location (a KL trip and a Langkawi trip in one booking),
  and meet its own rules on every trip.
- **No stock is kept.** `classAvailability` (`booking-rules.ts`) checks only the class's
  notice time and minimum hours, and the grid says whether it has a price for the route.
  Nothing counts vehicles, so a class is never "none free" on a day.
- **No draft, cart or basket table.**

## How it is built

### Where the trips live before booking

A list of trips does not fit a URL. Keep it in the browser (local storage), each trip with
its quote, the chosen class and the passengers. Sign-in returns to the same browser, so
nothing is lost. Storage is written a moment after a change rests, or as the page is left
or hidden, so typing in the confirm step stays quick (`docs/261106-interaction-speed.md`).
A table on the server is needed only if a list must follow the customer
to another device; not now.

### Pricing

- **One server action prices a list:** `quoteTripsAction(category, trips)`. It reads the
  locations, zones and offerings once, resolves each trip's places and route, and returns
  for each trip: the price in every class with its availability, the distance, the
  location and the moment it was quoted. Choosing a class or changing passengers needs no
  request.
- **"Get prices" prices every trip in one request.** After that, see "Pricing a growing
  list" under Future work.
- **Booking checks every trip again.** A new `createTripsBookingAction` reads the trips
  as `itemN.*` fields, re-prepares each with `prepareTripItem`, checks the overlap rule and
  the one class across them, and creates the booking with all its items. A price that
  changed since it was shown stops the booking and says "Now RM X, up from RM Y".
- **The rate limit stays per booking** (3 per email a day, 10 per address an hour).

### Pieces to share

The example's planner (`_example/search/Planner.tsx`) is the model for one shared
component: the trip list (`TripTimeline`, which the confirm page shows without editing),
the form (`TripForm`), and the vehicle page's panel with its sticky bar and sheet
(`TripsPanel`). Its rules (`_example/search/rules.ts`, and `clashOf` in
`_example/store.ts`) move into `packages/db` as pure functions with tests, next to
`booking-rules.ts`, so the booking action checks the same rules the screen does.

Build these in the real codebase, beside the live search card and booking pages, on
real prices and the real trip parameters. Take what helps from the example's code, but
nothing imports from it: it runs on sample classes and prices and on session storage, and
it is deleted at the end.

### Build order

One PR from `feat/multi-item-booking`, a commit or more per step, each step keeping the
site working. The example is added and deleted inside the branch, so the squash-merged
PR brings main the real flow and this plan, never the example.

1. **Rules and quotes** (`packages/db`): the overlap rule, "one class for all the trips"
   (offered at every location, meets its rules on every trip, seats the group), and a
   quote of many trips that shares its database reads. Tests next to the source. Rename
   the "By the hour" label to "Hourly".
2. **The vehicle and confirm pages take a list of trips** (today's one-trip URL still
   works as a list of one): the shared planner, the trips panel with its bar and sheet,
   the vehicle cards with their own Continue, the read-only list and "Edit trips" on the
   confirm page, the details form with the flights and the note, and the booking action
   with several items.
3. **The search card** on the home and location pages: the two radios, "Add trip", the
   list, passengers. The location pages keep their place presets and "Take me here".
4. **After booking:**
   - The received page and the account list for several trips.
   - The email headline and copy.
   - Per-trip cancellation by the customer, if chosen (see the open questions).
5. **Remove the example:** delete `apps/web/app/(site)/booking-example` entirely, once
   the real flow does everything it shows. Check nothing else refers to it.
6. **Docs:** mark Step 11 of docs/260930-admin-teams-and-access.md as superseded, and
   add "As built" here, saying the example was removed.

## Answered questions (2026-10-27)

1. **Choosing a model:** on the confirm page, once for the booking, under "Your
   vehicle". Offered when every trip's location lets the customer choose and has that
   model; each trip is charged its own location's fee on its own fare. Built, then
   hidden in the review of 2026-10-27 to keep the page simple: see Future work.
2. **Cancelling one trip:** yes. Each trip cancels on its own until its own cutoff;
   "Cancel booking" keeps today's rule (the earliest live trip's deadline).
3. **A class that fails one trip on its own rules:** hidden, like a class too small,
   with the line saying why ("Not shown: Premium MPV, which needs 24 hours notice for
   trip 1 (Tue, 3 Nov)").
4. **A trip that cannot be priced** (outside our areas, no grid price, too far): it says
   why under it in the list, and the vehicles and the booking wait until it is changed
   or removed. "A trip we quote by email" and "a driver's night away" from the example
   need concepts the system does not have (an item without a price, an overnight
   charge), so they moved to Future work.

## Future work

- **Pricing a growing list** (raised by the user on 2026-10-27, to discuss and decide).
  With four trips priced, adding a fifth should not price the four again.
  - **What a request costs:** the database reads per request are a fixed handful whether
    it prices one trip or five. The cost that grows is Google: every one-way trip needs a
    paid route lookup. Pricing all five again repeats four lookups already made.
  - **Proposal: price only the new or changed trip.**
    - Each trip keeps its quote: the price in every class, the distance, the location,
      when it was quoted.
    - Adding or changing a trip sends that trip alone.
    - A new date or time only moves surcharges such as late night or weekend, so the
      stored distance is reused with no Google call.
    - Removing a trip, choosing a class or changing passengers sends nothing.
  - **Keeping prices honest:** booking re-prices every trip anyway from the stored
    distances (database only) and stops if a price changed. A confirm page opened on old
    quotes (say over 30 minutes) re-prices them all once the same way.
  - **To decide:** whether this is worth it over pricing the whole list each time, how
    long a quote stays good, and whether route lookups should be cached by place pair
    across customers.
- **Choosing a model** (hidden on 2026-10-27, user's call). The website books any model
  of the class, whichever is free on the day, and no longer names the models (2026-11-04).
  Everything under it stays: the schema, the model charge in pricing, `itemN.model` in
  the booking action and the console's choice. To bring it back, restore from git what
  the hiding removed: `ModelChoice.tsx` (the confirm page's panel), `PhotoCarousel.tsx`,
  `bookingModelChoices` in `packages/db/src/trip-plan.ts` with its tests, the plan's
  `modelId`, and the quote's `modelChoiceSen`, `modelChoicePercent` and `modelIds`. Its
  tiles showed the vehicles' photos, which the website no longer reads (2026-11-04).
- **A trip we quote by email.** Book the priced trips and send an unpriced one to the
  team to quote. Needs an item without a price (`BookingItem.priceTotalSen` is
  required today) and console work to price it later.
- **A driver's night away.** A trip far from the driver's base adds the driver's
  room and meals. Needs an overnight charge on the rates and on the receipt.
- **Several products in one order:** a coach day inside a car booking, tickets, a hotel.
  One order holding several bookings, one per vehicle, paid together; overlaps checked per
  vehicle. It changes the one-vehicle rule, so it is its own step after this.

## As built (2026-10-27)

One PR from `feat/multi-item-booking`, a commit or more per step, in the build order
above.

- **Rules** (`packages/db/src/trip-plan.ts`, tested): `tripClashes` (same start, or
  starting during an hourly hire), `classFit` and `classFitNote` (one class for every
  trip), `isAirportPlace` and `flightOfTrip` (which flight goes on which trip, by the place's name or
  address). `BOOKING_RULES.maxTripsPerBooking` is 20. "By the hour" is "Hourly".
- **Quotes:** `quoteTrips` and `prepareTripItems` read the locations once and each
  location's offerings once for a list; `quoteTrip` and `prepareTripItem` go through
  them, so the console prices exactly as before.
- **The plan in the browser:** `apps/web/app/_lib/trip-plan.ts` (pure) and
  `trip-plan-store.ts` (local storage, versioned): the trips by start, passengers, the
  class, the flights and note, and the last pricing keyed by each trip's
  search, so a changed trip has no quote.
- **Pricing:** `quoteTripsAction` prices the whole list in one request. The vehicle
  and confirm pages ask it when a trip has no quote or the quotes are older than 15
  minutes (`QUOTE_TTL_MS`); removing a trip sends nothing. A trip priced again keeps
  each class's old price where it changed, and the confirm page says "Now RM X, up
  from RM Y when you added it". "Pricing a growing list" below stays to decide.
- **Booking:** `createTripsBookingAction` reads the trips as `itemN.*` fields with the
  price each showed, prices every trip again, refuses a clash, puts the arriving
  flight on each pick-up at an airport and the departing one on each drop-off at one,
  copies the note onto every trip, and stops with "now RM X, up from RM Y" when a
  price changed. The page then prices the trips again. On success the plan empties.
- **Pages (since 2026-11-14):** the search card (`app/_components/search/SearchCard.tsx`)
  and the vehicle page share `TripSearchPanel`: the rows (`TripRows`, held by
  `useTripRows`), "Add Another Trip", passengers and "Search", and the bar under the
  header. The class cards (`app/_components/ClassCard.tsx`) are shared with the location
  pages; the confirm page is layout B, its one button under the details. `TripsBar.tsx`
  holds the folded line (`TripsBar`), the phone's fold that pins under the header and
  opens a sheet over the page (`TripsFold`, on the confirm page), the bar under the
  header once the trips scroll away (`UnderHeader`), and `useFoldOnScroll`, which folds
  an open sheet once
  the page scrolls unless the customer is typing. Today's one-trip links still open the vehicle and confirm pages as a
  list of one; the address is cleaned with the browser's history,
  because a server action in flight drops a router navigation.
- **After booking:** `cancelTripAsCustomer` and the "customer-cancelled-trip" event and
  email; trips numbered with their status on the booking pages; each trip with its
  pick-up time under My bookings; the received page and emails worded for several.
- **Also:** the site pages got the toaster, and every customer save ends with a toast.
- **The example** at `/booking-example` was deleted in the branch's last code commit.

Not checked in the browser, because they write to the development database: making
a booking, and cancelling one trip of it. Both are typechecked, and the rules under
them are unit-tested.
