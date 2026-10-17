import type { Change } from "./change";
import { numberOf, textOf, type Parsed } from "./fields";
import type { Ring } from "./geo";
import { parseRinggit } from "./money";
import { isRing, isZoneShape, ringsOf, type ZoneShape } from "./zone-match";

/**
 * What the Zones and rates tab edits and the rules it checks, pure and
 * browser-safe: the forms display the messages, the writers in ./zones
 * apply the same checks before they write. See
 * docs/261015-locations-as-operation-areas.md.
 */

const fail = (error: string): Change => ({ ok: false, error });

export const ZONE_LIMITS = {
  /** Characters. */
  name: 60,
  /** Zones per location. A price list, not a map of the country. */
  zones: 40,
  /** Corners of a drawn polygon. */
  corners: 500,
  /** Metres, for a circle around a place. */
  radiusM: { min: 100, max: 50_000 },
} as const;

/** A zone drawn as a circle around a place: what the editor keeps to show and redo it. */
export type ZoneCircle = {
  placeId: string;
  label: string;
  radiusM: number;
};

export function isZoneCircle(value: unknown): value is ZoneCircle {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.placeId === "string" &&
    typeof c.label === "string" &&
    typeof c.radiusM === "number"
  );
}

/** A zone that is a district as it is: the district's code, and its name as the editor shows it. */
export type ZoneDistrict = {
  districtCode: string;
  label: string;
};

export function isZoneDistrict(value: unknown): value is ZoneDistrict {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return typeof d.districtCode === "string" && typeof d.label === "string";
}

/** Where a zone's shape came from, when it was not drawn corner by corner. */
export type ZoneOrigin = ZoneCircle | ZoneDistrict;

export function isZoneOrigin(value: unknown): value is ZoneOrigin {
  return isZoneCircle(value) || isZoneDistrict(value);
}

/** What the zone editor saves. */
export type ZoneFields = {
  name: string;
  /** One closed ring of [lng, lat], or a district's polygons. */
  shape: ZoneShape;
  /** The place and radius, or the district, it was drawn from; null for a drawn polygon. */
  drawnFrom: ZoneOrigin | null;
};

export function checkZoneName(name: string): Change {
  if (name === "") return fail("Enter the zone's name.");
  if (name.length > ZONE_LIMITS.name) {
    return fail(`A zone name is at most ${ZONE_LIMITS.name} characters.`);
  }
  return { ok: true };
}

export function checkRadius(radiusM: number): Change {
  const { min, max } = ZONE_LIMITS.radiusM;
  if (!Number.isInteger(radiusM) || radiusM < min || radiusM > max) {
    return fail(
      `The radius is a whole number of metres between ${min} and ${max}.`,
    );
  }
  return { ok: true };
}

/**
 * A shape is a ring with three to `corners` corners, or a district's
 * polygons with that many corners between them; the writer closes it.
 */
export function checkZoneShape(shape: unknown): Change {
  if (!isZoneShape(shape)) {
    return fail(
      "Draw the zone on the map, pick a place and a radius, or pick a district.",
    );
  }
  const corners = ringsOf(shape).reduce((sum, ring) => sum + ring.length, 0);
  if (corners > ZONE_LIMITS.corners + ringsOf(shape).length) {
    return fail(`A zone has at most ${ZONE_LIMITS.corners} corners.`);
  }
  return { ok: true };
}

/** The ring with its first corner repeated at the end, as zones are stored. */
export function closedRing(ring: Ring): Ring {
  const first = ring[0]!;
  const last = ring[ring.length - 1]!;
  return first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
}

/** The shape with every ring closed. */
export function closedShape(shape: ZoneShape): ZoneShape {
  return isRing(shape)
    ? closedRing(shape)
    : shape.map((polygon) => polygon.map(closedRing));
}

export function checkZoneFields(fields: ZoneFields): Change {
  const name = checkZoneName(fields.name);
  if (!name.ok) return name;
  const shape = checkZoneShape(fields.shape);
  if (!shape.ok) return shape;
  if (isZoneCircle(fields.drawnFrom)) {
    const radius = checkRadius(fields.drawnFrom.radiusM);
    if (!radius.ok) return radius;
  }
  if (
    isZoneDistrict(fields.drawnFrom) &&
    fields.drawnFrom.districtCode === ""
  ) {
    return fail("Pick a district.");
  }
  return { ok: true };
}

const UNREADABLE_ZONE: Parsed<never> = {
  ok: false,
  error: "The zone could not be read. Reload and draw it again.",
};

/**
 * The zone editor's values, read and checked: `{ name, shape, drawnFrom }`
 * as the editor holds them. The shape arrives closed or open and is stored
 * closed. A circle's or a district's shape is drawn again by the writer's
 * caller from the place or the district; what arrives here only has to be
 * a shape.
 */
export function parseZoneFields(value: unknown): Parsed<ZoneFields> {
  if (typeof value !== "object" || value === null) return UNREADABLE_ZONE;
  const { name, shape, drawnFrom } = value as Record<string, unknown>;
  if (
    drawnFrom !== null &&
    drawnFrom !== undefined &&
    !isZoneOrigin(drawnFrom)
  ) {
    return UNREADABLE_ZONE;
  }
  const check = checkZoneShape(shape);
  if (!check.ok) return check;
  const fields: ZoneFields = {
    name: textOf(name),
    shape: closedShape(shape as ZoneShape),
    drawnFrom: isZoneCircle(drawnFrom)
      ? {
          placeId: drawnFrom.placeId,
          label: drawnFrom.label,
          radiusM: drawnFrom.radiusM,
        }
      : isZoneDistrict(drawnFrom)
        ? { districtCode: drawnFrom.districtCode, label: drawnFrom.label }
        : null,
  };
  const checked = checkZoneFields(fields);
  return checked.ok ? { ok: true, value: fields } : checked;
}

/** One cell of the rate grid as the form posts it; null clears the cell. */
export type RateCell = {
  fromZoneId: string;
  toZoneId: string;
  vehicleClassId: string;
  priceSen: number | null;
};

const UNREADABLE_CELLS: Parsed<never> = {
  ok: false,
  error: "The rates could not be read. Reload and try again.",
};

/**
 * The grid's cells as posted: `[{ fromZoneId, toZoneId, vehicleClassId,
 * price }]` with the price in ringgit as typed, or "" to clear the cell.
 * Whether the zones and classes are the location's is the writer's check.
 */
export function parseRateCells(rows: unknown): Parsed<RateCell[]> {
  if (!Array.isArray(rows)) return UNREADABLE_CELLS;
  const cells: RateCell[] = [];
  const seen = new Set<string>();
  for (const row of rows as unknown[]) {
    if (typeof row !== "object" || row === null) return UNREADABLE_CELLS;
    const { fromZoneId, toZoneId, vehicleClassId, price } = row as Record<
      string,
      unknown
    >;
    if (
      typeof fromZoneId !== "string" ||
      typeof toZoneId !== "string" ||
      typeof vehicleClassId !== "string" ||
      !fromZoneId ||
      !toZoneId ||
      !vehicleClassId
    ) {
      return UNREADABLE_CELLS;
    }
    if (fromZoneId === toZoneId) {
      return { ok: false, error: "A route runs between two different zones." };
    }
    const key = `${fromZoneId}|${toZoneId}|${vehicleClassId}`;
    if (seen.has(key)) return UNREADABLE_CELLS;
    seen.add(key);
    const text = textOf(price);
    let priceSen: number | null = null;
    if (text !== "") {
      priceSen = parseRinggit(text);
      if (priceSen === null) {
        return {
          ok: false,
          error: `"${text}" is not a price. Enter it in RM, with at most two decimals, or leave the cell empty.`,
        };
      }
    }
    cells.push({ fromZoneId, toZoneId, vehicleClassId, priceSen });
  }
  return { ok: true, value: cells };
}

/** A route on the grid: one row, named by its two zones. */
export type GridRoute = { fromZoneId: string; toZoneId: string };

/** The odd-hours surcharge: a window as minutes of the local day, and a percentage. */
export type OddHours = {
  fromMinute: number;
  toMinute: number;
  percent: number;
};

export const ODD_HOURS = {
  maxPercent: 200,
} as const;

const MINUTES_PER_DAY = 24 * 60;

/** "23:00" -> 1380; null for anything that is not a time of day. */
export function minuteOfDay(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 1380 -> "23:00", for the form's inputs and the sentences. */
export function timeOfMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "23:00 to 07:00, +50%" */
export function oddHoursLabel(window: OddHours) {
  return `${timeOfMinute(window.fromMinute)} to ${timeOfMinute(window.toMinute)}, +${window.percent}%`;
}

/**
 * Whether a minute of the day is in the window. A window whose end is
 * before its start spans midnight: 23:00 to 07:00 holds 23:30 and 06:00.
 * The end is exclusive, so 07:00 itself is daytime.
 */
export function isInOddHours(window: OddHours, minute: number) {
  const { fromMinute, toMinute } = window;
  if (fromMinute === toMinute) return false;
  return fromMinute < toMinute
    ? minute >= fromMinute && minute < toMinute
    : minute >= fromMinute || minute < toMinute;
}

export function checkOddHours(window: OddHours): Change {
  for (const minute of [window.fromMinute, window.toMinute]) {
    if (!Number.isInteger(minute) || minute < 0 || minute >= MINUTES_PER_DAY) {
      return fail("Enter the window as times of day, such as 23:00 to 07:00.");
    }
  }
  if (window.fromMinute === window.toMinute) {
    return fail("The window ends at a different time from the one it starts.");
  }
  if (
    !Number.isInteger(window.percent) ||
    window.percent < 1 ||
    window.percent > ODD_HOURS.maxPercent
  ) {
    return fail(
      `The surcharge is a whole percentage between 1 and ${ODD_HOURS.maxPercent}.`,
    );
  }
  return { ok: true };
}

/**
 * The surcharge form's `from`, `to` and `percent`, read and checked. All
 * three empty means no surcharge; anything else needs all three.
 */
export function parseOddHoursFields(
  values: Record<string, unknown>,
): Parsed<OddHours | null> {
  const from = textOf(values.from);
  const to = textOf(values.to);
  const percentText = textOf(values.percent);
  if (from === "" && to === "" && percentText === "") {
    return { ok: true, value: null };
  }
  const fromMinute = minuteOfDay(from);
  const toMinute = minuteOfDay(to);
  if (fromMinute === null || toMinute === null) {
    return {
      ok: false,
      error: "Enter the window as times of day, such as 23:00 to 07:00.",
    };
  }
  const window: OddHours = {
    fromMinute,
    toMinute,
    percent: numberOf(percentText),
  };
  const check = checkOddHours(window);
  return check.ok ? { ok: true, value: window } : check;
}

/** The odd-hours columns of a location as the rules read them; null when unset. */
export function oddHoursOf(location: {
  oddHoursFromMinute: number | null;
  oddHoursToMinute: number | null;
  oddHoursPercent: number | null;
}): OddHours | null {
  const { oddHoursFromMinute, oddHoursToMinute, oddHoursPercent } = location;
  return oddHoursFromMinute !== null &&
    oddHoursToMinute !== null &&
    oddHoursPercent !== null
    ? {
        fromMinute: oddHoursFromMinute,
        toMinute: oddHoursToMinute,
        percent: oddHoursPercent,
      }
    : null;
}

/**
 * Where a one-way trip from the location may end, from the loosest to the
 * strictest: anywhere in Malaysia, metered where the grid has no price;
 * inside one of the location's zones, metered where the grid has no
 * price; or only on a route the grid prices, and only in a class the
 * route has a price for. The pickup is always in a zone, whatever the
 * rule, and hourly hire has no drop-off. See
 * docs/261015-locations-as-operation-areas.md, "Pickup here, drop-off
 * anywhere".
 */
export const DROPOFF_RULES = ["anywhere", "zones", "grid"] as const;
export type DropoffRule = (typeof DROPOFF_RULES)[number];

export function isDropoffRule(value: unknown): value is DropoffRule {
  return DROPOFF_RULES.includes(value as DropoffRule);
}

/** The rule a location row holds; a value from before the rules were named reads as the loosest. */
export function dropoffRuleOf(location: { dropoffRule: string }): DropoffRule {
  return isDropoffRule(location.dropoffRule)
    ? location.dropoffRule
    : "anywhere";
}

/** What each setting of the drop-off rule says on the location's tab. */
export const DROPOFF_RULE_LABELS: Record<DropoffRule, string> = {
  anywhere: "Drop-offs anywhere",
  zones: "Drop-offs inside this location only",
  grid: "Only the routes on the rate grid",
};

export function dropoffRuleLabel(rule: DropoffRule) {
  return DROPOFF_RULE_LABELS[rule];
}

/**
 * Whether a drop-off that fell in a zone, or in none, is allowed under the
 * rule. Under "grid" a drop-off in a zone still needs a priced route; that
 * is the quote's check, per class, since a route may be priced for some
 * classes and not others.
 */
export function dropoffAllowed(rule: DropoffRule, inZone: boolean): boolean {
  return rule === "anywhere" || inZone;
}
