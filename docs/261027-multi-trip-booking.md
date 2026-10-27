# Multi-trip booking: one booking, many trips, one vehicle

Status: designed with the user from 2026-10-25 to 2026-10-27 in the clickable example at
`/booking-example` (branch `feat/multi-item-booking`, not committed). Simplified on
2026-10-27: no Return, no Days, no link lines; one Continue per vehicle; the confirm page
only shows the trips; trips clash only at the same time or during a hire. Not built yet.
The build starts in its own thread from this plan.

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

### The search card (home page and location pages)

- **The trip type is two radios with icons in the row's first box**, where the live card
  has its "Trip" list: One-way and Hourly.
- **"Add trip"** puts the trip in "Your trips" and empties the form for the next.
- **"Your trips" appears once a trip is added,** so one trip looks like today's card.
  The list runs by date, numbered as the trips are booked and priced.
- **Choosing a trip opens it in the form** ("Change trip 2"): Save changes, Cancel,
  Remove trip. A new trip half typed waits until the change is done.
- **Passengers** is a stepper beside the button. Today the live code asks it on the
  options page (`_lib/search.ts`); it moves to the card.
- **"Get prices"** sends the list with the form's trip when one is typed: "Get my price",
  or "Get prices · 4 trips".
- **Errors stay at the field:** what is missing, and a trip that starts during another,
  naming it and what to do.

### The vehicle page (`/booking/transportation/[category]`)

- **"Your trips" at the top,** the same list and form as the card, each trip with its
  price in the vehicle chosen before, if any. A trip changed or added here is priced in
  place, with a toast; removing one offers Undo. No "Change trips" back to the home page.
- **A sticky trips bar.** Once the list scrolls away, a thin bar slides in under the site
  header: "4 trips · 3 Nov to 6 Nov · MPV · RM 950 · Show". Choosing it opens the list in
  a sheet below it with a short animation. A trip is changed or added right there in the
  sheet, without scrolling back up. Only the list scrolls inside the sheet, and the form's
  place suggestions hang below it. This page alone has the bar.
- **Vehicle cards like the location page's class cards,** three across: photo, name,
  blurb, models, seats and bags, and the late-night line.
- **Each card has its own button, "Continue · RM 950",** with the total for all the
  trips. Pressing it chooses that vehicle and goes to the confirm page: there is no
  selecting first. The vehicle chosen before is marked "Your choice".
- **A class too small for the group is not shown.** A line says which ("Not shown:
  Sedan, for fewer than 5"). No stock is kept, so a class is never "none free" on a day.
- **Passengers** is a stepper beside the heading; a group larger than any car gets the
  coach charter link.
- **Gone from the page:** the side "Your details" card, child seats, radios, and the list
  of trip prices inside each card (the list above shows them).

### The confirm page

- **Laid out as B:** the trips and the vehicle on the left, "Your details" on the right.
  The details stay in view while the left side scrolls, and scroll on their own when
  taller than the screen.
- **The trips are shown, not changed.** The same list, priced, with no editing and no
  "Add a trip". One "Edit trips" link goes back to the vehicle page, where trips are
  changed or added, and the vehicle chosen again. No sticky bar on this page.
- **A trip that cannot be booked says so under it in the list:** it is too soon to book
  online, or it is at the same time as another trip or during a hire. So do a trip we
  quote by email, a driver's night away, and a price changed since the trip was added.
- **"Your vehicle":** the class, passengers, "Change" (to the vehicle page), the total,
  trips quoted by email, free cancellation per trip, pay nothing now, and the products
  coming later (hotel, tickets, a pasted itinerary) marked Soon.
- **"Your details":** name, phone, email, the flights when they apply, the note for the
  driver, and "Confirm booking · RM 950". It names the trips to fix when any is red.

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
- **A one-way trip lasting an hour in the overlap rule.** It refused a trip at 11:00 after
  one at 10:30. Without a real drive time, only the same start time counts.
- **Editing and adding trips on the confirm page,** and two layouts for it (A: trips
  across the top).
- **Planning day by day** (a stay's days as cards).

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
nothing is lost. A table on the server is needed only if a list must follow the customer
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

### Build order

Each step keeps the site working.

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
5. **Docs:** mark Step 11 of docs/260930-admin-teams-and-access.md as superseded, and
   add "As built" here.

## Open questions

1. **Choosing a model.** The live options page lets a customer pick a model of the class
   for a fee (`ModelChoice`). With Continue on each card, where does that choice go, and
   is it once for the booking?
2. **Cancelling one trip.** Today a customer cancels the whole booking. Should each trip
   cancel on its own, until its own cutoff, as the example's page says?
3. **A class that fails one trip on its own rules:** too little notice for that class,
   fewer hours than its minimum, or no price for that route on the grid. It cannot take
   the booking. Hide it like a class too small, with the line saying why ("Not shown:
   Premium MPV, which needs 24 hours notice for Tue 3 Nov"), or show it with the reason
   and its button disabled? The example has no such rules, so it shows neither.

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
- **Several products in one order:** a coach day inside a car booking, tickets, a hotel.
  One order holding several bookings, one per vehicle, paid together; overlaps checked per
  vehicle. It changes the one-vehicle rule, so it is its own step after this.

## The example

`/booking-example` (not linked from the site, nothing saved) walks every step with sample
classes and prices. Files under `apps/web/app/(site)/booking-example/`:

- **`_example/situations.ts`:** every situation it opens on, listed at `/booking-example`.
  - One trip, there and back, a stay with hires between, the same hire every day, a
    different trip each day, across the country.
  - Too soon to book, a trip we quote, a price changed.
  - A visitor's booking, a booking halfway through.
  - What is not allowed: a different vehicle on some trips, two vehicles for one group,
    two trips at the same time.
- **`_example/SearchStep.tsx`, `search/SearchCard.tsx`, `search/Planner.tsx`,
  `search/parts.tsx`, `search/rules.ts`:** the card and the planner.
- **`_example/VehicleStep.tsx`, `_example/ConfirmStep.tsx`:** steps 2 and 3.
- **`_example/ReceivedStep.tsx`, `_example/BookingStep.tsx`:** after booking, each trip
  one item.
- **`_example/store.ts`:** the state in session storage, the trips and `clashOf`.
