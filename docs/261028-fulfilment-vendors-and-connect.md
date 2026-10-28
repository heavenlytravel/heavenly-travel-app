# Fulfilment: vendors, assignment and Connect

Status: designed with the user on 2026-10-27 and 2026-10-28, in conversation. Not built.
It is built in steps, one pull request each, in another thread (see "Build order"). The data
model below is a proposal: each step confirms its part of it before building, and the user
runs `db:push`.

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
  (`staging-connect.heavenlytravel.my` on staging). A third app beside `web` and `admin`.
- **`manage.`:** the admin app, as today.
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

### Vendors

- **Every vehicle and every driver belongs to one vendor.**
- **Heavenly Travel is the one vendor marked as ours.** What differs for it:

|                                   | Heavenly (ours) | Other vendors                         |
| --------------------------------- | --------------- | ------------------------------------- |
| Order in the picker               | First           | After ours                            |
| Cost to us                        | None            | Per trip, agreed in the offer         |
| Sign-up and approval              | None            | Signs up in Connect, `SUPER` approves |
| Its vehicles and drivers are kept | In `manage.`    | In Connect, and in `manage.` by staff |
| Accepts for the vendor            | Operation       | The vendor's owner or staff           |
| Its drivers accept their own jobs | Yes             | Yes                                   |

- **A vendor is a company or an individual.** An individual with a car is a vendor like
  any company. Without a car, they are a vendor whose only driver is themself.
- **A vendor serves one or more locations.** Each of its vehicles and drivers is based at
  one of them, as ours are today.
- **What a vendor offers is asked at sign-up for every kind:** car with driver, coach
  charter, driver only, self-drive rental, accommodation, attraction. Only transport
  works in Connect for now; the rest is a supplier list for Reservation until we sell it.
- **Vendors' vehicles never reach the website.** We sell our classes; vendors add
  capacity behind them. The class pictures and the models shown "or similar" read only
  Heavenly's vehicles (`modelsShownAt` in `packages/db/src/vehicle-models.ts`).

### Signing up

1. **`connect.heavenlytravel.my/sign-up`** asks for the business details: company or
   individual, name, SSM number (IC for an individual), contact person, phone, email,
   address, the locations served and what they offer. No account is made.
2. **It waits as Pending** until a `SUPER` reviews it in `manage.`.
3. **Approved:** the vendor is active, and the applicant's email gets owner access. If no
   account has that email yet, one is made, as the Users page makes one today. An email
   says they can sign in.
4. **Refused:** with a reason, staff only. No access.
5. **Only then can they sign in.** An account with no access to Connect sees a no-access
   page, as `manage.` does.

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
  - **Model:** picked from the class's models. A model typed new waits for `SUPER` with
    the vehicle, so a typo never enters the shared catalogue.
  - **Photos:** optional. They never reach the website.
- **Each new vehicle or driver from Connect waits for `SUPER`** before it can be assigned.
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
  insurance, inspection or permit expired on the trip's date, out of service, waiting
  for approval, or another job at that time. It shows each driver's day ("Ali: 8:00
  Airport → Datai, ends about 8:45").
- **Named or open.** Operation names a vendor's own vehicle or driver, and the vendor
  confirms; or asks a vendor for a vehicle, a driver or both, and the vendor chooses.
- **The offer** to a vendor holds the booking's trips, what is asked, the amount for each
  trip (with "same for every trip"), and a time to answer by.

### Acceptance

- **Every vendor accepts its offer.** For Heavenly that is Operation. The person assigning
  can accept our vehicle in the same step when they have already checked it; otherwise
  it waits in Operation's list like any other acceptance.
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

- **A cost per trip for each outside vendor on it,** agreed in the offer (OP-Q4: per job).
  Heavenly's is 0. Our drivers' own pay is still open (B-O2).
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
  - Being a vendor's owner or staff, or a driver whose row has the account, opens
    Connect.
  - One person can have both. Our Operation admins are staff of the Heavenly vendor.
- **A driver's account is linked by email.** A driver gets an email field; when an account
  with that email exists or is made, it is linked, as guest bookings are claimed in
  `packages/db/src/sync.ts`.
- **`getAccess`'s `"driver"` and `"partner"` areas become one `"connect"` area.** Today
  any admin passes them (`gateProfile` in `packages/db/src/session.ts`); Connect shows a
  vendor's own work, so it lets in members and drivers only.

### Who does what in `manage.`

| Who                | What                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `SUPER`            | Approve or refuse sign-ups; approve vendors' new vehicles, drivers and models; suspend a vendor                             |
| Operation          | Vendors and their fleets; assign; accept for Heavenly; record acceptances and reports for others; set costs; mark completed |
| Reservation, Sales | Confirm, as today                                                                                                           |
| Finance            | See the costs; pay them out later                                                                                           |

## Data model (proposal)

No enums: string columns checked against const arrays, as everywhere.

```
Vendor                                    new
  id
  name                "Heavenly Travel", "Ali bin Abu", "Pulau Coach Sdn Bhd"
  kind                "company" | "individual"
  isOurs              Boolean, true on Heavenly's row only
  status              "pending" | "active" | "refused" | "suspended"
  registrationNo      SSM number, or IC for an individual
  contactName, contactPhone, contactEmail, address
  offers              String[]: "car-with-driver" | "coach-charter" | "driver"
                      | "self-drive" | "accommodation" | "attraction"
  locations           Location[]          the locations it serves
  reviewNote          String?             why refused or suspended; staff only
  reviewedAt, reviewedById
  createdAt, updatedAt

VendorMember                              new, replaces PartnerProfile
  id, vendorId, userId
  role                "owner" | "staff"
  @@unique([vendorId, userId])

Vehicle             + vendorId  -> Vendor
                    + approvedAt  DateTime?   null while it waits for SUPER
Driver              + vendorId  -> Vendor
                    + email       String?     links their account
                    + approvedAt  DateTime?
VehicleModel        + approvedAt  DateTime?   a model a vendor typed waits with its vehicle
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
  costSen             Int, 0 for ours
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

One pull request per step. Production is live, so each step that changes the schema
pushes it, and runs its data script, before the merge. A script that writes to production
is rehearsed on a Neon copy first and backed up to a branch (PR #55).

**Before step 1, in a small PR of its own: pin the dev ports.** Web and admin each take
the first free port from 3000 today, so they swap between runs, and the Tailscale address
of one shows the other. The fix:

- `apps/web/package.json`: `"dev": "next dev --port 3000"`.
- `apps/admin/package.json`: `"dev": "next dev --port 3001"`.
- `CLAUDE.md`, "Development Workflow": replace "Dev ports are not pinned..." with the fixed
  ports, web 3000 and admin 3001, Connect 3002 once built, and BoothKita's 3200 left
  free on the same machine.
- `docs/260916-development-workflow.md`: the environments table's Local row, and the
  Tailscale table with the addresses on the same numbers (`:3000`, `:3001`). The old
  `:443` and `:8443` addresses still work.

Done when `pnpm dev` always puts web on 3000 and admin on 3001. Tailscale already serves
`:3000`, `:3001` and `:3002`, set up on 2026-10-28.

1. **Clean-up (BL-58, BL-69).** The columns, the table and the scripts the locations and
   fleet work left behind, including the base and minimum fare PR #51 stopped using.
   Tech Lead, 2026-10-22: they go with this work.
2. **Vendors in `manage.`.** The vendor tables. Heavenly as the first vendor, with every
   vehicle and driver moved under it: push `vendorId` as optional, run the script, then
   push it as required. Vendor screens for staff. The website reads only Heavenly's
   vehicles. Done when every vehicle and driver has a vendor, and Operation can enter an
   outside vendor's fleet.
3. **Assigning in `manage.`.** The drive time on new trips, the safety buffer, the picker
   with its reasons and warnings, offers with costs per trip, acceptances recorded by
   Operation, reopening a part, the board, the cancel rules for vendor costs, the
   customer's driver email, and "Mark assigned" gone. Done when every booking Operation
   assigns names who does each trip, and a clash is refused.
4. **Connect for drivers.** `apps/connect`, set up as in "Setting up Connect" below.
   Drivers sign in, see their jobs, accept or decline, and report the trip. Done when a
   driver completes a trip in Connect and Operation sees it without a call.
5. **Connect for vendors.** Sign-up and `SUPER`'s review, the vendor's owner access, its
   own vehicles and drivers on the shared forms with approval, and its offers. Done when
   a new vendor signs up, is approved, adds a car, and accepts a job.

## Setting up Connect (step 4)

Connect is a third Next.js app in the monorepo, `apps/connect`, built like `apps/admin`.
`pnpm dev` stays one command in one terminal: Turbo runs every app's `dev` task side by
side, three servers instead of two.

**Ports are pinned, and each Tailscale address uses the app's own port number.** Today
each app takes the first free port from 3000, so web and admin swap 3000 and 3001 between
runs, and a third app would land on 3002, which no Tailscale address serves. Web and admin
are pinned before step 1 (see "Build order"); Connect starts pinned. Each app's
`dev` script gets its own port:

| App     | Port | Tailscale address (testing from another machine) |
| ------- | ---- | ------------------------------------------------ |
| web     | 3000 | `https://akieez-h510m.tail4436c5.ts.net:3000`    |
| admin   | 3001 | `https://akieez-h510m.tail4436c5.ts.net:3001`    |
| connect | 3002 | `https://akieez-h510m.tail4436c5.ts.net:3002`    |

Port 3200 stays BoothKita's, so both projects can run at once. A pinned port that is
already taken stops that app with an error instead of moving it to another port. This
replaces "Dev ports are not pinned" in `CLAUDE.md`.

### In the repo (the PR does these)

1. `apps/connect` from `apps/admin`'s shape: `package.json` (name `connect`, the same
   `dev`, `build`, `lint` and `check-types` scripts), `next.config.ts` (with the tailnet
   host in `allowedDevOrigins`, as admin's), `tsconfig.json`,
   `eslint.config.js` (`next-js`), `postcss.config.js`, `proxy.ts` (session only, access
   checked per page), and `vercel.json` with `regions: ["sin1"]`.
2. Its own `/sign-in`, and `/sign-up` as the vendor application form, not Clerk's sign-up.
3. `CONNECT_URL` in `packages/db/src/origins.ts`, with `https://connect.heavenlytravel.my`
   as the default, for links in emails and between the apps. Add it to `globalEnv` in
   `turbo.json`.
4. A manifest and icons, so a driver can add Connect to their phone's home screen.
5. `CLAUDE.md`: add `apps/connect` to "Package Roles", and its port, 3002, beside web's
   and admin's.
6. Connect's `dev` script: `next dev --port 3002`. Web and admin are pinned by then.
7. `docs/260916-development-workflow.md`: the environments table, the branch model, "Show
   it on staging" (one push now deploys three apps), the Vercel configuration, and the
   Tailscale table with the three pinned ports.

### Vercel (the developer does these)

1. New project `connect` on the same GitHub repository, root directory `apps/connect`,
   production branch `main`.
2. Domains: `connect.heavenlytravel.my` → Production; `staging-connect.heavenlytravel.my`
   → Preview, Git branch `staging`.
3. Deployment Protection: Vercel Authentication off, as for `web` and `admin`.
4. Environment variables, the same split as `admin`:
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
   carries from `manage.` to `connect.`. The `user.*` webhook stays on the web app.
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
3. **A vehicle or driver staff add for an outside vendor in `manage.`:** active at once,
   since staff checked it, or waiting for `SUPER` like Connect's (step 2).
4. **No-show:** ends the trip as completed, the event saying no-show, and the vendor is
   paid. What the customer pays is B-O4 (step 4).
5. **How long contact details stay visible after a trip:** 3 days (step 4).
6. **Trips already marked Assigned on production,** with no vehicle or driver: count them
   before step 3, then leave them marked "assigned before vendors" or ask Operation to
   fill them in.

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
