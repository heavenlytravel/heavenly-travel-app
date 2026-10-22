# A location's daily work, and the class catalogue

Decided on 2026-10-18, after the first week of `261015-locations-as-operation-areas.md`
in use. This document wins over that one where they differ: "Vehicle classes: one
catalogue", "Who may do what" (the panel and the overview) and "Setting a location up"
(what the panel shows once a location is live). The work is built in one thread on
`feat/admin-location-workflow`.

## Why

A location holds three kinds of work. Its name, slug and states are set once. Its
classes, zones and rates are set up before it goes live and change rarely after. Its
bookings are worked every day. The panel listed all of them the same way, so a live
location's daily work sat among the one-time setup, and a booking opened from the
location left it for `/bookings/[id]`, with no panel and the way back to the queue
across locations.

The class catalogue held the three booking rules, so Langkawi and Penang shared one
notice period for a Sedan, though their fleets and their roads differ. With the rates
and the rules both on the location, the catalogue screen read as a table with nothing
to do; it is what each class is, and it needs a picture.

## Decisions

### The panel by daily work and setup

- A draft is all setup. Its overview stands alone on top, then the Setup group: how far
  it has come ("2 of 4 done"), a bar, what to do next, and the steps, numbered, with
  Rates among them unnumbered. A draft has no Bookings tab: it takes no bookings
  (`locationAt` skips drafts).
- A live or paused location puts the day first. The Work group holds the overview,
  named Today, then Bookings and Pages; Pages is Marketing's regular work, a setup
  step only while a draft. The Setup group (Details, Vehicle classes, Coverage, Rates,
  Status) is folded under its heading, which names what it holds; it opens by hand or
  by itself on one of its tabs, and stays as the admin left it while they move around.
- Revised on 2026-10-20: the location's header is its name alone. The state badge and
  "Pause" level with it on every tab read as if they paused the tab's own record. The
  panel keeps the badge, and a Status tab ends the Setup group: what the state means,
  what still stands in the way of going live, Go live, Pause or Resume for SUPER, and
  Delete location, moved from Details. Every admin reads it.
- History is at the panel's foot, beside the public page.
- The About section goes. Its facts are on their tabs: the states on Details, the top
  choice on Home page, the last change on History.
- Revised on 2026-10-20: the saved addresses are on the Pages tab, under the pages,
  still Marketing's. They are what the pages offer: the search card's drop-offs before
  anything is typed, and the highlights' "Take me here". They are shortcuts only: the
  drop-off rule on Rates judges a trip by zones, and a price for a particular place is
  a route on the rate grid.
- The strip of tabs on narrow screens follows the same order and names, from
  `locationTabsFor(state)` in `apps/admin/app/_lib/routes.ts`, which the panel reads
  too.

### The overview

- A draft's overview is its setup checklist alone; the panel has the rest.
- A live location's Today is the queue: its numbers, today's pick-ups and the bookings
  awaiting confirmation. "At a glance" is left for a team that does not work the queue,
  such as Marketing, whose Today would otherwise be empty.

### A booking inside its location

- `/locations/[slug]/bookings/[id]` and `/locations/[slug]/bookings/[id]/amend/[itemId]`
  show the booking under the location's header with its panel beside it, Bookings
  marked. The way back is the location's bookings, and an amend goes back to the
  booking inside the location.
- A location's lists (its overview and its Bookings tab) open bookings there.
  `/bookings/[id]` stays for the queue across locations, the emails and the activity
  log. Both render one screen, `bookingScreen` in `bookings/[id]/BookingScreen.tsx`.
- A booking with no item picking up in that location goes to `/bookings/[id]`.
- Not a drawer over the list: the panel holds the right side, a booking has too many
  controls, notes and history for one, and a drawer has no address to share.

### The rules per location and class

- The notice, the cancellation cutoff and the minimum hours move from `VehicleClass` to
  the offering (`LocationVehicleClass`), next to the rates. Langkawi's Sedan and
  Penang's Sedan may differ in both.
- A class a location starts selling starts with its category's usual rules
  (`CATEGORY_RULE_DEFAULTS`), and starts again from them when its category changes on
  the "Add class" form.
- A booking item keeps the cancellation cutoff it was made with, as before, so a
  change to the rules never moves an existing booking. An amend still prices the trip
  again with the rules of the day, cutoff included: see Future work.
- The quote and the options page read the rules from the offering.

### The catalogue: what each class is

- A catalogue class is what the vehicle is: name, description, category, seats,
  luggage, picture and order. One Sedan for every location, so the customer sees the
  same name and picture wherever they book, and the fleet (OP2) will point at it.
- `/vehicle-classes` shows a card per class, as a location's tab does: its picture, its
  seats and luggage, its line, and where it is sold, each location a link to it on
  Rates, greyed where the class is off sale.
- A class has one picture, `VehicleClass.imageUrl`, a file on UploadThing through
  `/api/uploads/vehicle-class-image` (`coverage.manage`). It shows on the customer
  site's options page and on each location's product page, in a frame that keeps the
  whole vehicle in view; when any class in the list has a picture, every card gets the
  frame, so the list lines up. Its alt text is empty: the class's name is beside it.

### Operations across locations

- The sidebar's Operations group holds the views across locations: Bookings, Vehicle
  classes, Coverage and Rates. Each is read there and changed inside its location.
- **Coverage** (`/coverage`): every zone on one map, each location in its colour, and
  the zones listed by location with how each was made and its priced routes. Narrowed
  to one location by the filter, each zone has its own colour, as the location's tab
  draws them. A zone opens its editor for Operation and its location's tab for the
  teams that read.
- **Rates** (`/rates`): per location, its classes at their metered rates, the charge
  to choose a model and the rules, its rate grid (read only), its drop-off rule and its
  odd-hours surcharge.
- **Vehicle classes**: each card lists the locations that sell the class with its base
  fare, per km and per hour at each, a link to that location on Rates.
- `listCoverage` loads every location's zones, with their shapes, and grid for
  Coverage, and `listPriceLists` the zones by name, grid and offerings for Rates, each
  in a single query. The location filter is the queue's, shared.

### The manual booking in steps

- `/bookings/new` is four steps on one page: the customer, the trip, the vehicle and
  the details (optional). One step is open at a time; a finished one folds to a line
  with "Edit", so a change mid-call is one click away and nothing entered is lost.
- The trip is priced by itself once it is complete; "Get prices" is gone. A changed
  trip keeps the chosen class when the new prices still offer it.
- The passengers sit with the vehicles, so the classes that do not fit grey out.
- A summary beside the steps keeps what was entered, the price and the button in view.
  The agreed price is there, under the total: the amount and a reason, one of the usual
  ones or typed. The quote stays on the receipt.
- One vehicle per booking for now: "Add another vehicle" is gone from the form. The
  create action and the booking screens still handle several items.
- The amend page uses the same steps, folded, with the category fixed.
- The steps' inputs have no names; `ItemHiddenFields` posts the item under the
  website's parameter names, so the server parses and prices it as before.

### Naming

"Vehicle classes" stays. A class is the type sold (Sedan, MPV, 44-seat coach). "Fleet"
is kept for OP2: the vehicles themselves, with a plate, a model, an owner (Heavenly or a
vendor) and their papers, each of one class. When OP2 lands, a location's Vehicle classes
tab may become Fleet, holding the classes on sale and the vehicles based there.

## Data model

```
VehicleClass
  + imageUrl                 String?   its picture on UploadThing
    minLeadHours, cancellationCutoffHours, minHourlyHours
                             no longer read; @default(0); dropped in a follow-up

LocationVehicleClass
  + minLeadHours             Int @default(0)
  + cancellationCutoffHours  Int @default(0)
  + minHourlyHours           Int @default(0)
```

The defaults are for the push only. In each database, in this order:

1. `pnpm db:push` (development), `pnpm db:push:prod` (production).
2. `pnpm --filter @repo/db db:migrate-offering-rules` (and `:prod`): each offering takes
   its class's three rules. An offering not copied yet holds 0 minimum hours, which no
   saved offering can, so running it again changes nothing.
3. Deploy the code.

## Future work

- Drop the rule columns of `VehicleClass` once the copy has run on every database, with
  the columns BL-58 drops.
- Rules for an amend, so a booking stays the receipt of what was bought. Today an amend
  prices the whole trip again with the rules of the day: today's rates, cutoff and
  notice, the class only if still on sale, and the model only if still choosable (the
  amend screen warns when it drops one). The proposal agreed in review: a change to
  the details alone (passengers, child seats, flight, notes) prices nothing again and
  keeps the receipt, and works up to the pickup; a change to the trip prices it again
  with today's rates for the class booked, keeps the model at its booked charge and the
  cancellation hours booked, and shows the old and new totals before saving. Open: warn
  or refuse a trip moved inside the notice, and whether a class off sale since the
  booking is still priced with its rates.
