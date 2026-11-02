import type { Parsed } from "./fields";
import { textOf } from "./fields";
import { parseRinggit } from "./money";
import { wholeKmUp } from "./zone-trip";

/**
 * Hourly hire priced like the zone grid, by the zone the pickup is in:
 * each zone sells packages of 4, 8 or 12 hours at a price per class, a
 * package covers its own hours from there (the sheet's "max hour usage", 5
 * for Langkawi's port cruise 4-hour package), and each hour past it costs
 * the location's rate for that package size and class. A pickup outside
 * every zone is priced from its nearest zone by road, plus that road past
 * the location's free km at the class's rate per extra km, as a one-way
 * trip's end is. The customer picks a package and any extra hours; 7
 * hours is 4 + 3 or 8, their choice. Pure and browser-safe: Hourly Rates
 * and the booking forms check with it, the writer in ./hourly-rates and
 * the quote apply the same. See docs/261102-booking-ops.md, "Hourly rate
 * grid".
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
  /** The hours a package may cover from a zone. */
  includedHours: { min: 1, max: 24 },
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

/** A duration as every screen names it: "4 hours". */
export function durationLabel(hours: number) {
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}

/** The durations a booking form offers: "4 hours", "8 hours", "12 hours". */
export const DURATION_CHOICES = HOURLY_PACKAGES.map((hours) => ({
  value: String(hours),
  label: durationLabel(hours),
}));

/** The extra hour choices a booking form offers: "None", "1 hour", "2 hours"... */
export const EXTRA_HOUR_CHOICES = EXTRA_HOUR_OPTIONS.map((hours) => ({
  value: String(hours),
  label: hours === 0 ? "None" : `${hours} ${hours === 1 ? "hour" : "hours"}`,
}));

/** "4 hours + 3 extra hours", as a trip names its hire. */
export function hourlyChoiceLabel(choice: HourlyChoice) {
  const { packageHours, extraHours } = choice;
  if (extraHours === 0) return durationLabel(packageHours);
  return `${durationLabel(packageHours)} + ${extraHours} extra ${extraHours === 1 ? "hour" : "hours"}`;
}

/**
 * The hours a choice runs by its package's name, before the pickup's zone
 * is known: a 4-hour package and 3 extra is 7. A zone may cover more (the
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

/** One package a zone sells: the hours it covers from there, and its price per class id. */
export type HourlyPackageRow = {
  hours: HourlyPackageHours;
  includedHours: number;
  prices: Record<string, number>;
};

/** A zone's packages; a zone with none is not sold hourly. */
export type HourlyZoneRow = {
  zoneId: string;
  packages: readonly HourlyPackageRow[];
};

/** A location's hourly price list: its zones' packages, and the extra hour rates by package size and class id. */
export type HourlyList = {
  zones: readonly HourlyZoneRow[];
  extras: readonly {
    packageHours: HourlyPackageHours;
    vehicleClassId: string;
    priceSen: number;
  }[];
};

/** The package a zone sells of a size; null when it sells none. */
export function zonePackageOf(
  list: HourlyList,
  zoneId: string,
  hours: number,
): HourlyPackageRow | null {
  const zone = list.zones.find((row) => row.zoneId === zoneId);
  return zone?.packages.find((row) => row.hours === hours) ?? null;
}

/** Whether a zone sells any package. */
export function sellsHourly(list: HourlyList, zoneId: string) {
  return list.zones.some(
    (row) => row.zoneId === zoneId && row.packages.length > 0,
  );
}

/** What a package and its extra hours cost in one class. */
export type HourlyCharge = {
  /** The zone the pickup was priced from, by name. */
  zone: string;
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
 * One class's price for a choice from a zone, or null when the class has
 * none: the package has no price in it, or extra hours were asked and the
 * location has no extra hour rate for it.
 */
export function hourlyChargeOf(
  list: HourlyList,
  zone: { id: string; name: string },
  choice: HourlyChoice,
  vehicleClassId: string,
): HourlyCharge | null {
  const row = zonePackageOf(list, zone.id, choice.packageHours);
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
    zone: zone.name,
    packageHours: choice.packageHours,
    includedHours: row.includedHours,
    packageSen,
    extraHours: choice.extraHours,
    extraHourSen,
    extraSen: choice.extraHours * extraHourSen,
  };
}

/**
 * The road to the zone a pickup outside every zone is priced from: its
 * km, the location's free km, the whole km charged past them, and what
 * they added at the class's rate per extra km.
 */
export type HourlyRoad = {
  extraKm: number;
  freeKm: number;
  chargedKm: number;
  perKmSen: number;
  extraSen: number;
};

/** What a pickup's road to its nearest zone adds: each km past the free km, rounded up to the whole km. */
export function hourlyRoadCharge(
  extraKm: number,
  perKmSen: number,
  freeKm = 0,
): HourlyRoad {
  if (!(extraKm >= 0)) throw new RangeError("extraKm must be zero or more");
  if (!(perKmSen >= 0)) throw new RangeError("perKmSen must be zero or more");
  if (!(freeKm >= 0)) throw new RangeError("freeKm must be zero or more");
  const chargedKm = wholeKmUp(Math.max(0, extraKm - freeKm));
  return {
    extraKm,
    freeKm,
    chargedKm,
    perKmSen,
    extraSen: Math.round(perKmSen * chargedKm),
  };
}

/** An hourly hire as its receipt keeps it: the package, the extra hours, and the road to a pickup outside every zone. */
export type HourlyReceipt = HourlyCharge & { road: HourlyRoad | null };

/** The least a package costs in a class anywhere on the list; null when none is priced. */
export function cheapestPackageSen(list: HourlyList, vehicleClassId: string) {
  let cheapest: number | null = null;
  for (const zone of list.zones) {
    for (const row of zone.packages) {
      const sen = row.prices[vehicleClassId];
      if (sen !== undefined && (cheapest === null || sen < cheapest)) {
        cheapest = sen;
      }
    }
  }
  return cheapest;
}

function isHourlyRoad(value: unknown): value is HourlyRoad {
  if (typeof value !== "object" || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.extraKm === "number" &&
    typeof r.freeKm === "number" &&
    typeof r.chargedKm === "number" &&
    typeof r.perKmSen === "number" &&
    typeof r.extraSen === "number"
  );
}

/** The hourly part of a stored receipt, or null when it is not one. */
export function hourlyReceiptOf(value: unknown): HourlyReceipt | null {
  if (typeof value !== "object" || value === null) return null;
  const c = value as Record<string, unknown>;
  if (
    typeof c.zone !== "string" ||
    !isHourlyPackage(c.packageHours) ||
    typeof c.includedHours !== "number" ||
    typeof c.packageSen !== "number" ||
    typeof c.extraHours !== "number" ||
    typeof c.extraHourSen !== "number" ||
    typeof c.extraSen !== "number"
  ) {
    return null;
  }
  return {
    zone: c.zone,
    packageHours: c.packageHours,
    includedHours: c.includedHours,
    packageSen: c.packageSen,
    extraHours: c.extraHours,
    extraHourSen: c.extraHourSen,
    extraSen: c.extraSen,
    road: isHourlyRoad(c.road) ? c.road : null,
  };
}

// ---------------------------------------------------------------------------
// The Hourly Rates page's form.
// ---------------------------------------------------------------------------

/** One zone's packages as Hourly Rates posts them; prices in sen, null for an empty cell. */
export type HourlyZoneInput = {
  zoneId: string;
  packages: {
    hours: HourlyPackageHours;
    includedHours: number;
    prices: { vehicleClassId: string; priceSen: number | null }[];
  }[];
};

/** The whole hourly list as the page saves it. */
export type HourlyListInput = {
  zones: HourlyZoneInput[];
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
 * The hourly list as posted: `{ zones: [{ zoneId, packages: [{ hours,
 * includedHours, prices: [{ vehicleClassId, price }] }] }], extras: [{
 * packageHours, vehicleClassId, price }] }`, prices in ringgit as typed or
 * "" for none. Checks the shape and the hours a package covers. Whether
 * the zones and classes are the location's is the writer's check.
 */
export function parseHourlyList(value: unknown): Parsed<HourlyListInput> {
  if (typeof value !== "object" || value === null) return UNREADABLE;
  const { zones, extras } = value as Record<string, unknown>;
  if (!Array.isArray(zones) || !Array.isArray(extras)) return UNREADABLE;

  const parsedZones: HourlyZoneInput[] = [];
  for (const raw of zones as unknown[]) {
    if (typeof raw !== "object" || raw === null) return UNREADABLE;
    const zone = raw as Record<string, unknown>;
    if (!isId(zone.zoneId) || !Array.isArray(zone.packages)) return UNREADABLE;
    if (parsedZones.some((z) => z.zoneId === zone.zoneId)) return UNREADABLE;
    const packages: HourlyZoneInput["packages"] = [];
    for (const rawPackage of zone.packages as unknown[]) {
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
          error: `A package covers ${min} to ${max} whole hours.`,
        };
      }
      const prices: HourlyZoneInput["packages"][number]["prices"] = [];
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
    parsedZones.push({ zoneId: zone.zoneId, packages });
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
  return { ok: true, value: { zones: parsedZones, extras: parsedExtras } };
}
