import { ITEM_STATUS_LABELS, isItemStatus } from "./booking-status";
import { guardFor } from "./const-enum";
import { ADMIN_TEAM_LABELS, adminTeamsOf } from "./roles";

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
  "zone",
  "vehicle-class",
  "admin",
  "setting",
] as const;
export type ActivityEntityType = (typeof ACTIVITY_ENTITY_TYPES)[number];
export const isActivityEntityType = guardFor(ACTIVITY_ENTITY_TYPES);

/**
 * Each action names the record type it logs against and whether a customer
 * may ever see it. Item actions log against their booking, with the item's
 * position in `before` and `after`.
 */
const ACTIONS = {
  "booking.created": { entityType: "booking", customerVisible: true },
  "booking.item.confirmed": { entityType: "booking", customerVisible: true },
  "booking.item.assigned": { entityType: "booking", customerVisible: true },
  "booking.item.completed": { entityType: "booking", customerVisible: true },
  "booking.item.cancelled": { entityType: "booking", customerVisible: true },
  "booking.cancelled": { entityType: "booking", customerVisible: true },
  "admin.promoted": { entityType: "admin", customerVisible: false },
  "admin.updated": { entityType: "admin", customerVisible: false },
  "admin.revoked": { entityType: "admin", customerVisible: false },
  "wall.switched": { entityType: "setting", customerVisible: false },
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

/**
 * One entry as a short sentence without its actor: "Confirmed item 2",
 * "Turned the wall on". The actor and the time are shown beside it.
 */
export function describeActivity(entry: DescribableActivity): string {
  if (!isActivityAction(entry.action)) return entry.action;
  switch (entry.action) {
    case "booking.created": {
      const items = field(entry.after, "items");
      return typeof items === "number" && items > 1
        ? `Made the booking with ${items} items`
        : "Made the booking";
    }
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
  }
}
