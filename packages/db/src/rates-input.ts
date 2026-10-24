import { formatClock } from "./booking-rules";
import { refuse, type Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
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

/**
 * A district zone, or one of some of its mukims, that loses ground to
 * another zone: its boundary is no longer the official one, so it is
 * reshaped from them.
 */
export function reshapedFromDistrict(origin: ZoneDistrict): ZoneReshaped {
  return {
    reshapedFrom: origin.districtCode,
    ...mukimCodesOf(origin.mukimCodes),
    label: origin.label,
  };
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
 * A cell with the same zone at both ends is the zone's within-zone price.
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
 * Where a location's trips may go, under nearest-zone pricing: how far
 * past its nearest zone an end may be by road, how much of that road is
 * free, and whether trips may end in another location's zone on the
 * routes out it prices. Hourly hire has no drop-off, so none touches it.
 * See docs/261023-nearest-zone-pricing.md, "Where a location's trips may go".
 */
export type TripReach = {
  /** The free extra road of each end, in whole km: only the road past it is charged. */
  freeExtraKm: number;
  /** The furthest extra road, in whole km. */
  maxExtraKm: number;
  crossLocation: boolean;
};

export const TRIP_REACH_LIMITS = {
  /** Km. Past 100 km a trip is no longer the zone's price plus a little road. */
  maxExtraKm: { min: 1, max: 100 },
} as const;

/** The form names of the settings. */
export const TRIP_REACH_FIELDS = {
  freeExtraKm: "freeExtraKm",
  maxExtraKm: "maxExtraKm",
  crossLocation: "crossLocation",
} as const;

/** How the screens name trips across locations. */
export const CROSS_LOCATION_NAME = "Cross-location";

/** "Cross-location on" or "Cross-location off". */
export function crossLocationLabel(crossLocation: boolean) {
  return `${CROSS_LOCATION_NAME} ${crossLocation ? "on" : "off"}`;
}

/** "First 3 km free, up to 15 km": the extra road's two settings in a line. */
export function extraRoadLabel(reach: Omit<TripReach, "crossLocation">) {
  return reach.freeExtraKm > 0
    ? `First ${reach.freeExtraKm} km free, up to ${reach.maxExtraKm} km`
    : `Up to ${reach.maxExtraKm} km`;
}

/** "Up to 15 km past a zone, cross-location off": the settings in a line. */
export function tripReachLabel(reach: TripReach) {
  return `${extraRoadLabel(reach)} past a zone, ${crossLocationLabel(reach.crossLocation).toLowerCase()}`;
}

export function checkTripReach(reach: TripReach): Change {
  const { min, max } = TRIP_REACH_LIMITS.maxExtraKm;
  if (
    !Number.isInteger(reach.maxExtraKm) ||
    reach.maxExtraKm < min ||
    reach.maxExtraKm > max
  ) {
    return refuse(
      `The furthest extra road is a whole number of km between ${min} and ${max}.`,
      TRIP_REACH_FIELDS.maxExtraKm,
    );
  }
  if (
    !Number.isInteger(reach.freeExtraKm) ||
    reach.freeExtraKm < 0 ||
    reach.freeExtraKm > reach.maxExtraKm
  ) {
    return refuse(
      `The free extra road is a whole number of km from 0 up to the furthest, ${reach.maxExtraKm} km.`,
      TRIP_REACH_FIELDS.freeExtraKm,
    );
  }
  return { ok: true };
}

/** The settings form's reach fields, read and checked; the switch is a checkbox and an empty free km is 0. */
export function parseTripReachFields(
  values: Record<string, unknown>,
): Parsed<TripReach> {
  const free = textOf(values[TRIP_REACH_FIELDS.freeExtraKm]);
  const reach: TripReach = {
    freeExtraKm: free === "" ? 0 : numberOf(free),
    maxExtraKm: numberOf(values[TRIP_REACH_FIELDS.maxExtraKm]),
    crossLocation: flagOf(values[TRIP_REACH_FIELDS.crossLocation]),
  };
  const check = checkTripReach(reach);
  return check.ok ? { ok: true, value: reach } : check;
}

/**
 * The weekend and holiday surcharge: the days of the week it applies on
 * (0 is Sunday, 6 Saturday, as `Date.getDay`), the dates it also applies
 * on ("2026-12-25", the location's local day), and what it adds. The
 * weekend is the location's to say: Kedah's is Friday and Saturday.
 */
export type WeekendSurcharge = {
  days: number[];
  dates: string[];
} & SurchargeCharge;

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/** Monday first, as the form lists the days. */
export const WEEKDAYS_FROM_MONDAY = [1, 2, 3, 4, 5, 6, 0] as const;

/** The most holiday dates a location keeps. */
export const MAX_HOLIDAY_DATES = 100;

/** The form names of the surcharge's fields; the days and the dates are each one comma-separated field. */
export const WEEKEND_FIELDS = {
  on: "weekendOn",
  days: "weekendDays",
  dates: "holidayDates",
  kind: "weekendKind",
  amount: "weekendAmount",
} as const;

/** "Sat, Sun and 3 holidays, +20%" */
export function weekendLabel(weekend: WeekendSurcharge) {
  const days = WEEKDAYS_FROM_MONDAY.filter((day) =>
    weekend.days.includes(day),
  ).map((day) => WEEKDAY_NAMES[day].slice(0, 3));
  const holidays =
    weekend.dates.length === 0
      ? []
      : [
          weekend.dates.length === 1
            ? "1 holiday"
            : `${weekend.dates.length} holidays`,
        ];
  const parts = [...days, ...holidays];
  const list =
    parts.length > 1
      ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`
      : (parts[0] ?? "");
  return `${list}, ${surchargeLabel(weekend)}`;
}

/** Whether "2026-12-25" is a real date. */
export function isIsoDate(text: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = new Date(`${text}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(text);
}

/** The weekday of "2026-12-25", 0 for Sunday. */
export const weekdayOfDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).getUTCDay();

/**
 * Why the surcharge applies on a local date, "2026-12-25": "holiday" when
 * it is one of the dates, "weekend" when its weekday is one of the days;
 * null when neither.
 */
export function weekendReason(
  weekend: WeekendSurcharge,
  date: string,
): "holiday" | "weekend" | null {
  if (weekend.dates.includes(date)) return "holiday";
  return weekend.days.includes(weekdayOfDate(date)) ? "weekend" : null;
}

export function checkWeekend(weekend: WeekendSurcharge): Change {
  if (weekend.days.length === 0 && weekend.dates.length === 0) {
    return refuse(
      "Pick the weekend days or add a holiday the surcharge applies on.",
      WEEKEND_FIELDS.days,
    );
  }
  if (
    weekend.days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    new Set(weekend.days).size !== weekend.days.length
  ) {
    return refuse("Pick the weekend days again.", WEEKEND_FIELDS.days);
  }
  if (weekend.dates.length > MAX_HOLIDAY_DATES) {
    return refuse(
      `Keep at most ${MAX_HOLIDAY_DATES} holidays. Remove the ones that are past.`,
      WEEKEND_FIELDS.dates,
    );
  }
  const bad = weekend.dates.find((date) => !isIsoDate(date));
  if (bad !== undefined) {
    return refuse(
      `"${bad}" is not a date. Pick it again.`,
      WEEKEND_FIELDS.dates,
    );
  }
  if (new Set(weekend.dates).size !== weekend.dates.length) {
    return refuse("A holiday is listed twice.", WEEKEND_FIELDS.dates);
  }
  return checkCharge(weekend, "the surcharge", WEEKEND_FIELDS.amount);
}

const listOf = (value: unknown) =>
  textOf(value)
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "");

/**
 * The weekend and holiday surcharge's fields, read and checked: off is
 * none; on needs a day or a date, and what it adds. The days are kept in
 * order and the dates sorted.
 */
export function parseWeekendFields(
  values: Record<string, unknown>,
): Parsed<WeekendSurcharge | null> {
  if (!flagOf(values[WEEKEND_FIELDS.on])) return { ok: true, value: null };
  const charge = parseCharge(
    values[WEEKEND_FIELDS.kind],
    textOf(values[WEEKEND_FIELDS.amount]),
    "the surcharge",
    WEEKEND_FIELDS.amount,
  );
  if (!charge.ok) return charge;
  const weekend: WeekendSurcharge = {
    days: listOf(values[WEEKEND_FIELDS.days])
      .map(Number)
      .sort((a, b) => a - b),
    dates: listOf(values[WEEKEND_FIELDS.dates]).sort(),
    ...charge.value,
  };
  const check = checkWeekend(weekend);
  return check.ok ? { ok: true, value: weekend } : check;
}

/** The surcharge's columns of a location as the rules read them; null when it has none. */
export function weekendOf(location: {
  weekendDays: number[];
  holidayDates: string[];
  weekendPercent: number | null;
  weekendFlatSen: number | null;
}): WeekendSurcharge | null {
  const charge = chargeOf(location.weekendPercent, location.weekendFlatSen);
  if (
    !charge ||
    (location.weekendDays.length === 0 && location.holidayDates.length === 0)
  ) {
    return null;
  }
  return {
    days: [...location.weekendDays],
    dates: [...location.holidayDates],
    ...charge,
  };
}

/** The odd-hours surcharge's switch; its other fields are `from`, `to`, `kind` and `amount`. */
export const ODD_HOURS_ON = "oddHoursOn";

/** A location's rules on its trips' prices, as the Rates tab saves them together. */
export type TripRules = {
  reach: TripReach;
  oddHours: OddHours | null;
  weekend: WeekendSurcharge | null;
};

/** "Up to 15 km, cross-location, odd hours, weekends": the rules in force, short. */
export function tripRulesLabel(rules: TripRules) {
  return [
    extraRoadLabel(rules.reach),
    ...(rules.reach.crossLocation ? ["cross-location"] : []),
    ...(rules.oddHours ? ["odd hours"] : []),
    ...(rules.weekend ? ["weekends"] : []),
  ].join(", ");
}

/** A location's columns as its trip rules. */
export function tripRulesOf(
  location: TripReach &
    Parameters<typeof oddHoursOf>[0] &
    Parameters<typeof weekendOf>[0],
): TripRules {
  return {
    reach: {
      freeExtraKm: location.freeExtraKm,
      maxExtraKm: location.maxExtraKm,
      crossLocation: location.crossLocation,
    },
    oddHours: oddHoursOf(location),
    weekend: weekendOf(location),
  };
}

/** The rules form, read and checked: the reach, and each surcharge when its switch is on. */
export function parseTripRulesFields(
  values: Record<string, unknown>,
): Parsed<TripRules> {
  const reach = parseTripReachFields(values);
  if (!reach.ok) return reach;
  let oddHours: Parsed<OddHours | null> = { ok: true, value: null };
  if (flagOf(values[ODD_HOURS_ON])) {
    oddHours = parseOddHoursFields(values);
    // Switched on, an empty window is not "none".
    if (oddHours.ok && oddHours.value === null) {
      oddHours = refuse(
        "Pick the times the window starts and ends, such as 11:00 PM to 7:00 AM.",
        "from",
      );
    }
  }
  if (!oddHours.ok) return oddHours;
  const weekend = parseWeekendFields(values);
  if (!weekend.ok) return weekend;
  return {
    ok: true,
    value: {
      reach: reach.value,
      oddHours: oddHours.value,
      weekend: weekend.value,
    },
  };
}

/** The zones a location's drop-offs map to: its own, and the zones its routes out end at when cross-location is on. */
export function reachableZones<Z>(
  crossLocation: boolean,
  own: readonly Z[],
  elsewhere: readonly Z[],
): readonly Z[] {
  return crossLocation ? [...own, ...elsewhere] : own;
}
