/** "Nurul Aina" from the two Clerk name fields; empty when both are blank. Browser-safe. */
export function fullName(user: {
  firstName: string | null;
  lastName: string | null;
}) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}

/** A list as a sentence names it: "Kedah", "Kedah and Perlis", "Kedah, Perlis and Penang". */
export function andList(items: readonly string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items.at(-1)}`;
}

/** A count with its noun: "1 zone", "3 zones", "2 classes" with `many` for an irregular plural. */
export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Words as a sentence opens with them: "tour guide" as "Tour guide". */
export function sentenceCase(text: string) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/** The words a title keeps small, unless one opens or closes it. */
const TITLE_SMALL_WORDS = new Set([
  "a",
  "an",
  "the",
  "and",
  "or",
  "but",
  "nor",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "onto",
  "per",
  "to",
  "via",
  "vs",
  "with",
]);

/**
 * Words as a title, a heading or a button names them: "more popular places
 * in Langkawi" as "More Popular Places in Langkawi". For a title built from
 * data; a fixed one is typed in Title Case (docs/261113-text-case.md). Only a
 * word all in small letters is touched, so a name keeps its own ("KLIA2",
 * "iPhone"), and a hyphenated word gets one capital ("Pick-up").
 */
export function titleCase(text: string) {
  const words = text.split(" ");
  return words
    .map((word, i) => {
      if (!/^[a-z]/.test(word) || /[A-Z0-9]/.test(word)) return word;
      const edge = i === 0 || i === words.length - 1;
      if (!edge && TITLE_SMALL_WORDS.has(word)) return word;
      return `${word.charAt(0).toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

/**
 * Two names in a fixed order, the same in every browser and on the
 * server, unlike `localeCompare`, whose order follows the locale: for a
 * list that the browser and the server must both build alike, such as a
 * delete's impact (./delete-impact).
 */
export function compareNames(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
