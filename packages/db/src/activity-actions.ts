import { ITEM_STATUS_LABELS, isItemStatus } from "./booking-status";
import { guardFor } from "./const-enum";
import { LOCATION_FIELD_LABELS } from "./location-input";
import { andList } from "./names";
import { loggedPageRef, pageNameOf } from "./location-page-input";
import { SITE_PAGE_LABELS, isSitePageKey } from "./site-page-input";
import { formatMyr } from "./money";
import { OFFERING_FIELD_LABELS } from "./offering-input";
import {
  oddHoursLabel,
  weekendLabel,
  type OddHours,
  type WeekendSurcharge,
} from "./rates-input";
import { DRIVER_FIELD_LABELS } from "./driver-input";
import { ADMIN_TEAM_LABELS, adminTeamsOf } from "./roles";
import {
  VEHICLE_CLASS_FIELD_LABELS,
  type VehicleClassField,
} from "./vehicle-class-input";
import { VEHICLE_FIELD_LABELS } from "./vehicle-input";
import { VENDOR_FIELD_LABELS } from "./vendor-input";

/**
 * The activity log's vocabulary, browser-safe: who can act, what an entry
 * can record and how an entry reads. Writing and reading entries is in
 * ./activity. See docs/260930-admin-teams-and-access.md, "The activity log".
 */

export const ACTOR_KINDS = ["admin", "customer", "guest", "system"] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];
export const isActorKind = guardFor(ACTOR_KINDS);

export type AdminActor = { kind: "admin"; userId: string };
export type CustomerActor = { kind: "customer"; userId: string };
/** A signed-out visitor booking on the website. See docs/261008-guest-booking.md. */
export type GuestActor = { kind: "guest" };
export type SystemActor = { kind: "system" };
/** Who is doing the change. Every mutation takes one and logs it. */
export type Actor = AdminActor | CustomerActor | GuestActor | SystemActor;
export const GUEST_ACTOR: GuestActor = { kind: "guest" };
export const SYSTEM_ACTOR: SystemActor = { kind: "system" };

/** The log's "who" for an entry whose actor has no account, or none any more. */
export const ANONYMOUS_ACTOR_NAMES: Record<ActorKind, string> = {
  admin: "Former staff",
  customer: "Former customer",
  guest: "Guest",
  system: "System",
};

export const ACTIVITY_ENTITY_TYPES = [
  "booking",
  "state",
  "district",
  "vehicle-class",
  "user",
  "admin",
  "setting",
  "location",
  "vehicle",
  "driver",
  "media",
  "site-page",
  "vendor",
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
  /**
   * An account staff created: its email, names and phone in `after`;
   * `existing` when Clerk held it already and it was only mirrored here.
   */
  "user.created": { entityType: "user", customerVisible: false },
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
  /** A model the vehicle form added to the class, by its name in `modelName`. */
  "vehicle-class.model.created": {
    entityType: "vehicle-class",
    customerVisible: false,
  },
  /** A model no vehicle or booking was of any more, by its name in `modelName`. */
  "vehicle-class.model.deleted": {
    entityType: "vehicle-class",
    customerVisible: false,
  },
  /** Its fields, with the model's and the location's names beside their ids. */
  "vehicle.created": { entityType: "vehicle", customerVisible: false },
  /** The changed fields; a new model or location with its name too. */
  "vehicle.updated": { entityType: "vehicle", customerVisible: false },
  /** The plate in `before`: the row is gone. */
  "vehicle.deleted": { entityType: "vehicle", customerVisible: false },
  /** Its fields, the classes by name in `classes`, the location's name. */
  "driver.created": { entityType: "driver", customerVisible: false },
  /** The changed fields; changed classes by name, a new location with its name. */
  "driver.updated": { entityType: "driver", customerVisible: false },
  /** The name in `before`: the row is gone. */
  "driver.deleted": { entityType: "driver", customerVisible: false },
  "location.created": { entityType: "location", customerVisible: false },
  /**
   * The states are logged by their codes, a top choice by its place on
   * the home page: 1, 2 or 3, null for none.
   */
  "location.updated": { entityType: "location", customerVisible: false },
  /** The whole list before and after, in its order: id, name and place label. */
  "location.addresses.updated": {
    entityType: "location",
    customerVisible: false,
  },
  "location.state.changed": { entityType: "location", customerVisible: false },
  /**
   * The page's key, its slug ("" or none for the main page and a section's
   * own), its name in `after`, and its whole content, before and after, so
   * a publish can be read back and rolled back by hand. The content before
   * is null on the first publish.
   */
  "location.page.published": {
    entityType: "location",
    customerVisible: false,
  },
  /** The page's key and slug, and whether it is published. */
  "location.page.updated": { entityType: "location", customerVisible: false },
  /** A page Marketing added to a section: its key, slug and name, in `after`. */
  "location.page.created": { entityType: "location", customerVisible: false },
  /** A page added on demand given another slug, before its first publish. */
  "location.page.renamed": { entityType: "location", customerVisible: false },
  /** A page added on demand, deleted: its key, slug, name and whether it was on, in `before`. */
  "location.page.deleted": { entityType: "location", customerVisible: false },
  /** A section's pages added on demand, by slug in their order, before and after; `moved` the one moved. */
  "location.pages.ordered": {
    entityType: "location",
    customerVisible: false,
  },
  /**
   * A site page's key and its whole content, before and after, as a
   * location's page logs it. Logged against the page's key.
   */
  "site.page.published": { entityType: "site-page", customerVisible: false },
  /** A site page's key and whether it is published. */
  "site.page.updated": { entityType: "site-page", customerVisible: false },
  /** The footer's whole content, before and after. Logged against `FOOTER_KEY`. */
  "site.footer.published": { entityType: "site-page", customerVisible: false },
  /**
   * The name, the slug, the state codes and the state it had, in
   * `before`: the row is gone, and its other entries are named from this one.
   * `routesFrom` names the other locations whose routes to its zones went
   * with it; the entry is in their history too.
   */
  "location.deleted": { entityType: "location", customerVisible: false },
  /** The class's name and the rates, in `after`. */
  "location.offering.created": {
    entityType: "location",
    customerVisible: false,
  },
  /** The class's name and the changed fields, before and after. */
  "location.offering.updated": {
    entityType: "location",
    customerVisible: false,
  },
  /**
   * The zone's name; its shape stays on the row. A removal's `routesFrom`
   * names the other locations whose routes to it went with it; the entry is
   * in their history too.
   */
  "location.zone.created": { entityType: "location", customerVisible: false },
  "location.zone.updated": { entityType: "location", customerVisible: false },
  "location.zone.deleted": { entityType: "location", customerVisible: false },
  /** The changed cells, each named by its zones and class, before and after. */
  "location.rates.updated": { entityType: "location", customerVisible: false },
  /** The window and percentage, before and after; null for none. */
  "location.surcharge.updated": {
    entityType: "location",
    customerVisible: false,
  },
  /**
   * `dropoffRule`, before and after: the drop-off rule, set before
   * nearest-zone pricing replaced it. Kept so its entries still read.
   */
  "location.dropoff.updated": {
    entityType: "location",
    customerVisible: false,
  },
  /** `freeExtraKm`, `maxExtraKm` and `crossLocation`, those that changed, before and after. */
  "location.reach.updated": {
    entityType: "location",
    customerVisible: false,
  },
  /** The weekend and holiday surcharge, before and after; empty for none. */
  "location.weekend.updated": {
    entityType: "location",
    customerVisible: false,
  },
  /**
   * Its fields, its locations by name in `locations`, and its status:
   * "active" when staff entered it, "pending" when it signed up in Connect.
   */
  "vendor.created": { entityType: "vendor", customerVisible: false },
  /** The changed fields; changed locations by name in `locations`. */
  "vendor.updated": { entityType: "vendor", customerVisible: false },
  "vendor.approved": { entityType: "vendor", customerVisible: false },
  /** The reason in `after`. */
  "vendor.refused": { entityType: "vendor", customerVisible: false },
  /** The reason, and the bookings it was taken off by reference in `released`. */
  "vendor.suspended": { entityType: "vendor", customerVisible: false },
  "vendor.reinstated": { entityType: "vendor", customerVisible: false },
  /** `isOurs`, before and after. */
  "vendor.ours.switched": { entityType: "vendor", customerVisible: false },
  /**
   * The files the Media screen deleted, each with its key, name and size,
   * in `before`. Logged against `MEDIA_RECORD_ID`.
   */
  "media.deleted": { entityType: "media", customerVisible: false },
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

/** The parts of a location its history can be narrowed to, in the History tab's order. */
export const LOCATION_HISTORY_KINDS = [
  "details",
  "classes",
  "coverage",
  "fleet",
  "pages",
  "status",
] as const;
export type LocationHistoryKind = (typeof LOCATION_HISTORY_KINDS)[number];
export const isLocationHistoryKind = guardFor(LOCATION_HISTORY_KINDS);
export const LOCATION_HISTORY_KIND_LABELS: Record<LocationHistoryKind, string> =
  {
    details: "Details",
    classes: "Vehicle classes",
    coverage: "Coverage and rates",
    fleet: "Vehicles and drivers",
    pages: "Pages",
    status: "Status",
  };

/** The part of a location an entry of its history is about; null for an action that is not a location's. */
export function locationHistoryKindOf(
  action: string,
): LocationHistoryKind | null {
  switch (action) {
    case "location.updated":
      return "details";
    case "location.offering.created":
    case "location.offering.updated":
      return "classes";
    case "location.zone.created":
    case "location.zone.updated":
    case "location.zone.deleted":
    case "location.rates.updated":
    case "location.surcharge.updated":
    case "location.dropoff.updated":
    case "location.reach.updated":
    case "location.weekend.updated":
      return "coverage";
    case "vehicle.created":
    case "vehicle.updated":
    case "vehicle.deleted":
    case "driver.created":
    case "driver.updated":
    case "driver.deleted":
      return "fleet";
    case "location.page.published":
    case "location.page.updated":
    case "location.page.created":
    case "location.page.renamed":
    case "location.page.deleted":
    case "location.pages.ordered":
    case "location.addresses.updated":
      return "pages";
    case "location.created":
    case "location.state.changed":
    case "location.deleted":
      return "status";
    default:
      return null;
  }
}

/** The actions one part of a location's history holds. */
export function locationHistoryActions(
  kind: LocationHistoryKind,
): ActivityAction[] {
  return ACTIVITY_ACTIONS.filter(
    (action) => locationHistoryKindOf(action) === kind,
  );
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

/** What the Media screen's entries log against: the uploaded files as a whole. */
export const MEDIA_RECORD_ID = "media";

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
  /** The model chosen, by name; null when any would do. */
  vehicleModel: string | null;
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
  vehicleModel: "the model",
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

/**
 * The labels of an offering's fields as its entries name them: today's,
 * and the base fare and the minimum fare, which nearest-zone pricing
 * removed, so an entry written before still reads as it happened.
 */
const OFFERING_ENTRY_LABELS: Record<string, string> = {
  ...OFFERING_FIELD_LABELS,
  baseFareSen: "Base fare",
  minimumFareSen: "Minimum fare",
};

/** The drop-off rules as their entries named them, before nearest-zone pricing replaced the rule. */
const OLD_DROPOFF_RULES: Record<string, string> = {
  anywhere: "drop-offs anywhere",
  zones: "drop-offs inside this location only",
  grid: "only the routes on the rate grid",
};

function field(json: unknown, key: string): unknown {
  return json !== null && typeof json === "object" && key in json
    ? (json as Record<string, unknown>)[key]
    : undefined;
}

function keysOf(json: unknown): string[] {
  return json !== null && typeof json === "object" ? Object.keys(json) : [];
}

/**
 * ", and Kuala Lumpur's routes to it" for a removal that took other
 * locations' routes (`routesFrom`); empty for one that took none.
 */
function routesGone(json: unknown, toWhat: string) {
  const names = field(json, "routesFrom");
  if (!Array.isArray(names)) return "";
  const owners = names
    .filter((name): name is string => typeof name === "string")
    .map((name) => `${name}'s`);
  return owners.length > 0
    ? `, and ${andList(owners)} routes to ${toWhat}`
    : "";
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

function vehicleClassChanges(after: unknown) {
  const phrases: string[] = [];
  const name = field(after, "name");
  if (typeof name === "string") phrases.push(`Renamed to ${name}`);
  const isActive = field(after, "isActive");
  if (typeof isActive === "boolean") {
    phrases.push(isActive ? "Turned the class on" : "Turned the class off");
  }
  // Entries from before the rates and the rules moved to the location's
  // offering name the class's old fields, which the offering's labels
  // still spell.
  const labelOf = (key: string) =>
    key in VEHICLE_CLASS_FIELD_LABELS
      ? VEHICLE_CLASS_FIELD_LABELS[key as VehicleClassField]
      : (OFFERING_ENTRY_LABELS[key] ?? null);
  const others = keysOf(after)
    .filter((key) => key !== "name" && key !== "isActive")
    .flatMap((key) => {
      const label = labelOf(key);
      return label ? [`the ${label.toLowerCase()}`] : [];
    });
  if (others.length > 0) phrases.push(`Changed ${andList(others)}`);
  return sentence(phrases, "Changed the class");
}

/** "Toyota Alphard", or "a model" when the entry names none. */
function modelName(json: unknown) {
  const name = field(json, "modelName");
  return typeof name === "string" ? name : "a model";
}

/**
 * "Moved to Penang, changed the colour and the road tax": a vehicle's or a
 * driver's changes. The switch, the location and the model or the classes
 * read as their own phrases; the rest are named by their labels.
 */
function recordChanges(
  after: unknown,
  labels: Record<string, string>,
  switched: [on: string, off: string],
  fallback: string,
) {
  const phrases: string[] = [];
  const isActive = field(after, "isActive");
  if (typeof isActive === "boolean") {
    phrases.push(isActive ? switched[0] : switched[1]);
  }
  const locationName = field(after, "locationName");
  if (typeof locationName === "string") {
    phrases.push(`Moved to ${locationName}`);
  }
  const vendorName = field(after, "vendorName");
  if (typeof vendorName === "string") {
    phrases.push(`Moved to the vendor ${vendorName}`);
  }
  const model = field(after, "modelName");
  if (typeof model === "string") phrases.push(`Changed the model to ${model}`);
  const classes = field(after, "classes");
  if (Array.isArray(classes)) {
    phrases.push(
      `Changed the classes they may drive to ${andList(classes.map(String))}`,
    );
  }
  const others = keysOf(after)
    .filter(
      (key) =>
        key in labels &&
        ![
          "isActive",
          "locationId",
          "vendorId",
          "vehicleClassId",
          "brand",
          "model",
          // Entries from before a vehicle named its model by brand and name.
          "vehicleModelId",
        ].includes(key),
    )
    .map((key) => `the ${labels[key]!.toLowerCase()}`);
  if (others.length > 0) phrases.push(`Changed ${andList(others)}`);
  return sentence(phrases, fallback);
}

/** "Changed the contact phone and the locations served": a vendor's changes, named by their labels. */
function vendorChanges(after: unknown) {
  const labels: Record<string, string> = {
    ...VENDOR_FIELD_LABELS,
    services: "What it offers",
    locations: "Locations served",
  };
  const changed = keysOf(after)
    .filter((key) => key in labels && key !== "locationIds")
    .map((key) =>
      key === "services"
        ? "what it offers"
        : `the ${labels[key]!.toLowerCase()}`,
    );
  return changed.length > 0
    ? `Changed ${andList(changed)}`
    : "Changed the vendor";
}

/** "Refused the vendor: no SSM certificate", or the sentence alone when the entry keeps no reason. */
function withReason(sentence: string, json: unknown) {
  const reason = field(json, "reason");
  return typeof reason === "string" && reason !== ""
    ? `${sentence}: ${reason}`
    : sentence;
}

/** "Executive sedan", or "the class" when the entry names none. */
function className(json: unknown) {
  const name = field(json, "vehicleClassName");
  return typeof name === "string" ? name : "the class";
}

/** "Put Executive sedan on sale, changed the base fare and the notice needed" */
function offeringChanges(after: unknown) {
  const name = className(after);
  const phrases: string[] = [];
  const isActive = field(after, "isActive");
  if (typeof isActive === "boolean") {
    phrases.push(isActive ? `Put ${name} on sale` : `Took ${name} off sale`);
  }
  // The charge to choose a model is two columns under one label.
  const others = [
    ...new Set(
      keysOf(after)
        .filter((key) => key in OFFERING_ENTRY_LABELS && key !== "isActive")
        .map((key) => `the ${OFFERING_ENTRY_LABELS[key]!.toLowerCase()}`),
    ),
  ];
  if (others.length > 0) {
    phrases.push(
      phrases.length > 0
        ? `Changed ${andList(others)}`
        : `Changed ${andList(others)} of ${name}`,
    );
  }
  return sentence(phrases, `Changed ${name}`);
}

/** "the zone Langkawi Airport", or "a zone". */
function zoneName(json: unknown) {
  const name = field(json, "name");
  return typeof name === "string" ? `the zone ${name}` : "a zone";
}

/** The weekend and holiday surcharge an entry holds; null for none. */
function weekendIn(json: unknown): WeekendSurcharge | null {
  const days = field(json, "days");
  const dates = field(json, "dates");
  const percent = field(json, "percent");
  const flatSen = field(json, "flatSen");
  if (!Array.isArray(days) || !Array.isArray(dates)) return null;
  const list = {
    days: days.filter((day): day is number => typeof day === "number"),
    dates: dates.filter((date): date is string => typeof date === "string"),
  };
  if (typeof percent === "number") return { ...list, percent, flatSen: null };
  if (typeof flatSen === "number") return { ...list, percent: null, flatSen };
  return null;
}

/** The surcharge an entry logged: a window and a percentage, or since a flat amount too. */
function oddHoursIn(json: unknown): OddHours | null {
  const fromMinute = field(json, "fromMinute");
  const toMinute = field(json, "toMinute");
  const percent = field(json, "percent");
  const flatSen = field(json, "flatSen");
  if (typeof fromMinute !== "number" || typeof toMinute !== "number") {
    return null;
  }
  if (typeof percent === "number") {
    return { fromMinute, toMinute, percent, flatSen: null };
  }
  if (typeof flatSen === "number") {
    return { fromMinute, toMinute, percent: null, flatSen };
  }
  return null;
}

/** 1.2 -> "×1.20": the multiplier of entries from before rates were set per location. */
function formatMultiplier(multiplier: number) {
  return `×${multiplier.toFixed(2)}`;
}

function locationChanges(before: unknown, after: unknown) {
  const phrases: string[] = [];
  const name = field(after, "name");
  if (typeof name === "string") phrases.push(`Renamed to ${name}`);
  const present = new Set(keysOf(after));
  if (present.has("topChoiceOrder")) {
    const place = field(after, "topChoiceOrder");
    if (typeof place !== "number") {
      phrases.push("Removed from the top choices");
    } else if (typeof field(before, "topChoiceOrder") === "number") {
      phrases.push(`Moved to top choice ${place}`);
    } else {
      phrases.push(`Made top choice ${place}`);
    }
  }
  const others = (
    Object.keys(LOCATION_FIELD_LABELS) as (keyof typeof LOCATION_FIELD_LABELS)[]
  )
    .filter((key) => key !== "name" && present.has(key))
    .map((key) => LOCATION_FIELD_LABELS[key]);
  if (others.length > 0) phrases.push(`Changed ${andList(others)}`);
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
    `${verb} the ${names.length > 1 ? "addresses" : "address"} ${andList(names)}`;

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
 * "Went live", "Paused the location": the move by the state it reached. The
 * log is never rewritten, so the moves of the `preview` state, which
 * locations had until docs/261003-location-flow.md, keep their sentences.
 */
function stateMove(before: unknown, after: unknown) {
  const from = field(before, "state");
  switch (field(after, "state")) {
    case "live":
      return from === "paused" ? "Resumed the location" : "Went live";
    case "paused":
      return "Paused the location";
    case "preview":
      return "Moved to preview";
    case "draft":
      return "Moved back to draft";
    default:
      return "Changed the state";
  }
}

/**
 * "the main page", "the popular place “Eagle Square”", or "a page" when
 * the entry names none we know. An entry from before sections names no
 * slug; one from before names were logged reads its name off the content.
 */
function pageName(json: unknown) {
  const ref = loggedPageRef(json);
  if (!ref) return "a page";
  const name = field(json, "name");
  const content = field(json, "content");
  const headline = field(content, "heroHeadline");
  return pageNameOf(
    ref,
    typeof name === "string" && name !== ""
      ? name
      : typeof headline === "string"
        ? headline
        : undefined,
  );
}

/** "About us", or "a site page" when the entry names none we know. */
function sitePageName(json: unknown) {
  const page = field(json, "page");
  return isSitePageKey(page) ? SITE_PAGE_LABELS[page] : "a site page";
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
        ? `Changed ${andList(changed)} of ${name}`
        : `Amended ${name}`;
    }
    case "booking.cancelled":
      return "Cancelled the booking";
    case "user.created":
      return field(entry.after, "existing") === true
        ? "Added the account Clerk already held"
        : "Created the account";
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
    case "vehicle-class.model.created":
      return `Added the model ${modelName(entry.after)}`;
    case "vehicle-class.model.deleted":
      return `Removed the model ${modelName(entry.before)}`;
    case "vehicle.created":
      return "Added the vehicle";
    case "vehicle.updated":
      return recordChanges(
        entry.after,
        VEHICLE_FIELD_LABELS,
        ["Put the vehicle in service", "Took the vehicle out of service"],
        "Changed the vehicle",
      );
    case "vehicle.deleted": {
      const model = field(entry.before, "modelName");
      return typeof model === "string"
        ? `Deleted the ${model}`
        : "Deleted the vehicle";
    }
    case "driver.created":
      return "Added the driver";
    case "driver.updated":
      return recordChanges(
        entry.after,
        DRIVER_FIELD_LABELS,
        ["Made the driver active", "Made the driver inactive"],
        "Changed the driver",
      );
    case "driver.deleted":
      return "Deleted the driver";
    case "location.created":
      return "Created the location";
    case "location.updated":
      return locationChanges(entry.before, entry.after);
    case "location.addresses.updated":
      return addressChanges(entry.before, entry.after);
    case "location.state.changed":
      return stateMove(entry.before, entry.after);
    case "location.deleted":
      return `Deleted the location${routesGone(entry.before, "its zones")}`;
    case "location.page.published":
      return `Published ${pageName(entry.after)}`;
    case "location.page.updated":
      // A page is unpublished; until docs/261003-location-flow.md it was a
      // switch, and the entries of it being turned on keep their sentence.
      return field(entry.after, "isOn") === true
        ? `Turned ${pageName(entry.after)} on`
        : `Unpublished ${pageName(entry.after)}`;
    case "location.page.created":
      return `Added ${pageName(entry.after)}`;
    case "location.page.renamed": {
      const page = field(entry.after, "page");
      const slug = field(entry.after, "slug");
      return `Changed the address of ${pageName(entry.after)} to /${typeof page === "string" ? `${page}/` : ""}${typeof slug === "string" ? slug : ""}`;
    }
    case "location.page.deleted":
      return `Deleted ${pageName(entry.before)}`;
    case "location.pages.ordered": {
      const moved = field(entry.after, "moved");
      const page = field(entry.after, "page");
      return typeof moved === "string"
        ? `Moved ${pageName({ page, slug: moved })} in the order`
        : "Changed the order of the pages";
    }
    case "site.page.published":
      return `Published ${sitePageName(entry.after)}`;
    case "site.page.updated":
      return `Unpublished ${sitePageName(entry.after)}`;
    case "site.footer.published":
      return "Published the footer";
    case "location.offering.created":
      return `Started selling ${className(entry.after)}`;
    case "location.offering.updated":
      return offeringChanges(entry.after);
    case "location.zone.created":
      return `Added ${zoneName(entry.after)}`;
    case "location.zone.updated": {
      // Another zone saved over this one trimmed it of its ground.
      const cutFor = field(entry.after, "cutFor");
      if (typeof cutFor === "string") {
        return `Trimmed ${zoneName(entry.after)} for ${cutFor}`;
      }
      const was = field(entry.before, "name");
      const now = field(entry.after, "name");
      return typeof was === "string" && typeof now === "string" && was !== now
        ? `Renamed the zone ${was} to ${now}`
        : `Redrew ${zoneName(entry.after)}`;
    }
    case "location.zone.deleted":
      return `Removed ${zoneName(entry.before)}${routesGone(entry.before, "it")}`;
    case "location.rates.updated": {
      const cells = field(entry.after, "cells");
      const count = Array.isArray(cells) ? cells.length : 0;
      return count === 1
        ? "Changed a rate on the grid"
        : `Changed ${count} rates on the grid`;
    }
    case "location.surcharge.updated": {
      const window = oddHoursIn(entry.after);
      return window
        ? `Set the odd-hours surcharge to ${oddHoursLabel(window)}`
        : "Removed the odd-hours surcharge";
    }
    case "location.dropoff.updated": {
      const rule = field(entry.after, "dropoffRule");
      return `Set ${OLD_DROPOFF_RULES[String(rule)] ?? OLD_DROPOFF_RULES.anywhere}`;
    }
    case "location.reach.updated": {
      const freeExtraKm = field(entry.after, "freeExtraKm");
      const maxExtraKm = field(entry.after, "maxExtraKm");
      const crossLocation = field(entry.after, "crossLocation");
      const parts = [
        ...(typeof freeExtraKm === "number"
          ? [`the free extra road to ${freeExtraKm} km`]
          : []),
        ...(typeof maxExtraKm === "number"
          ? [`the furthest extra road to ${maxExtraKm} km`]
          : []),
        ...(typeof crossLocation === "boolean"
          ? [`cross-location ${crossLocation ? "on" : "off"}`]
          : []),
      ];
      return `Set ${andList(parts)}`;
    }
    case "location.weekend.updated": {
      const weekend = weekendIn(entry.after);
      return weekend
        ? `Set the weekend and holiday surcharge to ${weekendLabel(weekend)}`
        : "Removed the weekend and holiday surcharge";
    }
    case "vendor.created":
      return field(entry.after, "status") === "pending"
        ? "Signed up in Connect"
        : "Added the vendor";
    case "vendor.updated":
      return vendorChanges(entry.after);
    case "vendor.approved":
      return "Approved the vendor";
    case "vendor.refused":
      return withReason("Refused the vendor", entry.after);
    case "vendor.suspended": {
      const released = field(entry.after, "released");
      const count = Array.isArray(released) ? released.length : 0;
      const taken =
        count > 0
          ? `, and took it off ${count === 1 ? "1 booking" : `${count} bookings`}`
          : "";
      return withReason(`Suspended the vendor${taken}`, entry.after);
    }
    case "vendor.reinstated":
      return "Reinstated the vendor";
    case "vendor.ours.switched":
      return field(entry.after, "isOurs") === true
        ? "Made the vendor ours"
        : "Made the vendor not ours";
    case "media.deleted": {
      const files = field(entry.before, "files");
      const count = Array.isArray(files) ? files.length : 0;
      return count === 1 ? "Deleted an image" : `Deleted ${count} images`;
    }
  }
}
