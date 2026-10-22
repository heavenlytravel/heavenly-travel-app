import { Prisma } from "./generated/prisma/client";

/**
 * The columns of the unique index a write broke, as Postgres names them in
 * "Key (plate)=(VLE1234) already exists": through the Neon driver adapter,
 * Prisma passes the adapter's error on in `meta` rather than a `target`.
 * A column with capitals comes quoted, `"clerkId"`.
 */
function violatedColumns(meta: Record<string, unknown> | undefined): string[] {
  const adapterError = meta?.driverAdapterError;
  if (typeof adapterError !== "object" || adapterError === null) return [];
  const cause: unknown = Reflect.get(adapterError, "cause");
  if (typeof cause !== "object" || cause === null) return [];
  const constraint: unknown = Reflect.get(cause, "constraint");
  if (typeof constraint !== "object" || constraint === null) return [];
  const fields: unknown = Reflect.get(constraint, "fields");
  return Array.isArray(fields)
    ? fields.map((name) => String(name).replaceAll('"', ""))
    : [];
}

/** Whether an error is Postgres refusing a duplicate in `field`'s unique index. */
export function isUniqueViolation(error: unknown, field: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    violatedColumns(error.meta).includes(field)
  );
}
