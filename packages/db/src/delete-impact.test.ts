import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IMPACT_CHANGED_MESSAGE,
  checkDeleteConfirmed,
  deleteConfirmationOf,
  type DeleteImpact,
} from "./delete-impact";

const errorOf = (result: { ok: true } | { ok: false; error: string }) =>
  result.ok ? "" : result.error;

const plain: DeleteImpact = { lines: ["Its photos go."], confirmWith: null };
const reaching: DeleteImpact = {
  lines: ["Its pages go.", "Kuala Lumpur loses its route."],
  confirmWith: "selangor",
};

describe("checkDeleteConfirmed", () => {
  it("goes ahead when the admin saw the impact as it stands", () => {
    assert.equal(
      checkDeleteConfirmed(plain, { seen: ["Its photos go."], typed: null }).ok,
      true,
    );
    assert.equal(
      checkDeleteConfirmed(reaching, {
        seen: [...reaching.lines],
        typed: "selangor",
      }).ok,
      true,
    );
  });

  it("refuses when the impact changed since it was shown", () => {
    for (const seen of [[], ["Its pages go."], ["Its pages go.", "Other."]]) {
      assert.equal(
        errorOf(checkDeleteConfirmed(reaching, { seen, typed: "selangor" })),
        IMPACT_CHANGED_MESSAGE,
        seen.join("|"),
      );
    }
  });

  it("asks for what the delete wants typed, exactly", () => {
    for (const typed of [null, "", "Selangor", "selangor "]) {
      assert.equal(
        errorOf(
          checkDeleteConfirmed(reaching, { seen: [...reaching.lines], typed }),
        ),
        "Type selangor to confirm.",
        String(typed),
      );
    }
  });
});

describe("deleteConfirmationOf", () => {
  it("reads what a server action received, and nothing else", () => {
    assert.deepEqual(deleteConfirmationOf(["a"], null), {
      seen: ["a"],
      typed: null,
    });
    assert.deepEqual(deleteConfirmationOf([], "x"), { seen: [], typed: "x" });
    assert.equal(deleteConfirmationOf("a", null), null);
    assert.equal(deleteConfirmationOf([1], null), null);
    assert.equal(deleteConfirmationOf([], 3), null);
  });
});
