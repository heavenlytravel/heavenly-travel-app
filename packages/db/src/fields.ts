/**
 * Readers for form values, which reach a server action as strings, or as a
 * `File`, or not at all. Each parser in this package reads its raw values
 * through these and answers a `Parsed`. Browser-safe.
 */

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** The trimmed text, or "" for anything that is not a string. */
export function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** The number the text spells, or NaN when it is blank or not a number. */
export function numberOf(value: unknown): number {
  const text = textOf(value);
  return text === "" ? NaN : Number(text);
}

/** A checkbox: present as "on" or "true", or a real boolean. */
export function flagOf(value: unknown): boolean {
  return value === true || value === "on" || value === "true";
}
