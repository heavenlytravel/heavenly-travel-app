import type { Parsed } from "./fields";
import { GUIDE_LANGUAGES } from "./guide-input";
import { priceOf, type HourlyChoice } from "./hourly-input";

/**
 * A location's tour guide price list: per language, what a guide costs
 * for one trip, one-way or a 4, 8 or 12-hour hire, and each hour past
 * the hire. The website sells a language on a trip only while it is
 * active and the trip's prices are set: a language with no row, switched
 * off, or with the trip's cell empty is not shown at all. A customer may
 * still ask for any other language, free, as a request. Pure and
 * browser-safe: Guide Rates checks with it, the writer in ./guide-rates
 * and the quote apply the same. See docs/261103-tour-guide.md, "Guide
 * rates".
 */

/** The prices of a row, in the order the grid shows them. */
export const GUIDE_RATE_PRICES = [
  "oneWaySen",
  "hours4Sen",
  "hours8Sen",
  "hours12Sen",
  "extraHourSen",
] as const;
export type GuideRatePrice = (typeof GUIDE_RATE_PRICES)[number];

export const GUIDE_RATE_PRICE_LABELS: Record<GuideRatePrice, string> = {
  oneWaySen: "Transfer",
  hours4Sen: "4 hours",
  hours8Sen: "8 hours",
  hours12Sen: "12 hours",
  extraHourSen: "Extra hour",
};

/** One language's row: on sale or not, and its prices in sen, null where none is set. */
export type GuideRateRow = {
  language: string;
  isActive: boolean;
} & Record<GuideRatePrice, number | null>;

/** A trip as a guide is priced for it: one-way, or the hire chosen. */
export type GuideTripShape =
  { mode: "oneway" } | ({ mode: "hourly" } & HourlyChoice);

const PACKAGE_PRICE = {
  4: "hours4Sen",
  8: "hours8Sen",
  12: "hours12Sen",
} as const satisfies Record<HourlyChoice["packageHours"], GuideRatePrice>;

/**
 * What a guide in this row costs for the trip: the one-way price, or the
 * hire's plus each extra hour. Null when any price it needs is not set.
 * Whether the row is on sale is `guideOffers`' to check.
 */
export function guidePriceSen(
  row: GuideRateRow,
  shape: GuideTripShape,
): number | null {
  if (shape.mode === "oneway") return row.oneWaySen;
  const hire = row[PACKAGE_PRICE[shape.packageHours]];
  if (hire === null) return null;
  if (shape.extraHours === 0) return hire;
  if (row.extraHourSen === null) return null;
  return hire + shape.extraHours * row.extraHourSen;
}

/** A language on sale for a trip, at its price there. */
export type GuideOffer = { language: string; amountSen: number };

/** The languages a trip may be booked with a guide in, in the order Ops set (the rows'): active and priced. */
export function guideOffers(
  rows: readonly GuideRateRow[],
  shape: GuideTripShape,
): GuideOffer[] {
  return rows.flatMap((row) => {
    if (!row.isActive) return [];
    const amountSen = guidePriceSen(row, shape);
    return amountSen === null ? [] : [{ language: row.language, amountSen }];
  });
}

/**
 * The languages every trip of a booking sells, each with what it costs
 * across them: one guide language is chosen for all the trips, so only
 * one offered on each is shown.
 */
export function guideOffersOnAll(
  perTrip: readonly (readonly GuideOffer[])[],
): GuideOffer[] {
  const [first, ...rest] = perTrip;
  if (!first) return [];
  return first.flatMap(({ language, amountSen }) => {
    let total = amountSen;
    for (const offers of rest) {
      const here = offers.find((offer) => offer.language === language);
      if (!here) return [];
      total += here.amountSen;
    }
    return [{ language, amountSen: total }];
  });
}

const UNREADABLE = {
  ok: false as const,
  error: "The guide rates could not be read. Reload and try again.",
};

/**
 * The list as Guide Rates posts it: `[{ language, isActive, oneWay,
 * hours4, hours8, hours12, extraHour }]`, prices in ringgit as typed or ""
 * for none, in the order the page lists them. Each language once, from
 * `GUIDE_LANGUAGES`. A row with nothing set and switched off is dropped.
 */
export function parseGuideRates(value: unknown): Parsed<GuideRateRow[]> {
  if (!Array.isArray(value)) return UNREADABLE;
  const rows: GuideRateRow[] = [];
  for (const raw of value as unknown[]) {
    if (typeof raw !== "object" || raw === null) return UNREADABLE;
    const posted = raw as Record<string, unknown>;
    const language = posted.language;
    if (
      typeof language !== "string" ||
      !(GUIDE_LANGUAGES as readonly string[]).includes(language) ||
      rows.some((row) => row.language === language) ||
      typeof posted.isActive !== "boolean"
    ) {
      return UNREADABLE;
    }
    const row: GuideRateRow = {
      language,
      isActive: posted.isActive,
      oneWaySen: null,
      hours4Sen: null,
      hours8Sen: null,
      hours12Sen: null,
      extraHourSen: null,
    };
    for (const key of GUIDE_RATE_PRICES) {
      const price = priceOf(posted[key]);
      if (!price.ok) return price;
      row[key] = price.value;
    }
    if (row.isActive || GUIDE_RATE_PRICES.some((key) => row[key] !== null)) {
      rows.push(row);
    }
  }
  return { ok: true, value: rows };
}

/** The languages a customer may ask for: every one not on sale for the trips. */
export function requestableLanguages(offers: readonly GuideOffer[]): string[] {
  const onSale = new Set(offers.map((offer) => offer.language));
  return GUIDE_LANGUAGES.filter((language) => !onSale.has(language));
}

/**
 * Why a guide chosen cannot be booked as it is: its language is no longer
 * on sale for every trip (a price was cleared, or a trip changed). Null
 * when it can, or without a guide.
 */
export function guideOfferIssue(
  language: string | null,
  offers: readonly GuideOffer[],
): string | null {
  if (language === null) return null;
  return offers.some((offer) => offer.language === language)
    ? null
    : `A tour guide speaking ${language} is no longer offered for these trips. Choose another language, or no guide.`;
}
