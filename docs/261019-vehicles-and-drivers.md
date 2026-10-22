# Vehicle models, vehicles and drivers

Decided on 2026-10-19, and revised the same day once Operation answered: a customer
gets any model of the class they book, and choosing a particular model is an add-on the
location charges for; a vehicle's brand and model are typed on its form, and the models
come from the vehicles entered. The first part of OP2 in the docs repo's
`plan/260929-internal-operations-roadmap.md` §5.3: our own vehicles and drivers. Vendors
come later, on the same records. Built on `feat/admin-location-workflow`, in the same
pull request as `261018-location-work-and-class-catalogue.md`.

## Why

Operation keeps its vehicles and drivers in sheets. Assignment (OP3) and the driver portal
(OP5) cannot start until the app holds them: which vehicles are based where, whose
documents run out when, who may drive what.

A customer books a class and wants to see what they will ride in. We send whichever
model of the class is free; a VIP customer who wants the Alphard rather than the
Vellfire pays for the choice. The class list itself was placeholders; Operation's seating
table sets it.

## Decisions

### Three levels

```
Vehicle class   MPV VIP          what the customer books and pays for
  Model         Toyota Alphard   what the customer sees, and may pay to choose
    Vehicle     VLE1234          one unit: plate, colour, documents, where it is based
```

- A class and its models are one catalogue for every location. A model is in one class,
  and is its brand and its name: Toyota, Alphard.
- A vehicle is based at one location. Two Vellfires and three Alphards in Langkawi are
  five vehicles of two models.
- "Fleet" is not a screen name: the screens are Vehicles and Drivers, and the words are
  class, model and vehicle.

### The class list

From Operation's seating table, in `packages/db/prisma/class-list.ts`. Operation accepted
the values below for now, the ones first assumed included (2026-10-19). The models are
the ones each class starts with, as suggestions for the vehicle form; customers see a
model only once a vehicle of it is in service at their location.

| Class     | Category        | Models it starts with                     | Passengers | Luggage       |
| --------- | --------------- | ----------------------------------------- | ---------- | ------------- |
| Sedan     | car-with-driver | Toyota Vios, Honda City                   | Up to 3    | 2 medium bags |
| Sedan VIP | car-with-driver | Toyota Camry, Honda Accord                | Up to 2    | 2 medium bags |
| MPV       | car-with-driver | Toyota Innova, Toyota Veloz               | Up to 5    | 4 medium bags |
| MPV VIP   | car-with-driver | Toyota Vellfire, Toyota Alphard           | Up to 4    | 4 medium bags |
| Van       | car-with-driver | Nissan Urvan, Toyota Hiace                | Up to 7    | 7 medium bags |
| Coach     | coach-charter   | Scania 44-seater, Volvo 44-seater         | Up to 44   | 40 large bags |
| Coach VIP | coach-charter   | Scania VIP 27-seater, Volvo VIP 27-seater | 15 to 27   | 25 large bags |

- The table's "2 + 1" and "4 + 1" are the back seats plus the one beside the driver, so
  Sedan seats 3 and MPV 5. A VIP class seats its passengers in the back only. Fit stays
  by the class's maximum alone.
- Every model in a class seats the class's maximum with its luggage. A model that seats
  fewer belongs in a smaller class, so "any model of the class" never sends a group a
  vehicle too small.
- Coach is one size, 44 seats, from one passenger. Coach VIP keeps the old VIP coach's
  seats and luggage: Operation's table does not list it.
- Minibus and Midi coach are deleted, with their prices at every location. VIP coach
  becomes Coach VIP, slug `coach-vip`.
- The seed and the one-off script read the one list, so a fresh database and an
  existing one end up with the same classes and models.

### Deleting a class

- A booking keeps a snapshot of its class's name and category, and its receipt, so it
  reads the same if the class changes. It also keeps the link to the class: the amend
  keeps the same class by it, and assignment will look for vehicles of that class by it.
  Each location's offering and zone rates link to the class too.
- So a class is deleted only when no booking or vehicle uses it, and its offerings and
  zone rates go with it. A class still in use is switched off instead.
- There is no Delete in the console. Operation switches a class off; the one-off script
  deletes the two old classes.

### Models

- A model has a brand ("Toyota") and a name ("Alphard"), shown together as "Toyota
  Alphard", and nothing else: no photos, order or switch of its own. Models are listed
  by name.
- Models come from the vehicles entered. The vehicle form's brand and model each open a
  list of the ones entered before that narrows as you type, with "Create" under it for
  a new one (`Combobox` in `@repo/ui`, after shadcn's, on cmdk); saving finds the
  class's model of that brand and name, however it is cased, or adds it, logged against
  the class.
- A model no vehicle is of and no booking chose goes as soon as its last vehicle leaves
  it, so a model typed wrong and corrected leaves no suggestion behind. The models the
  class list starts with stay until a vehicle has been of them.
- There is no screen for models. The class's page inside a location lists our vehicles
  of the class based there, under its rates and rules, with "Add vehicle" opening the
  form with the class picked. The catalogue's class page lists its vehicles by location:
  Langkawi, "3 vehicles: 2 Toyota Vios, 1 Honda City", each row opening the location's
  Vehicles tab. The catalogue's cards give each location that sells the class its count
  of vehicles in service.

### Photos

Revised on 2026-10-20: the photos were the model's, one set for every location, so a
Penang customer would see a Langkawi plate. They are each vehicle's now.

- A vehicle has up to 12 photos, in order, each with an optional caption ("Interior"):
  its alt text is "Toyota Alphard, Interior", or the model's name alone. The first is
  the vehicle's cover. They are uploaded on the vehicle's form, through
  `/api/uploads/vehicle-image` (`fleet.manage`), several at once, and are moved,
  captioned and removed there. The upload is one hook, `use-image-upload.ts`, that the
  class picture uses too. `src/photos-input.ts` reads and checks the list.
- A location's customers see a model in the photos of its vehicles in service there, one
  vehicle's after another, the first entered first, at most 12.
- The class's picture at a location is the first photo of its first vehicle entered of
  those in service there with a photo (`classCoverOf`). Until a vehicle there has one,
  it is the catalogue's picture, which is meant to be neutral: a cut-out with no plate.
  Nothing more to upload: a location's cover follows its own vehicles. The location's
  Vehicle classes tab shows the same picture, as customers see it.

### The customer's choice of model

- The rule, from Operation: a customer books a class, and we send whichever of its models
  is free. A customer who wants a particular model pays for the choice.
- A location's customers see the models of the vehicles based there and in service. A
  model no vehicle there is of is not shown, so the site never sells a model the
  location cannot send.
- What the choice costs is the location's, on the class's offering (its Vehicle classes
  tab, beside the rates): a percentage of the trip's price before any odd-hours
  surcharge, or a flat amount, the same for every model of the class there. Empty, the
  customer cannot choose there. Choosing also needs two models or more there. The
  percentage and the amount follow the odd-hours surcharge's rules and limits, and its
  input: `ChargeInput` in the console, `checkCharge` and `parseCharge` in
  `src/rates-input.ts`.
- On the options page, a class's card shows its picture at the location and names its
  models ("Toyota Vellfire or Toyota Alphard, or similar"). Chosen, the card opens on its
  models, a tile each, two side by side and one on a phone, wide enough to see the
  vehicle: the first four, then "Show all 6 models" for the rest, so a long list does
  not push the next class far down. A tile's photos are swiped through in place
  (`PhotoCarousel`: snapping slides, arrows for a pointer, a dot per photo), a tap
  anywhere on the tile but the arrows chooses it, and "View" opens its photos large in a
  gallery, the page behind holding still:
  - where the location charges for the choice, "Choose your model (optional)": "Any MPV
    VIP, Included", ticked to start, then a tile per model at "+RM 40.00";
  - where it does not, "What we may send", to look at.
- A model chosen adds a line to the receipt, "Toyota Alphard, chosen" (with "+10%" for a
  percentage), and to the total. The URL carries it as `model`; the item keeps the model
  (a link, emptied if the model is deleted) and its name as a snapshot, and the receipt
  keeps the charge. A model that can no longer be chosen is refused at the confirm step.
- The booking emails, the customer's booking pages and the booking screen show the model
  under the vehicle. While the item is received or confirmed, the booking screen tells
  Operation in amber: "The customer paid to choose the Toyota Alphard. Send one. If none
  is free, call them before sending another vehicle." Operation calls, as they arrange the
  assignment. The app checks no availability until OP3: people keep this promise.
- The manual booking's vehicle step and the amend offer the same choice: "Any MPV VIP" or
  "Toyota Alphard +RM 40.00". An amend that changes it is logged as "Changed the model".
- The first version's tick box, "a similar vehicle is fine", is gone: a chosen model is
  paid for, so it is the one sent.

### Vehicles

- A vehicle has a plate, a class, a brand and a model, the location it is based at, a
  colour, the year it was made, whether it is in service, its photos, the expiry dates
  of its documents, and notes. The class is picked; the brand and the model are picked
  from the ones entered before or added new, the brand's models in the class first. Under them
  the form says when saving will add a model to the class, and names the class that has
  it already when it is another one.
- The plate is unique, kept in capitals without spaces: "vle 1234" is VLE1234.
- Its documents are what a vehicle that carries paying passengers keeps valid. Each is a
  date, empty when it does not apply:
  - road tax;
  - insurance;
  - the PUSPAKOM inspection;
  - the operating permit (APAD in Peninsular Malaysia).
- A document is valid through its day, due within 30 days of today in Malaysia, and
  expired after (`src/expiry.ts`). Lists show the due and the expired, amber and red,
  soonest first, and filter to them; the form says how far off each date is.
- A vehicle out of service keeps its history, its documents are not checked, and its
  model is no longer shown at its location unless another vehicle of it is in service
  there. One entered by mistake can be deleted.
- Saving, moving or deleting a vehicle refreshes the customer site's class cards, which
  name the location's models and show their photos.
- The customer sees no vehicle until assignment, when OP3 sends the plate, the colour,
  the model and the driver.

### Drivers

- A driver has a name, a phone (their WhatsApp), the location they are based at, the
  classes they may drive (a coach driver is not a sedan driver; at least one), the expiry
  dates of their driving licence and their PSV licence, whether they are active, and
  notes.
- `Driver` replaces `DriverProfile`, which nothing wrote to. A driver exists before they
  have an account: the account link is optional, set when the driver portal opens, and
  `getAccess("driver")` reads it as it read the profile, active or pending. The old
  table stays, unread, until a follow-up drops it: the push comes before the deploy, and
  the running code reads it at every sign-in.
- Licence dates show as the vehicles' documents do. One entered by mistake can be
  deleted.
- No IC number or licence number: Operation does not know yet whether one is needed, and
  an IC number is personal data to guard. Kept as an open question below.

### Screens and access

- One permission, `fleet.manage`, for Operation only: they assign drivers and vehicles
  (`ORGANISATION.md` in the docs repo). It reads, adds and changes both.
- Each location gains a Vehicles tab and a Drivers tab: in the Work group after Bookings
  once live or paused, and unnumbered in Setup while a draft. The panel says how many are
  in service or active and how many have a document (a driver's: a licence) due, and
  links to those due and to "Add". Each tab lists, filters to "Documents due" ("Licences
  due" for drivers), searches by plate, brand or model (a driver by name or phone), adds
  and opens:
  `/locations/[slug]/vehicles/[id]`, `/locations/[slug]/drivers/[id]`: the form across
  the page, and level with the title "History", to the record's own history page
  (`.../history`, as a class's and a booking's have too), and "Delete". Moving one to
  another location is a change of where it is based; the save opens that location's
  tab, and its page under the old location opens it at the new one.
- A location's History lists its vehicles' and drivers' changes with its own, under
  "Vehicles and drivers", for Operation: a move is in both locations' history. The
  catalogue's class page lists the class's vehicles to Operation alone.
- A live location's Today shows Operation a "Documents due" card when any vehicle or
  driver there has one.
- The sidebar's Operations group gains Vehicles and Drivers across locations, filtered by
  location and by documents due, each row opening inside its location. "Add vehicle" and
  "Add driver" there open `/vehicles/new` and `/drivers/new`: the same forms, with where
  it is based to choose, starting at the location the list is narrowed to. Saved, they go
  back to the list, narrowed as it was.
- A location with vehicles or drivers based at it cannot be deleted: the refusal says to
  move them first.

### Vendors, later

- A vendor's vehicles and drivers go in the same tables, with the vendor as their owner.
  The vendor portal reuses the same forms, against the same classes and models, so a
  vendor's Alphard is the customer's Alphard. A model a vendor runs that the catalogue
  lacks is added by its first vehicle, as ours are.

## Data model

```
VehicleModel                          new
  id
  vehicleClassId     -> VehicleClass
  brand              String @default("")  "Toyota"; empty only before db:set-class-list
  name               String           "Alphard"
  vehicles           Vehicle[]
  @@unique([vehicleClassId, brand, name])

Vehicle                               new
  id
  plate              String @unique
  vehicleModelId     -> VehicleModel
  locationId         -> Location
  colour             String
  year               Int?
  isActive           Boolean @default(true)
  roadTaxExpiresOn, insuranceExpiresOn, inspectionExpiresOn, permitExpiresOn
                     DateTime? @db.Date
  notes              String @default("")
  photos             VehiclePhoto[]

VehiclePhoto                          new
  id
  vehicleId          -> Vehicle, onDelete: Cascade
  url                String           on UploadThing (src/images.ts)
  caption            String @default("")
  sortOrder          Int

Driver                                new, in place of DriverProfile (no longer read)
  id
  userId             String? @unique  their account, once the portal opens
  locationId         -> Location
  name, phone        String
  vehicleClasses     VehicleClass[]   the classes they may drive
  licenceExpiresOn, psvExpiresOn
                     DateTime? @db.Date
  isActive           Boolean @default(true)
  notes              String @default("")

LocationVehicleClass
  + modelChoicePercent  Int?          what choosing a model adds, a percentage
  + modelChoiceFlatSen  Int?          or a flat amount; both null: no choosing

TripItemDetails
  + vehicleModelId    String?         -> VehicleModel, onDelete: SetNull
  + vehicleModelName  String?         snapshot

BookingItem.priceBreakdown (JSON)
  + model             { name, percent, amountSen } | null

ActivityLog
  + locationIds       String[] @default([])   the locations whose history an entry is
                                               in too: a vehicle's or a driver's; GIN
```

## Rollout

In each database, in this order, after the steps of
`261018-location-work-and-class-catalogue.md` (the push there and this one are the same
push):

1. Development only: the developer has cleared the bookings.
2. `pnpm db:push` (development), `pnpm db:push:prod` (production). In production it
   only adds tables and columns, so the code running until the deploy keeps working. In
   development, where the earlier versions were pushed, it also drops
   `TripItemDetails.similarModelOk` (the tick box), `VehicleModelPhoto` (the models'
   photos) and `VehicleModel.sortOrder` and `isActive`, and may ask to accept that:
   none of them was ever in production. A model photo uploaded in development is
   uploaded again on a vehicle.
3. `pnpm --filter @repo/db db:migrate-offering-rules` (and `:prod`), from the plan
   before.
4. `pnpm --filter @repo/db db:set-class-list` (and `:prod`), first with `-- --dry-run`,
   which prints every change and writes nothing: splits a model named before brands
   were kept, "Toyota Alphard", into its brand and name; sets the classes' names, seats,
   luggage and order, adds the models they start with, renames VIP coach, and deletes
   Minibus and Midi coach with their prices and models. A class that a booking, a
   vehicle or a driver still has is switched off instead and listed. Running it again
   changes nothing.
5. Deploy the code.
6. Operation sells Sedan VIP and MPV VIP at each location with their rates, sets the
   charge to choose a model where customers may, enters the vehicles with their photos
   and the drivers, and uploads a neutral picture for each class.

## Operation's answers

Given on 2026-10-19:

1. The class list's values stand for now, the assumed ones included. A vehicle's brand
   and model are typed freely, and the ones entered before are suggested.
2. The four documents are enough for now. Uploading them, PDF scans included, comes
   later.
3. A 30-day warning is right, for any document coming due.
4. Operation calls the customer when a chosen model is not free, as they arrange the
   assignment.
5. Whether a driver's IC or licence number is needed is not known yet.

## To raise with Operation

1. Whether a driver's IC or licence number is needed, for insurance or the authorities.
2. When a chosen model is not free on the day: is the charge refunded, or does the
   customer pick another model? And when another vehicle of a better class is sent
   instead?
3. The charge to choose a model, for each class at each location. None is set, so no
   customer can choose a model until Operation sets one.
4. Sedan VIP and MPV VIP are sold nowhere until each location adds them with its rates.

## Future work

Next, with assignment (OP3):

- A driver and a vehicle per item, picked from those of the class, in service, with valid
  documents and a driver allowed the class; a chosen model's item only from the vehicles
  of that model; the conflict check; off-road periods for a vehicle in service and leave
  for a driver.
- The vehicle and the driver sent to the customer when assigned: the plate, the colour,
  the model, the driver's name and phone, by email and WhatsApp.

Soon after:

- Availability per model at booking time: a chosen model refused, or warned of, when
  every vehicle of it at the location is taken.
- A daily email to Operation of the documents due, and the count across locations on the
  home page.
- The driver portal (OP5) on the account link: an invite by phone or email.

Later:

- Vendors, their vehicles and drivers, and the vendor portal on the same forms.
- Scans of the documents, PDF included, uploaded on the vehicle and the driver.
- The drivers' languages and photo, for the customer's message.
- Features on a model (captain seats, Wi-Fi), shown with its photos.
- A charge per model, should a location want the Alphard dearer than the Vellfire.
- A cover picked for each class at each location, should the first photo of its
  vehicles there not be the best picture of the class.
- A vehicle's cover beside its plate in the console's lists.
- Removing an unused photo's file from UploadThing by itself: a removed photo stays
  stored until SUPER deletes it on the Media screen (2026-10-22), as a
  page's replaced image does.
- Delete `db:set-class-list` once it has run on every database, drop `DriverProfile`, and
  drop the default of `VehicleModel.brand`, with BL-58.
