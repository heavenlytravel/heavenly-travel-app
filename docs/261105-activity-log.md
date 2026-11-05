# The activity log: everything it writes

Date: 2026-11-05. Branch: `feat/manage-ui-checks`.

This is an inventory, not a plan. It lists every action the app writes to
`ActivityLog`, what each one stores, who causes it, and where it shows. Use it
to decide how the Activity screen and each record's History should look.

All example values are invented. They match the keys the code writes.

Sources: `packages/db/src/activity-actions.ts` (actions and sentences),
`packages/db/src/activity-areas.ts` (areas), `packages/db/src/activity.ts`
(writing and reading), every `logActivity(` call in `packages/db/src` and
`packages/db/scripts`, and the manage screens listed in section 1.5.

---

## 1. How the log works

### 1.1 One entry

One row in `ActivityLog` (`packages/db/prisma/schema.prisma`, `model ActivityLog`):

| Column | What it holds |
| --- | --- |
| `id`, `createdAt` | The entry and its time. Entries from one transaction share a time; `id` keeps their order. |
| `actorId` | The user who acted. Null for a guest and for the system. No relation, so it outlives the user. |
| `actorKind` | `admin`, `customer`, `guest`, `system` or `connect` (a vendor's member or a driver in Connect). |
| `action` | One of the 87 actions below, for example `booking.item.confirmed`. |
| `entityType`, `entityId` | The record the entry belongs to: a booking, a location, a vehicle and so on. Item and trip actions use the **booking**. Location sub-parts (zones, rates, pages, offerings) use the **location**. |
| `before`, `after` | JSON. For an update: only the fields that changed (`changedFields`, `activity.ts:71`). Saving with no change writes no entry, in most writers. |
| `customerVisible` | Fixed per action. True only for 8 booking actions. **No screen reads it yet.** It is for a future customer page. |
| `locationIds` | Other locations whose Activity should show this entry too. Set for vehicles, drivers and tour guides (where they are based, before and after a move), and for deletes that removed other locations' routes. |

The writer `logActivity` (`activity.ts:42`) also masks two fields everywhere:
`bankAccountNumber` and `registrationNo` become `"ending 1234"`
(`bank-input.ts:163`).

When an entry is read, `decorate` (`activity.ts:115`) adds:

- `actorName`: the user's full name, or the email, or "Guest", "System",
  "Former staff", "Former customer", "Former Connect user".
- `entityLabel`: the record's name today. A booking shows its invoice number,
  else its quote number, else its reference (`bookingLabelOf`). A deleted
  location, vehicle, driver, guide or user shows the name from its delete
  entry with " (deleted)". Any `setting` entry is always "The wall". Media is
  always "Media".

### 1.2 Actor kinds

| Kind | Who | Shown as |
| --- | --- | --- |
| `admin` | Staff in manage | Their name. Blue disc. |
| `customer` | A signed-in customer on the website | "Aina Rahman, customer". Grey disc. |
| `guest` | A signed-out visitor booking on the website | "Guest" |
| `connect` | A vendor owner, vendor staff or driver in Connect | Their name (no "Connect" marker). Grey disc. |
| `system` | Scripts and the offer timer (`expireOffers`) | "System" |

### 1.3 Areas and who sees them

Each action has one area (`activity-areas.ts:70`). An admin sees an area on
Activity when they hold that area's permission (`activityAreasHeld`,
`activity-areas.ts:179`). SUPER holds everything.

| Area (chip label) | Permission asked | Default teams (when the wall is on) |
| --- | --- | --- |
| Bookings | `bookings.view` | Operation, Reservation, Sales, Finance |
| Fleet | `fleet.manage` | Operation |
| Coverage and rates | `coverage.view` | Operation, Reservation, Sales |
| Pages | `pages.manage` | Marketing, SEO |
| Website | `website.manage` | Marketing, SEO |
| Details | `locations.manage` | Marketing |
| Status | `locations.view` | Any admin |
| Users (`team`) | `admins.manage` | SUPER only |

When the wall is off, `may` (`permissions.ts`) gives every admin every team
rule, so every admin sees every area except Users. SUPER can change the teams
on Admin; the table shows the defaults.

### 1.4 Where entries show

- **Activity under `~`** (`/~/activity`): every entry of the areas you hold,
  newest first, 50 per page, filter chips by area.
- **A location's Activity** (`/[slug]/activity`): entries with
  `entityType = "location"` and that location's id, plus entries whose
  `locationIds` has it. Only these areas can show there: Fleet, Coverage,
  Pages, Website, Details, Status (`LOCATION_ACTIVITY_AREAS`). **Bookings and
  Users never show on a location's Activity.**
- **Record History.** A booking, vehicle, driver, tour guide and class each
  have a History page (`.../history`), reached by the History button. The
  booking screen also has a "History" card with the last 4. A vendor page and
  a user page show their full history in a card on the page. A location has no
  History page; its Activity is its history. These pages read **every** entry
  of the record, with no area filter.
- **Publish lists.** A page editor lists its publishes (who and when) from
  `location.page.published`, `site.page.published` and `site.footer.published`.

### 1.5 Links and tags on the Activity screen

From `apps/manage/app/_lib/activity-links.ts` and
`_components/HistoryTimeline.tsx`.

One line shows: the time, a disc with the actor's initials, the sentence
(`describeActivity`), the actor's name under it, and a tag at the right.

**Tag** (`activityEntryTag`):
- A location entry: "Langkawi · Coverage and rates" under `~`; only
  "Coverage and rates" on that location's own Activity.
- The wall and Media: "The wall", "Media".
- Any other: record type and label: "Booking HTI-1310", "Vehicle WXY 1234",
  "Driver Ali Hassan", "Vendor Pulau Coach", "Class Executive Sedan",
  "User aina@example.my", "Admin aina@example.my", "Site page Footer".

**Link** (`activityEntryHref`): the sentence is a link when:
- `location.page.published` with `pages.manage`: opens the before/after page
  (`/[slug]/activity/[entryId]`).
- `site.page.published` and `site.footer.published` with `website.manage`:
  opens the before/after page (`/~/pages/website/history/[entryId]`). Other
  site-page entries open the page's editor.
- Any other location entry under `~`: the location's dashboard. On the
  location's own Activity: no link.
- Booking (`bookings.view`), vehicle, driver, guide (`fleet.manage`, at the
  location it is based now), vendor (`fleet.manage`), class (`coverage.view`),
  Media (`media.manage`), user and admin (`users.manage`).
- No link: the wall, state, district, and any deleted record.

Record History pages and the History cards show **no tags and no links**
(`RecordHistory.tsx:109`, `HistoryCard`).

Only the three publish actions have a page that shows `before` and `after`.
For every other action, the stored data is only used to build the sentence.

### 1.6 Size and growth

- Production, 2026-10-21 to 2026-11-04 (15 days): 709 entries, about 800 kB
  with indexes. That is about 1.1 kB per row.
- 709 in 15 days is about 330 a week on average. Recent weeks are nearer
  500 a week.
- At 500 a week: about 26,000 entries a year, about 29 MB a year.
- Rows are not the same size. Publishes keep the whole page content before
  and after, so one publish can be many kB. `booking.contact.viewed` is tiny
  but the most frequent (94, 13% of all entries).
- Top 5 actions are 46% of all entries: `booking.contact.viewed` 94,
  `booking.created` 66, `booking.invoiced` 57, `booking.contact.updated` 56,
  `vehicle-class.updated` 56.

---

## 2. Every action, by area

Key to "Shows on":
- **~** = Activity under `~`.
- **Loc** = a location's Activity.
- **Hist** = the record's History (page or card).
- **Link** = where the sentence links on Activity.

"Item N" in a sentence is the trip's `position` in the booking.

### 2.1 Bookings (`bookings.view`)

All log against the booking. None show on a location's Activity. All show on
the booking's History page and its History card (last 4). Link on `~`: the
booking. Tag: "Booking HTI-1310".

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `booking.created` | "Made the booking" / "Entered the booking with 3 items" | after: `status` "confirmed", `priceTotalSen` 45000, `items` 3, `via` "console" or "website", `oldInvoiceNumber` 1295 (only when typed) | Website: customer or guest at checkout (`web/.../confirm/actions.ts`). Manage: New booking, `bookings.create`. `createBooking`, `bookings.ts:249` | ~, Hist. Customer visible | 66 |
| `booking.item.confirmed` | "Confirmed item 2" | before: `position` 2, `status` "received"; after: `position` 2, `status` "confirmed" | Manage, booking screen Confirm, `bookings.manage`. `advanceItem`, `bookings.ts:601` | ~, Hist. Customer visible | 52 |
| `booking.item.assigned` | "Marked item 1 driver assigned" | before: `position` 1, `status` "confirmed"; after: `position` 1, `status` "assigned" | Automatic when every part of a trip is accepted (`settleTrips`, `fulfilment.ts:1270`). Caused by Assign (`bookings.fulfil`), an answer in Connect (vendor or driver), or naming | ~, Hist. Customer visible | 4 |
| `booking.item.completed` | "Marked item 1 completed" | before: `position` 1, `status` "assigned"; after: `position` 1, `status` "completed" | Manage Complete, `bookings.fulfil` (`advanceItem`). Or a "Dropped off" / "No-show" tap: driver in Connect or Operation for them (`driver-jobs.ts:448`) | ~, Hist. Customer visible | 5 |
| `booking.item.cancelled` | "Cancelled item 2" | before: `position` 2, `status` "confirmed"; after: `position` 2, `status` "cancelled" | Manage, `bookings.manage` (`cancelItem`, `bookings.ts:637`). Website: customer cancels one trip (`cancelTripAsCustomer`, `bookings.ts:1097`) | ~, Hist. Customer visible | 3 |
| `booking.cancelled` | "Cancelled the booking" | before: `status` "confirmed"; after: `status` "cancelled" | Manage, `bookings.manage` (`cancelBookingAsAdmin`). Website: customer cancels the whole booking. `cancelAllItems`, `bookings.ts:999` | ~, Hist. Customer visible | 5 |
| `booking.item.amended` | "Changed the pick-up and the price of item 1" | before and after: `position` 1, plus only the changed `AMENDED_FIELDS`: `mode`, `pickup` "KLIA Terminal 1", `dropoff`, `startsAt` ISO, `hours`, `vehicleClassName` "Executive Sedan", `vehicleModel`, `passengers`, `childSeats`, `flightNumber`, `tourGuide` "English, Japanese", `priceTotalSen` | Manage, Amend trip, `bookings.manage` (agreed price also needs `bookings.create`). `amendItem`, `bookings.ts:852` | ~, Hist. Customer visible | 4 |
| `booking.item.added` | "Added item 3 at RM 180.00" | after: `position` 3, `status` "confirmed", and all `AMENDED_FIELDS` as above | Manage, Add trip, `bookings.manage`. `addItem`, `bookings.ts:954` | ~, Hist. Customer visible | 0 |
| `booking.item.reopened` | "Reopened item 1: it lost its vehicle or driver" | before: `position` 1, `status` "assigned"; after: `position` 1, `status` "confirmed" | Automatic when an assigned trip loses a part (`settleTrips`, `fulfilment.ts:1270`): release, decline, amend, expiry, suspension, out of service | ~, Hist | 0 |
| `booking.offer.sent` | "Asked for the vehicle of trips 1 and 2 (WXY 1234, Pulau Coach)" / "Assigned the driver of trip 1 (Ali Hassan, Heavenly Travel) and accepted it" | after: `role` "vehicle", `vendorName` "Pulau Coach", `named` "WXY 1234" or null, `positions` [1, 2], `costSen` 30000, `tipSen` (driver only), `respondBy` ISO, `acceptedNow` true (ours, checked) | Manage, Assign, `bookings.fulfil`. `assignBooking`, `fulfilment.ts:802` | ~, Hist | 17 |
| `booking.part.accepted` | "Accepted the vehicle of trip 1 (WXY 1234, Pulau Coach) for the vendor" / "... for the driver, recorded by staff" | after: `role`, `vendorName`, `named`, `positions`, `by` "vendor" or "driver", `recorded` true/false, `warnings` [..] when seen | Connect: vendor owner/staff, or the driver. Manage: Operation records it for them, `bookings.fulfil`. `answerParts`, `fulfilment.ts:943` | ~, Hist | 9 |
| `booking.part.declined` | "Declined the driver of trip 1 (Ali Hassan, Pulau Coach) for the driver: Too far" | after: as accepted, plus `reason` "Too far", `note` "Car at workshop" (when written) | Same as accepted. `fulfilment.ts:967` | ~, Hist | 0 |
| `booking.part.named` | "Named the vehicle of trip 2 (WXY 1234, Pulau Coach)" | after: `role`, `vendorName`, `named`, `positions` | Connect: vendor names its vehicle/driver/guide. Manage: Operation enters it, `bookings.fulfil`. `nameParts`, `fulfilment.ts:1080` | ~, Hist | 0 |
| `booking.part.released` | "Released the vehicle of trip 1 (WXY 1234, Pulau Coach)" / "No answer in time for ..." / "Vendor suspended: released ..." / "Out of service: released ..." | after: `role`, `vendorName`, `named`, `positions`, `cause` "released", "expired", "suspended" or "out-of-service", `note` "The trip was amended" (on amend) | Manage Release, `bookings.fulfil`. System: offer time ran out (`expireOffers`, run when Assign opens). Also inside amend, vendor suspend (`vendors.review`), vehicle/driver/guide out of service. `releaseParts`, `fulfilment.ts:1130`. One entry per role per booking | ~, Hist | 5 |
| `booking.trip.reported` | "Dropped off, item 1" / "Report a problem, item 2: Customer not at gate" | after: `position` 1, `kind` "dropped-off", `at` ISO (phone clock), `note` (when written), `driverName` "Ali Hassan" | Connect: the driver taps. Manage: Operation taps for them, `bookings.fulfil`. `reportTripEvent`, `driver-jobs.ts:429` | ~, Hist | 21 |
| `booking.contact.viewed` | "Ali Hassan saw the customer's details of item 1" / "Pulau Coach's staff saw ..." | after: `position` 1, and `driverName` "Ali Hassan" or `vendorName` "Pulau Coach" | Connect: **every time** a driver or vendor opens a job page that shows the customer (`driver-jobs.ts:296`, `vendor-work.ts:398`) | Area is **Users**: ~ for SUPER only. But Hist shows it to anyone with `bookings.view` | 94 |
| `booking.part.cost.changed` | "Set the cost of the vehicle of trip 1 (WXY 1234, Pulau Coach) to RM 150.00" | before: `role`, `vendorName`, `named`, `positions`, `costSen` 30000; after: same, `costSen` 15000, `reason` "Late cancellation, half" | Manage, Assign, `bookings.fulfil`. `setPartCost`, `fulfilment.ts:1355` | ~, Hist | 0 |
| `booking.item.priced` | "Set the price of item 1 to RM 200.00" / "Reset the price of item 1 to RM 240.00" | before: `position` 1, `priceTotalSen` 24000; after: `position` 1, `priceTotalSen` 20000, `reason` "Repeat customer" or null | Manage, `bookings.create`: price override, or an agreed price given at create, amend or add trip (`bookings.ts:262, 703, 859, 967`) | ~, Hist | 8 |
| `booking.note.added` | "Added a note" | after: `noteId` only. The text stays in `BookingNote` | Manage, booking screen, `bookings.notes`. `addBookingNote`, `booking-notes.ts:64` | ~, Hist | 1 |
| `booking.contact.updated` | "Changed the customer's phone from +60 12-345 6789 to +60 19-876 5432" | before / after: only changed of `contactName`, `contactPhone`, `contactEmail` | Manage, booking screen, `bookings.manage`. `updateBookingContact`, `bookings.ts:1136` | ~, Hist | 56 |
| `booking.invoiced` | "Gave the booking invoice HTI-1310" | after: `invoice` "HTI-1310" (or "HTI-1295-03" for an agent's line), `oldInvoiceNumber` 1223 (when typed) | Manage, booking screen, `bookings.payment`. `invoiceBooking`, `bookings.ts:1202` | ~, Hist | 57 |
| `booking.payment.updated` | "Set invoice HTI-1310 to Fully paid" | before: `paymentStatus` "pending"; after: `paymentStatus` "paid", `invoice` "HTI-1310" | Manage, booking screen, `bookings.payment`. `setInvoicePayment`, `bookings.ts:1247` | ~, Hist | 0 |

### 2.2 Fleet (`fleet.manage`)

Vehicles, drivers and guides have `locationIds` (where they are based, both
places on a move), so they show on that location's Activity. **Vendor entries
have no `locationIds`: they show only under `~`.**

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `vehicle.created` | "Added the vehicle" | after: all fields: `vendorId`, `plate` "WXY 1234", `vehicleClassId`, `brand` "Toyota", `model` "Alphard", `locationId`, `colour` "Black", `year` 2022, `isActive`, `notes`, `roadTaxExpiresOn`, `insuranceExpiresOn`, `inspectionExpiresOn`, `permitExpiresOn`; plus `photos` 3, `modelName` "Toyota Alphard", `locationName` "Langkawi", `vendorName` "Pulau Coach" | Manage, Fleet, `fleet.manage`. Connect: vendor owner/staff. `vehicles.ts:236` | ~, Loc, Hist (vehicle). Link: vehicle. Tag "Vehicle WXY 1234" | 2 |
| `vehicle.updated` | "Took the vehicle out of service" / "Moved to Penang, changed the colour and the road tax" | before / after: only changed fields; `photos` count when photos changed; `modelName`, `locationName`, `vendorName` in after when those changed | Same as created. `vehicles.ts:366`. Out of service also releases its accepted jobs | ~, Loc (old and new), Hist | 2 |
| `vehicle.deleted` | "Deleted the Toyota Alphard" | before: `plate`, `modelName`, `locationName` | Manage, `fleet.manage`, after the delete dialog. `vehicles.ts:515` | ~, Loc, Hist. No link. Tag "Vehicle WXY 1234 (deleted)" | 0 |
| `driver.created` | "Added the driver" | after: `vendorId`, `name` "Ali Hassan", `phone`, `email`, `locationId`, `isActive`, `notes`, `licenceExpiresOn`, `psvExpiresOn`, `paidToVendor`, `bankName`, `bankAccountNumber` "ending 1234", `bankAccountName`; plus `classes` ["Executive Sedan"], `locationName`, `vendorName` | Manage, `fleet.manage`. Connect: vendor owner/staff. `drivers.ts:242`. With an email it also writes `user.created` | ~, Loc, Hist (driver) | 9 |
| `driver.updated` | "Made the driver inactive" / "Changed the classes they may drive to Executive Sedan and MPV" / "Changed the phone" | before / after: changed fields; `classes` by name when changed; `locationName`, `vendorName` when changed | Same as created. `drivers.ts:386` | ~, Loc (old and new), Hist | 7 |
| `driver.deleted` | "Deleted the driver" | before: `name`, `locationName` | Manage `fleet.manage`, Connect vendor. `drivers.ts:447`. May also write `user.deleted` | ~, Loc, Hist. No link | 0 |
| `guide.created` | "Added the tour guide" | after: `vendorId`, `name` "Mei Ling", `phone`, `email`, `locationId`, `languages` ["English", "Mandarin"], `isActive`, `notes`, `motacExpiresOn`, payee and bank fields; plus `locationName`, `vendorName` | Manage `fleet.manage`, Connect vendor. `guides.ts:132` | ~, Loc, Hist (guide) | 0 |
| `guide.updated` | "Made the tour guide inactive" / "Changed the languages" | before / after: changed fields, `languages` when changed, `locationName`, `vendorName` | Same. `guides.ts:211` | ~, Loc, Hist | 0 |
| `guide.deleted` | "Deleted the tour guide" | before: `name`, `locationName` | Same. `guides.ts:257` | ~, Loc, Hist. No link | 0 |
| `vendor.created` | "Added the vendor" / "Signed up in Connect" | after: `name` "Pulau Coach", `kind`, `registrationNo` "ending 5678", `contactName`, `contactPhone`, `contactEmail`, `address`, `services` ["vehicle", "driver"], `invoicePeriod`, bank fields; `locations` ["Langkawi"], `status` "active" or "pending", `owner` email (when created with one) | Manage, `fleet.manage` (`createVendor`, `createVendorWithOwner`). Connect: sign-up (pending). Scripts: `migrate-vendors.ts`, `set-agents.ts` (System). `vendors.ts:286` | ~ only, Hist (vendor page card). Link: vendor | 12 |
| `vendor.updated` | "Changed the contact phone and the locations served" | before / after: changed fields, `services`, `locations` by name | Manage, `fleet.manage`. Connect: owner, Business. Script `set-agents.ts`. `vendors.ts:465` | ~ only, Hist | 2 |
| `vendor.approved` | "Approved the vendor" | before: `status` "pending"; after: `status` "active" | Manage, vendor page review, `vendors.review` (SUPER). `moveVendor`, `vendors.ts:581` | ~ only, Hist | 0 |
| `vendor.refused` | "Refused the vendor: No SSM certificate" | before: `status` "pending"; after: `status` "refused", `reason` | Same | ~ only, Hist | 1 |
| `vendor.suspended` | "Suspended the vendor, and took it off 2 bookings: Late twice" | before: `status` "active"; after: `status` "suspended", `reason`, `released` ["HT-7K3QZM", ...] | Same. Also writes `booking.part.released` per booking | ~ only, Hist | 0 |
| `vendor.reinstated` | "Reinstated the vendor" | before: `status` "suspended"; after: `status` "active" | Same | ~ only, Hist | 0 |
| `vendor.ours.switched` | "Made the vendor ours" | before / after: `isOurs` | Manage, `vendors.review`. `vendors.ts:630` | ~ only, Hist | 0 |
| `vendor.member.added` | "Added siti@pulaucoach.my as staff" | after: `email`, `role` "staff" | Connect: the owner, Staff. Manage: `vendors.review`. `vendors.ts:716`. May also write `user.created` | ~ only, Hist | 0 |
| `vendor.member.removed` | "Removed siti@pulaucoach.my from the staff" | before: `email`, `role` | Same. `vendors.ts:751`. May also write `user.deleted` | ~ only, Hist | 0 |
| `vendor.owner.changed` | "Made lim@pulaucoach.my the owner in place of tan@pulaucoach.my" | before: `email` (when it had one); after: `email` | Manage, `vendors.review`. `vendors.ts:383` | ~ only, Hist | 1 |

### 2.3 Coverage and rates (`coverage.view`)

Location entries log against the location: they show on that location's
Activity, tag "Coverage and rates". Class entries log against the class:
**they show only under `~`**, and on the class's History page.

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `state.updated` | "Set the multiplier to ×1.20" | after: `multiplier` | **No writer today.** Old entries only | ~ (no link) | 0 |
| `district.updated` | "Turned the district on" | after: `isActive` | **No writer today.** Old entries only | ~ (no link) | 0 |
| `vehicle-class.created` | "Created the class" | after: `slug` "executive-sedan", `name`, `description`, `category`, `sortOrder`, `minPassengers`, `maxPassengers`, `luggage`, `imageUrl`, `isActive` | Manage, class catalogue, `coverage.manage` (`vehicle-classes.ts:135`). Or a new class made while adding it to a location (`offerings.ts:253`) | ~, Hist (class). Link: class | 6 |
| `vehicle-class.updated` | "Renamed to Premium Sedan, turned the class off" / "Changed the description and the picture" | before / after: changed fields | Manage, catalogue, `coverage.manage`. `vehicle-classes.ts:174` | ~, Hist | 56 |
| `vehicle-class.model.created` | "Added the model Toyota Alphard" | after: `modelName` "Toyota Alphard" | Automatic: a vehicle saved with a new brand/model (manage `fleet.manage` or Connect). `vehicle-models.ts:105` | ~, Hist (class) | 16 |
| `vehicle-class.model.deleted` | "Removed the model Toyota Alpard" | before: `modelName` | Automatic: no vehicle or booking uses the model any more after a vehicle save or delete. `vehicle-models.ts:133` | ~, Hist (class) | 1 |
| `location.offering.created` | "Started selling Executive Sedan" | after: `vehicleClassName`, `perKmSen`, `minLeadHours`, `cancellationCutoffHours`, `modelChoicePercent`, `modelChoiceFlatSen`, `isActive` | Manage, location's Classes, `coverage.manage`. `offerings.ts:289` | ~, Loc. Link on ~: dashboard | 12 |
| `location.offering.updated` | "Took Executive Sedan off sale" / "Changed the notice needed of Executive Sedan" | before / after: `vehicleClassName` + changed fields | Same. `offerings.ts:339` | ~, Loc | 7 |
| `location.offerings.ordered` (new on this branch) | "Moved MPV in the order of classes" | before: `order` ["Executive Sedan", "MPV"]; after: `order` ["MPV", "Executive Sedan"], `moved` "MPV" | Same, up/down arrows. `moveOffering`, `offerings.ts:392`. One entry per click | ~, Loc | 0 |
| `location.zone.created` | "Added the zone Langkawi Airport" | after: `zoneId`, `name`. Shape not stored | Manage, Coverage, `coverage.manage`. `zones.ts:611` | ~, Loc | 16 |
| `location.zone.updated` | "Redrew the zone Kuah Town" / "Renamed the zone Kuah to Kuah Town" / "Trimmed the zone Cenang for Langkawi Airport" | before: `zoneId`, `name`; after: `zoneId`, `name`, `cutFor` (trim only) | Same. Save (`zones.ts:662`), and one trim entry for each other zone cut (`zones.ts:495`), logged on **that zone's** location | ~, Loc | 31 |
| `location.zone.deleted` | "Removed the zone Pantai Tengah, and Kedah's routes to it" | before: `zoneId`, `name`, `routesFrom` ["Kedah"] | Same, after the delete dialog. `zones.ts:737`. `locationIds` = the other locations | ~, Loc (also the other locations) | 4 |
| `location.rates.updated` | "Changed 3 rates on the grid" | before / after: `cells` [{ `cell` "Langkawi Airport to Kuah Town, Executive Sedan", `priceSen` 6000 }, ...] | Manage, Rates grid, `coverage.manage`. `setZoneRates`, `zones.ts:873` | ~, Loc | 48 |
| `location.hourly.updated` | "Changed the hourly prices" | before / after: the whole list: `zones` [{ `zone` "Kuah Town", `packages` [{ `duration` "4 hours", `includedHours`, `prices` { "Executive Sedan": 32000 } }] }], `extras` [{ `duration`, `class`, `priceSen` }] | Manage, Hourly rates, `coverage.manage`. `hourly-rates.ts:236` | ~, Loc | 4 |
| `location.guide-rates.updated` | "Changed the tour guide rates" | before / after: `rows` [{ `language` "Japanese", `isActive`, `oneWaySen`, `hours4Sen`, `hours8Sen`, `hours12Sen`, `extraHourSen` }] | Manage, Tour guide rates, `coverage.manage`. `guide-rates.ts:101` | ~, Loc | 0 |
| `location.surcharge.updated` | "Set the odd-hours surcharge to 23:00 to 07:00, 20%" / "Removed the odd-hours surcharge" | before / after: `fromMinute` 1380, `toMinute` 420, `percent` 20 or `flatSen`; `{}` for none | Manage, Rates rules, `coverage.manage`. `setTripRules`, `zones.ts:957` | ~, Loc | 0 |
| `location.dropoff.updated` | "Set drop-offs inside this location only" | after: `dropoffRule` | **No writer today.** Old entries only | ~, Loc | 0 |
| `location.reach.updated` | "Set the free extra road to 5 km and cross-location on" | before / after: changed of `freeExtraKm`, `maxExtraKm`, `crossLocation` | Same save as surcharge. `zones.ts:948` | ~, Loc | 2 |
| `location.buffer.updated` | "Set the safety buffer to 30 min" / "Turned the safety buffer off" | before / after: `safetyBufferMinutes` | Manage, Settings card, `coverage.manage`. `setSafetyBuffer`, `locations.ts:335` | ~, Loc | 0 |
| `location.weekend.updated` | "Set the weekend and holiday surcharge to Sat, Sun and 2 holidays, 10%" | before / after: `days` [6, 0], `dates` ["2026-12-25"], `percent` or `flatSen`; `{}` for none | Same save as surcharge. `zones.ts:965` | ~, Loc | 0 |

### 2.4 Pages (`pages.manage`)

All but Media log against the location: they show on that location's Activity,
tag "Pages".

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `location.page.published` | "Published the main page" / "Published the popular place “Eagle Square”" | before: `page`, `slug`, `content` (whole page, null on first publish); after: `page` "popular-places", `slug` "eagle-square", `name`, `content` { `metaTitle`, `metaDescription`, `shareImage`, `tagline`, `heroHeadline`, `heroSubheadline`, `heroImage`, `intro`, `body`, `faqs`, `addressId`, `indexable` } | Manage, page editor Publish, `pages.manage`. `location-pages.ts:709` | ~, Loc, page editor's publish list. **Link: before/after page** | 9 |
| `location.page.updated` | "Unpublished the blog post “Best beaches”" | before: `page`, `slug`, `isOn` true; after: `page`, `slug`, `name`, `isOn` false | Manage, Unpublish, `pages.manage`. `location-pages.ts:754` | ~, Loc | 0 |
| `location.page.created` | "Added the popular place “Eagle Square”" | after: `page`, `slug`, `name` | Manage, Add page, `pages.manage` (`location-pages.ts:942`). Script `migrate-popular-places.ts` (System) | ~, Loc | 3 |
| `location.page.renamed` | "Changed the address of the popular place “Eagle Square” to /popular-places/dataran-lang" | before: `page`, `slug`; after: `page`, `slug`, `name` | Manage, `pages.manage`. `location-pages.ts:1008` | ~, Loc | 0 |
| `location.page.deleted` | "Deleted the popular place “Eagle Square”" | before: `page`, `slug`, `name`, `isOn` | Manage, `pages.manage`. `location-pages.ts:1037` | ~, Loc | 0 |
| `location.pages.ordered` | "Moved the popular place “eagle-square” in the order" | before: `page`, `order` [slugs]; after: `page`, `order`, `moved` slug | Manage, up/down, `pages.manage`. `location-pages.ts:1090` | ~, Loc | 0 |
| `media.deleted` | "Deleted 3 images" | before: `files` [{ `key`, `name` "kuah-jetty.jpg", `size` 245760 }] | Manage, Media, `media.manage` (Marketing, SEO, **Operation**). `logMediaDeleted`, `media.ts:284` | ~ only. Link: Media. Tag "Media" | 2 |

### 2.5 Website (`website.manage`)

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `location.top-choice.updated` | "Made top choice 3" / "Moved to top choice 1" / "Removed from the top choices" | before / after: `topChoiceOrder` 1, 2, 3 or null | Manage, Website pages, `website.manage` (`changeTopChoice`, `locations.ts:847`). Also when a location is deleted. One entry **per location whose place moved** | ~, Loc (each location) | 0 |
| `site.page.published` | "Published About us" | before: `page`, `content` (null first time); after: `page` "about-us", `content` | Manage, site page editor, `website.manage`. `site-pages.ts:238` | ~, page's publish list. **Link: before/after page**. Tag "Site page About us" | 3 |
| `site.page.updated` | "Unpublished Refund policy" | before: `page`, `isOn` true; after: `page`, `isOn` false | Same. `site-pages.ts:299` | ~. Link: page editor | 0 |
| `site.footer.published` | "Published the footer" (both footers) | before / after: `content` { `tagline`, `columns`, `socialHeading`, `social`, `contactHeading`, `whatsapp`, `phone`, `email`, `address`, `badgesHeading`, `badges`, `paymentHeading`, ... }. Entity: `footer` or `connect-footer` | Manage, footer editor, `website.manage`. `site-footer.ts:216` | ~, footer's publish list. **Link: before/after page**. Tag "Site page Footer" / "Site page Connect footer" | 17 |

### 2.6 Details (`locations.manage`)

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `location.updated` | "Renamed to Pulau Langkawi, changed the states" | before / after: changed of `name`, `slug`; `stateCodes` ["02"] when states changed | Manage, Settings, `locations.manage`. `locations.ts:405` | ~, Loc | 1 |
| `location.addresses.updated` | "Added the address Kuah Jetty" / "Renamed the address Jetty to Kuah Jetty" / "Reordered the saved addresses" | before / after: the whole list `addresses` [{ `id`, `name` "Kuah Jetty", `place` "Jalan Pelabuhan, Kuah" }] | Manage, Saved addresses, `locations.manage`; also "add address" from a page editor. `locations.ts:547` | ~, Loc | 0 |

### 2.7 Status (`locations.view`, every admin)

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `location.created` | "Created the location" | after: `name` "Langkawi", `slug` "langkawi", `stateCodes` ["02"] | Manage, `locations.create` (SUPER). `locations.ts:302` | ~, Loc | 4 |
| `location.state.changed` | "Went live" / "Paused the location" / "Resumed the location" | before / after: `state` "draft", "live", "paused" | Manage, Settings, `locations.activate` (SUPER). `locations.ts:774` | ~, Loc | 1 |
| `location.deleted` | "Deleted the location, and Kedah's routes to its zones" | before: `name`, `slug`, `stateCodes`, `state`, `routesFrom` ["Kedah"] | Manage, `locations.activate` (SUPER). `locations.ts:683`. `locationIds` = locations that lost routes | ~ (no link), other locations' Loc. Tag "Langkawi (deleted) · Status" | 3 |

### 2.8 Users (`team`, SUPER only)

Only under `~`. User and admin entries both use the user's id; the user page
reads both types in one card.

| Action | Sentence shown (example) | Stored in before / after | Who triggers it | Shows on | Prod count |
| --- | --- | --- | --- | --- | --- |
| `user.created` | "Created the account" / "Added the account Clerk already held" | after: `email`, `firstName`, `lastName`, `phone`, `existing` true (if Clerk had it), `madeFor` "driver:<id>" or "vendor:<id>" | Manage, All Users, `users.manage` (as staff also `admins.manage`); Admin add staff; a driver with an email (`fleet.manage` or Connect); a vendor owner or staff. `keepNewAccount`, `accounts.ts:234` | ~, Hist (user page). Link: user (`users.manage`). Tag "User aina@example.my" | 6 |
| `user.updated` | "Changed the first name and phone" | before / after: `firstName`, `lastName`, `phone` (all three, even unchanged) | Manage, user page, `users.manage`. `accounts.ts:472` | ~, Hist | 0 |
| `user.email.changed` | "Changed the email to aina.r@example.my" | before / after: `email` | Same. `accounts.ts:553` | ~, Hist | 0 |
| `user.password.set` | "Set a new password and signed them out everywhere" | nothing | Same. `accounts.ts:584` | ~, Hist | 4 |
| `user.deleted` | "Deleted the account, never used" | before: `email` | Automatic, after a driver delete or a vendor member removal, if the account was never used. `accounts.ts:307` | ~, Hist. No link | 0 |
| `admin.promoted` | "Promoted to REGULAR (Operation, Sales)" | after: `level` "REGULAR", `teams` ["OPERATION", "SALES"] | Manage, Admin, `admins.manage`. `grantAdmin`, `admins.ts:120` | ~, Hist. Tag "Admin aina@example.my" | 6 |
| `admin.updated` | "Changed from REGULAR (Operation) to REGULAR (Operation, Finance)" | before / after: `level`, `teams` | Same. `admins.ts:97` | ~, Hist | 3 |
| `admin.revoked` | "Revoked admin access (was REGULAR (Sales))" | before: `level`, `teams` | Same. `admins.ts:137` | ~, Hist | 0 |
| `wall.switched` | "Turned the wall on" | before / after: `wallActive` | Manage, Admin, `wall.switch` (SUPER). `settings.ts:93` | ~ only. No link. Tag "The wall" | 1 |
| `access.rule.changed` | "Gave \"See coverage, classes and rates\" to Operation and Sales" | before / after: `permission` "coverage.view", `teams` ["OPERATION", "SALES"] | Manage, Admin Team access, `admins.manage`. `settings.ts:69`. One entry **per changed permission** | ~ only. No link. Tag "The wall" | 0 |
`booking.contact.viewed` is also in this area. It is listed in 2.1 with the
other booking actions.

Count check: 22 Bookings (with `booking.contact.viewed`) + 19 Fleet + 20
Coverage + 7 Pages + 4 Website + 2 Details + 3 Status + 10 Users = 87, the
whole `ACTIONS` list.

---

## 3. Findings for readability

All are about how the log reads on screen. Each cites the code.

### 3.1 Repeated entries

1. **"Saw the customer's details" on every page open.** Connect logs
   `booking.contact.viewed` each time a driver or vendor opens a job page that
   shows the customer (`driver-jobs.ts:295-301`, `vendor-work.ts:397-403`).
   It is the biggest action: 94 of 709 (13%). A driver who opens the job 5
   times before pickup makes 5 lines that are the same.
2. **One save, several lines.** One click can write a run of entries with the
   same time:
   - Rates rules save: up to 3 (`reach`, `surcharge`, `weekend`), `zones.ts:946-972`.
   - Amend: `booking.item.amended` + `booking.item.priced` + one
     `booking.part.released` per role + `booking.item.reopened` per trip
     (`bookings.ts:852-883`, `fulfilment.ts:1130`, `fulfilment.ts:1270`).
   - Booking created with agreed prices: 1 + one `priced` per item (`bookings.ts:249-273`).
   - Assign: `booking.offer.sent` per role, then `booking.item.assigned` per trip.
   - Zone save that trims others: one "Trimmed" line per zone cut, in the
     other location (`zones.ts:495`).
   - Top choice move: one line per location whose place changed (`locations.ts:847`).
   - Team access save: one line per permission (`settings.ts:68-75`).
   - Class order (new): one line per arrow click (`offerings.ts:392`); same for
     page order (`location-pages.ts:1090`).
   The screen shows each as its own line; nothing groups them.
3. **Zone save logs even with no change.** `updateZone` writes and logs on
   every save (`zones.ts:632-667`); unlike most writers it does not use
   `changedFields`. A save with the same name reads "Redrew the zone ...".

### 3.2 Who did it

4. **Actor shown three times on `contact.viewed`.** The sentence starts with
   the driver's name ("Ali Hassan saw ...", `activity-actions.ts:939-948`), the
   disc shows "AH", and the line under it says "Ali Hassan"
   (`HistoryTimeline.tsx:120-144`).
5. **Operation tapping for a driver hides the driver.** `booking.trip.reported`
   stores `driverName` (`driver-jobs.ts:437`) but the sentence never uses it
   (`activity-actions.ts:931-938`). When Operation reports, the line reads
   "Dropped off, item 1 — Nurul Aina", as if staff drove.
6. **Connect users look like anyone else.** `connect` actors get the same grey
   disc as customers and no marker (`HistoryTimeline.tsx:34-39`, `124-127`).
   Only customers get ", customer".

### 3.3 Vague sentences (data stored but not shown)

7. **Only publishes can be opened.** Only `location.page.published`,
   `site.page.published` and `site.footer.published` link to a page that shows
   before and after (`activity-links.ts:97`, `130-133`). For all other actions,
   `before` and `after` are stored and never shown. The worst cases:
   - "Changed 3 rates on the grid" (`activity-actions.ts:1138-1144`): the cells
     and prices are in `cells` but not shown (48 entries).
   - "Changed the hourly prices" (`:1145`) and "Changed the tour guide rates"
     (`:1147`): the whole list before and after is stored.
   - "Changed the description and the picture" (class), "Changed the phone"
     (driver), "Changed the contact phone" (vendor): field names only, no values.
   - "Added the vehicle", "Added the driver", "Created the class": the full
     record is in `after`, but the line says nothing about it.
   - `user.updated` names fields by comparing before and after, but it stores
     all three fields every time (`accounts.ts:472`).
8. **Stored but not in the sentence.** `booking.offer.sent` keeps `costSen`,
   `tipSen` and `respondBy` (`fulfilment.ts:806-818`); `booking.part.accepted`
   keeps `warnings`; `booking.part.declined` keeps `note`;
   `booking.part.released` keeps `note` ("The trip was amended"); `booking.created`
   keeps the total; `vendor.suspended` keeps the booking references. None reach
   the screen.
9. **"Added a note" says nothing.** `booking.note.added` keeps only `noteId`
   (`booking-notes.ts:64-68`); the line cannot show the note or link to it.

### 3.4 Wording

10. **"Item" and "trip" for the same thing.** Status lines say "item 2"
    (`activity-actions.ts:477-480`); fulfilment lines say "trip 2" (`:612-627`).
    On one booking History both appear.
11. **Labels used as sentence parts read oddly.**
    - "Marked item 1 driver assigned": `ITEM_STATUS_LABELS.assigned` is
      "Driver assigned" (`booking-status.ts:65`), even when the trip also needed a vehicle.
    - "Report a problem, item 2: ...": the trip event label is the button text
      (`trip-events-input.ts:32`).
    - "Promoted to REGULAR (Operation)": the level is printed raw in capitals
      (`activity-actions.ts:482-490`).
12. **Same words, different things.** "Changed the state" is the fallback for
    both `state.updated` (a Malaysian state, `:1020`) and `location.state.changed`
    (a location's status, `:822`). "Published the footer" is the same for the
    website's and Connect's footer (`:1111`); only the tag tells them apart.
13. **Page order shows the slug.** `location.pages.ordered` passes only the slug
    as the name (`activity-actions.ts:1103`), so it reads "Moved the popular
    place “eagle-square” in the order", while other page lines use the headline.
14. **Long personal data in the line.** `booking.contact.updated` prints old and
    new phone and email in full (`activity-actions.ts:879-899`); with three
    fields the line gets long.

### 3.5 Tags

15. **The wall tag on team rules.** Every `setting` entry is labelled "The
    wall" (`activity.ts:360-361`), so `access.rule.changed` is tagged "The wall".
16. **Same person, two tags.** Admin entries are tagged "Admin aina@..." and
    account entries "User aina@..." (`activity-links.ts:38-39`), for the same user.
17. **The area tag repeats the filter.** On a location's own Activity, every
    location line's tag is only the area, for example "Coverage and rates"
    (`activity-links.ts:60`). With a chip on, every line has the same tag.
18. **Tags and links only on Activity.** Record History pages and History cards
    pass no `tagOf` or `hrefOf` (`RecordHistory.tsx:109`, `HistoryCard`).

### 3.6 Where an entry shows (and does not)

19. **Location Activity misses some of its own work.** The Fleet and Coverage
    chips show there, but vendor entries and class entries have no
    `locationIds` (`vendors.ts:286`, `vehicle-classes.ts:135`,
    `vehicle-models.ts:105`), so they only show under `~`. Bookings never show
    on a location's Activity.
20. **PDPA entries leak to booking History.** `booking.contact.viewed` is in the
    Users area, so on Activity only SUPER sees it (`activity-areas.ts:86-87`).
    But the booking History page and card read every entry with no area filter
    (`bookings/[id]/history/page.tsx:36`, `BookingScreen.tsx:152`), so anyone
    with `bookings.view` sees it there. Activity and History disagree.
21. **Operation cannot see its own media deletes.** `media.deleted` is in Pages
    (`pages.manage`, `activity-areas.ts:160`), but Operation also holds
    `media.manage` (`permissions.ts`, for fleet photos).
22. **Vendor and user cards are not paged.** The vendor page and the user page
    show the full history in a card (`fleet/vendors/[id]/page.tsx:357`,
    `users/[id]/page.tsx:159`); others use a 4-line card and a History page.

### 3.7 Dead or unused vocabulary

23. `state.updated`, `district.updated` and `location.dropoff.updated` have no
    writer; they exist only so old entries still read.
24. The release cause "backed-out" ("Backed out of ...") is never passed: both
    callers send "released" (`assign/actions.ts:229`, `:232`).
25. `booking.payment.updated`'s comment says an agent's invoice changes every
    booking on it, but only one entry is written, on the booking where staff
    clicked (`bookings.ts:1247`). The other bookings' History does not show it.
26. `customerVisible` is set but no screen reads it yet.

### 3.8 What this branch changed on screen

The log writes the same as before; these are display changes only.

| Finding | Now |
|---|---|
| 1, 2 Repeats and one save, several lines | Folded: the same sentence again and again is one line, "3 times, 10:36 to 16:40"; one person's entries on one record within 5 seconds are one line, the rest listed under it (`activity-lines.ts`). |
| 4 Actor three times | The line under the sentence leaves the name out when the sentence starts with it. |
| 7 Only publishes open | Every line with stored values opens "What changed", field by field, old and new, money in RM, files as a count ("2 images"). |
| 10, 11 Wording | "Trip 2" everywhere; "Assigned everyone to trip 1", "Completed trip 1", "Reported a problem on trip 2: …", "Regular" not "REGULAR". |
| 20 PDPA entries on booking History | Booking History reads only the areas the admin holds (`entriesSeenBy`), as Activity does: drivers' views are SUPER's. |
| — Finding one person | Activity's Filters: area, who (staff, customers, guests, vendors and drivers, system) and staff member. |

---

## 4. What to log: gaps and excess

To fine-tune later, with performance in mind. Nothing here is built yet.
Each item says what happens today, what to change, and why.

### 4.1 Not logged, and worth logging

Found by reading every function in `packages/db/src` that writes without a
`logActivity` call (`sync.ts`, `accounts.ts`, `fulfilment.ts`, `bookings.ts`).

| # | What happens, unlogged | Where | Suggest | Why |
|---|---|---|---|---|
| G1 | A customer signs up: their `User` row is made from Clerk. | `sync.ts` `upsertUserFromClerk` | `user.signed-up` on the user, actor the customer. | A user's History starts at nothing; staff-made accounts log `user.created`, self-made ones do not. |
| G2 | The sign-up claims the guest bookings made with that email. | `sync.ts` `claimGuestBookings` | `booking.claimed` on each booking, with the account's email. | The booking's History never says when it gained an account, so "who is this customer" has no trail. |
| G3 | The sign-up links a driver row to the account. | `sync.ts` `linkDriver` | `driver.account.linked` on the driver. | The driver's History does not say when they could first open Connect. |
| G4 | An account deleted in Clerk's dashboard removes the `User` row. | `sync.ts` `deleteUserFromClerk`, from `api/webhooks/clerk` | `user.deleted` with actor `system`, keeping the email. | Deleting in Manage is logged; the same delete from Clerk is not. |
| G5 | A trip cancelled before its free-cancellation deadline sets the accepted parts' cost to RM 0. | `fulfilment.ts` `settleCancelledTrips` | `booking.part.cost.changed` with actor `system` and cause "cancelled in time". | Finance sees a cost drop to 0 on the booking with no line saying why; a manual change is logged. |
| G6 | A vendor's offer turns accepted or gone as its parts settle. | `fulfilment.ts` `settleOffer` | Nothing new: the part lines already say it. Only add `booking.offer.accepted` if Assign needs one line per offer. | Listed so the gap is known, not because it is missing. |
| G7 | A new vendor's applicant names and phone, kept on their account. | `accounts.ts` `keepApplicantProfile` | Leave unlogged, or fold into the `vendor.created` entry's `after`. | Small, and the registration itself is logged. |
| G8 | Staff open a booking that shows the customer's phone and email. | Manage booking page | Leave unlogged. | Drivers' views are logged for PDPA because they are outside the company. Logging staff views would add an entry on every open, far more than all the rest. |
| G9 | A file uploaded to Media. | `api/uploads` | Leave unlogged. | A file only matters once a page, class or vehicle uses it, and that save is logged. Deleting is logged. |
| G10 | An agent's invoice paid or changed, on the other bookings on that invoice. | `bookings.ts:1247` | One entry per booking on the invoice, or have the History of each booking read the invoice's entry. | Today only the booking where staff clicked shows it (finding 25). |
| G11 | Location Activity misses its vendors' and classes' changes. | `vendors.ts:286`, `vehicle-classes.ts:135`, `vehicle-models.ts:105` | Write `locationIds`: a vendor's locations, the locations that sell a class. | Finding 19: under a location, Fleet's own work is missing. |
| G12 | Emails sent (when `EMAILS_ON` is turned on). | `@repo/email` | `booking.email.sent` with the template and recipient, once emails go out. | "Did the customer get the confirmation?" is a common question. Resend keeps its own log, so this is optional. |

### 4.2 Logged, and worth logging less

| # | Today | Suggest | Saves |
|---|---|---|---|
| E1 | `booking.contact.viewed` on every open of a job page (13% of all entries). | Log the first view per person per trip, or per person per trip per day. Folding on screen already hides the repeats. | Most of the biggest action. |
| E2 | `updateZone` logs every save, even with nothing changed (finding 3). | Compare as other writers do (`changedFields`), and log nothing when nothing changed. | Lines that say "Redrew" for no change. |
| E3 | `user.updated` stores all three name fields every time (finding 7). | Store only the fields that changed. | Clearer "What changed". |
| E4 | Team access: one entry per permission changed in one save. | One `access.rule.changed` per save, the permissions added and removed in it. | Lines; the screen folds them now anyway. |
| E5 | Class order and page order: one entry per arrow click. | Keep; the screen folds a run of clicks into one line. If they grow, log the order once per minute per location. | Little, so low priority. |
| E6 | Rate rules save: up to three entries (`reach`, `surcharge`, `weekend`). | One `location.rules.updated` per save with the three parts. | Lines; folded on screen already. |
| E7 | Three actions with no writer (`state.updated`, `district.updated`, `location.dropoff.updated`) and the cause "backed-out" (findings 23, 24). | Keep the read side so old entries still read; delete the vocabulary once prod holds none (check with a count). | Code, not rows. |

### 4.3 Keep as it is: other code reads it

Changing these changes behaviour, not just the log.

- **Publishes store the whole page before and after.** They are the largest
  rows, but Media reads them to know which files an earlier version still
  uses (`media.ts`, "earlier"), and the publish link shows before and after.
- **`user.created` keeps `madeFor`.** `deleteAccountIfUnused` reads it to
  know whether an account was made for a driver or vendor and may go with
  it (`accounts.ts`).
- **Offer expiry is logged lazily.** `expireOffers` writes the release, with
  actor `system`, when a screen next reads fulfilment, not at the deadline.
  The time on the line is when it was noticed. Fine as long as the cause
  says "expired".

### 4.4 Size, if all of 4.1 and 4.2 were done

E1 alone would cut the biggest action to about one entry per driver per
trip. G1 to G5 add about one entry per sign-up and per cancellation, a few a
week today. Net: smaller than now. At today's rate (section 1.6) the table
stays under about 30 MB a year either way, so none of this is urgent for
size; it is for reading.
