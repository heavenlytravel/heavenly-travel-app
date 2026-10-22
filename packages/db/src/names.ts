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

/**
 * Two names in a fixed order, the same in every browser and on the
 * server, unlike `localeCompare`, whose order follows the locale: for a
 * list that the browser and the server must both build alike, such as a
 * delete's impact (./delete-impact).
 */
export function compareNames(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}
