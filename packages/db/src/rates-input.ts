import { formatClock } from "./booking-rules";
import { refuse, type Change } from "./change";
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

export const ZONE_LIMITS = {
  /** Characters. */
  name: 60,
  /** Zones per location. A price list, not a map of the country. */
  zones: 40,
  /**
   * Corners of a zone, all its pieces together: the largest district has
   * 653, and Langkawi's mukims with their islands 1,322 between them.
   */
  corners: 2000,
  /** Mukims one zone is made of: every one of a district's. Kota Bharu, the most, has 85. */
  mukims: 100,
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

/** Absent, or a list of codes. */
const isCodes = (value: unknown): value is string[] | undefined =>
  value === undefined ||
  (Array.isArray(value) && value.every((code) => typeof code === "string"));

/**
 * A zone that is a district as it is, or some of its mukims as they are:
 * the district's code, the mukims' codes when it is some of them, and the
 * district's name as the editor shows it. The official boundary, read
 * again from the codes on every save, so it never drifts from the data.
 */
export type ZoneDistrict = {
  districtCode: string;
  /** The mukims the zone is made of, put together; absent for the whole district. */
  mukimCodes?: string[];
  label: string;
};

export function isZoneDistrict(value: unknown): value is ZoneDistrict {
  if (typeof value !== "object" || value === null) return false;
  const d = value as Record<string, unknown>;
  return (
    typeof d.districtCode === "string" &&
    typeof d.label === "string" &&
    isCodes(d.mukimCodes)
  );
}

/**
 * A zone started from a district's boundary, or some of its mukims', and
 * then reshaped by hand or with other zones cut out of it: the district
 * and the mukims are a reference only, and the shape is stored as drawn.
 */
export type ZoneReshaped = {
  reshapedFrom: string;
  mukimCodes?: string[];
  label: string;
};

export function isZoneReshaped(value: unknown): value is ZoneReshaped {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.reshapedFrom === "string" &&
    typeof r.label === "string" &&
    isCodes(r.mukimCodes)
  );
}

/** The mukims a district zone names, without repeats; absent when it names none. */
function mukimCodesOf(codes: string[] | undefined) {
  return codes ? { mukimCodes: [...new Set(codes)] } : {};
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
  if (name === "") return refuse("Enter the zone's name.");
  if (name.length > ZONE_LIMITS.name) {
    return refuse(`A zone name is at most ${ZONE_LIMITS.name} characters.`);
  }
  return { ok: true };
}

export function checkRadius(radiusM: number): Change {
  const { min, max } = ZONE_LIMITS.radiusM;
  if (!Number.isInteger(radiusM) || radiusM < min || radiusM > max) {
    return refuse(
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
    return refuse(
      "Draw the zone on the map, pick a place and a radius, or pick a district or its mukims.",
    );
  }
  const corners = ringsOf(shape).reduce((sum, ring) => sum + ring.length, 0);
  if (corners > ZONE_LIMITS.corners + ringsOf(shape).length) {
    return refuse(`A zone has at most ${ZONE_LIMITS.corners} corners.`);
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
    return refuse("Pick a district.");
  }
  const mukims =
    isZoneDistrict(fields.drawnFrom) || isZoneReshaped(fields.drawnFrom)
      ? fields.drawnFrom.mukimCodes
      : undefined;
  if (mukims && mukims.length === 0) return refuse("Tick at least one mukim.");
  if (mukims && mukims.length > ZONE_LIMITS.mukims) {
    return refuse(`A zone is made of at most ${ZONE_LIMITS.mukims} mukims.`);
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
        ? {
            districtCode: drawnFrom.districtCode,
            ...mukimCodesOf(drawnFrom.mukimCodes),
            label: drawnFrom.label,
          }
        : isZoneReshaped(drawnFrom)
          ? {
              reshapedFrom: drawnFrom.reshapedFrom,
              ...mukimCodesOf(drawnFrom.mukimCodes),
              label: drawnFrom.label,
            }
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
 * What a charge adds to a trip: a percentage of its price, or a flat
 * amount in sen. Exactly one of the two is set. The odd-hours surcharge is
 * one, and so is the charge for choosing a model.
 */
export type SurchargeCharge =
  { percent: number; flatSen: null } | { percent: null; flatSen: number };

/** The odd-hours surcharge: a window as minutes of the local day, and what it adds. */
export type OddHours = {
  fromMinute: number;
  toMinute: number;
} & SurchargeCharge;

/** How a form asks what a charge adds. */
export const SURCHARGE_KINDS = ["percent", "flat"] as const;
export type SurchargeKind = (typeof SURCHARGE_KINDS)[number];

/** The most a charge may add. */
export const CHARGE_LIMITS = {
  maxPercent: 200,
  /** RM 1,000. */
  maxFlatSen: 100_000,
} as const;

const sentenceCase = (text: string) =>
  text.charAt(0).toUpperCase() + text.slice(1);

/**
 * The rules on a charge: a whole percentage from 1, or an amount from one
 * sen, each up to its limit. `subject` names it in the message: "the
 * surcharge"; `field` is the form's field for its amount.
 */
export function checkCharge(
  charge: SurchargeCharge,
  subject: string,
  field: string,
): Change {
  if (charge.percent !== null) {
    if (
      !Number.isInteger(charge.percent) ||
      charge.percent < 1 ||
      charge.percent > CHARGE_LIMITS.maxPercent
    ) {
      return refuse(
        `${sentenceCase(subject)} is a whole percentage between 1 and ${CHARGE_LIMITS.maxPercent}.`,
        field,
      );
    }
  } else if (
    !Number.isInteger(charge.flatSen) ||
    charge.flatSen < 1 ||
    charge.flatSen > CHARGE_LIMITS.maxFlatSen
  ) {
    return refuse(
      `${sentenceCase(subject)} is an amount between ${formatMyr(1)} and ${formatMyr(CHARGE_LIMITS.maxFlatSen)}.`,
      field,
    );
  }
  return { ok: true };
}

/**
 * A charge's amount as a form posts it, read but not checked: `kind`
 * "flat" reads it as ringgit, anything else as a whole percentage. What an
 * empty amount means is the caller's to say. `field` is the form's field
 * for the amount.
 */
export function parseCharge(
  kind: unknown,
  amount: string,
  subject: string,
  field: string,
): Parsed<SurchargeCharge> {
  if (kind !== "flat") {
    return { ok: true, value: { percent: numberOf(amount), flatSen: null } };
  }
  const flatSen = parseRinggit(amount);
  return flatSen === null
    ? refuse(`Enter ${subject} in RM, with at most two decimals.`, field)
    : { ok: true, value: { percent: null, flatSen } };
}

/** A percentage column and a flat one as a charge: the percentage when it is set; null when neither is. */
export function chargeOf(
  percent: number | null,
  flatSen: number | null,
): SurchargeCharge | null {
  if (percent !== null) return { percent, flatSen: null };
  if (flatSen !== null) return { percent: null, flatSen };
  return null;
}

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
      return refuse(
        "Pick the times the window starts and ends, such as 11:00 PM to 7:00 AM.",
        minute === window.fromMinute ? "from" : "to",
      );
    }
  }
  if (window.fromMinute === window.toMinute) {
    return refuse(
      "The window ends at a different time from the one it starts.",
      "to",
    );
  }
  return checkCharge(window, "the surcharge", "amount");
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
  const amountText = textOf(values.amount);
  if (from === "" && to === "" && amountText === "") {
    return { ok: true, value: null };
  }
  const fromMinute = minuteOfDay(from);
  const toMinute = minuteOfDay(to);
  if (fromMinute === null || toMinute === null) {
    return refuse(
      "Pick the times the window starts and ends, such as 11:00 PM to 7:00 AM.",
      fromMinute === null ? "from" : "to",
    );
  }
  const charge = parseCharge(
    values.kind,
    amountText,
    "the surcharge",
    "amount",
  );
  if (!charge.ok) return charge;
  const window: OddHours = { fromMinute, toMinute, ...charge.value };
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
  const { oddHoursFromMinute: fromMinute, oddHoursToMinute: toMinute } =
    location;
  const charge = chargeOf(location.oddHoursPercent, location.oddHoursFlatSen);
  if (fromMinute === null || toMinute === null || !charge) return null;
  return { fromMinute, toMinute, ...charge };
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
