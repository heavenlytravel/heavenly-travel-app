# Class types and tiers, the booking flow, Assign, Connect, documents and the blog

Decided with the developer on 2026-11-11 from the team's to-do list of the same day. One pull
request, built in the order of its parts: A, B, D, E, F, then C. Parts B and D read part A's
types; nothing else depends on another part.

| Part | What                                           | Schema                                      |
| ---- | ---------------------------------------------- | ------------------------------------------- |
| A    | Class types and tiers                          | Two tables, two columns on `VehicleClass`   |
| B    | The website's booking flow                     | None                                        |
| D    | Assign                                         | None (stops writing `TripPart.classReason`) |
| E    | Connect                                        | None                                        |
| F    | Quotation numbers, Pay later at creation, PDFs | None (`Booking.quoteNumber` is used again)  |
| C    | The blog moves to `/blog`                      | A blog table of its own                     |

## A. Class types and tiers

### Decisions

1. **A class is a tier of a type.** A type is what the vehicle is (Sedan, SUV, MPV, Van,
   Coach, Truck); a tier is its level (Standard, Deluxe, Executive, VIP Seating, VIP, 44
   Seater Standard). Each is a list Operation adds to from the class form, as the vehicle
   form adds brands and models: a combobox listing the ones there are, with "Create".
   One tier list for every type.
2. **A tier is optional.** A class without one is its type alone ("Truck").
3. **The name and the slug are made from them**, tier first: "Deluxe - Sedan",
   `deluxe-sedan`. Neither is typed any more. The slug is unique, so a second class of the
   same tier and type is refused, at the tier field. Changing a class's type or tier
   renames it and its slug; a class page of the location's site follows the slug.
4. **Bookings keep their snapshot of the name** (`TripItemDetails`), so a renamed class
   never changes a booking. Rates, offerings, vehicles, models and drivers point at the
   class's id and are untouched.
5. **The order is set with arrows**, as a location's classes are: the catalogue's cards
   get the same up and down arrows, renumbering `VehicleClass.sortOrder` 1…n. The number
   field on the class form goes. The move logic is shared with the offerings'.
6. **A type or tier no class uses is deleted** when its last class leaves it, as a model
   is, so a typo leaves nothing behind.

### Production's classes (read 2026-11-11)

| Today               | Type  | Tier               | Becomes                    | Slug                       |
| ------------------- | ----- | ------------------ | -------------------------- | -------------------------- |
| Standard- Sedan     | Sedan | Standard           | Standard - Sedan           | `standard-sedan`           |
| Deluxe- Sedan       | Sedan | Deluxe             | Deluxe - Sedan             | `deluxe-sedan`             |
| Standard- Suv       | SUV   | Standard           | Standard - SUV             | `standard-suv`             |
| Standard- Mpv       | MPV   | Standard           | Standard - MPV             | `standard-mpv`             |
| Deluxe- Mpv         | MPV   | Deluxe             | Deluxe - MPV               | `deluxe-mpv`               |
| Executive- Mpv      | MPV   | Executive          | Executive - MPV            | `executive-mpv`            |
| Standard- Van       | Van   | Standard           | Standard - Van             | `standard-van`             |
| VIP Seating- Van    | Van   | VIP Seating        | VIP Seating - Van          | `vip-seating-van`          |
| Coach 44 Seater     | Coach | 44 Seater Standard | 44 Seater Standard - Coach | `44-seater-standard-coach` |
| Coach VIP (off)     | Coach | VIP                | VIP - Coach                | `vip-coach`                |
| Luggage Truck (off) | Truck | none               | Truck                      | `truck`                    |

The developer confirms the Van and Coach rows before the production run; the mapping is a
list at the top of the script. Production had no class pages (`LocationPage` rows of a
class) on that day, so no page address changes.

### Schema

```prisma
model VehicleType {
  id      String         @id @default(cuid())
  name    String         @unique   // "Sedan"
  classes VehicleClass[]
}

model VehicleTier {
  id      String         @id @default(cuid())
  name    String         @unique   // "Deluxe"
  classes VehicleClass[]
}

model VehicleClass {
  // added, optional until every class has a type:
  typeId String?
  tierId String?
}
```

Both columns are optional so the code live on `main` keeps working after the push. A later
schema change makes `typeId` required, once production's classes all have one.

### The script

`db:set-class-types` (and `:prod`, protected): for each class in its mapping, by id-stable
slug, finds or creates the type and tier, sets them, the name and the slug, and renumbers
`sortOrder` in the current order. It touches no other column and no other table. Run on dev
first, then rehearsed on a copy of production. `class-list.ts` (the seed) gains each class's
type and tier.

## B. The website's booking flow

1. **One-way is Transfer, Hourly is By the hour,** everywhere: the website, Manage, Connect
   and the emails (`ITEM_KIND_LABELS` and the words written out elsewhere).
2. **Four steps:** search, then the vehicle, then add-ons, then details and confirmation.
   The add-ons leave the confirm page for a page of their own,
   `/booking/transportation/[category]/add-ons`. A booking with no add-on to offer (no tour
   guide at its location, no extras) skips the step both ways.
3. **Filter chips on the vehicle step,** one per type among the classes shown ("Sedan",
   "MPV", "Van") with "All" first; a chip shows that type's tiers. One type alone shows no
   chips.
4. **Each vehicle card shows its price** for all the trips, and its button is **Book now**.
   Every step's button reads Book now: the vehicle step's and the add-ons' lead on, the
   details step's makes the booking.

## D. Assign

1. **Same vendor for vehicle and driver.** A tick on a trip's vehicle and driver: one vendor
   picked, one offer of both parts, and **one amount for both**, kept on the vehicle part
   (`costSen`), the driver part at 0. The vendor's payout reads "Vehicle and driver".
2. **Apply to all trips.** A tick that names the same vehicle, driver or vendor on every
   open trip of the booking. Each trip keeps its own amount and is paid and due on its own.
   Each trip is checked for clashes on its own; one of another class, or clashing, is
   skipped and named.
3. **Individual vendors.** The vendor list on Assign is grouped by what each supplies:
   Vehicle and driver, Driver only, Vehicle only, Tour guide. Picking an individual whose
   only driver (or vehicle) is one fills it in. See E for their registration.
4. **Vehicles of the class booked by default.** "Assign others" lists every vehicle,
   other classes included. Choosing another class needs no reason and says nothing about
   it ("MPV instead of Sedan" goes, on the trip page and in the log line);
   `TripPart.classReason` is no longer written, and dropped at the next schema change.
5. **When: Upcoming, Past, All.** Assign lists trips from today by default, as now; Past
   lists the ones before, newest first.
6. **Urgency:** within 24 hours of pickup is red, within 48 hours yellow.

## E. Connect

1. **Two reports: Arrived, then Dropped off.** On the way and Passenger on board go from
   the screen (the kinds stay valid, so old taps still read). Waiting is no longer measured.
   "Report a problem" goes from the screen and stays in the schema.
2. **No-show** shows only after Arrived and once the pickup time has passed, and needs a
   reason (the tap's note). It completes the trip; the vendor is paid; the customer is
   charged in full, and Operation refunds by hand if it decides to.
3. **Add buttons follow the vendor's one service,** as now: a vendor that does not supply a
   part neither adds it nor sees its tab, unless it already has some from before, which it
   sees but cannot add to. Manage's vendor page follows the same rule.
4. **A vendor edits its own profile:** name, kind, registration, contact, address, bank
   and locations, everything but its services and status, which the Manage team changes.
   Logged like staff edits.
5. **A driver edits their own profile:** name, phone, photo, licence and its expiry, bank.
6. **An individual registers without company fields:** no SSM or contact person, their
   own name and phone, IC optional. One who supplies a driver gets their own driver record
   from their profile when approved.

## F. Quotation numbers, Pay later, PDFs

1. **A received booking is a quotation, HTQ-0001,** from its own counter (`quote`). It
   takes its HTB number when confirmed, from the booking counter, and keeps the HTQ.
   `Booking.number` stays empty until then and `quoteNumber` (marked old) is used again.
   `/booking/HTQ-0001` and Manage's page by HTQ open it, and redirect to the HTB once it
   has one. A booking cancelled while received only ever has the HTQ. An admin booking,
   confirmed at once, takes HTB straight away. Production had no received booking on
   2026-11-11, so no booking is renumbered. The corporate quotation form will use the same
   path.
2. **Pay later at creation:** the New booking form has the same Pay later, with its day,
   as the booking page; the booking page's control stays for bookings already made.
3. **PDFs, Manage only:** one PDF module (`@react-pdf/renderer`, server side). A booking's
   PDF once confirmed or completed (trips, pickups, vehicle, driver once assigned, price);
   an invoice's or credit note's once issued, stamped Paid or Void when it is. Customers do
   not get them yet.

## C. The blog

1. **A post belongs to the site, not a location:** `/blog/[slug]`, tagged with any number of
   locations. `/[location]/blog/[slug]` goes (production had no posts on 2026-11-11, so
   nothing redirects).
2. **`/blog` is the blog's home:** the highlighted posts first, picked and ordered by
   Marketing as top-choice destinations are, then the 4–5 newest, then "View all"
   (`/blog/all`, every post, newest first).
3. **`/[location]/blog`** lists the posts tagged with the location, each opening `/blog/[slug]`.
4. Marketing writes posts under Website, Blog, with the same editor; the location's Pages
   keep the blog's own page (its title and text) only.

## Production order

1. `pnpm db:push:prod` (additive: two tables, two optional columns, the blog's tables).
2. `db:set-class-types:prod`, after confirming the Van and Coach rows.
3. Merge.
4. After the deploy, the next schema change drops `TripPart.classReason`,
   `VehicleClass.imageUrl` and makes `VehicleClass.typeId` required.

## As built (part C)

**Schema** (additive): a `BlogPost` table (`slug` unique, `isOn`, `draft`, `published`,
`publishedAt`, `firstPublishedAt`, `highlightOrder` nullable, `createdAt`, `updatedAt`) and
the implicit join table `_BlogPostToLocation` for its location tags (`Location.blogPosts`).
A post's content is a page of the `article` kind, read and checked by `page-content.ts` as
before. Tags and highlights are saved apart from the content and leave `updatedAt`, so an
open editor saves on.

**Rules** (`packages/db/src/blog-input.ts`, pure): the addresses, `checkBlogPostSlug` (a
page's slug, but never `all`), `blogHomeOf` (highlights in order, then the 4 newest), at
most 3 highlights. Adding, removing and moving a highlight is `pickedAfter` in
`list-move.ts`, which the home page's top choices now use too. The title check of a page
added on demand (`checkEntryTitle`, `entryTitleOf`) moved to `location-page-input.ts` and
is shared. Readers and writers are in `blog-posts.ts`; Media counts a post's images as in
use, its past publishes too.

**A location's blog** keeps its own page (`page: "blog"`, slug `""`: title, summary, cover,
intro, FAQs) and takes no posts under it: `SECTIONS.blog.children` is `null`, so
`/[location]/blog/[slug]` is a 404 and the location's Pages offers no "Add post". The two
unpublished drafts under langkawi in development are left behind as rows nothing reads; the
developer can delete them.

**Website**: `/blog` (highlighted, then latest, then "View all"), `/blog/all`,
`/blog/[slug]` (title, summary, cover, Markdown, first published and "Updated" dates,
`Article` and breadcrumb structured data), `/preview/blog/[slug]` for staff with
`pages.manage`, with the preview bar. `/[location]/blog` and a location's main page list
the published posts tagged with it, each opening `/blog/[slug]`. All read under the `blog`
cache tag (`apps/web/app/_lib/blog.ts`). The article header is one component
(`_components/ArticleHeader.tsx`) for documents, a location's blog page and posts. "blog"
is a reserved location slug. There is no sitemap yet, so none changed.

**Manage**: Website, Blog (`/~/pages/blog`, `pages.manage`): "Add post", the highlighted
posts as cards with the arrows (`MoveButtons`) and Remove, then every post with its status,
locations and first publish. A post's editor is `/~/pages/blog/[id]`: the page editor, its
slug until the first publish, Delete, and a Locations card of ticks saved on its own. Its
publishes open at `/~/pages/blog/history/[entryId]`.

**Activity** (area Pages, logged against the post's id, entity type `blog-post`):
`blog.post.created`, `.published` (content before and after), `.updated` (an unpublish),
`.renamed`, `.deleted`, `.tagged` (location names before and after), `.highlighted`
(`highlightOrder` before and after, one entry per post whose place changed).

## As built (parts A, B, D, E, F)

Built 2026-11-11 in the working tree, not committed. What the build settled beyond the plan:

**A.** `vehicle-class-input.ts` has `classNameOf` / `classSlugOf`; the writers are in
`vehicle-classes.ts` (`createClassIn` is shared by the catalogue's Add class and a location's
new class), with `moveVehicleClass` and `listClassKinds`. The class form's Type and Tier are the
vehicle form's combobox, which gained a `none` row ("No tier"). The arrows are
`apps/manage/app/_components/MoveButtons.tsx`, shared with a location's classes; the move logic
is `movedRow` in `packages/db/src/list-move.ts`, shared with the offerings and pages. The class
list the seed reads (`prisma/class-list.ts`) is production's, as types and tiers.
`db:set-class-list` is deleted, as its doc asked once it had run everywhere. The one-off is
`db:set-class-types` (`scripts/set-class-types.ts`): it finds each class by the slug of the name
it has now, so development's slugs, which differ from production's, map too.

**B.** The vehicle cards carry their type (`ClassCard.type`). The add-on rules are one helper,
`plan-add-ons.ts` (`guideAddOnOf`), read by all three steps. The details step keeps the total on
its button: "Book now · RM 950". The renames are `TRIP_MODE_LABELS` and the words written
out in Manage and the emails. The Hourly Rates page keeps its name, as it names a rate grid.

**D.** The class reason is gone from Manage, Connect and the writers (`classChangeOf`,
`classChangeFor`, `ClassReasonField`, the amend notice on the part card). Old log entries still
read with it. Candidates carry `otherClass`. Vendors are grouped by `vendorGroupsOf`. A vendor
with one vehicle or driver of the class booked has it filled in. Urgency is `tripUrgencyOf`:
"urgent" under 24 hours, "near" under 48, and `NotAssignedBadge` takes it.

**E.** `TAPPED_EVENTS` (arrived, dropped off, no-show) is what the writer accepts now.
`noShowRefusal` is checked by the phone and by the writer, by the tap's own time.
`waitingMinutes` is gone. The fleet tabs follow `vendorShowsOf`, in Connect and on Manage's vendor
page. An individual is their own contact (`parseVendorFields`). `createOwnDriver` runs after
the team approves one. The owner's Business form is the staff form's fields
(`VendorDetailsFields`) without the services. The driver's own form is
`/~/account/driver/edit` (`parseDriverSelfFields`).

**F.** A booking made received takes its HTQ from the "quote" counter, and `refreshBooking`
gives the HTB on its first confirmation, before billing names it. `bookingRefOfPath` reads HTB
or HTQ on the website, and an HTQ link redirects to the HTB once there is one. Search finds
both. The New booking form's Pay later is saved with the booking (`payLaterDueOn`), not on a
credit agent's. The PDFs are `apps/manage/app/_pdf` on `@react-pdf/renderer` 4.9.0 (Manage only,
`serverExternalPackages`): `/[location]/bookings/[id]/pdf` and `/[location]/invoices/[id]/pdf`,
with the letterhead from the website footer (`getCompanyDetails`). Production had no "quote"
counter on 2026-11-11, so its first is HTQ-0001; development's continues from 203.

### After review (2026-11-11)

- Assign: the same-vendor tick sits above the cards and joins them into one "Vehicle and Driver"
  card (`AssignCards`). A vehicle reads plate, model and class. An individual reads "Individual ·
  name" and is filled in as the driver, without Any. The time reads in hours up to 48.
- Assign's day filter is read in the query, so an old day is always found.
- Manage's No-show waits by the same rule as Connect's (`noShowRefusal`).
- A type or tier typed in another case takes the spelling stored; both are added atomically.
- Pay later on a credit agent's new booking is refused at the field, not dropped.
- `db:set-billing` never numbers a quotation.
- The confirmation email names the request's HTQ beside its HTB.
- Long invoices run onto further pages; a PDF renders in about 30 ms, 0.5 s for 120 lines.
- Left as asked: vendors and drivers edit everything themselves but the services (and status),
  their bank and licence dates included.

### Second round (2026-11-12)

- **Assign's past.** The When filter is gone. The page reads the trips from today on, or one day
  picked, past or not: one query on `(status, startsAt)` either way, never a page of past
  trips. The pick-up date takes any day; a past one shows a "Past day" line with Back to
  upcoming. The Done tile reads "Done today" unless a day is picked. History beyond that is
  the Bookings list's. (A card of past days left open was built and taken out on review.)
- **Undo no-show.** `noShowUndoRefusal` and `undoNoShow` (driver-jobs). The driver, in
  Connect, within `NO_SHOW_UNDO_MINUTES` (60) of the no-show; Operation, on the booking and
  the trip page, at any time. Not after a Dropped off, never on a cancelled trip. The no-show's
  tap is deleted, so Dropped off can be reported. The trip the no-show completed is assigned
  or confirmed again by its parts, and the booking's status follows. An invoice the no-show
  issued stays: the price did not change and a number is never taken back. Logged as
  `booking.trip.no-show.undone` with the no-show's time and reason, so the history keeps it.
  Other options kept: an `undoneAt` on the event instead of a delete (every reader would
  need to skip it; schema change), or a reason asked on undo.
- **Agents' terms.** The agent list reads "Name · Monthly credit", "Name · Twice a month
  credit" or "Name · No credit" (`agentTermsLabel`). A credit agent ticks Pay later and
  locks it, with no date: its booking is Pay later on its period invoice already
  (`paysLater`). The writer still refuses a date sent for one.

### Third round (2026-11-12)

- **No-show** buttons are red, in Connect and Manage. After the reason, it asks once more
  ("Yes, report no-show") before it is sent.
- **On the road while it can be taken back.** A no-show completes the trip at once, but for
  the driver's `NO_SHOW_UNDO_MINUTES` after it Assign shows the trip On the road, as the driver
  is still at the pickup (`assignStateOf`'s `noShowOpen`), never overdue; then Done.
- **When it bills.** The no-show completes the trip when it is tapped, not after the hour: with
  no scheduler, a completion that waits would only happen when someone opened a page, and
  billing must not hang on that. When it is the booking's last trip, the booking completes and
  its invoice is issued at the tap; an undo leaves the invoice, as the price is the same. Kept
  option: complete after the hour through a Vercel cron (needs `CRON_SECRET` and a route),
  so the invoice waits for the hour.

### Production order for this branch

Before the merge, in this order. Both are `--protect`: rehearsed on a copy of production,
confirmed by typing, then production is backed up to a Neon branch.

1. `pnpm db:push:prod`. Additive only: `VehicleType`, `VehicleTier`, `VehicleClass.typeId` and
   `tierId` (optional), `BlogPost` and its location join table.
2. `pnpm --filter @repo/db db:set-class-types:prod -- --dry-run`: check each of the 11
   classes' type, tier and new name (Van: VIP Seating; Coach: 44 Seater Standard, VIP,
   Executive). Then the same without `--dry-run`.
3. Merge. Vercel deploys web, manage and connect.

Not needed on production (checked 2026-11-12): no backfill of drivers for individuals (its one
active individual has drivers), no "quote" counter (the first received booking makes it,
HTQ-0001), no blog data, no billing rerun (`db:set-billing` is not run again).

After the deploy, at the next schema change: drop `TripPart.classReason` and
`VehicleClass.imageUrl`, and make `VehicleClass.typeId` required.
