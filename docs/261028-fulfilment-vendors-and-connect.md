# Fulfilment: vendors, assignment and Connect

Status: designed with the user on 2026-10-27 and 2026-10-28, in conversation, and settled
in review on 2026-10-28. Built on the branch `feat/fulfilment-vendors-connect`, not yet
merged. A small pull request went first (#58): it pins the dev ports
and renames `apps/admin` to `apps/manage`. Then this plan is built in one pull request,
in five steps, one commit or more each (see "Build order"). The data model below is a
proposal: each step confirms its part of it before building, and the user runs `db:push`.

Today a booking is received, confirmed, "assigned" and completed, but "assigned" is a
label only: nothing records which vehicle and which driver did the trip. Operation assigns
on WhatsApp, and drivers report on Telegram ("arrived at the lobby 8am", "customer came
8:15"). This plan closes the loop from a confirmed booking to a completed one:

- Every vehicle and driver belongs to a **vendor**, Heavenly Travel included.
- Operation assigns a booking to a vehicle and a driver, and **each one's owner accepts**.
- The driver **reports the trip** step by step in a new app, **Connect**.
- Outside vendors **sign up in Connect**, and keep their own vehicles and drivers there.

For the docs repo, it answers or changes: OP2-03, OP3-01 to OP3-03, OP5-*, OP8-02,
OP-Q2, OP-Q4, OP-D4, B-O5, R-21 and `plan/260912-dispatch-and-driver-portal.md` (`05e`).
See "What this changes elsewhere".

## Words

- **Vendor:** whoever supplies a vehicle, a driver or both. Heavenly Travel is one. So is
  "Ali", an independent driver, with or without a car of his own, and so is a coach
  company.
- **Connect:** the app vendors and drivers use, at `connect.heavenlytravel.my`
  (`staging-connect.heavenlytravel.my` on staging). A third app beside `web` and `manage`,
  in `apps/connect`. Its screens say "Heavenly Travel Connect"; a phone's home screen,
  "HT Connect". "Vendor" stays the name of the thing in the data and on its screens.
- **`manage.`:** the admin app, in `apps/manage` (`apps/admin` until the first pull
  request).
- **Trip:** one booking item. A booking holds one or more trips on one vehicle class
  (docs/261027-multi-trip-booking.md).

## Decisions

### The booking's life

```
received ──► confirmed ──► assigned ──► completed
    └────────────┴────────────┴──► cancelled
```

- **Received and Confirmed: unchanged for now.** Reservation confirms by hand.
- **Later, with HitPay** (chosen on 2026-10-27, over Stripe): a paid website booking
  confirms itself. A B2B booking on credit terms, and any booking that needs a review,
  still comes to Reservation. The rule: never take money for a trip we have not
  committed to, so a booking that needs a review is not paid at checkout; Reservation
  accepts it, then a payment link goes out. Payment is not part of this plan.
- **Assigned is no longer a button.** A trip is assigned once its vehicle and its driver
  are named and every acceptance is in (see "Acceptance").
- **Completed** comes from the driver's "Dropped off", or from Operation on their behalf.
- **The board's columns are worked out, not stored:** To assign, Waiting to accept,
  Assigned, On the road, Done. The item status stays one of today's five.
- **The board is for watching; cards are not dragged.** A card moves when someone acts:
  a vendor or driver accepts, a driver taps. Clicking a card opens it, and a card in To
  assign opens the assign panel with the picker. Dragging trips onto a driver's day is
  in "Later".
- **Where it lives in manage** (the Signature console's addresses, see
  `docs/261029-manage-signature-overhaul.md`): the board at `/[location]/board`, every
  location's under `~`; vendors under Fleet at `/[location]/fleet/vendors`, those serving
  a location under its slug; who does a trip and what its driver reported on the
  booking's page; the safety buffer on the location's Settings.

### Vendors

- **Every vehicle and every driver belongs to one vendor.**
- **A vendor is ours when `SUPER` switches it on,** on the vendor's page in `manage.`. No
  one else can. Heavenly Travel is ours from the start, set by the script that makes it,
  and a company Heavenly owns later can be switched on too. The code finds ours by the
  switch, never by the name, so a renamed vendor stays ours. What differs for ours:

|                                   | Ours                      | Other vendors                         |
| --------------------------------- | ------------------------- | ------------------------------------- |
| Order in the picker               | First                     | After ours                            |
| Cost to us                        | None                      | Per trip, agreed in the offer         |
| Sign-up and approval              | None                      | Signs up in Connect, `SUPER` approves |
| Its vehicles and drivers are kept | In `manage.`              | In Connect, and in `manage.` by staff |
| Accepts for the vendor            | Operation and `SUPER`     | The vendor's owner or staff           |
| Its drivers accept their own jobs | Yes                       | Yes                                   |
| Its vehicles reach the website    | Class pictures and models | Never                                 |

- **Ours has no members.** Accepting for ours is the `bookings.fulfil` permission in
  `manage.`: the Operation team, and `SUPER`, who holds every permission. One list, the
  Admins page, says who may.

- **A vendor is a company or an individual.** An individual with a car is a vendor like
  any company. Without a car, they are a vendor whose only driver is themself.
- **A vendor serves one or more locations.** Each of its vehicles and drivers is based at
  one of them, as ours are today.
- **What a vendor offers is asked at sign-up for every kind:** car with driver, coach
  charter, driver only, self-drive rental, accommodation, attraction. Only transport
  works in Connect for now; the rest is a supplier list for Reservation until we sell it.
- **Vendors' vehicles never reach the website.** We sell our classes; vendors add
  capacity behind them. The class pictures and the models shown "or similar" read only
  our vendors' vehicles (`modelsShownAt` in `packages/db/src/vehicle-models.ts`).
- **Suspending a vendor first shows its accepted bookings still to come** in a dialog:
  "Vendor A has 2 accepted bookings: HT-… Fri 8:00, HT-… Sat 9:00. Suspending takes its
  vehicle and driver off them." Confirming suspends it and puts those bookings back in
  To assign. Its owner, staff and drivers then see a suspended screen in Connect. **The
  same dialog** comes before a vehicle or driver is taken out of service.

### Signing up

**Since 2026-10-31 the form comes first, then the account** (PR `feat/auth-connect-onboarding`,
docs/261030-sign-in-connect-onboarding-and-media.md, "Connect"): `/register` takes the
whole form and a password, and sending it starts the sign-up, whose email code makes the
account and sends the registration together. An email with an account signs in instead,
and an account that registered already goes to its status page. `/join` and `/sign-up`
lead to `/register`; Connect's landing page at `/` leads there too. A pending vendor sees
its status page, not "Waiting for approval". What follows is the flow as first built.

Clerk first, then our form (decided 2026-10-28, replaced 2026-10-31):

1. **`connect.heavenlytravel.my/sign-up` is Clerk's sign-up,** with an email code.
   Someone who already has an account, a customer's for one, signs in instead. Clerk's
   bot protection keeps spam out, and the code proves the email is theirs.
2. **Then the registration form,** at `/register`: company or individual, name, SSM
   number (IC for an individual), contact person, phone, address, the locations served
   and what they offer. The email is the account's. The applicant is the vendor's owner.
3. **It waits as Pending** until a `SUPER` reviews it in `manage.`.
4. **Approved:** the vendor is active, and an email says Connect is open.
5. **Refused:** with a reason, staff only.

Connect checks who is signed in on each page and shows one screen per case, as
`manage.` shows "No admin access":

| Signed in as                                        | Sees                           |
| --------------------------------------------------- | ------------------------------ |
| Neither a vendor's member nor a driver              | The registration form          |
| A member of a pending vendor                        | "Waiting for approval"         |
| A member of a refused vendor                        | "Not approved", with a contact |
| A member, or a driver, of a suspended vendor        | "Suspended", with a contact    |
| A member of an active vendor, or one of its drivers | Connect                        |

Documents and scans (SSM certificate, permits, licences) are later. Until then a vendor's
vehicles and drivers carry the expiry dates ours do.

Our own drivers do not sign up: they are added in `manage.`, and their account is linked
by email (see "Accounts").

### A vendor's vehicles and drivers

- **The same forms in both apps, from one shared copy of the code.** The checks are
  already shared (`vehicle-input.ts`, `driver-input.ts` in `@repo/db`). It is one
  database, so a change in either app shows in the other at once.
- **In Connect the form is narrowed:**
  - **Location:** only the locations the vendor serves.
  - **Class:** only the classes on sale at that location. A driver's "may drive" classes
    are limited the same way.
  - **Model:** picked from the class's models, or typed new, which adds it to the
    catalogue at once. If typed models pile up with typos, a fixed list comes later
    (see "Later").
  - **Photos:** optional. They never reach the website.
- **No approval for each vehicle or driver.** The vendor's approval covers them: one
  saved in Connect can be assigned at once, as one staff add in `manage.`.
- **In `manage.`, Operation keeps every vendor's fleet:** to assign, to watch documents
  expire, and to enter a fleet for a vendor not yet on Connect, or one that never signs
  in.

### Assigning a booking

Assigning is Operation's work (`bookings.fulfil`).

- **One vehicle and one driver for the whole booking.** That is how Operation works, and
  a booking is one vehicle since PR #56. It is saved against each trip, so a change on one
  day works without a redesign. The screen assigns the booking; changing one trip is the
  exception.
- **Any vehicle with any driver:**

| Driver     | Vehicle    | Vehicle accepted by | Driver accepted by        | Cost to us     |
| ---------- | ---------- | ------------------- | ------------------------- | -------------- |
| Ours       | Ours       | Operation           | Our driver                | None           |
| Ours       | Vendor B's | Vendor B            | Our driver                | B, the vehicle |
| Vendor A's | Ours       | Operation           | Vendor A, then its driver | A, the driver  |
| Vendor A's | Vendor A's | Vendor A            | Vendor A, then its driver | A, one offer   |
| Vendor A's | Vendor B's | Vendor B            | Vendor A, then its driver | A and B        |

- **The picker** lists vehicles and drivers, ours first. One that cannot be used is shown
  greyed with the reason: not allowed on this class, a licence, PSV, road tax,
  insurance, inspection or permit expired on the trip's date, out of service, its vendor
  suspended, or another job at that time. It shows each driver's day ("Ali: 8:00
  Airport → Datai, ends about 8:45").
- **Named or open.** Operation names a vendor's own vehicle or driver, and the vendor
  confirms; or asks a vendor for a vehicle, a driver or both, and the vendor chooses.
- **The offer** to a vendor holds the booking's trips, what is asked, the amounts for each
  trip, one for the vehicle and one for the driver (with "same for every trip"), and a
  time to answer by. A vendor asked for both may quote less for the pair: that is two
  lower amounts.

### Acceptance

- **Every vendor accepts its offer.** For ours that is Operation or `SUPER`, in
  `manage.`. The person assigning can accept our vehicle in the same step when they have
  already checked it; otherwise it waits in Operation's list like any other acceptance.
- **Acceptance is kept for each part,** the vehicle and the driver, so a back-out reopens
  that part alone, even when one vendor supplies both.
- **Every driver accepts their own job, ours included.** It replaces the "acknowledge"
  step of `05e`. A vendor's owner names the driver, then that driver accepts. For a
  one-person vendor such as Ali, one tap covers both.
- **The booking is assigned once every vehicle and driver on it is accepted.**
- **A decline asks a short reason:** not available, too far, other.
- **A decline, no answer by the deadline, or a back-out after accepting reopens only that
  part.** If vendor B declines the vehicle, the driver who accepted stays and Operation
  looks for a vehicle. Operation can still release everything and start again.
- **Before Connect is built** (steps 2 and 3), Operation records an acceptance for the
  vendor or driver ("accepted by phone"), and the log keeps who recorded it. The flow is
  the same before and after Connect.
- **The customer gets an email once it is assigned:** the driver's name and phone, the
  plate, the model and the colour; and again when any of them changes (BL-46, BL-48).

### Clashes and timing

- **A vehicle or driver is busy from a trip's pickup to its end, plus the location's
  safety buffer.**
- **A trip's end:** an hourly hire has it already (`endsAt`). A one-way trip ends at its
  pickup plus Google's drive time. That time comes back from the route lookup pricing
  already makes (add `routes.duration` to the field mask in
  `packages/places/src/google.ts`), and is saved on the trip. Trips booked before it have
  an estimate from their distance.
- **Between two jobs:** the drive from the earlier job's drop-off to the next pickup.
  - In the picker's list, estimated from the straight-line distance and shown as "about":
    no Google call.
  - When Operation picks a driver or vehicle, one real route lookup for each neighbouring
    job. A few hundred a month, against the free 10,000.
  - The plain drive time, without live traffic, which is a dearer lookup. Traffic is what
    the buffer is for.
- **The safety buffer is per location:** 15 minutes to start, 0 turns it off. Roads differ
  by place, not by vendor. Drivers also arrive early.
- **Refused:** two jobs whose known times overlap, the same start or a start during an
  hourly hire. It is the rule a customer's own trips follow (`tripClashes` in
  `packages/db/src/trip-plan.ts`), applied across bookings.
- **Warned, never refused:** what rests on estimates, a drive time, the gap between jobs or
  the buffer. "Ali finishes at Datai about 8:45. Cenang is about 60 min away, so he
  arrives about 9:45 for a 9:00 pickup."
- **Whoever accepts owns the timing.** The warning shows when they accept, and the record
  keeps that they saw it. A vendor may have work from other companies we never see; the
  acceptance puts that on them. Our vehicle is accepted by Operation, so its timing is
  Operation's.
- **On the day, the driver's reports replace the estimates.** Dropped off at 8:43 means
  free from 8:43, plus the buffer. A driver past their estimated end flags their next
  job on the board, so Operation acts before a customer waits.

### On the day: the driver's reports

**On the way → Arrived at pickup → Passenger on board → Dropped off**, plus **No-show**
and **Report a problem**.

- **Dropped off completes the trip.** One tap, so fewer are forgotten.
- **Waiting is not a tap:** it is measured from Arrived to Passenger on board, for
  waiting charges and vendor questions later.
- **Each tap keeps its time,** with an optional note. A tap made without signal waits on
  the phone and is sent again, with an id made on the phone so a retry never counts
  twice (`05e` §5).
- **Operation sees each tap on the board,** can tap for a driver, and sees a trip past its
  estimated end with no Dropped off flagged.
- **Telegram is decided later.** One option: a bot posts each tap to the team's group and
  tells drivers of new jobs.

### What people see in Connect

|                       | Offers    | Jobs            | Vehicles and drivers | Customer details          |
| --------------------- | --------- | --------------- | -------------------- | ------------------------- |
| Vendor owner or staff | Its own   | All of its jobs | Keeps its own        | Once accepted             |
| A vendor's driver     | None      | Their own       | None                 | Their jobs, once accepted |
| Our driver            | Their own | Their own       | None                 | Their jobs, once accepted |
| One-person vendor     | Their own | Their own       | Their own            | Once accepted             |

- **An offer shows only the trip:** day and time, the pick-up and drop-off area, class,
  passengers and the amount. A declined offer leaks nothing.
- **Once accepted, whatever the job needs** (OP-Q2): name, phone, exact addresses,
  flights and notes.
- **Never the customer's price.**
- **Contact details hide some days after the trip,** and each view is logged (PDPA).

### Money owed to vendors

- **A cost per trip for the vehicle and for the driver,** owed to the vendor of each and
  agreed in the offer (OP-Q4: per job). Ours is 0. Our drivers' own pay is still open
  (B-O2).
- **Due once every trip of the booking is completed or late-cancelled.** For a 3-day
  booking, after day 3. Paying it out is Finance's work, later (OP6-03).
- **A cancelled trip:**
  - **Before its free-cancellation deadline:** the vendor gets nothing for it and is told.
    The deadline is the trip's pickup minus its cutoff, set per location and class and
    kept on the trip when booked (24 hours for cars and 48 for coaches to start).
  - **After it:** the vendor keeps that trip's cost by default. Operation can change it
    while cancelling, with a reason. If B-O4 decides late cancellations are free for the
    customer, the default changes to match.
- **Customers cancel one trip on its own already** (`checkCustomerTripCancel`,
  `cancelTripAsCustomer`, PR #56). Admins cancel a trip or the booking (`cancelItem`,
  `cancelBookingAsAdmin`). Nothing changes there.

### Accounts and access

- **One Clerk instance for all three apps.** They are subdomains of
  `heavenlytravel.my`, so one sign-in can carry across. To be checked on staging before
  relying on it. People sign in with their own email.
- **Access comes from rows, never a role column,** as today:
  - An admin profile opens `manage.`.
  - Being an owner or staff of an active vendor, or a driver of one whose row has the
    account, opens Connect. The other cases see a screen saying why (see "Signing up").
  - One person can have both: one of our admins who also drives, say.
- **A driver's account is linked by email.** A driver gets an email field; when an account
  with that email exists or is made, it is linked, as guest bookings are claimed in
  `packages/db/src/sync.ts`.
- **`getAccess`'s `"driver"` and `"partner"` areas become one `"connect"` area.** Today
  any admin passes them (`gateProfile` in `packages/db/src/session.ts`); Connect shows a
  vendor's own work, so it lets in members and drivers only.

### Who does what in `manage.`

| Who                | What                                                                                                                    |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `SUPER`            | Approve or refuse sign-ups; switch a vendor to ours; suspend a vendor; anything Operation does                          |
| Operation          | Vendors and their fleets; assign; accept for ours; record acceptances and reports for others; set costs; mark completed |
| Reservation, Sales | Confirm, as today                                                                                                       |
| Finance            | See the costs; pay them out later                                                                                       |

## Data model (proposal)

No enums: string columns checked against const arrays, as everywhere.

```
Vendor                                    new
  id
  name                "Heavenly Travel", "Ali bin Abu", "Pulau Coach Sdn Bhd"
  kind                "company" | "individual"
  isOurs              Boolean @default(false); SUPER switches it; true on
                      Heavenly's row from the script that makes it
  status              "pending" | "active" | "refused" | "suspended"
  registrationNo      SSM number, or IC for an individual
  contactName, contactPhone, contactEmail, address
  offers              String[]: "car-with-driver" | "coach-charter" | "driver"
                      | "self-drive" | "accommodation" | "attraction"
  locations           Location[]          the locations it serves
  reviewNote          String?             why refused or suspended; staff only
  reviewedAt, reviewedById
  createdAt, updatedAt

VendorMember                              new, replaces PartnerProfile; none for ours
  id, vendorId, userId
  role                "owner" | "staff"
  @@unique([vendorId, userId])

Vehicle             + vendorId  -> Vendor
Driver              + vendorId  -> Vendor
                    + email       String?     links their account
Location            + safetyBufferMinutes Int @default(15)
TripItemDetails     + driveMinutes Int?       Google's drive time, one-way trips

VendorOffer                               new: what one vendor is asked for one booking
  id, bookingId, vendorId
  status              "offered" | "accepted" | "declined" | "expired"
                      | "withdrawn" | "released"
  respondBy           DateTime
  declineReason       String?
  sentById, sentAt, answeredById?, answeredAt?

TripPart                                  new: the vehicle or the driver of one trip
  id
  itemId              -> BookingItem
  offerId             -> VendorOffer
  role                "vehicle" | "driver"
  vehicleId?          named vehicle; null until the vendor names it
  driverId?           named driver
  costSen             Int, 0 for ours: this part's amount for this trip
  vendorAcceptedAt    DateTime?           its vendor's acceptance, for this part
  driverAcceptedAt    DateTime?           the driver's own acceptance
  @@unique([itemId, role])

TripEvent                                 new, never edited or deleted
  id, itemId, driverId?, actorId?
  kind                "on-the-way" | "arrived" | "on-board" | "dropped-off"
                      | "no-show" | "problem"
  at                  DateTime            when it happened, by the phone's clock
  note                String?
  clientId            String @unique      made on the phone; a retry never counts twice
  createdAt
```

- **A reopened part is deleted;** the offer keeps its status and reason, and the activity
  log keeps the history, as for every other change.
- **One function works out "assigned"** from a booking's parts, offers and acceptances,
  as `bookingStatusOf` works out the booking's status today, and the result is stored for
  filtering.
- **`NEXT_ITEM_STATUS` loses Confirmed → Assigned.** Operation keeps "Mark completed" on a
  driver's behalf.
- **Dropped:** `PartnerProfile` (replaced) and `DriverProfile` (BL-69).

## Build order

Two pull requests (decided 2026-10-28).

**First, a small one: the dev ports and the `manage` folder.** No schema, no Connect.

- **Pin the dev ports.** Web and admin each took the first free port from 3000, so they
  swapped between runs, and the Tailscale address of one showed the other. Each app's
  `dev` script now names its port: web 3000, manage 3001, and Connect 3002 once built.
  BoothKita keeps 3200. A taken port stops `pnpm dev` with `EADDRINUSE` instead of moving
  the app. Tailscale serves `:3000`, `:3001` and `:3002` since 2026-10-28; the old `:443`
  and `:8443` still work.
- **Rename `apps/admin` to `apps/manage`,** the package `admin` to `manage`, so the folder
  matches its address, as `apps/connect` will. The paths in `CLAUDE.md`, the READMEs, the
  docs, `.gitignore` (the two lines that keep the coverage pages tracked) and the
  lockfile follow. `ADMIN_URL`, `AdminProfile` and "admin" for staff stay: they name
  people, not the app. The Vercel project `ht-admin` becomes `ht-manage`, and its Root
  Directory changes.
- **The READMEs** replace the starter text they still had.
- Its steps outside the code are under "Outside the code", "The first pull request".

Done when `pnpm dev` puts web on 3000 and manage on 3001, and `manage.` deploys from
`apps/manage`.

**Then one pull request for this plan,** built in the five steps below, each in its own
commits, on the branch `feat/fulfilment-vendors-connect`, rebased on `main` once the first
is merged.

**It pushes the schema twice,** because it removes things as well as adding them. The
code live on `main` reads every column it knows, so a column or table removed before the
merge breaks it, and so does a column made required. Each push goes through
`pnpm db:push:prod`: a rehearsal on a Neon copy, the typed confirmation, a backup branch,
then production (PR #55).

1. **Before the merge, push the additions:** the new tables and columns, `vendorId`
   still optional. Then run the vendor script's `:prod`: Heavenly as a vendor, with
   every vehicle and driver under it. Prisma warns of no data loss here; a warning means
   stop.
2. **Merge.** Vercel deploys code that no longer reads what goes, and always sets a
   vehicle's or driver's vendor.
3. **After the deploy, push the removals:** run the vendor script's `:prod` again, for
   anything added in between, then `pnpm db:push:prod` from `main`. It drops the columns
   of step 1, `PartnerProfile` and `DriverProfile`, and makes `vendorId` required.
   Prisma's data-loss warning is expected here and lists exactly those; anything else in
   it means stop. Nothing breaks while this waits, so it need not be the same hour.

The first push needs the schema without the removals. The pull request keeps them in its
last commit, and its body gives the commands for both pushes.

1. **Clean-up (BL-58, BL-69).** The columns, the table and the scripts the locations and
   fleet work left behind, including the base and minimum fare PR #51 stopped using.
   Tech Lead, 2026-10-22: they go with this work. Their removal is the second push.
2. **Vendors in `manage.`.** The vendor tables. Heavenly as the first vendor, ours, with
   every vehicle and driver moved under it by a script. Vendor screens for staff: the
   ours switch, suspending with its dialog. The website reads only our vendors'
   vehicles. Done when every vehicle and driver has a vendor, and Operation can enter an
   outside vendor's fleet.
3. **Assigning in `manage.`.** The drive time on new trips, the safety buffer, the picker
   with its reasons and warnings, offers with a vehicle and a driver amount per trip,
   acceptances recorded by Operation, reopening a part, the board, the cancel rules for
   vendor costs, the customer's driver email, and "Mark assigned" gone. Done when every
   booking Operation assigns names who does each trip, and a clash is refused.
4. **Connect for drivers.** `apps/connect`, set up as in "Setting up Connect" below.
   Drivers sign in, see their jobs, accept or decline, and report the trip. Done when a
   driver completes a trip in Connect and Operation sees it without a call.
5. **Connect for vendors.** Clerk's sign-up, the registration form and `SUPER`'s review,
   the screens for each case, the vendor's owner access, its own vehicles and drivers on
   the shared forms, and its offers. Done when a new vendor signs up, is approved, adds a
   car, and accepts a job.

## Setting up Connect (step 4)

Connect is a third Next.js app in the monorepo, `apps/connect`, built like `apps/manage`.
`pnpm dev` stays one command in one terminal: Turbo runs every app's `dev` task side by
side, three servers instead of two. Its port is 3002, pinned like web's and manage's, and
`https://akieez-h510m.tail4436c5.ts.net:3002` serves it on the tailnet.

**It looks like `manage.`:** the same sidebar, header, page headers, tables and cards.
The parts both apps need move from `apps/manage/app/_components` into one shared copy, not
two. Built in `packages/console` (`@repo/console`), not `@repo/ui` as first written: they
read `@repo/db`, and `@repo/ui` is built on its own with no dependency on it. Within that frame, the drivers' pages are built for a phone
first, with large buttons for the reports.

### In the repo (the PR does these)

1. `apps/connect` from `apps/manage`'s shape: `package.json` (name `connect`, the same
   `dev`, `build`, `lint` and `check-types` scripts), `next.config.ts` (with the tailnet
   host in `allowedDevOrigins`, as manage's), `tsconfig.json`,
   `eslint.config.js` (`next-js`), `postcss.config.js`, `proxy.ts` (session only, access
   checked per page), and `vercel.json` with `regions: ["sin1"]`.
2. Its own `/sign-in`; `/sign-up`, Clerk's, which leads to the registration form at
   `/register` (see "Signing up").
3. `CONNECT_URL` in `packages/db/src/origins.ts`, with `https://connect.heavenlytravel.my`
   as the default, for links in emails and between the apps. Add it to `globalEnv` in
   `turbo.json`.
4. A manifest and icons, so a driver can add Connect to their phone's home screen: the
   name "Heavenly Travel Connect", the short name "HT Connect".
5. `CLAUDE.md`: add `apps/connect` to "Package Roles", `connect` to the commit scopes,
   and its port, 3002, beside web's and manage's.
6. Connect's `dev` script: `next dev --port 3002`.
7. `docs/260916-development-workflow.md`: the environments table, the branch model, "Show
   it on staging" (one push now deploys three apps), the Vercel configuration, and the
   Tailscale table with the three ports.

### Vercel (the developer does these)

1. New project `ht-connect` on the same GitHub repository, root directory `apps/connect`,
   production branch `main`.
2. Domains: `connect.heavenlytravel.my` → Production; `staging-connect.heavenlytravel.my`
   → Preview, Git branch `staging`.
3. Deployment Protection: Vercel Authentication off, as for `ht-web` and `ht-manage`.
4. Environment variables, the same split as `ht-manage`:
   - **Production:** the production `DATABASE_URL`, the Production Clerk keys and its
     `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, the production `UPLOADTHING_TOKEN`,
     `RESEND_API_KEY`, `EMAIL_FROM`, `SITE_URL`, `ADMIN_URL` and `CONNECT_URL`.
   - **Preview:** the development database and the Development Clerk keys, the dev
     UploadThing app's token, and the staging addresses for the three URLs.
   - `GOOGLE_MAPS_SERVER_KEY` only if Connect calls Google itself.
5. Redeploy after setting the variables.

### DNS (at the `heavenlytravel.my` DNS provider)

1. `CNAME` `connect` → the value Vercel shows (usually `cname.vercel-dns.com`).
2. `CNAME` `staging-connect` → the same.
3. Wait until Vercel shows both domains as valid.

### Clerk and the other services

1. **Clerk:** no new instance. Development serves local and staging, and Production serves
   production, for all three apps. On staging and then production, check that one sign-in
   carries from `manage.` to `connect.`. The `user.*` webhook stays on the web app. Bot
   sign-up protection on in both instances, since Connect's sign-up is open to anyone.
2. **UploadThing:** no new app. Connect uses the same app as the database it reads
   (production, or `heavenly-travel-app-dev`), so Media's "delete unused" stays safe.
3. **Resend:** no change. The sending domain is already verified.
4. **Google:** only if Connect shows a map, add its two domains to the browser key's
   allowed websites.
5. **Tailscale, for testing from another machine:** nothing to do. `:3002` already points
   at port 3002, set up on 2026-10-28 with `tailscale serve --bg --https=3002 3002`.

### Docs repo

- `infrastructure/02` and `03`: the new Vercel project and the two DNS records.
- `ACCESS.md`: who reaches Connect, and how.

## To confirm while building

Each has a proposal; the step it belongs to settles it.

1. **The safety buffer** per location, 15 minutes to start (step 3).
2. **The default time to answer an offer:** 2 hours, never later than an hour before
   pickup; Operation can change it on each offer (step 3).
3. **No-show:** ends the trip as completed, the event saying no-show, and the vendor is
   paid. What the customer pays is B-O4 (step 4).
4. **How long contact details stay visible after a trip:** 3 days (step 4).

Settled on 2026-10-28: a vehicle or driver is usable once saved, in either app, with no
approval of its own. Production has no real bookings yet, so no trip marked Assigned needs
a vehicle or driver filled in; its real data is the operational kind (locations, zones,
rates, routes, classes, the fleet, the pages).

## Outside the code

What the developer and the team do, in the order it is needed. The pull requests do
everything else.

### The first pull request (ports and `apps/manage`)

- [ ] Any time: rename the Vercel project `ht-admin` to `ht-manage` (Settings → General →
      Project Name). Nothing in the code reads the name or Vercel's OpenID Connect token,
      so its warning does not apply. What follows the name: the preview addresses become
      `ht-manage-…vercel.app`, and the PR check reads "Vercel – ht-manage". If Google's
      browser key lists `ht-admin-…` preview addresses, add the new ones; if a GitHub
      ruleset requires the Vercel check, select the new name.
- [ ] Before the merge, in `ht-manage`: Settings → Build and Deployment → Root Directory
      `apps/manage`. Then redeploy the pull request's preview and check it
      builds. Until the merge, `main` would not build there, and nothing deploys it.
- [ ] Merge. Check https://manage.heavenlytravel.my and https://new.heavenlytravel.my.
- [ ] In each checkout of the repository: stop `pnpm dev`, pull or switch, then move
      `apps/admin/.env.local` to `apps/manage/.env.local`. Git does not move ignored
      files. Delete what is left of `apps/admin` (`node_modules`, `.next`), run
      `pnpm install`, start `pnpm dev`.
- [ ] Rebase any open branch on `main`. One still on `apps/admin` fails its `ht-manage`
      preview on Vercel until it is.
- [ ] Docs repo: the `apps/admin` paths become `apps/manage`.

### Before building this plan

- [ ] Collect an email for each of our drivers: Connect links their account by it.
- [ ] List the outside vendors: those staff enter in `manage.`, and those to invite to
      sign up.
- [ ] Settle the four items of "To confirm while building", and chase B-O2 (our drivers'
      pay) and B-O4 (what a late cancellation or a no-show costs the customer).

### Connect's services (before this plan's merge)

- [ ] Vercel: the `ht-connect` project, its domains, its environment variables and a
      redeploy, as in "Setting up Connect".
- [ ] Vercel: `CONNECT_URL` with the staging address in the Preview environment of `ht-web`
      and `ht-manage` too, so their links reach staging's Connect. Production needs none:
      the default is the production address.
- [ ] DNS: the `connect` and `staging-connect` records, until Vercel shows them valid.
- [ ] Clerk: bot sign-up protection on, in Development and Production.
- [ ] Google: only if Connect shows a map, its two domains on the browser key.

### The merge of this plan

- [ ] On development: `pnpm db:push`, the scripts, then test on staging.
- [ ] Before the merge: the first push and the vendor script, as in "Build order".
- [ ] Merge, then check `manage.`, `new.` and `connect.`.
- [ ] After the deploy: the vendor script again, then the second push.
- [ ] Clerk: one sign-in carries from `manage.` to `connect.`, on staging and production.
- [ ] In each checkout of the repository: stop `pnpm dev`, pull or switch, then add
      `apps/connect/.env.local` (the keys of `apps/connect/.env.example`: Clerk, the
      database, UploadThing, Resend and the email lines, `SITE_URL`, `ADMIN_URL`, and
      `CONNECT_URL=http://localhost:3002`; no Google keys), and `CONNECT_URL` in
      `apps/manage/.env.local`. Git does not carry ignored files. Run `pnpm install`,
      start `pnpm dev`: three apps, on 3000, 3001 and 3002.

### After

- [ ] Set each location's safety buffer if 15 minutes is wrong for it.
- [ ] Brief Operation on the board and the picker, and drivers on Connect: accept, then
      On the way, Arrived, On board, Dropped off.
- [ ] Docs repo sync, as in "What this changes elsewhere".

## What this changes elsewhere

For the docs repo's sync:

- **`plan/260912-dispatch-and-driver-portal.md` (`05e`):** the portal is Connect, one
  app for drivers and vendors at `connect.heavenlytravel.my`, not `driver.`. D1: drivers
  sign in with their own email on the shared Clerk, not a phone code. D2 (B-O5): the drive
  between jobs plus a per-location buffer, not a flat 60 minutes. D4 and OP-D4: every
  driver accepts, and may decline, ours included; acceptance replaces "acknowledge".
  OP-D6: work is assigned per booking and saved per trip.
- **`plan/260929-internal-operations-roadmap.md`:** OP-Q2 answered (whatever the job
  needs, once accepted); OP-Q4 answered (a cost per job); OP5 and OP8-02 are the one app;
  vendors (OP2-03) are designed here. OP-Q3 and B-O2, our drivers' pay, stay open.
- **`plan/260912-booking-and-payments.md` (`05c`):** HitPay, not Stripe; R-21 closed, the
  footer's payment marks stay. CEO-4 still applies, for HitPay. KD-16: when payment is
  built, a paid website booking confirms itself; Reservation still confirms B2B on terms
  and bookings that need a review.
- **`docs/261019-vehicles-and-drivers.md`, "Vendors, later":** designed here.

## Later

- **Paying vendors out** (OP6-03) and each booking's margin (OP6-06).
- **Telegram:** a bot for the team's group and for drivers' new jobs.
- **HitPay** (M4-11, TL7): the payment status, a payment link for staff bookings, unpaid
  bookings that cancel themselves.
- **Documents and scans** for vendors, vehicles and drivers, kept private (PDPA).
- **Offering one job to several vendors at once,** the first to accept getting it.
- **A vendor's record:** late back-outs and declines.
- **The customer seeing the driver's progress** ("your driver has arrived").
- **The other kinds of supplier** as products: self-drive rental, accommodation,
  attractions.
- **A portal for B2B customers.** Keep `business.` free for it.
- **Web push** to Connect on a phone.
- **A dispatch timeline, a big build:** one row per driver or vehicle, the hours across,
  the trips to assign in a tray, and a trip dragged onto a row opens the assign panel.
  It shows each day's gaps and clashes at a glance. On a computer only, since dragging
  on a phone is poor; every drag also needs a click. After Operation has used the
  board.
- **A fixed list of models,** if the models vendors type pile up with typos.
