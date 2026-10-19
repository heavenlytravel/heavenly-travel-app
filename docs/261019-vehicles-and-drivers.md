# Vehicle models, vehicles and drivers

Decided on 2026-10-19. The first part of OP2 in the docs repo's
`plan/260929-internal-operations-roadmap.md` §5.3: our own vehicles and drivers. Vendors
come later, on the same records. Built on `feat/admin-location-workflow`, in the same
pull request as `261018-location-work-and-class-catalogue.md`.

## Why

Operation keeps its vehicles and drivers in sheets. Assignment (OP3) and the driver portal
(OP5) cannot start until the app holds them: which vehicles are based where, whose
documents run out when, who may drive what.

A customer books a class and wants to see what they will ride in. A VIP customer may ask
for an Alphard rather than a Vellfire. The class list itself was placeholders; Operation's
seating table sets it.

## Decisions

### Three levels

```
Vehicle class   MPV VIP          what the customer books and pays for
  Model         Toyota Alphard   what the customer sees: its photos
    Vehicle     VLE1234          one unit: plate, colour, documents, where it is based
```

- A class and its models are one catalogue for every location. A model is in one class.
- A vehicle is based at one location. Two Vellfires and three Alphards in Langkawi are
  five vehicles of two models.
- "Fleet" is not a screen name: the screens are Vehicles and Drivers, and the words are
  class, model and vehicle.

### The class list

From Operation's seating table, in `packages/db/prisma/class-list.ts`. Starred values are
assumed until Operation confirms them.

| Class     | Category        | Models                                        | Passengers | Luggage         |
| --------- | --------------- | --------------------------------------------- | ---------- | --------------- |
| Sedan     | car-with-driver | Toyota Vios, Honda City                       | Up to 3    | 2 medium bags   |
| Sedan VIP | car-with-driver | Toyota Camry, Honda Accord\*                  | Up to 2    | 2 medium bags   |
| MPV       | car-with-driver | Toyota Innova, Toyota Veloz                   | Up to 5    | 4 medium bags   |
| MPV VIP   | car-with-driver | Toyota Vellfire, Toyota Alphard               | Up to 4    | 4 medium bags   |
| Van       | car-with-driver | Nissan Urvan, Toyota Hiace\*                  | Up to 7    | 7 medium bags   |
| Coach     | coach-charter   | Scania 44-seater\*, Volvo 44-seater\*         | Up to 44   | 40 large bags\* |
| Coach VIP | coach-charter   | Scania VIP 27-seater\*, Volvo VIP 27-seater\* | 15 to 27\* | 25 large bags\* |

- The table's "2 + 1" and "4 + 1" are the back seats plus the one beside the driver, so
  Sedan seats 3 and MPV 5. A VIP class seats its passengers in the back only. Fit stays
  by the class's maximum alone.
- Every model in a class seats the class's maximum with its luggage. A model that seats
  fewer belongs in a smaller class, so "or similar" never sends a group a vehicle too
  small.
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

### Models and their photos

- A model has a name ("Toyota Alphard"), an order within its class, a switch for whether
  customers see it, and its photos.
- A model's photos are in order; the first is the model's cover. Each has an optional
  caption ("Interior"): its alt text is "Toyota Alphard, Interior", or the model's name
  alone. At most 12. They are uploaded through `/api/uploads/vehicle-model-image`
  (`coverage.manage`), several at once, and are moved, captioned and removed on the
  model's page. The upload is one hook, `use-image-upload.ts`, that the class picture
  uses too.
- The class's picture stays the class's cover: the options page and the location's
  product page show it on the class's card.
- Models are kept on their class's page, `/vehicle-classes/[id]`, in a Models card beside
  the form, and on `/vehicle-classes/[id]/models/[modelId]`. Both are behind
  `coverage.manage`, as the catalogue is. Their changes are logged against the class. A
  model is deleted only while no vehicle is of it; otherwise it is switched off. The
  catalogue's cards name each class's models.

### The customer's choice of model

- A class's card on the options page and on the location's product page names its models
  ("Toyota Vellfire or Toyota Alphard, or similar") and "See photos" opens them, model by
  model, in one gallery.
- Once a class with two or more models is chosen, the details panel offers "Model
  (optional)": "No preference", the default, or a model.
- A model picked shows a tick box, ticked: "A similar vehicle is fine if the Toyota
  Alphard is not free." Unticked, it reads "We will contact you before sending another
  vehicle."
- The price is the class's. A model never changes it.
- The URL carries it as `model` and, unticked, `similar=no`. The item keeps the model (a
  link, emptied if the model is deleted), its name as a snapshot, and the tick. A model
  the class no longer shows is refused at the confirm step.
- The booking emails, the customer's booking pages and the booking screen show it under
  the vehicle: "Toyota Alphard, or a similar vehicle", or "Toyota Alphard only: we ask
  before sending another". "Only" is marked in amber on the booking screen while the item
  is received or confirmed. The app checks no availability until OP3: people keep this
  promise.
- The manual booking's vehicle step and the amend offer the same choice. An amend that
  changes it is logged as "Changed the model".

### Vehicles

- A vehicle has a plate, a model (so a class), the location it is based at, a colour, the
  year it was made, whether it is in service, the expiry dates of its documents, and
  notes.
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
- A vehicle out of service keeps its history and its documents are not checked. One
  entered by mistake can be deleted.
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
- No IC number: it is not needed yet, and it is personal data to guard.

### Screens and access

- One permission, `fleet.manage`, for Operation only: they assign drivers and vehicles
  (`ORGANISATION.md` in the docs repo). It reads, adds and changes both.
- Each location gains a Vehicles tab and a Drivers tab: in the Work group after Bookings
  once live or paused, and unnumbered in Setup while a draft. The panel says how many are
  in service or active and how many have a document due, and links to those due and to
  "Add". Each tab lists, filters to "Documents due", adds and opens:
  `/locations/[slug]/vehicles/[id]`, `/locations/[slug]/drivers/[id]`, each with its
  history and the delete. Moving one to another location is a change of where it is
  based; the save opens that location's tab.
- A live location's Today shows Operation a "Documents due" card when any vehicle or
  driver there has one.
- The sidebar's Operations group gains Vehicles and Drivers across locations, read
  only, filtered by location and by documents due, each row opening inside its location.
- A location with vehicles or drivers based at it cannot be deleted: the refusal says to
  move them first.

### Vendors, later

- A vendor's vehicles and drivers go in the same tables, with the vendor as their owner.
  The vendor portal reuses the same forms, against the same classes and models, so a
  vendor's Alphard is the customer's Alphard. A model a vendor runs that the catalogue
  lacks is added by Operation.

## Data model

```
VehicleModel                          new
  id
  vehicleClassId     -> VehicleClass
  name               String           "Toyota Alphard"
  sortOrder          Int
  isActive           Boolean @default(true)
  photos             VehicleModelPhoto[]
  vehicles           Vehicle[]
  @@unique([vehicleClassId, name])

VehicleModelPhoto                     new
  id
  vehicleModelId     -> VehicleModel, onDelete: Cascade
  url                String           on UploadThing (src/images.ts)
  caption            String @default("")
  sortOrder          Int

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

TripItemDetails
  + vehicleModelId    String?         -> VehicleModel, onDelete: SetNull
  + vehicleModelName  String?         snapshot
  + similarModelOk    Boolean @default(true)
```

## Rollout

In each database, in this order, after the steps of
`261018-location-work-and-class-catalogue.md` (the push there and this one are the same
push):

1. Development only: the developer has cleared the bookings.
2. `pnpm db:push` (development), `pnpm db:push:prod` (production). It only adds
   tables and columns, so the code running until the deploy keeps working.
3. `pnpm --filter @repo/db db:migrate-offering-rules` (and `:prod`), from the plan
   before.
4. `pnpm --filter @repo/db db:set-class-list` (and `:prod`): sets the classes' names,
   seats, luggage and order, adds their models, renames VIP coach, and deletes Minibus and
   Midi coach with their prices. A class that a booking or a vehicle still uses is
   switched off instead and listed. Running it again changes nothing.
5. Deploy the code.
6. Operation sells Sedan VIP and MPV VIP at each location with their rates, uploads the
   class pictures and the models' photos, and enters the vehicles and drivers.

## To raise with Operation

1. The starred values above: Honda Accord in Sedan VIP, Toyota Hiace in Van, the coach
   models, Coach VIP's seats and luggage, and Coach's luggage.
2. The documents a vehicle keeps: road tax, insurance, PUSPAKOM and the operating permit
   are assumed. Is anything else tracked (a MOTAC licence, the commercial insurance
   apart), and do they want the scans kept?
3. Whether 30 days is the right warning.
4. Who calls the customer on a "model only" booking when the model is not free:
   Reservation, who confirms, or Operation, who assigns.
5. Whether a driver's IC or licence number is needed, for insurance or the authorities.
6. Sedan VIP and MPV VIP are sold nowhere until each location adds them with its rates.

## Future work

- Delete `db:set-class-list` once it has run on every database, and drop
  `DriverProfile`, with BL-58.
- Assignment (OP3): a driver and a vehicle per item, picked from those of the class, in
  service, with valid documents and a driver allowed the class; the conflict check; the
  "model only" check against the vehicles of the model; off-road periods for a vehicle
  in service and leave for a driver.
- The vehicle and the driver sent to the customer when assigned: the plate, the colour,
  the model, the driver's name and phone, by email and WhatsApp.
- Availability per class and model at booking time, and then a guaranteed model, maybe
  for a fee.
- The driver portal (OP5) on the account link: an invite by phone or email.
- Vendors, their vehicles and drivers, and the vendor portal on the same forms.
- A daily email to Operation of the documents due, and the count across locations on the
  home page.
- Scans of the documents, uploaded on the vehicle and the driver.
- The drivers' languages and photo, for the customer's message.
- Features on a model (captain seats, Wi-Fi), shown with its photos.
- Removing an unused photo's file from UploadThing: a removed photo stays stored, as a
  page's replaced image does.
- Links from the Activity screen to a vehicle's or a driver's page.
