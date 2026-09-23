/** "Nurul Aina" from the two Clerk name fields; empty when both are blank. Browser-safe. */
export function fullName(user: {
  firstName: string | null;
  lastName: string | null;
}) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
}
