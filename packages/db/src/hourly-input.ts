import type { Parsed } from "./fields";
import { textOf } from "./fields";
import { formatMyr, parseRinggit } from "./money";

/**
 * Hourly hire priced like the zone grid, by where the pickup is: a
 * location groups its zones into hourly areas, each area sells packages of
 * 4, 8 or 12 hours at a price per class, a package covers its own hours
 * there (the sheet's "max hour usage", 5 for Langkawi's port cruise 4-hour
 * package), and each hour past it costs the location's rate for that
 * package size and class. The customer picks a package and any extra
 * hours; 7 hours is 4 + 3 or 8, their choice. Pure and browser-safe: the
 * Hourly tab and the booking forms check with it, the writer in
 * ./hourly-rates and the quote apply the same. See
 * docs/261102-booking-ops.md, "Hourly rate grid".
 */

/** The package sizes, in hours, smallest first. */
export const HOURLY_PACKAGES = [4, 8, 12] as const;
export type HourlyPackageHours = (typeof HOURLY_PACKAGES)[number];

export function isHourlyPackage(value: unknown): value is HourlyPackageHours {
  return HOURLY_PACKAGES.includes(value as HourlyPackageHours);
}

export const HOURLY_LIMITS = {
  /** The most hours past a package one trip may add. */
  maxExtraHours: 12,
  /** The longest an hourly trip may run, the hours a package covers plus the extra. */
  maxTripHours: 24,
  /** The hours a package may cover from an area. */
  includedHours: { min: 1, max: 24 },
  areaNameLength: 80,
} as const;

/** The extra hours a booking form offers: none, then one at a time. */
export const EXTRA_HOUR_OPTIONS: readonly number[] = Array.from(
  { length: HOURLY_LIMITS.maxExtraHours + 1 },
  (_, i) => i,
);

/** What a customer asks of an hourly hire: a package, and the hours past it. */
export type HourlyChoice = {
  packageHours: HourlyPackageHours;
  extraHours: number;
};

/** "4-hour package" */
export function packageLabel(hours: number) {
  return `${hours}-hour package`;
}

/** The package choices a booking form offers: "4 hours", "8 hours", "12 hours". */
export const PACKAGE_CHOICES = HOURLY_PACKAGES.map((hours) => ({
  value: String(hours),
  label: `${hours} hours`,
}));

/** The extra hour choices a booking form offers: "None", "1 hour", "2 hours"... */
export const EXTRA_HOUR_CHOICES = EXTRA_HOUR_OPTIONS.map((hours) => ({
  value: String(hours),
  label: hours === 0 ? "None" : `${hours} ${hours === 1 ? "hour" : "hours"}`,
}));

/** "4-hour package + 3 extra hours", as a trip names its hire. */
export function hourlyChoiceLabel(choice: HourlyChoice) {
  const { packageHours, extraHours } = choice;
  if (extraHours === 0) return packageLabel(packageHours);
  return `${packageLabel(packageHours)} + ${extraHours} extra ${extraHours === 1 ? "hour" : "hours"}`;
}

/**
 * The hours a choice runs by its package's name, before the pickup's area
 * is known: a 4-hour package and 3 extra is 7. An area may cover more (the
 * port cruise's 4-hour package covers 5), so a check made before the quote
 * is made again with the quoted hours.
 */
export function namedHours(choice: {
  packageHours: number;
  extraHours: number;
}) {
  return choice.packageHours + choice.extraHours;
}

/** Whether the extra hours are a whole number a form offers. */
export function isExtraHours(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= HOURLY_LIMITS.maxExtraHours
  );
}

/**
 * The choice that stands for a stored hire of so many hours, for a form
 * that amends a trip booked before packages: the biggest package it
 * fills, and the rest as extra hours. Hours under the smallest package
 * become that package.
 */
export function hourlyChoiceOfHours(hours: number): HourlyChoice {
  const fits = HOURLY_PACKAGES.filter((size) => size <= hours);
  const packageHours = fits.at(-1) ?? HOURLY_PACKAGES[0];
  return {
    packageHours,
    extraHours: Math.min(
      Math.max(0, hours - packageHours),
      HOURLY_LIMITS.maxExtraHours,
    ),
  };
}

// ---------------------------------------------------------------------------
// The price list, as quoting reads it.
// ---------------------------------------------------------------------------

/** One package an area sells: the hours it covers there, and its price per class id. */
export type HourlyPackageRow = {
  hours: HourlyPackageHours;
  includedHours: number;
  prices: Record<string, number>;
};

export type HourlyAreaRow = {
  name: string;
  zoneIds: readonly string[];
  packages: readonly HourlyPackageRow[];
};

/** A location's hourly price list: its areas, and the extra hour rates by package size and class id. */
export type HourlyList = {
  areas: readonly HourlyAreaRow[];
  extras: readonly {
    packageHours: HourlyPackageHours;
    vehicleClassId: string;
    priceSen: number;
  }[];
};

/** The area a zone is in; null when hourly hire from it has no price. */
export function hourlyAreaOf(list: HourlyList, zoneId: string) {
  return list.areas.find((area) => area.zoneIds.includes(zoneId)) ?? null;
}

/** The package an area sells of a size; null when it does not sell it. */
export function areaPackageOf(area: HourlyAreaRow, hours: number) {
  return area.packages.find((row) => row.hours === hours) ?? null;
}

/** What an hourly hire costs in one class, as its receipt keeps it. */
export type HourlyCharge = {
  /** The area the pickup was priced from. */
  area: string;
  packageHours: HourlyPackageHours;
  /** The hours the package covered from there. */
  includedHours: number;
  packageSen: number;
  extraHours: number;
  /** The rate per extra hour; 0 when there were none. */
  extraHourSen: number;
  /** extraHours x extraHourSen. */
  extraSen: number;
};

/**
 * One class's price for a choice from an area, or null when the class has
 * none: the package has no price in it, or extra hours were asked and the
 * location has no extra hour rate for it.
 */
export function hourlyChargeOf(
  list: HourlyList,
  area: HourlyAreaRow,
  choice: HourlyChoice,
  vehicleClassId: string,
): HourlyCharge | null {
  const row = areaPackageOf(area, choice.packageHours);
  const packageSen = row?.prices[vehicleClassId];
  if (!row || packageSen === undefined) return null;
  let extraHourSen = 0;
  if (choice.extraHours > 0) {
    const rate = list.extras.find(
      (extra) =>
        extra.packageHours === choice.packageHours &&
        extra.vehicleClassId === vehicleClassId,
    );
    if (!rate) return null;
    extraHourSen = rate.priceSen;
  }
  return {
    area: area.name,
    packageHours: choice.packageHours,
    includedHours: row.includedHours,
    packageSen,
    extraHours: choice.extraHours,
    extraHourSen,
    extraSen: choice.extraHours * extraHourSen,
  };
}

/** The least a package costs in a class anywhere on the list; null when none is priced. */
export function cheapestPackageSen(list: HourlyList, vehicleClassId: string) {
  let cheapest: number | null = null;
  for (const area of list.areas) {
    for (const row of area.packages) {
      const sen = row.prices[vehicleClassId];
      if (sen !== undefined && (cheapest === null || sen < cheapest)) {
        cheapest = sen;
      }
    }
  }
  return cheapest;
}

/** "RM 140.00 for 4 hours, then RM 35.00 an hour", for a receipt's line. */
export function hourlyChargeLabel(charge: HourlyCharge) {
  const covers = `${formatMyr(charge.packageSen)} for ${charge.includedHours} ${charge.includedHours === 1 ? "hour" : "hours"}`;
  return charge.extraHours === 0
    ? covers
    : `${covers}, then ${formatMyr(charge.extraHourSen)} an hour`;
}

export function isHourlyCharge(value: unknown): value is HourlyCharge {
  if (typeof value !== "object" || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.area === "string" &&
    isHourlyPackage(c.packageHours) &&
    typeof c.includedHours === "number" &&
    typeof c.packageSen === "number" &&
    typeof c.extraHours === "number" &&
    typeof c.extraHourSen === "number" &&
    typeof c.extraSen === "number"
  );
}

// ---------------------------------------------------------------------------
// The Hourly tab's form.
// ---------------------------------------------------------------------------

/** One area as the Hourly tab posts it; prices in sen, null for an empty cell. */
export type HourlyAreaInput = {
  name: string;
  zoneIds: string[];
  packages: {
    hours: HourlyPackageHours;
    includedHours: number;
    prices: { vehicleClassId: string; priceSen: number | null }[];
  }[];
};

/** The whole hourly list as the tab saves it. */
export type HourlyListInput = {
  areas: HourlyAreaInput[];
  extras: {
    packageHours: HourlyPackageHours;
    vehicleClassId: string;
    priceSen: number | null;
  }[];
};

const UNREADABLE: Parsed<never> = {
  ok: false,
  error: "The hourly prices could not be read. Reload and try again.",
};

const isId = (value: unknown): value is string =>
  typeof value === "string" && value !== "" && value.length <= 200;

/** A price as typed in ringgit: sen, null for empty, or the refusal. */
function priceOf(raw: unknown): Parsed<number | null> {
  const text = textOf(raw);
  if (text === "") return { ok: true, value: null };
  const sen = parseRinggit(text);
  return sen === null
    ? {
        ok: false,
        error: `"${text}" is not a price. Enter it in RM, with at most two decimals, or leave it empty.`,
      }
    : { ok: true, value: sen };
}

/**
 * The hourly list as posted: `{ areas: [{ name, zoneIds, packages: [{
 * hours, includedHours, prices: [{ vehicleClassId, price }] }] }], extras:
 * [{ packageHours, vehicleClassId, price }] }`, prices in ringgit as typed
 * or "" for none. Checks the shape and the rules a form can know: names,
 * hours, each zone in one area. Whether the zones and classes are the
 * location's is the writer's check.
 */
export function parseHourlyList(value: unknown): Parsed<HourlyListInput> {
  if (typeof value !== "object" || value === null) return UNREADABLE;
  const { areas, extras } = value as Record<string, unknown>;
  if (!Array.isArray(areas) || !Array.isArray(extras)) return UNREADABLE;

  const parsedAreas: HourlyAreaInput[] = [];
  const names = new Set<string>();
  const zoneArea = new Map<string, string>();
  for (const raw of areas as unknown[]) {
    if (typeof raw !== "object" || raw === null) return UNREADABLE;
    const area = raw as Record<string, unknown>;
    const name = textOf(area.name);
    if (!name) return { ok: false, error: "Every hourly area needs a name." };
    if (name.length > HOURLY_LIMITS.areaNameLength) {
      return {
        ok: false,
        error: `Keep "${name.slice(0, 20)}…" to ${HOURLY_LIMITS.areaNameLength} characters.`,
      };
    }
    const key = name.toLowerCase();
    if (names.has(key)) {
      return { ok: false, error: `Two hourly areas are called "${name}".` };
    }
    names.add(key);
    if (!Array.isArray(area.zoneIds) || !area.zoneIds.every(isId)) {
      return UNREADABLE;
    }
    const zoneIds = [...new Set(area.zoneIds as string[])];
    if (zoneIds.length === 0) {
      return { ok: false, error: `Choose at least one zone for ${name}.` };
    }
    for (const zoneId of zoneIds) {
      const other = zoneArea.get(zoneId);
      if (other) {
        return {
          ok: false,
          error: `A zone is in both ${other} and ${name}. A zone can be in one hourly area.`,
        };
      }
      zoneArea.set(zoneId, name);
    }
    if (!Array.isArray(area.packages)) return UNREADABLE;
    const packages: HourlyAreaInput["packages"] = [];
    for (const rawPackage of area.packages as unknown[]) {
      if (typeof rawPackage !== "object" || rawPackage === null) {
        return UNREADABLE;
      }
      const row = rawPackage as Record<string, unknown>;
      if (!isHourlyPackage(row.hours) || !Array.isArray(row.prices)) {
        return UNREADABLE;
      }
      if (packages.some((p) => p.hours === row.hours)) return UNREADABLE;
      const included = row.includedHours;
      const { min, max } = HOURLY_LIMITS.includedHours;
      if (
        typeof included !== "number" ||
        !Number.isInteger(included) ||
        included < min ||
        included > max
      ) {
        return {
          ok: false,
          error: `The ${packageLabel(row.hours)} from ${name} covers ${min} to ${max} whole hours.`,
        };
      }
      const prices: HourlyAreaInput["packages"][number]["prices"] = [];
      for (const rawPrice of row.prices as unknown[]) {
        if (typeof rawPrice !== "object" || rawPrice === null) {
          return UNREADABLE;
        }
        const cell = rawPrice as Record<string, unknown>;
        if (!isId(cell.vehicleClassId)) return UNREADABLE;
        if (prices.some((p) => p.vehicleClassId === cell.vehicleClassId)) {
          return UNREADABLE;
        }
        const price = priceOf(cell.price);
        if (!price.ok) return price;
        prices.push({
          vehicleClassId: cell.vehicleClassId,
          priceSen: price.value,
        });
      }
      packages.push({ hours: row.hours, includedHours: included, prices });
    }
    parsedAreas.push({ name, zoneIds, packages });
  }

  const parsedExtras: HourlyListInput["extras"] = [];
  for (const raw of extras as unknown[]) {
    if (typeof raw !== "object" || raw === null) return UNREADABLE;
    const extra = raw as Record<string, unknown>;
    if (!isHourlyPackage(extra.packageHours) || !isId(extra.vehicleClassId)) {
      return UNREADABLE;
    }
    if (
      parsedExtras.some(
        (e) =>
          e.packageHours === extra.packageHours &&
          e.vehicleClassId === extra.vehicleClassId,
      )
    ) {
      return UNREADABLE;
    }
    const price = priceOf(extra.price);
    if (!price.ok) return price;
    parsedExtras.push({
      packageHours: extra.packageHours,
      vehicleClassId: extra.vehicleClassId,
      priceSen: price.value,
    });
  }
  return { ok: true, value: { areas: parsedAreas, extras: parsedExtras } };
}
