import { Prisma } from "./generated/prisma/client";

/** Whether an error is Postgres refusing a duplicate in `field`'s unique index. */
export function isUniqueViolation(error: unknown, field: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta?.target ?? "").includes(field)
  );
}
