import type { Change } from "./change";
import { numberOf, type Parsed } from "./fields";
import { formatMyr, toSen } from "./money";

/**
 * What the Coverage screen edits and the rule it checks, pure and
 * browser-safe: the form displays the message, the writer in ./coverage
 * applies the same check before it writes. See docs/260930-coverage.md.
 */

/** A state's multiplier applies to every price with a pickup in the state. */
export const STATE_MULTIPLIER = { min: 0.5, max: 3 } as const;

/** 1.2 -> "×1.20". The screen says "no change" for 1 itself. */
export function formatMultiplier(multiplier: number) {
  return `×${multiplier.toFixed(2)}`;
}

/** "A RM 100 trip becomes RM 120.00": the multiplier's effect, for the form. */
export function multiplierEffect(multiplier: number) {
  return `A RM 100 trip becomes ${formatMyr(toSen(100 * multiplier))}`;
}

const hasTwoDecimals = (n: number) =>
  Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

export function checkMultiplier(multiplier: number): Change {
  const { min, max } = STATE_MULTIPLIER;
  if (!Number.isFinite(multiplier) || multiplier < min || multiplier > max) {
    return {
      ok: false,
      error: `The multiplier is a number between ${min} and ${max}.`,
    };
  }
  if (!hasTwoDecimals(multiplier)) {
    return { ok: false, error: "The multiplier has at most two decimals." };
  }
  return { ok: true };
}

/** The state form's `multiplier` value, read and checked. */
export function parseMultiplier(
  values: Record<string, unknown>,
): Parsed<number> {
  const multiplier = numberOf(values.multiplier);
  const check = checkMultiplier(multiplier);
  return check.ok ? { ok: true, value: multiplier } : check;
}
