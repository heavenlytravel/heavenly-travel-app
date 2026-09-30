import type { Change } from "./change";
import { textOf, type Parsed } from "./fields";
import { formatMyr, parseRinggit } from "./money";

/**
 * What staff type on a booking beyond the trip: an internal note, and an
 * agreed price in place of the rates'. Pure and browser-safe: the forms show
 * the messages, the writers in ./booking-notes and ./bookings apply the same
 * checks before they write. See docs/260930-admin-teams-and-access.md,
 * steps 8 and 12.
 */

export const BOOKING_NOTE_MAX_LENGTH = 2000;

/** A note's text, trimmed, or why it cannot be saved. */
export function parseNoteBody(value: unknown): Parsed<string> {
  const body = textOf(value);
  if (body === "") return { ok: false, error: "Write the note first." };
  if (body.length > BOOKING_NOTE_MAX_LENGTH) {
    return {
      ok: false,
      error: `A note is at most ${BOOKING_NOTE_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true, value: body };
}

/** An agreed price for one item and why it differs from the rates'. */
export type PriceOverride = { totalSen: number; reason: string };

export const PRICE_OVERRIDE_REASON_MAX_LENGTH = 200;

/** The input names the override form posts, in ringgit and words. */
export const PRICE_OVERRIDE_FIELDS = {
  amount: "agreedPrice",
  reason: "priceReason",
} as const;

/** The rules on an override; the writer checks them again. */
export function checkPriceOverride(override: PriceOverride): Change {
  if (!Number.isInteger(override.totalSen) || override.totalSen < 0) {
    return { ok: false, error: "Enter the agreed price in RM." };
  }
  const reason = override.reason.trim();
  if (reason === "") {
    return { ok: false, error: "Give the reason for the agreed price." };
  }
  if (reason.length > PRICE_OVERRIDE_REASON_MAX_LENGTH) {
    return {
      ok: false,
      error: `The reason is at most ${PRICE_OVERRIDE_REASON_MAX_LENGTH} characters.`,
    };
  }
  return { ok: true };
}

/**
 * The override form's values: an amount in ringgit and a reason. Both blank
 * means no override. One without the other is refused, so an agreed price
 * always has its reason.
 */
export function parsePriceOverride(values: {
  amount: unknown;
  reason: unknown;
}): Parsed<PriceOverride | null> {
  const amount = textOf(values.amount);
  const reason = textOf(values.reason);
  if (amount === "" && reason === "") return { ok: true, value: null };
  const totalSen = parseRinggit(amount);
  if (totalSen === null) {
    return {
      ok: false,
      error: "Enter the agreed price in RM, with at most two decimals.",
    };
  }
  const override = { totalSen, reason };
  const check = checkPriceOverride(override);
  return check.ok ? { ok: true, value: override } : check;
}

/** "RM 300.00 (agreed on the phone)": an override as one line. */
export function describePriceOverride(override: PriceOverride) {
  return `${formatMyr(override.totalSen)} (${override.reason})`;
}
