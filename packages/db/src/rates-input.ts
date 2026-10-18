import { formatClock } from "./booking-rules";
import type { Change } from "./change";
import { numberOf, textOf, type Parsed } from "./fields";
import type { Ring } from "./geo";
import { formatMyr, parseRinggit } from "./money";
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
  /** Corners of a zone, all its pieces together: the largest district has 653. */
  corners: 1000,
  /** Metres, for a circle around a place. */
  radiusM: { min: 100, max: 50_000 },
} as const;

/**
 * A zone started as a circle around a place. The place and the radius are
 * a reference only: the shape is what the admin left after reshaping it,
 * and is stored as drawn.
 */
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

/**
 * A zone that is a district as it is: the district's code, and its name as
 * the editor shows it. The official boundary, read again from the code on
 * every save, so it never drifts from the data.
 */
export type ZoneDistrict = {
  districtCode: string;
  label: string;
};

export function isZoneDistrict(value: unknown): value is ZoneDistrict {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return typeof d.districtCode === "string" && typeof d.label === "string";
}

/**
 * A zone started from a district's boundary and then reshaped by hand: the
 * district is a reference only, and the shape is stored as drawn.
 */
export type ZoneReshaped = {
  reshapedFrom: string;
  label: string;
};

export function isZoneReshaped(value: unknown): value is ZoneReshaped {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.reshapedFrom === "string" && typeof r.label === "string";
}

/** Where a zone's shape came from, when it was not drawn from a plain circle or square. */
export type ZoneOrigin = ZoneCircle | ZoneDistrict | ZoneReshaped;

export function isZoneOrigin(value: unknown): value is ZoneOrigin {
  return isZoneCircle(value) || isZoneDistrict(value) || isZoneReshaped(value);
}

/** What the zone editor saves. */
export type ZoneFields = {
  name: string;
  /** One closed ring of [lng, lat], or a district's polygons. */
  shape: ZoneShape;
  /** The place, the district or the boundary it was started from; null for a plain circle or square. */
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
    (isZoneDistrict(fields.drawnFrom) &&
      fields.drawnFrom.districtCode === "") ||
    (isZoneReshaped(fields.drawnFrom) && fields.drawnFrom.reshapedFrom === "")
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
 * closed. A district as it is has its boundary read again by the writer's
 * caller from its code; every other shape is stored as drawn.
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
        : isZoneReshaped(drawnFrom)
          ? { reshapedFrom: drawnFrom.reshapedFrom, label: drawnFrom.label }
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

/**
 * What the odd-hours surcharge adds to a trip: a percentage of its price,
 * or a flat amount in sen. Exactly one of the two is set.
 */
export type SurchargeCharge =
  { percent: number; flatSen: null } | { percent: null; flatSen: number };

/** The odd-hours surcharge: a window as minutes of the local day, and what it adds. */
export type OddHours = {
  fromMinute: number;
  toMinute: number;
} & SurchargeCharge;

/** How the form asks what the surcharge adds. */
export const SURCHARGE_KINDS = ["percent", "flat"] as const;
export type SurchargeKind = (typeof SURCHARGE_KINDS)[number];

export const ODD_HOURS = {
  maxPercent: 200,
  /** RM 1,000. */
  maxFlatSen: 100_000,
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

/** 1380 -> "23:00", the value of the form's time fields. */
export function timeOfMinute(minute: number): string {
  const hours = Math.floor(minute / 60);
  const minutes = minute % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** "+50%" or "+RM 30.00" */
export function surchargeLabel(charge: SurchargeCharge) {
  return charge.percent !== null
    ? `+${charge.percent}%`
    : `+${formatMyr(charge.flatSen)}`;
}

/** "11:00 PM to 7:00 AM, +50%" or "11:00 PM to 7:00 AM, +RM 30.00" */
export function oddHoursLabel(window: OddHours) {
  return `${formatClock(window.fromMinute)} to ${formatClock(window.toMinute)}, ${surchargeLabel(window)}`;
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
      return fail(
        "Pick the times the window starts and ends, such as 11:00 PM to 7:00 AM.",
      );
    }
  }
  if (window.fromMinute === window.toMinute) {
    return fail("The window ends at a different time from the one it starts.");
  }
  if (window.percent !== null) {
    if (
      !Number.isInteger(window.percent) ||
      window.percent < 1 ||
      window.percent > ODD_HOURS.maxPercent
    ) {
      return fail(
        `The surcharge is a whole percentage between 1 and ${ODD_HOURS.maxPercent}.`,
      );
    }
  } else if (
    !Number.isInteger(window.flatSen) ||
    window.flatSen < 1 ||
    window.flatSen > ODD_HOURS.maxFlatSen
  ) {
    return fail(
      `The surcharge is an amount between ${formatMyr(1)} and ${formatMyr(ODD_HOURS.maxFlatSen)}.`,
    );
  }
  return { ok: true };
}

/**
 * The surcharge form's `from`, `to`, `kind` and `amount`, read and
 * checked: `kind` "percent" reads the amount as a whole percentage, "flat"
 * as ringgit. The window and the amount empty mean no surcharge; anything
 * else needs all three.
 */
export function parseOddHoursFields(
  values: Record<string, unknown>,
): Parsed<OddHours | null> {
  const from = textOf(values.from);
  const to = textOf(values.to);
  const kind: SurchargeKind = values.kind === "flat" ? "flat" : "percent";
  const amountText = textOf(values.amount);
  if (from === "" && to === "" && amountText === "") {
    return { ok: true, value: null };
  }
  const fromMinute = minuteOfDay(from);
  const toMinute = minuteOfDay(to);
  if (fromMinute === null || toMinute === null) {
    return {
      ok: false,
      error:
        "Pick the times the window starts and ends, such as 11:00 PM to 7:00 AM.",
    };
  }
  let window: OddHours;
  if (kind === "percent") {
    window = {
      fromMinute,
      toMinute,
      percent: numberOf(amountText),
      flatSen: null,
    };
  } else {
    const flatSen = parseRinggit(amountText);
    if (flatSen === null) {
      return {
        ok: false,
        error: "Enter the surcharge in RM, with at most two decimals.",
      };
    }
    window = { fromMinute, toMinute, percent: null, flatSen };
  }
  const check = checkOddHours(window);
  return check.ok ? { ok: true, value: window } : check;
}

/** The odd-hours columns of a location as the rules read them; null when unset. */
export function oddHoursOf(location: {
  oddHoursFromMinute: number | null;
  oddHoursToMinute: number | null;
  oddHoursPercent: number | null;
  oddHoursFlatSen: number | null;
}): OddHours | null {
  const {
    oddHoursFromMinute: fromMinute,
    oddHoursToMinute: toMinute,
    oddHoursPercent: percent,
    oddHoursFlatSen: flatSen,
  } = location;
  if (fromMinute === null || toMinute === null) return null;
  if (percent !== null) return { fromMinute, toMinute, percent, flatSen: null };
  if (flatSen !== null) return { fromMinute, toMinute, percent: null, flatSen };
  return null;
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

/** The rule in a word or two, where a summary names it: the location's panel, its overview. */
export const DROPOFF_RULE_SHORT_LABELS: Record<DropoffRule, string> = {
  anywhere: "Anywhere",
  zones: "Inside the zones",
  grid: "Grid routes only",
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
