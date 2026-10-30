/**
 * The contact phone number on a booking. Stored as typed, minus separators,
 * so "+60 12-345 6789" and "0123456789" both become something ops can dial.
 * Browser-safe: no database.
 */

const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

/** Strips spaces, dashes, dots and brackets; keeps digits and a leading plus. */
export function normalizePhone(input: string) {
  const trimmed = input.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/\D/g, "");
}

/** Whether a normalised number has enough digits to be dialled. */
export function isValidPhone(normalized: string) {
  const digits = normalized.replace(/\D/g, "");
  return (
    /^\+?\d+$/.test(normalized) &&
    digits.length >= MIN_DIGITS &&
    digits.length <= MAX_DIGITS
  );
}

/**
 * A number's WhatsApp link, "https://wa.me/60123456789": wa.me wants the
 * country code without the plus, so a local "012…" is read as Malaysian.
 */
export function whatsappHref(phone: string) {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, "");
  const international =
    normalized.startsWith("+") || digits.startsWith("60")
      ? digits
      : `60${digits.replace(/^0/, "")}`;
  return `https://wa.me/${international}`;
}
