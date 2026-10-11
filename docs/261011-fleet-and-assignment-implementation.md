# Fleet and assignment: the implementation, end to end

Status: implementation plan, written on 2026-10-11 and built the same day. It extends
`261010-fleet-and-assignment.md`, which holds the decisions and their grades and is not
replaced by this file. Where the two differ, this one wins: it was written against the
code at `main` `b963194`, with each file read.

The plan was built in one go, in one worktree against the throwaway Neon branch
`feat-fleet`, and tested as a whole: lint, types, 245 unit tests, and a browser
click-through of §9 with the Operation and Reservation accounts, all green. "How to
build it" at the end says how. The driver portal, money and the customer's view of the
assignment stay out, as decided.

What the build changed from the plan:

- **Two PRs, not five.** The docs PR first, then one feature PR with the commits split by
  concern (db, icons, Fleet and Vendors screens, assignment, Schedule, doc amendments).
  The schema, `routes.ts`, `nav.ts`, `activity-actions.ts` and the exports are shared by
  every slice, so cutting them into PRs B to E would have meant PRs that do not compile
  on their own. One schema push covers everything.
- **The assign form is controlled.** React resets an uncontrolled form once its action
  answers, so a refused save (a clash) emptied the selects. The form keeps its values in
  state, as the customer confirm form does, and is keyed by the item's assignment so a
  change or an unassign starts it afresh.
- **A vehicle's label change reads "Renamed to …"** in the history, like a class's name.

## Contents

1. The result, in one paragraph
2. Schema
3. `packages/db`: modules, signatures, log vocabulary
4. `apps/admin`: routes, navigation, screens, actions
5. The customer site: nothing
6. Older documents to amend
7. Tests
8. How to build it: worktree, Neon branch, one-shot order, the five PRs
9. Acceptance walk-through
10. Things to decide while building

---

## 1. The result

Operation opens Fleet and sees its vehicles and drivers, each with expiry dates coloured
when near. It opens Vendors and sees the companies it subcontracts to. On a confirmed
booking item it presses Assign, picks a driver and a vehicle, or a vendor and a cost, and
the item becomes "Driver assigned" with the names on the card and in the history. If the
driver or vehicle already has a trip at that time it is refused with the other booking's
reference, unless "Assign anyway" is ticked. Unassign puts the item back to Confirmed.
The Schedule page lists one day's trips in pick-up order with who does each. The
Dashboard shows one more number: documents expired or expiring within 30 days.

---

## 2. Schema

All in `packages/db/prisma/schema.prisma`. Plain strings, no enums, as the file does
everywhere. `db push` applies it; there are no migrations.

### 2.1 Remove `DriverProfile`, add `Driver`

Delete the `DriverProfile` model and the `driverProfile DriverProfile?` line on `User`.
Add, under a new section comment "Fleet. See docs/261010-fleet-and-assignment.md":

```prisma
/// A person Operation assigns to a trip, on the payroll or not. Linked to a
/// User only once the driver portal exists; `userId` is null until then.
model Driver {
  id               String    @id @default(cuid())
  name             String
  /// Normalised as booking phones are: digits and a leading plus.
  phone            String
  isActive         Boolean   @default(true)
  /// Driving licence expiry, as a Malaysian calendar day at 00:00 +08:00.
  licenceExpiresAt DateTime?
  /// PSV (public service vehicle) licence expiry, same shape.
  psvExpiresAt     DateTime?
  notes            String?
  userId           String?   @unique
  user             User?     @relation(fields: [userId], references: [id], onDelete: SetNull)
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  items BookingItem[]

  @@index([isActive, name])
}
```

On `User`, where `driverProfile` was: `driver Driver?`.

`PartnerProfile` is unchanged.

### 2.2 `Vehicle`

```prisma
/// One car or coach Heavenly owns or runs. The class is a label for the
/// assign form, not a rule: Operation may put a booked class in a bigger car.
model Vehicle {
  id                 String       @id @default(cuid())
  /// Upper case, no spaces or dashes: "WXY1234". Shown with a space.
  plate              String       @unique
  /// "Toyota Alphard 2021, white"
  label              String
  vehicleClassId     String
  vehicleClass       VehicleClass @relation(fields: [vehicleClassId], references: [id])
  isActive           Boolean      @default(true)
  roadTaxExpiresAt   DateTime?
  insuranceExpiresAt DateTime?
  notes              String?
  createdAt          DateTime     @default(now())
  updatedAt          DateTime     @updatedAt

  items BookingItem[]

  @@index([isActive, plate])
}
```

On `VehicleClass`: add `vehicles Vehicle[]`.

### 2.3 `Vendor`

```prisma
/// A company whose cars and drivers do trips for Heavenly. Its own drivers
/// and cars are not recorded; the assignment note names them per trip.
model Vendor {
  id          String   @id @default(cuid())
  name        String
  contactName String?
  phone       String?
  email       String?
  isActive    Boolean  @default(true)
  /// Free text, what the rates sheet says: "Alphard KLIA to KL RM250".
  rateNotes   String?
  notes       String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  items BookingItem[]

  @@index([isActive, name])
}
```

### 2.4 `BookingItem`: the assignment

Add after `priceOverrideReason`:

```prisma
  /// Who does the trip, set while `status` is "assigned": our driver and
  /// vehicle, or a vendor. All null otherwise, except on a cancelled item,
  /// which keeps them as a record. See src/assignment.ts for the rule.
  driverId        String?
  driver          Driver?  @relation(fields: [driverId], references: [id])
  vehicleId       String?
  vehicle         Vehicle? @relation(fields: [vehicleId], references: [id])
  vendorId        String?
  vendor          Vendor?  @relation(fields: [vendorId], references: [id])
  /// What the vendor charges us for this trip, when known. Vendor only.
  vendorCostSen   Int?
  /// "Ali, WXY 1234" for a vendor's driver; anything for the job sheet.
  assignmentNote  String?
```

Add two indexes for the conflict check and the schedule:

```prisma
  @@index([driverId, status, startsAt])
  @@index([vehicleId, status, startsAt])
```

The existing `@@index([status, startsAt])` serves the Schedule page.

### 2.5 Update the `ActivityLog` comment

The `entityType` comment gains `| "vehicle" | "driver" | "vendor"`.

---

## 3. `packages/db`

Every new module follows the two that exist for vehicle classes: a browser-safe
`*-input.ts` with the field list, labels, checks and parser, and a server `*.ts` with
readers and writers that log inside their transaction. Exports go through `index.ts`
(browser-safe) and `server.ts` (server), in the same style as the lines already there.

### 3.1 `permissions.ts`

Add one rule, after `coverage.manage`:

```ts
  /** Vehicles, drivers and vendors. */
  "fleet.manage": ["OPERATION"],
```

`permissions.test.ts`: `WALL.OPERATION` gains `"fleet.manage"`. Nothing else changes;
the file's loops cover the new key.

### 3.2 `session.ts`

- `withProfiles.include`: `driverProfile: true` becomes `driver: true`.
- `getAccess`, case `"driver"`: `gateProfile(user, isAdmin, user.driver)`. The
  `gateProfile` signature (`{ isActive: boolean } | null`) already fits a `Driver`.
- The doc comment "driver -> active driver profile" becomes "driver -> active driver
  row". No other file reads `driverProfile` (checked with grep across `apps` and
  `packages`).

### 3.3 `booking-rules.ts`: three additions

```ts
/**
 * How long a one-way trip is taken to occupy its driver and vehicle, for the
 * conflict check. A placeholder until Operation says otherwise; an hourly
 * hire uses its own hours. See docs/261010-fleet-and-assignment.md, D5.
 */
export const ONE_WAY_BLOCK_HOURS = 3;

/** Days before an expiry at which the fleet lists turn amber. */
export const EXPIRY_WARNING_DAYS = 30;

/** A Malaysian calendar day as ops reads it: "3 Oct 2026". */
export function formatLocalDate(instant: Date): string;
```

`formatLocalDate` is an `Intl.DateTimeFormat` with `timeZone: BOOKING_RULES.timeZone`,
`day: "numeric", month: "short", year: "numeric"`, built once at module level like
`localDateTime` is. A date-only form value becomes an instant with the existing
`pickupInstant(date, "00:00")`, and an instant becomes an input value with
`localDateTimeInputs(instant).date`. Nothing new is needed for dates beyond the format.

### 3.4 `fleet-input.ts` (new, browser-safe)

```ts
export type VehicleFields = {
  plate: string; // normalised
  label: string;
  vehicleClassId: string;
  isActive: boolean;
  roadTaxExpiresAt: Date | null;
  insuranceExpiresAt: Date | null;
  notes: string | null;
};
export type DriverFields = {
  name: string;
  phone: string; // normalised
  isActive: boolean;
  licenceExpiresAt: Date | null;
  psvExpiresAt: Date | null;
  notes: string | null;
};
export type VendorFields = {
  name: string;
  contactName: string | null;
  phone: string | null; // normalised when given
  email: string | null;
  isActive: boolean;
  rateNotes: string | null;
  notes: string | null;
};

export const VEHICLE_FIELD_LABELS: Record<keyof VehicleFields, string>;
export const DRIVER_FIELD_LABELS: Record<keyof DriverFields, string>;
export const VENDOR_FIELD_LABELS: Record<keyof VendorFields, string>;
// Plate, Label, Class, Active, Road tax expires, Insurance expires, Notes;
// Name, Phone, Active, Licence expires, PSV expires, Notes;
// Company, Contact name, Phone, Email, Active, Rate notes, Notes.

/** "wxy 1234" -> "WXY1234". Letters and digits only, upper case. */
export function normalizePlate(input: string): string;
/** "WXY1234" -> "WXY 1234": the letters, a space, the rest. Display only. */
export function formatPlate(plate: string): string;

export function checkVehicleFields(fields: Partial<VehicleFields>): Change;
export function checkDriverFields(fields: Partial<DriverFields>): Change;
export function checkVendorFields(fields: Partial<VendorFields>): Change;
export function parseVehicleFields(
  values: Record<string, unknown>,
): Parsed<VehicleFields>;
export function parseDriverFields(
  values: Record<string, unknown>,
): Parsed<DriverFields>;
export function parseVendorFields(
  values: Record<string, unknown>,
): Parsed<VendorFields>;

export type ExpiryTone = "expired" | "soon" | "ok";
/** Null for no date. "soon" within EXPIRY_WARNING_DAYS of now. */
export function expiryTone(
  expiresAt: Date | null,
  now?: Date,
): ExpiryTone | null;
```

Rules, in the order checked:

- Vehicle: plate normalises to at least 2 characters, else "Enter the plate."; label not
  blank; `vehicleClassId` not blank ("Choose a class."); each date either blank or a
  valid `YYYY-MM-DD` ("Enter the road tax expiry as a date, or leave it blank.").
- Driver: name not blank; phone passes `isValidPhone(normalizePhone(...))` ("Enter a
  phone number ops can dial."); dates as above.
- Vendor: name not blank; phone, when given, valid; email, when given, contains `@`
  (shape only, as the booking form does); the rest free.
- `parse*` reads `textOf`, `flagOf` and the date strings from the form names equal to
  the field names; `isActive` is a checkbox. Blank optional text becomes `null`.

### 3.5 `fleet.ts` (new, server)

```ts
export type VehicleWithClass = Vehicle & {
  vehicleClass: { id: string; name: string };
};
export type { Driver, Vendor };

export function listVehicles(): Promise<VehicleWithClass[]>; // active first, then plate
export function listDrivers(): Promise<Driver[]>; // active first, then name
export function listVendors(): Promise<Vendor[]>; // active first, then name
export function getVehicle(id: string): Promise<VehicleWithClass | null>;
export function getDriver(id: string): Promise<Driver | null>;
export function getVendor(id: string): Promise<Vendor | null>;

export function createVehicle(
  actor: Actor,
  fields: VehicleFields,
): Promise<Created>;
export function updateVehicle(
  actor: Actor,
  id: string,
  patch: Partial<VehicleFields>,
): Promise<Change>;
export function createDriver(
  actor: Actor,
  fields: DriverFields,
): Promise<Created>;
export function updateDriver(
  actor: Actor,
  id: string,
  patch: Partial<DriverFields>,
): Promise<Change>;
export function createVendor(
  actor: Actor,
  fields: VendorFields,
): Promise<Created>;
export function updateVendor(
  actor: Actor,
  id: string,
  patch: Partial<VendorFields>,
): Promise<Change>;

/** The active rows the assign form offers, in one round trip. */
export function listAssignable(): Promise<{
  drivers: Pick<Driver, "id" | "name">[];
  vehicles: Pick<VehicleWithClass, "id" | "plate" | "label" | "vehicleClass">[];
  vendors: Pick<Vendor, "id" | "name">[];
}>;

/** Vehicles and drivers with a document expired or expiring within the warning days. */
export function countExpiringDocuments(now?: Date): Promise<number>;
```

Writers mirror `createVehicleClass` and `updateVehicleClass`: check the fields, open a
transaction, for a vehicle look the plate up first and answer "`WXY 1234` is already
listed as `<label>`." on a clash (and catch `isUniqueViolation` as a second line of
defence), create or `changedFields` then update, `logActivity` in the same transaction.
Dates are logged as ISO strings (`changedFields` compares scalars, so convert the patch
and the current row to ISO strings or null before the diff, in one small helper
`scalarsOf`). Saving an unchanged form logs nothing, as the class writer does.

`countExpiringDocuments` is two `count` queries with
`{ OR: [{ roadTaxExpiresAt: { lt: limit } }, { insuranceExpiresAt: { lt: limit } }], isActive: true }`
where `limit = now + EXPIRY_WARNING_DAYS` days, summed. Inactive rows are not counted.

### 3.6 `assignment-input.ts` (new, browser-safe)

```ts
/** The form names of the assign form. */
export const ASSIGNMENT_FIELDS = {
  kind: "kind", // "driver" | "vendor"
  driverId: "driverId",
  vehicleId: "vehicleId",
  vendorId: "vendorId",
  vendorCost: "vendorCost", // ringgit text, optional
  note: "assignmentNote",
  force: "force", // checkbox
} as const;

export type Assignment =
  | {
      kind: "driver";
      driverId: string;
      vehicleId: string;
      assignmentNote: string | null;
    }
  | {
      kind: "vendor";
      vendorId: string;
      vendorCostSen: number | null;
      assignmentNote: string | null;
    };

export const ASSIGNMENT_NOTE_MAX_LENGTH = 200;

export function parseAssignment(
  values: Record<string, unknown>,
): Parsed<Assignment>;
// "Choose a driver.", "Choose the vehicle.", "Choose a vendor.",
// "Enter the vendor cost in RM, with at most two decimals, or leave it blank."

/** The time a trip occupies its driver and vehicle. */
export type Window = { start: Date; end: Date };
export function itemWindow(item: {
  startsAt: Date;
  endsAt: Date | null;
}): Window;
// end = endsAt ?? startsAt + ONE_WAY_BLOCK_HOURS

/** Touching counts: a trip ending at 14:00 clashes with one starting at 14:00. */
export function windowsClash(a: Window, b: Window): boolean;
// a.start <= b.end && b.start <= a.end

/** How the booking card and the log name an assignment: "Ali · WXY 1234", "Vendor X · RM 250". */
export function assignmentLabel(item: {
  driver: { name: string } | null;
  vehicle: { plate: string } | null;
  vendor: { name: string } | null;
  vendorCostSen: number | null;
}): string | null;
```

### 3.7 `assignment.ts` (new, server)

```ts
export type AssignResult = BookingChange; // the booking page's shape, event null

/**
 * Sets who does one item. From "confirmed" it moves the item to "assigned";
 * from "assigned" it replaces the assignment. Refuses when the driver or the
 * vehicle has another assigned item whose window clashes, unless `force`.
 */
export function assignItem(
  actor: Actor,
  itemId: string,
  assignment: Assignment,
  options?: { force?: boolean; now?: Date },
): Promise<BookingChange>;

/** Clears the assignment and moves "assigned" back to "confirmed". */
export function unassignItem(
  actor: Actor,
  itemId: string,
  now?: Date,
): Promise<BookingChange>;

export type Clash = {
  reference: string;
  position: number;
  start: Date;
  end: Date;
  who: "driver" | "vehicle";
};
```

Inside `assignItem`, in one `db.$transaction`:

1. Load the item with its booking reference and current driver, vehicle, vendor.
   Not found: "Booking item not found." Status not `confirmed` or `assigned`:
   "Item is `<status>`, so it cannot be assigned."
2. For `kind: "driver"`, load the driver and the vehicle; each must exist and be active
   ("That driver is no longer active." / "That vehicle is no longer active."). For
   `kind: "vendor"`, the same for the vendor.
3. Conflicts, `kind: "driver"` only and unless `force`: query `bookingItem.findMany`
   where `status = "assigned"`, `id != itemId`, `OR: [{ driverId }, { vehicleId }]`, and
   `startsAt < window.end + maxHourly` with `endsAt`/`startsAt` filtered in code through
   `windowsClash` (the SQL cut is coarse, the function decides). Include the booking
   reference. On any clash answer
   `"<name> is on <reference> until <HH:mm>. Tick \"Assign anyway\" if it fits."`,
   naming the driver or the vehicle's plate, the first clash only.
4. Update the item: the five columns from the assignment (the unused ones null),
   `status: "assigned"`.
5. Log `booking.item.assigned`, `entityId` the booking id, `before` and `after` as
   `{ position, driver, vehicle, vendor, vendorCostSen, assignmentNote, forced }` with
   names (driver name, plate, vendor name) rather than ids, `null` where unset.
   `before` is the previous assignment, all null on a first assignment.
6. `refreshBooking(tx, bookingId, null, now)` and return `{ ok: true, ...result }`.
   The booking's status does not change (assigned counts as confirmed), so `event` is
   null and no email goes out.

`unassignItem`: status must be `assigned` ("Item is `<status>`, so there is nothing to
unassign."); null the five columns, `status: "confirmed"`; log `booking.item.unassigned`
with `before` the names and `after: { position }`; refresh.

`refreshBooking` is currently a module-private function in `bookings.ts`. Export it (it
is already the shared tail of every item transition). `withItems` in `bookings.ts` gains
`driver: { select: { id: true, name: true } }`,
`vehicle: { select: { id: true, plate: true, label: true } }`,
`vendor: { select: { id: true, name: true } }` on `items.include`, so
`BookingItemWithDetails` carries the names everywhere the booking is read.

`advanceItem` gains one guard after the `next` check:
`if (next === "assigned") return { ok: false, error: "Assign a driver or a vendor instead." };`
`NEXT_ITEM_STATUS` and `ADVANCE_PERMISSIONS` are unchanged, so the status vocabulary
and the wall tests stand.

### 3.8 `activity-actions.ts`

- `ACTIVITY_ENTITY_TYPES` gains `"vehicle"`, `"driver"`, `"vendor"`.
- `ACTIONS` gains, none customer visible except the two item ones:

  ```ts
  "booking.item.unassigned": { entityType: "booking", customerVisible: true },
  "vehicle.created": { entityType: "vehicle", customerVisible: false },
  "vehicle.updated": { entityType: "vehicle", customerVisible: false },
  "driver.created":  { entityType: "driver",  customerVisible: false },
  "driver.updated":  { entityType: "driver",  customerVisible: false },
  "vendor.created":  { entityType: "vendor",  customerVisible: false },
  "vendor.updated":  { entityType: "vendor",  customerVisible: false },
  ```

  `booking.item.assigned` keeps `customerVisible: true`: its `after` holds a driver's
  first name and a plate, which the customer will be told anyway when OP5-04 arrives,
  and the customer page that would show it (OP8-05) does not exist. Note this in the
  comment on the action.

- `describeActivity`:
  - `booking.item.assigned`: if `after.driver` or `after.vendor` is a string, read the
    label from `after` ("Ali in WXY 1234", "Vendor X"); if `before` has one too,
    `Changed item 1 from <before> to <after>`; else `Assigned item 1 to <after>`;
    append ` despite a clash` when `after.forced === true`. Entries without names (the
    ones written before this change) keep `Marked item 1 driver assigned`.
  - `booking.item.unassigned`: `Unassigned item 1 (was <before label>)`.
  - `vehicle.created`: "Added the vehicle"; `driver.created`: "Added the driver";
    `vendor.created`: "Added the vendor".
  - `*.updated`: one shared `fleetChanges(after, labels, noun)` in the style of
    `vehicleClassChanges`: "Renamed to X" for `name`/`label`, "Turned the vehicle
    on/off" for `isActive`, "Changed the road tax expiry and the notes" for the rest.

### 3.9 `activity.ts`, `decorate`

Three more `findMany` calls in the `Promise.all` (vehicles by `plate`, drivers by `name`,
vendors by `name`) and three `Map`s in `labels`. `entityLabelOf` lists the three new
types with the existing fall-through cases. The vehicle's label is `formatPlate(plate)`.

### 3.10 `dashboard.ts`

`DashboardCounts` gains `documentsExpiring: number`, filled by
`countExpiringDocuments(now)` inside the same `Promise.all`.

### 3.11 `schedule.ts` (new, server)

```ts
export type ScheduleItem = BookingItemWithDetails & {
  booking: {
    id: string;
    reference: string;
    contactName: string;
    contactPhone: string;
  };
};

/** Live items picking up on the Malaysian day of `day`, earliest first. */
export function listSchedule(day: Date): Promise<ScheduleItem[]>;
```

One `bookingItem.findMany` with `status: { not: "cancelled" }`,
`startsAt: { gte, lt }` from `localDayRange(day)`, `include` the same as
`withItems.include.items.include` plus the booking select, `orderBy: { startsAt: "asc" }`.
Reuse the item include by exporting it from `bookings.ts` as `itemInclude`.

### 3.12 Exports

`index.ts`: `export * from "./fleet-input"; export * from "./assignment-input";`.
`server.ts`: the readers and writers of `fleet.ts`, `assignment.ts` and `schedule.ts`,
their types, and `refreshBooking` is not exported (it stays internal to the package;
`assignment.ts` imports it from `./bookings`).

---

## 4. `apps/admin`

### 4.1 `_lib/routes.ts`

```ts
export const FLEET_PATH = "/fleet";
export function vehicleHref(id: string) {
  return `${FLEET_PATH}/vehicles/${id}`;
}
export const NEW_VEHICLE_PATH = vehicleHref("new");
export function driverHref(id: string) {
  return `${FLEET_PATH}/drivers/${id}`;
}
export const NEW_DRIVER_PATH = driverHref("new");

export const VENDORS_PATH = "/vendors";
export function vendorHref(id: string) {
  return `${VENDORS_PATH}/${id}`;
}
export const NEW_VENDOR_PATH = vendorHref("new");

export const SCHEDULE_PATH = "/schedule";
/** The day's list; `date` is YYYY-MM-DD in Malaysian time, today when absent. */
export function scheduleHref(date?: string) {
  return date ? `${SCHEDULE_PATH}?date=${date}` : SCHEDULE_PATH;
}
```

### 4.2 `@repo/ui/icons` and `_components/nav.ts`

`icons.tsx` holds hand-drawn SVGs in one style. Add three in the same style, paths from
Lucide: `CarIcon`, `UsersIcon`, `CalendarDaysIcon`. The Operations group of `NAV`
becomes, in order: Dashboard, Bookings, Schedule (`CalendarDaysIcon`, `bookings.view`),
Coverage, Vehicle classes, Fleet (`CarIcon`, `fleet.manage`), Vendors (`UsersIcon`,
`fleet.manage`). Seven items; `navFor` hides what a team cannot open, so Reservation sees
three.

### 4.3 Shared piece: `_components/ExpiryDate.tsx`

```tsx
/** A date with its tone: red when past, amber within the warning days, plain otherwise. "—" for none. */
export function ExpiryDate({ at }: { at: Date | null });
```

Uses `expiryTone` and `formatLocalDate`. Used by both fleet tables and the Dashboard
card's tooltip text is not needed.

### 4.4 The Fleet screen, `(console)/fleet/`

Files:

```
fleet/page.tsx                 the two tables
fleet/actions.ts               create/update/setActive for vehicles and drivers
fleet/FleetControls.tsx        VehicleActiveSwitch, DriverActiveSwitch ("use client")
fleet/VehicleForm.tsx          "use client"
fleet/DriverForm.tsx           "use client"
fleet/vehicles/[id]/page.tsx   form and history; "new" for a new one
fleet/drivers/[id]/page.tsx    same
```

`page.tsx`: `requireAdmin("fleet.manage")`. `PageHeader` title "Fleet", description
"The vehicles and drivers Operation assigns to trips. Off keeps a row out of the assign
form; nothing is deleted." Two `Streamed` sections with `TableSkeleton`, each with its own
heading and an "Add vehicle" / "Add driver" button beside it (the header's single
`action` slot cannot hold two, so put the buttons on the section headings).

Vehicles table columns: Plate (link to the edit page, `formatPlate`; label underneath in
small text), Class, Active (switch), Road tax (`ExpiryDate`), Insurance (`ExpiryDate`),
Notes (truncated, `max-w-64`), Edit. Inactive rows `text-neutral-500` as the classes
table does. Empty row: "No vehicles yet. Add the first from the sheet."

Drivers table: Name (link), Phone (`tel:` link), Active, Licence, PSV, Notes, Edit.

`actions.ts`: `createVehicleAction`, `updateVehicleAction`, `setVehicleActiveAction`,
and the same three for drivers. Each gets the admin with `getAdmin("fleet.manage")`,
parses with the input module, calls the writer with `actorOf(admin)`, then
`revalidatePath(FLEET_PATH)` and `revalidatePath("/")` (the Dashboard count). The
`create*` actions `redirect` to `FLEET_PATH` on success (as the location form does after
a create; the class form stays on the page, either is fine, choose redirect so the new
row is seen in the list).

`VehicleForm`: `id` hidden when editing; `plate` (`Input`, `autoCapitalize="characters"`,
placeholder "WXY 1234"), `label`, `vehicleClassId` (`Select` over the classes passed in
as a prop from the page, `listVehicleClasses()`, active ones first, inactive labelled
"(off)"), `roadTaxExpiresAt` and `insuranceExpiresAt` (`Input type="date"`, default from
`localDateTimeInputs(at).date`), `notes` (`Textarea rows={3}`), `isActive` checkbox,
Save / Cancel link back to `FLEET_PATH`, the error line. `useActionState` with the create
or update action, as `VehicleClassForm` does.

`DriverForm`: `name`, `phone` (`inputMode="tel"`, placeholder "+60 12-345 6789"),
`licenceExpiresAt`, `psvExpiresAt`, `notes`, `isActive`.

`vehicles/[id]/page.tsx` and `drivers/[id]/page.tsx`: copy the shape of
`vehicle-classes/[id]/page.tsx`: back link "All of Fleet", `requireAdmin("fleet.manage")`,
`id === "new"` renders the empty form under the header "New vehicle"; otherwise load the
row (`notFound()` when missing), header with the plate or the name, the form, and a
History card from `listActivityFor("vehicle" | "driver", id)`.

### 4.5 The Vendors screen, `(console)/vendors/`

```
vendors/page.tsx
vendors/actions.ts
vendors/VendorControls.tsx
vendors/VendorForm.tsx
vendors/[id]/page.tsx
```

The same shape with one table: Company (link), Contact (name, phone as `tel:`, email as
`mailto:` in small text), Active, Rate notes (truncated), Edit. Header description: "The
companies that do trips for us. The cost of each trip is typed when the trip is assigned."
The form has `name`, `contactName`, `phone`, `email`, `rateNotes` (`Textarea rows={4}`,
hint "Free text, as the rates sheet has it. Typed per trip when assigning."), `notes`,
`isActive`.

### 4.6 Assigning, on the booking page

`(console)/bookings/[id]/Assignment.tsx` ("use client"):

```tsx
export function AssignControl({
  itemId,
  current, // the item's driver, vehicle, vendor, vendorCostSen, assignmentNote, or null
  options, // listAssignable()'s result, fetched by the page once
  status, // "confirmed" | "assigned"
});
```

Closed state, status `confirmed`: one primary button "Assign". Status `assigned`: two
small buttons, "Change" (secondary) and "Unassign" (ghost, `confirm("Unassign item N? It
goes back to Confirmed.")`), each its own `<form>` as `PriceOverrideControl` does.

Open state, a bordered `neutral-50` panel like the price form:

- Two radios under `ASSIGNMENT_FIELDS.kind`: "Our driver" (default, or whatever the
  current one is) and "Vendor". `useState` chooses which half renders.
- Driver half: `Select` of drivers ("Choose…" first) and `Select` of vehicles, each option
  `"WXY 1234 · Toyota Alphard 2021 · Executive sedan"`. Both `required`.
- Vendor half: `Select` of vendors, `Input` "Cost (RM)" `inputMode="decimal"`, optional.
- Both: `Input` "Note" with `maxLength={ASSIGNMENT_NOTE_MAX_LENGTH}`, placeholder
  "Vendor's driver and plate, or anything for the job sheet".
- A checkbox "Assign anyway" that appears only after the action answered a clash. The
  action's error text is shown; the client sets `showForce` when `state.error` contains
  "Assign anyway" (the server sentence ends with it, see 3.7). Simpler than a second
  return channel and good enough: the checkbox is harmless when shown.
- Save / Cancel, pending text "Assigning…".

`actions.ts` gains:

```ts
export async function assignItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState>;
// getAdmin("bookings.fulfil"); itemId; parseAssignment(Object.fromEntries(formData));
// force = flagOf(formData.get(ASSIGNMENT_FIELDS.force)); finish(await assignItem(...))
export async function unassignItemAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState>;
```

`finish` already revalidates the booking, the list and the Dashboard, and
`sendBookingChangeEmail` is a no-op for `event: null`. Add `revalidatePath(SCHEDULE_PATH)`
to `finish` so the day list is fresh.

`BookingControls.tsx`: `ADVANCE_LABELS` loses the `assigned` key, and `ItemControls`
renders the advance form only when `next !== "assigned"`; the type of the record becomes
`Partial<Record<NextItemStatus, string>>` or, cleaner, narrow `next` with
`next !== "assigned"` before the lookup.

`page.tsx`, `ItemCard`: after the Dates column, a third block when the item is assigned
or cancelled-with-assignment: heading "Driver", rows `["Driver", name]`,
`["Vehicle", "WXY 1234 · label"]` or `["Vendor", name]`, `["Vendor cost", formatMyr]`
when set, `["Note", text]` when set. Below the rows, when
`permissions.includes("bookings.fulfil")` and status is `confirmed` or `assigned`,
`<AssignControl … />`. `bookingDetails` fetches `listAssignable()` in its `Promise.all`
only when the admin holds `bookings.fulfil` (one more query for Operation, none for the
other teams).

### 4.7 The Dashboard

`groupsOf`: the Operation group gains `{ label: "Documents expiring", value:
counts.documentsExpiring }` as its last card, and `StatCard` learns a second kind of
link: a card may carry `href` plus the `permission` it needs instead of a booking
status. Give the new card `href: FLEET_PATH, permission: "fleet.manage"`; the four
booking cards keep `status`. The skeleton's `[2, 4]` becomes `[2, 5]`.

### 4.8 The Schedule page, `(console)/schedule/page.tsx`

`requireAdmin("bookings.view")`. Read `searchParams.date`; valid `YYYY-MM-DD` (reuse
`pickupInstant(date, "00:00")`, null means invalid) else today. `PageHeader` title
"Schedule", description `formatLocalDate(day)` in words with the weekday, e.g. "Saturday,
11 Oct 2026". A row of links: Yesterday, Today, Tomorrow, each `scheduleHref(...)`, and a
plain `<form method="get">` with `<Input type="date" name="date">` and a "Go" button.
`Streamed` keyed by the date around the table.

Table columns: Pick-up (time only, `HH:mm`), Booking (reference link, customer name under
it), Trip (`tripHeadline(trip)` and, under it, `itemSummary`), Class
(`tripDetails.vehicleClassName`), Who (`assignmentLabel(item)` or, when null and the item
is confirmed, a small "Assign" link to the booking; "Awaiting confirmation" in grey for a
received item), Status (`ItemStatusBadge`). Empty: "No trips on this day."

The time format: add `formatLocalTime(instant)` to `booking-rules.ts` beside the other
two, `hour: "2-digit", minute: "2-digit", hour12: false`.

---

## 5. The customer site

No change. My bookings shows `ITEM_STATUS_LABELS.assigned`, "Driver assigned", as it
does today, and shows nothing when the item goes back to Confirmed. No email is sent on
assign or unassign. `apps/web` is not touched by any of the five PRs.

---

## 6. Older documents to amend

In the PR that makes each statement false:

| Document                           | Change                                                                                                                                                                | PR  |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `260918-auth-and-database.md`      | Lines on `DriverProfile`: the `driver` area is granted by an active `Driver` row with a `userId`. Table row "driver" reads "active driver row linked to the account". | B   |
| `260923-car-with-driver.md`        | Future work, "Driver assignment": point to `261010-fleet-and-assignment.md`.                                                                                          | D   |
| `260930-admin-teams-and-access.md` | The wall table gains the `fleet.manage` row under Operation; "Fleet, the vehicle units, is a later phase" points here.                                                | B   |
| `260930-coverage.md`               | "Fleet … is a later phase (OP2)" points here.                                                                                                                         | B   |
| `261010-fleet-and-assignment.md`   | Status line: "built, see `261011-…`" once PR E merges; any grade that was overturned while building gets a one-line note.                                             | E   |
| `CLAUDE.md`, `packages/db` role    | Add "fleet and assignment" to the list of what the package holds, one clause.                                                                                         | B   |

The docs repo (`heavenly-travel-docs`) is updated by the developer afterwards: OP2-01 to
OP2-03, OP3-01, OP3-02 ticked, OP3-03 noted as the day list, OP-Q4 answered as "typed per
trip", OP-D6 confirmed.

---

## 7. Tests

`node --test` files beside the modules, in the style of `vehicle-class-input.test.ts`:

- `fleet-input.test.ts`: `normalizePlate` ("wxy 1234" → "WXY1234", "W-X-Y 12" →
  "WXY12"), `formatPlate`, each `check*` rule above with one failing input per rule and
  one passing full record, `parse*` reading the date strings and the checkbox, blank
  optional text becoming null, `expiryTone` at yesterday, in 29 days, in 31 days, null.
- `assignment-input.test.ts`: `parseAssignment` for both kinds and each error; `itemWindow`
  for hourly (uses `endsAt`) and one-way (adds `ONE_WAY_BLOCK_HOURS`); `windowsClash`
  touching (true), apart by one minute (false), nested (true); `assignmentLabel` for the
  three shapes.
- `permissions.test.ts`: the `WALL` constant only.
- `activity-actions.test.ts`: `describeActivity` for assigned with names, assigned
  without names (old entry), changed from one to another, forced, unassigned, and one
  `vehicle.updated` sentence.
- `booking-status.test.ts`: unchanged; `NEXT_ITEM_STATUS` still maps confirmed →
  assigned. Add one test to `bookings`-level behaviour only if a pure helper is extracted;
  `advanceItem`'s new refusal is checked by hand (it needs the database).

No test touches the database; CI keeps its placeholder `DATABASE_URL`.

---

## 8. How to build it

### 8.1 One worktree, one branch, commits in PR order

Build everything on one branch, `feat/fleet-and-assignment`, cut from `main`, in a
worktree of its own. Commit by concern and **in the order of the PRs**, so the history
reads B, then C, then D, then E, with the doc commit first:

```
docs: add the fleet and assignment plans            (A: both plan files)
feat(db): vehicles, drivers and the fleet permission (B)
feat(admin): fleet screen                            (B)
feat(db): vendors                                    (C)
feat(admin): vendors screen                          (C)
feat(db): assign a driver or vendor to an item       (D)
feat(admin): assign form, dashboard card             (D)
feat(admin): schedule for the day                    (E)
```

Yes, the whole thing can be built and tested as one, then shipped as five PRs. The
squash-merge makes this a little fiddly, because each merge rewrites history; the recipe
in 8.4 handles it. The alternative, one PR for all of it, is allowed by nothing in the
workflow document but makes a 40-file review. Prefer the five.

Before the first commit of a new route folder, run
`git check-ignore -v apps/admin/app/\(console\)/fleet` (and `vendors`, `schedule`). The
root `.gitignore` once swallowed the `coverage` route; `fleet`, `vendors` and `schedule`
match no rule today, but check.

### 8.2 The database: a Neon branch for the worktree

Neither the shared `development` branch nor `production` sees the schema until a PR
merges. Create a Neon branch from `development` for this work:

1. Neon console → the project → Branches → "New branch", parent `development`, name
   `feat-fleet`, include data (the default). Or with the CLI:
   `npx neonctl branches create --name feat-fleet --parent development`.
2. Copy its **pooled** connection string.
3. The worktree has no `.env` files (they are ignored by git). Copy them from the main
   checkout: `packages/db/.env`, `apps/admin/.env.local`, `apps/web/.env.local`. In all
   three, set `DATABASE_URL` to the `feat-fleet` string. Leave
   `DATABASE_URL_PRODUCTION` as it is; nothing in this work runs a `:prod` script.
4. `pnpm db:push` in the worktree. It warns that `DriverProfile` will be dropped; the
   branch is a copy, accept it.
5. Work. The branch carries the development data, so the test bookings, states, classes
   and admin accounts are all there.

When PR B merges, the developer runs `pnpm db:push` against `development` (main
checkout, after `git pull`), accepting the `DriverProfile` drop after checking the table
is empty (`pnpm db:studio`, or `select count(*) from "DriverProfile"`), and
`pnpm db:push:prod` with the same check on production. PR D needs the same two pushes
for the five columns and two indexes; C needs them for `Vendor`. One push per schema PR,
three in all, or one after all three if they merge the same day. Delete the `feat-fleet`
branch in Neon when PR E is merged.

Prisma's `db push` is interactive on data loss. In a non-interactive shell add
`--accept-data-loss` only on the throwaway branch, never by habit on `development` or
`production`.

### 8.3 The one-shot order

Build in this order; each step leaves lint, types and tests green:

1. Schema (all of §2), `pnpm db:push` on the branch, `pnpm --filter @repo/db build` to
   regenerate the client.
2. `booking-rules.ts` additions, `permissions.ts` and its test, `session.ts`.
3. `fleet-input.ts` with tests, `fleet.ts`, activity vocabulary and `decorate` for the
   three types, exports.
4. Routes, icons, nav, `ExpiryDate`, the Fleet screen with its forms and edit pages, the
   Dashboard card. Click through.
5. Vendors: input, writer, screen. Click through.
6. `assignment-input.ts` with tests, `assignment.ts`, `bookings.ts` changes (`withItems`,
   `advanceItem` guard, exported include), `describeActivity` sentences with tests.
7. `AssignControl`, the two actions, `BookingControls` and `ItemCard` changes. Click
   through the acceptance list in §9.
8. `schedule.ts`, `formatLocalTime`, the Schedule page.
9. Document amendments of §6, in the commits of their PRs.
10. `pnpm lint && pnpm check-types && pnpm test` at the root. `pnpm build` once, so the
    Vercel build is not the first to compile it.

### 8.4 Opening the five PRs one after another

With the commits in order, each PR is a prefix of the branch. Make a branch pointer at
each boundary (`git log --oneline` to find the hashes):

```sh
git branch feat/fleet-plan        <hash of the docs commit>
git branch feat/fleet-vehicles    <hash of the last B commit>
git branch feat/fleet-vendors     <hash of the last C commit>
git branch feat/fleet-assign      <hash of the last D commit>
# feat/fleet-and-assignment itself is E
```

Then, in turn:

```sh
git push -u origin feat/fleet-plan
gh pr create --base main --head feat/fleet-plan --title "docs: add the fleet and assignment plans" --body-file -
```

After it squash-merges, move the rest onto the new `main` and open the next:

```sh
git fetch origin
git rebase --onto origin/main feat/fleet-plan feat/fleet-vehicles
git push -u origin feat/fleet-vehicles
gh pr create --base main --head feat/fleet-vehicles --title "feat(admin): vehicles and drivers" ...
```

The pattern is `git rebase --onto origin/main <merged-branch-tip> <next-branch>`, where
`<merged-branch-tip>` is the local tip of the branch that was just squashed (its commits
are now one commit on `main`, so they are dropped from the next branch's history). Do the
same for `feat/fleet-vendors`, `feat/fleet-assign` and finally `feat/fleet-and-assignment`.
Conflicts should not occur: each PR touches new files or distinct regions, and the few
shared files (`schema.prisma`, `index.ts`, `server.ts`, `activity-actions.ts`, `nav.ts`,
`routes.ts`) get additions in separate blocks. If one does, it is an additive hunk and
the resolution is to keep both.

Each PR's description gets the matching "Checks before merge" from §9 and ends with the
attribution line. After each merge, run `pr-cleanup` for the merged branch and the
`db:push` steps of 8.2 when the PR carried schema.

Staging: `pnpm staging` from `feat/fleet-and-assignment` shows the whole feature on the
staging domains for the team to try while the PRs are in review. The staging apps read
the `development` branch, so the schema must be on `development` by then; that means the
staging preview waits for PR B's push, or the developer points staging's `DATABASE_URL`
Preview variable at `feat-fleet` for the review and back afterwards. The second is a
Vercel env change and a redeploy; choose it only if the team must see it before B merges.

---

## 9. Acceptance walk-through

Run on the worktree against the `feat-fleet` branch with a SUPER account, then once with
a REGULAR Operation account and the wall on, then once with a Reservation account.

Fleet and Vendors (B, C):

1. `/fleet` empty states; "Add vehicle" → plate `wxy 1234`, label, class, road tax
   yesterday → saved; list shows `WXY 1234`, road tax in red.
2. Add a second vehicle with plate `WXY1234` → "WXY 1234 is already listed as …".
3. Add a driver with phone `012-345 6789` → stored `0123456789`, `tel:` link works.
   Licence in 20 days → amber.
4. Switch the driver off; the row dims; the Dashboard "Documents expiring" drops to 1
   (inactive rows are not counted). Switch on again → 2.
5. Edit the vehicle's label only → history shows "Changed the label"; save again with no
   change → no new entry.
6. `/vendors`: add one with rate notes; edit page history "Added the vendor".
7. Reservation account, wall on: `/fleet` and `/vendors` redirect to `/restricted`; the
   sidebar does not list them. Direct POST to a fleet action is refused (`FORBIDDEN`).

Assign (D):

8. Open a confirmed booking as Operation. The item card shows "Assign", not "Mark driver
   assigned". Assign the driver and vehicle → badge "Driver assigned", "Driver" block
   with name and plate, history "Assigned item 1 to Ali in WXY 1234".
9. On the customer site, My bookings for that booking shows "Driver assigned". No email
   arrived (check the terminal when `RESEND_API_KEY` is unset).
10. A second confirmed item at the same time, same driver → refused: "Ali is on HT-…
    until 14:30. Tick "Assign anyway" if it fits." The checkbox appears. Tick it → assigned,
    history ends with "despite a clash".
11. Same vehicle, different driver, overlapping → refused naming the plate. A different
    day → allowed.
12. Change the first item to the vendor with cost 250 → "Changed item 1 from Ali in WXY
    1234 to Vendor X"; the card shows "Vendor cost RM 250.00".
13. Unassign → badge "Confirmed", history "Unassigned item 1 (was Vendor X)", My
    bookings shows "Confirmed". Amend is offered again.
14. Try to assign a `received` item: the control is not shown; a hand-made POST gets
    "Item is received, so it cannot be assigned."
15. Cancel an assigned item: the Driver block stays as a record, controls gone.
16. The Dashboard "Awaiting driver" count falls by one per assignment.
17. The old "Mark driver assigned" POST (`to=assigned`) answers "Assign a driver or a
    vendor instead."

Schedule (E):

18. `/schedule` shows today's live items in time order with "Who"; a confirmed one shows
    "Assign" linking to its booking; a received one says "Awaiting confirmation".
19. Tomorrow, Yesterday and a typed date work; an invalid `?date=` falls back to today.
20. Reservation sees Schedule (it is `bookings.view`); Marketing does not.

Every PR: `pnpm lint`, `pnpm check-types`, `pnpm test`, and `pnpm build` once before the
first PR.

---

## 10. Things to decide while building

Small calls the first document did not grade, with the default to take unless something
in the code argues otherwise:

| Call                                                                      | Default                                                                                         |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Where the class list for the vehicle form comes from                      | `listVehicleClasses()` in the page, passed as a prop; inactive classes listed last with "(off)" |
| Whether the vehicle select in the assign form is filtered by booked class | No, all active vehicles; the booked class is shown in the card above the form                   |
| Whether the Fleet lists paginate                                          | No; a fleet of tens of rows                                                                     |
| Date of expiry stored as midnight Malaysian time                          | Yes, through `pickupInstant(date, "00:00")`, so "today" comparisons use `localDayRange`         |
| `expiryTone` "expired" boundary                                           | `expiresAt < localDayRange(now).start`: the day of expiry itself is still "soon"                |
| Assign form fetch                                                         | Server-side in the page, only for admins with `bookings.fulfil`                                 |
| `describeActivity` for a cancelled item that had an assignment            | Unchanged; the Driver block on the card is the record                                           |
| Vendor cost shown to anyone but Operation                                 | Every team that can open the booking sees it, as they see the price override                    |
| Deleting the `activeAt` idea from the old stub                            | Dropped; `isActive` plus the log is enough                                                      |
