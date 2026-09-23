/** Money is integer sen (1/100 MYR) everywhere. Browser-safe. */

export const CURRENCY = "MYR";

const ringgit = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 123456 -> "RM 1,234.56" */
export function formatMyr(sen: number) {
  return `RM ${ringgit.format(sen / 100)}`;
}

/** 12.345 -> 1235; keeps every amount a whole number of sen. */
export function toSen(ringgitAmount: number) {
  return Math.round(ringgitAmount * 100);
}
