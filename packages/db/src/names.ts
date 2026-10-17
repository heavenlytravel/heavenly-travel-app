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
