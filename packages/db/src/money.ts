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

const RINGGIT_RE = /^\d{1,7}(\.\d{1,2})?$/;

/**
 * "1,234.56" or "RM 30" -> sen. Null when the text is not an amount of
 * ringgit with at most two decimals, or is negative. The forms enter money
 * in ringgit; nothing else converts.
 */
export function parseRinggit(text: string): number | null {
  const cleaned = text
    .trim()
    .replace(/^RM\s*/i, "")
    .replace(/,/g, "");
  return RINGGIT_RE.test(cleaned) ? toSen(Number(cleaned)) : null;
}

/** 123456 -> "1234.56": the value an input starts with. */
export function ringgitInputValue(sen: number) {
  return (sen / 100).toFixed(2);
}
