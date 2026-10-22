import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Prisma } from "./generated/prisma/client";
import { isUniqueViolation } from "./prisma-errors";

/** A P2002 as Prisma throws it through the Neon adapter: the columns under `driverAdapterError`. */
function duplicate(fields: string[] | undefined, code = "P2002") {
  return new Prisma.PrismaClientKnownRequestError(
    "Unique constraint failed",
    {
      code,
      clientVersion: "7",
      meta: {
        modelName: "Vehicle",
        driverAdapterError: {
          cause: {
            kind: "UniqueConstraintViolation",
            constraint: fields ? { fields } : undefined,
          },
        },
      },
    },
  );
}

describe("isUniqueViolation", () => {
  it("names the column Postgres refused", () => {
    assert.equal(isUniqueViolation(duplicate(["plate"]), "plate"), true);
    assert.equal(isUniqueViolation(duplicate(["plate"]), "reference"), false);
  });

  it("reads a quoted column with capitals", () => {
    assert.equal(isUniqueViolation(duplicate(['"clerkId"']), "clerkId"), true);
  });

  it("finds a column among an index's several", () => {
    const error = duplicate(['"vehicleClassId"', "brand", "name"]);
    assert.equal(isUniqueViolation(error, "brand"), true);
    assert.equal(isUniqueViolation(error, "bran"), false);
  });

  it("is false for another error or no columns", () => {
    assert.equal(isUniqueViolation(duplicate(["plate"], "P2025"), "plate"), false);
    assert.equal(isUniqueViolation(duplicate(undefined), "plate"), false);
    assert.equal(isUniqueViolation(new Error("plate"), "plate"), false);
  });
});
