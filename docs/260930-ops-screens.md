# Ops screens: Zones and Vehicle classes

Status: agreed and built on 2026-09-30; the screens shipped in PR D, see "As built". This
is step 5 of `260930-admin-teams-and-access.md` (PR C): the design of the two Operation
screens that steps 6 and 7 built in PR D, the coverage check that step 5 ran against
Google, and the seed rule that follows from it. Where this document differs from
`260923-car-with-driver.md` or `260928-coach-charter.md`, this one wins.

Today a change to a rate, a rule or a district is an edit to `prisma/seed.ts` and a
deploy, and the console's Locations screen holds sample data that nothing reads. These
two screens give the Operation team the two tables that decide what the site sells and
where: `Zone` with its `ZoneDistrict` rows, and `VehicleClass`. Both screens sit behind
`coverage.manage`, so with the wall on they are Operation's and `SUPER`'s. Every change
is written to the activity log in the same transaction, as the log requires.

## Decisions

### A district is a town, as Google names it

The coverage check below geocoded 208 real places. Google returned an administrative
district (`administrative_area_level_2`) for none of them. What it returns is the
`locality`, a town: "Petaling Jaya", "Bayan Lepas", "Skudai". So:

- A `ZoneDistrict.district` row is a Google locality. The real district names (Petaling,
  Timur Laut, Melaka Tengah) match nothing and are not listed. The column and the word
  "district" stay in the code and on the screen, defined there as "the town names
  Google returns for addresses in the zone".
- `ZoneDistrict.state` is information. Google spells the same state several ways
  ("Penang" and "Pulau Pinang", "Melaka" and "Malacca", "Johor" and "Johor Darul
  Ta'zim", four spellings for Kuala Lumpur), so `resolveZone` uses it only to break a tie
  when two zones list the same name, and the seed avoids such ties. The screen shows it
  dimmed and fills it from the test result, never asks for it first.
- Names are added from real results, not typed from memory. The Zones screen's "Test an
  address" field shows the locality Google carries for a place and offers to add it to
  the zone in one click. Typing a name by hand stays possible for a name seen in a
  customer's address.
- A place whose locality is in no zone is not served, as today. The gaps the check found
  are listed under "Known gaps" with the decision they need.

### The Zones screen

Route `/zones`, permission `coverage.manage`, sidebar item "Zones" under Operations. It
takes the place of the sample Locations screen, which is removed with
`sample-locations.ts`. The home page destination cards stay static content in
`apps/web` and get no admin screen; the home page reads nothing from the database.

The list, one row per zone, ordered by name:

| Column    | Shows                                                                 |
| --------- | --------------------------------------------------------------------- |
| Zone      | Name, linking to the zone's page                                      |
| Active    | A switch. Off means pickups there get "We do not serve that area yet" |
| Price     | The multiplier as "×1.00"; "no change" at 1                           |
| Districts | How many names, with the first few as text                            |
| Changed   | When the zone or its districts last changed, from the activity log    |

Above the list: "Add zone". A new zone has a name, a slug derived from it (kebab-case,
unique, never changed after), multiplier 1, no districts, and starts off. It is turned
on when it has districts.

The zone's page, `/zones/[id]`:

- **Name** and **multiplier**, edited in place and saved together. The multiplier is a
  number with at most two decimals between 0.5 and 3, shown with its effect: "A RM 100
  trip becomes RM 120". It applies to new quotes at once; a booking keeps the price it
  was made at.
- **Active** switch, with a confirm when turning off: "Customers with a pickup in
  Klang Valley will be told the area is not served yet. Existing bookings are not
  changed."
- **Districts** as chips, each with a remove control and its state dimmed. Below them an
  "Add district" input for a name and a state. Adding a name another zone already holds
  is refused with that zone named; to move a name, remove it there first.
- **Test an address**: the same autocomplete field the website uses. Picking a place
  shows its formatted address, the locality and state Google carries, and the outcome:
  "Covered by Klang Valley, on Seri Kembangan" or "Not covered", with a button "Add
  Seri Kembangan to this zone" when the place has a locality and no zone lists it. A
  place with no locality says so: "Google gives no town for this place, only the
  postcode 43900", which is the case for the known gaps.
- **History**: the zone's entries from the activity log, as the booking page shows a
  booking's.

Zones are never deleted, only turned off, as `260923-car-with-driver.md` says.

Server actions, each re-checking `coverage.manage` and logging inside the transaction:
`createZone`, `updateZone` (name, multiplier, active), `addZoneDistrict`,
`removeZoneDistrict`, `testAddress`. Saving what is already there logs nothing, as
`setAdmin` and `setWallActive` do.

| Action                  | Logged as                               |
| ----------------------- | --------------------------------------- |
| `zone.created`          | after: name, slug, multiplier, isActive |
| `zone.updated`          | before and after of the changed fields  |
| `zone.district.added`   | after: state, district                  |
| `zone.district.removed` | before: state, district                 |

All four have `entityType: "zone"`, which the log already knows, and `customerVisible`
false. The full log reads "Aki added Seri Kembangan to Klang Valley" through
`describeActivity`.

The autocomplete needs Google in the admin app: `GOOGLE_MAPS_SERVER_KEY` is added to
`apps/admin` locally and on Vercel, the search route handler is added to the admin app,
and `PlaceInput` with its fetch helper move from `apps/web/app/_components/search` to
`packages/ui` so both apps share one field. Without the key the null provider offers the
seeded names, and the test tool says so.

### The Vehicle classes screen

Route `/vehicle-classes`, permission `coverage.manage`, sidebar item "Vehicle classes"
under Operations. `VehicleClass` stays the name in code; nothing is called "Fleet".

The list, grouped under "Car with driver" and "Coach charter" in `sortOrder`, then name:

| Column  | Shows                                                                   |
| ------- | ----------------------------------------------------------------------- |
| Class   | Name, with the description as a second line                             |
| Active  | A switch. Off hides the class from the options page and the search card |
| Seats   | "1 to 6" from `minPassengers` and `maxPassengers`                       |
| Luggage | The text as it is                                                       |
| Rates   | Base, per km, per hour and minimum fare in RM, from the sen columns     |
| Rules   | "Notice 4 h · Cancel up to 24 h · Minimum 3 h"                          |

"Add class" and each row's "Edit" open a side sheet (`@repo/ui/sheet`) with these fields:

| Field                                     | Rule                                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Name, description                         | Required. Renaming is safe: bookings snapshot the name                                                        |
| Slug                                      | Derived from the name on creation, unique, shown read-only after                                              |
| Category                                  | `car-with-driver` or `coach-charter`. Choosing one on a new class fills the rules below with its usual values |
| Sort order                                | Whole number; the position within the category                                                                |
| Seats, from and to                        | Whole numbers, from ≥ 1, to ≥ from. Only "to" refuses a group; "from" is information                          |
| Luggage                                   | Free text, "5 large bags"                                                                                     |
| Base fare, per km, per hour, minimum fare | RM with two decimals, stored as sen, never negative. A minimum below the base fare is allowed with a warning  |
| Notice needed                             | Hours, ≥ 0. `minLeadHours`                                                                                    |
| Cancel up to                              | Hours before pickup, ≥ 0. `cancellationCutoffHours`                                                           |
| Minimum hours                             | Between the hourly floor (3) and the maximum (12) in `BOOKING_RULES`. `minHourlyHours`                        |
| Active                                    | A switch, default on                                                                                          |

The usual values per category, today `CAR_RULES` and `COACH_RULES` inside `seed.ts`,
move to `booking-rules.ts` as `CATEGORY_RULE_DEFAULTS` so the seed and the form read
one definition. Turning off the last active class of a category gets a confirm: the
category's tab then has nothing to sell, because the site reads its seat limit and its
classes from the active rows.

Classes are never deleted, only turned off. A rate change applies to new quotes at
once; a booking keeps its receipt.

Server actions: `createVehicleClass` and `updateVehicleClass`, logged as
`vehicle-class.created` and `vehicle-class.updated` with the changed fields before and
after, `entityType: "vehicle-class"`, `customerVisible` false.

### Both screens

- Money is entered and shown in RM and stored in sen through `money.ts`; no screen
  holds its own conversion.
- The forms are server actions with `useActionState`, as the Admins page, and re-check
  the permission on every call.
- Validation lives in `@repo/db` next to the writers, returns `{ ok, error }` like
  `AdminChange`, and is unit-tested; the forms only display the message.
- The screens read their data in the page and pass it down; no client fetch.

## Module changes for PR D

| Module                                        | Change                                                                                                                                                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `booking-rules.ts`                            | Gains `CATEGORY_RULE_DEFAULTS`; `seed.ts` reads it.                                                                                                                                                                |
| `zones.ts`                                    | `listZones` (all, with district counts), `getZone`, `createZone`, `updateZone`, `addZoneDistrict`, `removeZoneDistrict`, each taking the actor and logging. `resolveZone` also returns the district it matched on. |
| `vehicle-classes.ts`                          | `listVehicleClasses` (all), `getVehicleClass`, `createVehicleClass`, `updateVehicleClass`, with the actor and the log. The validation, pure and tested.                                                            |
| `activity-actions.ts`                         | The six actions above and their sentences in `describeActivity`.                                                                                                                                                   |
| `packages/ui`                                 | `PlaceInput` and its fetch helper, from `apps/web`.                                                                                                                                                                |
| `apps/admin/app/api/places/search`            | The search route handler, as the web app's.                                                                                                                                                                        |
| `apps/admin/.../zones`, `.../vehicle-classes` | The screens. `.../locations` and `sample-locations.ts` are removed.                                                                                                                                                |
| `apps/admin/app/_components/nav.ts`           | "Zones" and "Vehicle classes" replace "Locations".                                                                                                                                                                 |
| `apps/admin/app/_lib/routes.ts`               | `ZONES_PATH`, `zoneHref(id)`, `VEHICLE_CLASSES_PATH`.                                                                                                                                                              |

No schema change.

## Coverage check

`pnpm --filter @repo/places check-coverage [zone-slug ...]` geocodes a fixed list of
real places through Google, resolves each through `resolveZone` against the database in
`packages/db/.env`, and reports the zone it landed in next to the zone ops expects. It
needs `GOOGLE_MAPS_SERVER_KEY` from `apps/web/.env.local`. It exits 1 on a miss; the
known gaps are printed and counted apart. Run it after adding a zone, after changing
district names, and when a customer reports a served area as not served. The list of
places is in the script; add a place there when one surprises.

Run on 2026-09-30 with 208 places, after the seed correction below: 203 resolved as
expected, 5 known gaps, 0 misses. What it found:

1. **No administrative district, ever.** `administrative_area_level_2` was empty for
   all 208 places. The seed's real district names never matched; the places that did
   resolve before the correction did so because a town shares the district's name
   (Klang, Sepang, Kajang, Alor Gajah, Jasin).
2. **The locality is the town.** Malls, hotels, stations, airports and jetties all carry
   one. The seed now lists, per zone, every locality the check saw, and every listed
   name resolved at least one place.
3. **State spelling varies.** Kuala Lumpur places said "Wilayah Persekutuan Kuala
   Lumpur", "Federal Territory of Kuala Lumpur", "Wilayah Persekutuan" and once
   "Selangor" (Bandar Sri Damansara). Penang: "Penang" and "Pulau Pinang". Melaka:
   "Melaka" and "Malacca". Johor: "Johor" and "Johor Darul Ta'zim". Hence the decision
   that the state is information only.
4. **Quirks kept on purpose.** A few Kepong places carry the locality "Wilayah
   Persekutuan"; it is listed under Klang Valley (Labuan places say "Labuan", so no
   clash). "Rawang" is a Gombak town whose locality Google also gives to Bukit Beruntung
   in Hulu Selangor, so that town is covered. "Cheras" as a locality is Selangor's
   Cheras; Kuala Lumpur's Cheras carries "Kuala Lumpur". "Simpang Ampat" is also a
   town in Melaka and in Perak; it is listed under Penang only, where it is the
   locality of Batu Kawan and Bukit Tambun.
5. **Neighbours not covered, for ops to decide.** These resolved to no zone, as the seed
   intends, and are one "Add district" away: Kuala Langat (Banting, Jenjarom, Telok
   Panglima Garang), Hulu Selangor (Kuala Kubu Bharu, Batang Kali, Serendah), Kuala
   Selangor (Kuala Selangor, Sekinchan, Puncak Alam, Bestari Jaya), Genting Highlands,
   Nilai, Seremban and Port Dickson around Klang Valley; Alor Setar, Kuala Kedah and
   Kuala Perlis around Langkawi; Kulim and Parit Buntar around Penang; Tampin and Muar
   around Melaka; Pontian, Kota Tinggi, Desaru and Kluang around Johor Bahru; Ipoh,
   Simpang Pulai, Tapah and Gua Musang around Cameron Highlands.

### Known gaps

Five places carry no locality at all, only the state and a postcode, so nothing in the
model can place them:

| Place              | Google gives                                                      | Note                                                        |
| ------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------- |
| KLIA Terminal 2    | Selangor, sublocality "Kuala Lumpur International Airport", 43900 | Terminal 1 resolves through the locality "Sepang"           |
| "klia2"            | "KLIA2 Arrival Lane", Selangor, 43900                             | The first suggestion for what a customer types              |
| Gombak LRT Station | Wilayah Persekutuan Kuala Lumpur, 53100                           | Sublocality "Taman Melati"                                  |
| Pantai Cenang      | Kedah, 07000                                                      | The beach itself. Hotels on it carry "Langkawi" and resolve |
| Tanjung Rhu Beach  | Kedah, 07000                                                      | Same. The Four Seasons there resolves                       |

Hotels and terminals resolve; natural features and road-level results do not. The one
that matters is "klia2": an airport transfer company's most typed pickup returns a place
with no town.

Decided on 2026-09-30: towns stay the key for now, and the known gaps stay listed in
the check. Customers pick Terminal 1 or a hotel at the airport instead. Two ways to
close the gaps are on record for later, to be chosen when the town list proves not
enough:

- **Postcode as a second key.** `ZonePostcode` rows, `from` and `to`, per zone;
  `Place` snapshots `postalCode`; `resolveZone` tries the postcode first and the town
  second. Malaysian postcodes are five digits with well-known ranges per town (07000
  Langkawi, 43900 KLIA, 39000 to 39200 Cameron Highlands), ops staff know them, and
  Google returned one for every establishment tested, including all five gaps. Area
  names such as "Nusajaya" carry no postcode, which is why the towns would stay as the
  fallback. About eight files in the packages, one schema push, and a "Postcodes" list
  on the Zones screen.
- **Polygons.** A drawn boundary per zone, matched by the place's coordinates. Covers
  everything Google can locate, at the cost of a map editor on the Zones screen. Already
  on record in `260923-car-with-driver.md`.

A `sublocality` fallback was considered and dropped: it would cover Terminal 2 and the
LRT station but not "klia2" or the beaches, and sublocalities are neighbourhoods,
thousands of them, that nobody would list.

## Seed

`prisma/seed.ts` now only creates. A vehicle class or zone that exists by slug is left
alone, rates and districts included: after the first seed, ops owns the rows and edits
them in the console. For an existing zone whose districts differ from the seed's list
the script prints both differences and stops, so a change is carried over by hand or
deliberately:

```
pnpm --filter @repo/db db:seed -- --replace-districts
pnpm --filter @repo/db db:seed:prod -- --replace-districts
```

The flag replaces every existing zone's districts with the seed's list and touches
nothing else. Rates are never replaced by any flag. The development database was
corrected this way on 2026-09-30; production is corrected with the second command after
this PR merges, or district by district in the Zones screen once it exists. Six stale
names sit in production until then (Petaling, the five Penang district names, Melaka
Tengah, Cameron Highlands); they match nothing and do no harm.

## Build order

PR D, `feat(admin)`, steps 6 and 7 of `260930-admin-teams-and-access.md`, in this
order within the PR:

6. **Zones screen**: `CATEGORY_RULE_DEFAULTS` is not needed here; the zone writers,
   their log actions and `describeActivity` sentences, `PlaceInput` moved to
   `packages/ui`, the admin search route and key, the two pages, the nav change, the
   Locations screen removed.
7. **Vehicle classes screen**: `CATEGORY_RULE_DEFAULTS`, the class writers and
   validation with tests, the log actions, the list and the sheet.

## As built

PR D built both screens as designed. Where the build settled a detail the design left
open, or placed a module differently:

- **Validation modules.** The pure checks live in `zone-input.ts` and
  `vehicle-class-input.ts`, next to the writers rather than inside them: `zones.ts` and
  `vehicle-classes.ts` import the Prisma client, which the unit tests cannot load. Each
  has a `parse…Fields` for the form's strings and a `check…Fields` for typed values; the
  server action parses, the writer checks again. `fields.ts` holds the readers the
  parsers share (`textOf`, `numberOf`, `flagOf`); `slug.ts` derives slugs; `money.ts`
  gained `parseRinggit` and `ringgitInputValue`. `change.ts` holds the `Change` and
  `Created` answers every writer returns; `AdminChange` is the same shape.
- **What an update logs.** `changedFields` in `activity.ts` compares a patch with the
  row and returns the fields that differ, which is both what the update writes and what
  it logs. A patch that changes nothing writes and logs nothing.
- **`resolveZone`** returns a `ZoneMatch`, the zone and the district row that placed the
  place there, or null. `quoteTrip` and `check-coverage` read `.zone`.
- **The search route** is one handler, `handlePlaceSearch` in `@repo/places/server`,
  exported as `GET` by both apps' `api/places/search/route.ts`. `hasGooglePlaces` says
  whether Google or the null provider answers; the test tool shows a note when it is the
  null provider.
- **`PlaceInput`** is `@repo/ui/place-input`, with the fetch helper in
  `@repo/ui/place-search`. The package now depends on `@repo/places` for the shared
  types and query limits, and compiles with bundler module resolution, as the apps do,
  so it can read that package's source. `@repo/ui/field` exports `inputClassName` for
  inputs the package does not render itself.
- **Adding a district** needs the state as well as the town, because `ZoneDistrict` is
  unique on the pair. The test tool fills both from Google's result; the hand form asks
  for both. Removing a zone's last district does not turn the zone off; nothing resolves
  there until a district is added, and the switch refuses to turn a zone on without one.
- **A place with no town** reads "Google gives no town for this place": `Place` carries
  no postcode yet, so the postcode is not shown. It arrives with the postcode key if that
  is chosen.
- **The console's tables** share `_components/Table.tsx` and its cards share
  `_components/Card.tsx`; the Admins, Activity and Bookings tables moved onto them.
- **Turning a class off** is the same `updateVehicleClass` as the sheet, with a patch of
  one field, so the switch and the form log the same way.

## Future work, on record

- Read-only views of both screens for the other teams, if a team asks (already in the
  admin teams plan).
- Per-category coverage, when a zone has cars but no coach (already in the coach plan).
- Postcodes or polygons as a second coverage key, see "Known gaps".
- State aliases in `resolveZone`, if two zones ever need the same town name in two
  states.
- Vehicle photos per class, when the class cards get photos.
