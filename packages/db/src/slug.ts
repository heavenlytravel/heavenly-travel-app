/**
 * "Klang Valley" -> "klang-valley": lower case, ASCII letters and digits,
 * dashes between. Empty when the name has neither a letter nor a digit.
 * Derived once, when a record is created, and never changed. Browser-safe.
 */
export function slugify(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
