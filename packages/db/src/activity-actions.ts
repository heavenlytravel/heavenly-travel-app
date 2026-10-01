import { ITEM_STATUS_LABELS, isItemStatus } from "./booking-status";
import { guardFor } from "./const-enum";
import { formatMultiplier } from "./coverage-input";
import { LOCATION_FIELD_LABELS } from "./location-input";
import { formatMyr } from "./money";
import { ADMIN_TEAM_LABELS, adminTeamsOf } from "./roles";
import {
  VEHICLE_CLASS_FIELD_LABELS,
  type VehicleClassField,
} from "./vehicle-class-input";

/**
 * The activity log's vocabulary, browser-safe: who can act, what an entry
 * can record and how an entry reads. Writing and reading entries is in
 * ./activity. See docs/260930-admin-teams-and-access.md, "The activity log".
 */

export const ACTOR_KINDS = ["admin", "customer", "system"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];
export const isActorKind = guardFor(ACTOR_KINDS);

export type AdminActor = { kind: "admin"; userId: string };
export type CustomerActor = { kind: "customer"; userId: string };
export type SystemActor = { kind: "system" };
/** Who is doing the change. Every mutation takes one and logs it. */
export type Actor = AdminActor | CustomerActor | SystemActor;
export const SYSTEM_ACTOR: SystemActor = { kind: "system" };

export const ACTIVITY_ENTITY_TYPES = [
  "booking",
  "state",
  "district",
  "vehicle-class",
  "admin",
  "setting",
  "location",
] as const;
export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];
export const isActivityEntityType = guardFor(ACTIVITY_ENTITY_TYPES);

/**
 * Each action names the record type it logs against and whether a customer
 * may ever see it. Item actions log against their booking, with the item's
 * position in `before` and `after`. State and district entries log against
 * the row's code, location entries against the location's id. An update's
 * `before` and `after` hold the changed fields only.
 */
const ACTIONS = {
  "booking.created": { entityType: "booking", customerVisible: true },
  "booking.item.confirmed": { entityType: "booking", customerVisible: true },
  "booking.item.assigned": { entityType: "booking", customerVisible: true },
  "booking.item.completed": { entityType: "booking", customerVisible: true },
  "booking.item.cancelled": { entityType: "booking", customerVisible: true },
  "booking.cancelled": { entityType: "booking", customerVisible: true },
  /** The `AMENDED_FIELDS` that changed; the driver notes and the reason are not in it. */
  "booking.item.amended": { entityType: "booking", customerVisible: true },
  /** The reason is in `after`, so a customer never sees the entry. */
  "booking.item.priced": { entityType: "booking", customerVisible: false },
  /** The note's id only; the text stays in `BookingNote`. */
  "booking.note.added": { entityType: "booking", customerVisible: false },
  "admin.promoted": { entityType: "admin", customerVisible: false },
  "admin.updated": { entityType: "admin", customerVisible: false },
  "admin.revoked": { entityType: "admin", customerVisible: false },
  "wall.switched": { entityType: "setting", customerVisible: false },
  "state.updated": { entityType: "state", customerVisible: false },
  "district.updated": { entityType: "district", customerVisible: false },
  "vehicle-class.created": {
    entityType: "vehicle-class",
    customerVisible: false,
  },
  "vehicle-class.updated": {
    entityType: "vehicle-class",
    customerVisible: false,
  },
  "location.created": { entityType: "location", customerVisible: false },
  /** A place is logged by its label, with the district it moved to. */
  "location.updated": { entityType: "location", customerVisible: false },
  /** The whole list before and after, in its order: id, name and place label. */
  "location.addresses.updated": {
    entityType: "location",
    customerVisible: false,
  },
} as const satisfies Record<
  string,
  { entityType: ActivityEntityType; customerVisible: boolean }
>;

export type ActivityAction = keyof typeof ACTIONS;
export const ACTIVITY_ACTIONS = Object.keys(ACTIONS) as ActivityAction[];
export const isActivityAction = guardFor(ACTIVITY_ACTIONS);

export function activityActionMeta(action: ActivityAction) {
  return ACTIONS[action];
}

/** The action that moves an item to each status, for `advanceItem`. */
export const ITEM_ACTIONS = {
  confirmed: "booking.item.confirmed",
  assigned: "booking.item.assigned",
  completed: "booking.item.completed",
  cancelled: "booking.item.cancelled",
} as const satisfies Partial<Record<string, ActivityAction>>;

/** The id of the one `AppSetting` row, which setting entries log against. */
export const APP_SETTING_ID = "app";

/**
 * What an amend logs, before and after, as scalars: places by their labels,
 * the time as an ISO instant, the class by its name and the charged price.
 * The driver notes and the override reason are left out, so the entry can
 * be shown to the customer.
 */
export type AmendedFields = {
  mode: string;
  pickup: string;
  dropoff: string | null;
  startsAt: string;
  hours: number | null;
  vehicleClassName: string;
  passengers: number;
  childSeats: number;
  flightNumber: string | null;
  priceTotalSen: number;
};

/** How the sentence names each field: "Changed the pick-up and the vehicle". */
export const AMENDED_FIELD_LABELS: Record<keyof AmendedFields, string> = {
  mode: "the trip type",
  pickup: "the pick-up",
  dropoff: "the drop-off",
  startsAt: "the pick-up time",
  hours: "the hours",
  vehicleClassName: "the vehicle",
  passengers: "the passengers",
  childSeats: "the child seats",
  flightNumber: "the flight",
  priceTotalSen: "the price",
};

/** What `describeActivity` reads of an entry. `before` and `after` are JSON. */
export type DescribableActivity = {
  action: string;
  before: unknown;
  after: unknown;
};

function field(json: unknown, key: string): unknown {
  return json !== null && typeof json === "object" && key in json
    ? (json as Record<string, unknown>)[key]
    : undefined;
}

function keysOf(json: unknown): string[] {
  return json !== null && typeof json === "object" ? Object.keys(json) : [];
}

function itemName(json: unknown) {
  const position = field(json, "position");
  return typeof position === "number" ? `item ${position}` : "an item";
}

function adminState(json: unknown) {
  const level = field(json, "level");
  const teams = field(json, "teams");
  const names = adminTeamsOf(Array.isArray(teams) ? teams : []).map(
    (team) => ADMIN_TEAM_LABELS[team],
  );
  const levelName = typeof level === "string" ? level : "admin";
  return names.length > 0 ? `${levelName} (${names.join(", ")})` : levelName;
}

/** "Renamed to X, turned the class off": the phrases as one sentence. */
function sentence(phrases: string[], fallback: string) {
  if (phrases.length === 0) return fallback;
  return phrases
    .map((phrase, i) =>
      i === 0 ? phrase : phrase.charAt(0).toLowerCase() + phrase.slice(1),
    )
    .join(", ");
}

/** "the base fare, the per km and the notice needed" */
function listOf(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

function vehicleClassChanges(after: unknown) {
  const phrases: string[] = [];
  const name = field(after, "name");
  if (typeof name === "string") phrases.push(`Renamed to ${name}`);
  const isActive = field(after, "isActive");
  if (typeof isActive === "boolean") {
    phrases.push(isActive ? "Turned the class on" : "Turned the class off");
  }
  const others = keysOf(after)
    .filter(
      (key): key is VehicleClassField =>
        key in VEHICLE_CLASS_FIELD_LABELS &&
        key !== "name" &&
        key !== "isActive",
    )
    .map((key) => `the ${VEHICLE_CLASS_FIELD_LABELS[key].toLowerCase()}`);
  if (others.length > 0) phrases.push(`Changed ${listOf(others)}`);
  return sentence(phrases, "Changed the class");
}

function locationChanges(after: unknown) {
  const phrases: string[] = [];
  const name = field(after, "name");
  if (typeof name === "string") phrases.push(`Renamed to ${name}`);
  const present = new Set(keysOf(after));
  const others = (
    Object.keys(LOCATION_FIELD_LABELS) as (keyof typeof LOCATION_FIELD_LABELS)[]
  )
    .filter((key) => key !== "name" && present.has(key))
    .map((key) => LOCATION_FIELD_LABELS[key]);
  if (others.length > 0) phrases.push(`Changed ${listOf(others)}`);
  return sentence(phrases, "Changed the location");
}

/** The saved addresses an entry holds, as far as they can be read. */
function addressesOf(json: unknown) {
  const addresses = field(json, "addresses");
  if (!Array.isArray(addresses)) return [];
  return (addresses as unknown[]).flatMap((address) => {
    const id = field(address, "id");
    const name = field(address, "name");
    return typeof id === "string" && typeof name === "string"
      ? [{ id, name }]
      : [];
  });
}

/** "Added the address Kuah Jetty": what differs between the two lists. */
function addressChanges(before: unknown, after: unknown) {
  const was = addressesOf(before);
  const now = addressesOf(after);
  const wasById = new Map(was.map((address) => [address.id, address.name]));
  const nowIds = new Set(now.map((address) => address.id));
  const named = (verb: string, names: string[]) =>
    `${verb} the ${names.length > 1 ? "addresses" : "address"} ${listOf(names)}`;

  const added = now.filter((a) => !wasById.has(a.id)).map((a) => a.name);
  const removed = was.filter((a) => !nowIds.has(a.id)).map((a) => a.name);
  const renamed = now
    .filter((a) => wasById.has(a.id) && wasById.get(a.id) !== a.name)
    .map((a) => `${wasById.get(a.id)} to ${a.name}`);

  const phrases: string[] = [];
  if (added.length > 0) phrases.push(named("Added", added));
  if (removed.length > 0) phrases.push(named("Removed", removed));
  if (renamed.length > 0) phrases.push(named("Renamed", renamed));
  return sentence(phrases, "Reordered the saved addresses");
}

/**
 * One entry as a short sentence without its actor or its record: "Confirmed
 * item 2", "Turned the district on", "Turned the wall on". The actor, the
 * record and the time are shown beside it.
 */
export function describeActivity(entry: DescribableActivity): string {
  if (!isActivityAction(entry.action)) return entry.action;
  switch (entry.action) {
    case "booking.created": {
      const items = field(entry.after, "items");
      // Staff enter a booking on the console; a customer makes one on the site.
      const verb = field(entry.after, "via") === "console" ? "Entered" : "Made";
      return typeof items === "number" && items > 1
        ? `${verb} the booking with ${items} items`
        : `${verb} the booking`;
    }
    case "booking.item.priced": {
      const price = field(entry.after, "priceTotalSen");
      const name = itemName(entry.after);
      if (typeof price !== "number") return `Changed the price of ${name}`;
      return typeof field(entry.after, "reason") === "string"
        ? `Set the price of ${name} to ${formatMyr(price)}`
        : `Reset the price of ${name} to ${formatMyr(price)}`;
    }
    case "booking.note.added":
      return "Added a note";
    case "booking.item.confirmed":
      return `Confirmed ${itemName(entry.after)}`;
    case "booking.item.assigned":
    case "booking.item.completed": {
      const status = field(entry.after, "status");
      const label = isItemStatus(status)
        ? ITEM_STATUS_LABELS[status].toLowerCase()
        : "changed";
      return `Marked ${itemName(entry.after)} ${label}`;
    }
    case "booking.item.cancelled":
      return `Cancelled ${itemName(entry.after)}`;
    case "booking.item.amended": {
      // In the vocabulary's order, not the stored one: jsonb reorders keys.
      const present = new Set(keysOf(entry.after));
      const changed = (
        Object.keys(AMENDED_FIELD_LABELS) as (keyof AmendedFields)[]
      )
        .filter((key) => present.has(key))
        .map((key) => AMENDED_FIELD_LABELS[key]);
      const name = itemName(entry.after);
      return changed.length > 0
        ? `Changed ${listOf(changed)} of ${name}`
        : `Amended ${name}`;
    }
    case "booking.cancelled":
      return "Cancelled the booking";
    case "admin.promoted":
      return `Promoted to ${adminState(entry.after)}`;
    case "admin.updated":
      return `Changed from ${adminState(entry.before)} to ${adminState(entry.after)}`;
    case "admin.revoked":
      return `Revoked admin access (was ${adminState(entry.before)})`;
    case "wall.switched":
      return field(entry.after, "wallActive") === true
        ? "Turned the wall on"
        : "Turned the wall off";
    case "state.updated": {
      const multiplier = field(entry.after, "multiplier");
      return typeof multiplier === "number"
        ? `Set the multiplier to ${formatMultiplier(multiplier)}`
        : "Changed the state";
    }
    case "district.updated":
      return field(entry.after, "isActive") === true
        ? "Turned the district on"
        : "Turned the district off";
    case "vehicle-class.created":
      return "Created the class";
    case "vehicle-class.updated":
      return vehicleClassChanges(entry.after);
    case "location.created":
      return "Created the location";
    case "location.updated":
      return locationChanges(entry.after);
    case "location.addresses.updated":
      return addressChanges(entry.before, entry.after);
  }
}
