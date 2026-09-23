/**
 * The schema stores enumerations as plain strings and validates them against
 * const arrays in code (no Prisma enums, so adding a value never needs a
 * migration). This builds the type guard for one such array.
 */
export function guardFor<const T extends readonly string[]>(values: T) {
  return (value: unknown): value is T[number] =>
    typeof value === "string" && (values as readonly string[]).includes(value);
}
