# Coverage: states, districts and the pickup point

Status: decided and built on 2026-09-30, in PR D (`feat/ops-screens`, #27). This replaces
the Zones half of `260930-ops-screens.md`: the town-list model that document designed
was built, reviewed and set aside the same day for the model here. Where this document
differs from `260930-ops-screens.md` or `260923-car-with-driver.md`, this one wins.

## The decision

Coverage is a switch per district on Malaysia's fixed list of states and districts. A
pickup is placed in a district by its coordinates, against district boundaries we hold
as data. Ops never types a place name: the list is Malaysia's, and the only two things
ops changes are whether a district is served and what a state's price multiplier is.

Why not the town list of `260930-ops-screens.md`: Google returns no administrative
district for Malaysian places, only the town (`locality`), and the town list had to be
grown by hand from real results. That made coverage depend on Google's spelling and on
ops keeping a list. It also failed for the most typed pickup of all, "klia2", which
carries no town. Coordinates have neither problem: every place Google returns has a
latitude and longitude, and a point either falls inside a district boundary or it does
not.

### Boundaries as data

- Source: [geoBoundaries.org](https://www.geoboundaries.org), Malaysia ADM1 (the 13 states
  and 3 federal territories) and ADM2 (the districts), boundaries representative of 2020,
  release built December 2023, licence CC BY 4.0. The attribution line lives in the data
  file and must stay wherever the data is used: "Administrative boundaries courtesy of
  geoBoundaries.org".
- `packages/db/data/malaysia-districts.json`, 0.5 MB, built once by
  `pnpm --filter @repo/db db:build-districts <folder>` from the simplified geoBoundaries
  files, simplified again to about 50 m. It holds 16 states with their ISO 3166-2 codes
  and 160 districts, each with a code (the slug of its name), its state, a point surely
  inside it, its bounding box and its boundary.
- The ADM2 file has no unit for Putrajaya, so the build adds the territory itself as its
  own district. A district's state is found by where the district's inside point falls
  in the ADM1 shapes. Five geoBoundaries spellings are replaced: Malacca to Melaka, Ulu
  Langat and Ulu Selangor to Hulu, Kulaijaya to Kulai, "Nabawan / Persiangan" to Nabawan.
- The file is loaded once per process on the server by `district-index.ts`, never sent to
  the browser. Rebuild it only when geoBoundaries publishes a new release; the codes are
  slugs of names, so a release that renames a district needs the seed to follow.

### Placing a point

`districtCodeAt(lat, lng)` in `district-index.ts`, pure and unit-tested:

1. Every district whose bounding box holds the point is tested with a point-in-polygon
   check (ray casting, holes respected). Of several hits the smallest wins: the ADM2
   shape of Sepang wraps Putrajaya.
2. A point in no district but within 3 km of one takes the nearest, measured to the
   boundary's edges. Jetties, beach hotels and piers sit past the shoreline the data
   draws; the first run against Google put every Pantai Cenang hotel and the Pulau Ketam
   jetty in the sea.
3. Further out, or outside Malaysia, the point is in no district and the pickup is not
   served.

`resolveDistrict(place)` in `coverage.ts` turns the code into the database row with its
state. `quoteTrip` refuses a pickup whose district is off or missing with "We do not
serve that pickup area yet", and prices with the state's multiplier.

### Data model

```
State      code String @id        (ISO 3166-2, "MY-10")
           name String
           multiplier Float @default(1)
           updatedAt
District   code String @id        (slug of the name, "petaling")
           name String
           stateCode -> State
           isActive Boolean @default(false)
           updatedAt
BookingItem.districtCode String? -> District   (replaces zoneId)
```

`Zone` and `ZoneDistrict` are dropped. Bookings made before this change lose their zone
link; their pickup place, price receipt and multiplier are still in the snapshot. The
push is `pnpm db:push` then `pnpm --filter @repo/db db:seed`; production the same with
`:prod`, right before the merge, by the developer.

The seed upserts every state and district from the data file, refreshing names only: an
existing row keeps its switch and its multiplier. A district created by the seed starts
on when it is in the launch list (Kuala Lumpur, Putrajaya, Petaling, Klang, Gombak, Hulu
Langat, Sepang, Langkawi, the five Penang districts, Melaka Tengah, Alor Gajah, Jasin,
Johor Bahru, Kulai, Cameron Highlands), which is the coverage the town list gave.

### The multiplier

Per state, not per district: prices do not differ inside a state today, and every
multiplier is 1. It may not be needed at all; it stays because it costs nothing and
`priceTrip` already takes it. If pricing ever differs inside a state it moves to the
district.

### What Google is used for

Search, place details and driving distance, as before. Not for districts: the Geocoding
API is not enabled and is not needed. One change to search: suggestions whose types
name an area rather than a spot (a town, a suburb, a state, a postcode, a road) are
dropped before the customer sees them, because Google pins those in the middle of the
area and that is no pickup point. `searchPlaces` takes `includeAreas` for the coverage
check, which asks for towns by name on purpose.

Two more layers from the same advice are on record for the customer flow, not built
here: refusing a pick whose viewport is wider than a few hundred metres, and confirming
the pickup with a draggable pin on a map, with the district check run on the pin.

### The activity log

`state.updated` (the multiplier) and `district.updated` (the switch), logged against
the row's code, `customerVisible` false. The entity types `state` and `district` replace
`zone`. A state's page shows its own entries and its districts' together.

## The Coverage screen

Route `/coverage`, permission `coverage.manage`, sidebar item "Coverage" under
Operations. It replaces the Zones screen.

- **Test an address** at the top: the same autocomplete field the website uses. Picking
  a place shows its address, its coordinates, the district and state they fall in with a
  link to the state, and whether that district is on. A point in no district says so.
  Without a Google key the field offers the districts themselves and says so.
- **The list**, one row per state, by name: the state linking to its page, districts on
  as "9 of 9", the multiplier as "×1.20" or "no change", and when the state or any of
  its districts last changed, from the log.

The state's page, `/coverage/[code]`:

- **Districts** as a table: name, a switch, and when the row last changed. Turning a
  district off asks first: "Customers with a pickup in Sepang will be told the area is
  not served yet. Existing bookings are not changed."
- **Price**: the multiplier, saved on its own, with "A RM 100 trip becomes RM 120" as it
  is typed.
- **History**: the state's entries and its districts'.

Explanations sit behind a small "i" tooltip (`@repo/ui/info-tip`), not in running text.

## The Vehicle classes screen, revised

Unchanged in what it edits. "Add class" and "Edit" open pages, `/vehicle-classes/new`
and `/vehicle-classes/[id]`, instead of a side sheet; the class page shows the class's
history beside the form. Field help is in tooltips.

"Fleet", the vehicle units (two Vellfire, six S-Class) that belong to a class and are
assigned to bookings, is a later phase (OP2 in the roadmap) with its own design.
Nothing is named Fleet yet.

## Coverage check

`pnpm --filter @repo/places check-coverage [district ...]` geocodes the same 208 real
places as before and reports the district each lands in by its coordinates, next to the
district it is known to sit in. Run it after a new release of the boundary data and when
a customer reports a served place as not served.

Run on 2026-09-30 with 208 places: 208 landed in the expected district. What the runs
found on the way, and what changed because of it:

1. **Coastal points.** Every hotel on Pantai Cenang, the Kuah jetty, the Pulau Ketam
   jetty and Morib beach fell in the sea, a few hundred metres past the shoreline the
   data draws. Hence the nearest-district rule within 3 km.
2. **Nested shapes.** Putrajaya Sentral landed in Sepang, whose ADM2 shape wraps the
   territory. Hence the smallest-shape rule.
3. **Border places.** Gombak LRT Station sits on the Kuala Lumpur line and lands in
   Gombak; Queensbay Mall and Sungai Ara sit on the Timur Laut line and land there,
   although Google calls their town Bayan Lepas. The boundary data decides; all three
   districts are on, so no customer is refused.
4. **Corrections to what we thought.** Sekinchan is in Sabak Bernam, not Kuala
   Selangor; Bukit Rahman Putra and Bandar Sri Damansara are in Petaling; Kota Kemuning
   is in Klang; IOI City Mall is in Sepang, not Putrajaya. The town list had these
   right by accident or not at all.
5. **The town filter.** With area suggestions dropped, a search for a town name such
   as "Bukit Mertajam" returns a shop of that name somewhere else. The check asks for
   areas on purpose; the customer fields do not, and a customer types a building.

## Future work, on record

- The viewport check and the pin confirmation in the customer flow, see above.
- Per-district multipliers, if pricing ever differs inside a state.
- Per-category coverage, when a district has cars but no coach (already in the coach
  plan).
- A map of the districts on the Coverage screen, when there is a map component.
