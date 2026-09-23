/**
 * Human-readable booking references: HT- plus six characters from an
 * alphabet without 0/O and 1/I, so they survive being read out loud or typed
 * from a WhatsApp message. Random and never sequential; 32^6 (about a
 * billion) values, so a collision is rare and the creator simply retries.
 */

export const REFERENCE_PREFIX = "HT-";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const LENGTH = 6;
const REFERENCE_RE = new RegExp(
  `^${REFERENCE_PREFIX}[${ALPHABET}]{${LENGTH}}$`,
);

export function generateReference() {
  const bytes = crypto.getRandomValues(new Uint8Array(LENGTH));
  let code = "";
  for (const b of bytes) code += ALPHABET[b % ALPHABET.length];
  return REFERENCE_PREFIX + code;
}

/** Whether a string has the shape of a reference we could have issued. */
export function isReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE_RE.test(value);
}

/** What a person typed, as the stored form: trimmed, upper case, with prefix. */
export function normalizeReference(input: string) {
  const upper = input.trim().toUpperCase();
  return upper.startsWith(REFERENCE_PREFIX) ? upper : REFERENCE_PREFIX + upper;
}
