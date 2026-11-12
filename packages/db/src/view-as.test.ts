import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatViewAs,
  mayViewAs,
  parseViewAs,
  viewableAccount,
} from "./view-as";

const session = "sess_2abcDEF123";

describe("parseViewAs", () => {
  it("reads back what it wrote, in the same sign-in", () => {
    const target = { userId: "cm1user", sessionId: session };
    assert.deepEqual(parseViewAs(formatViewAs(target), session), target);
  });

  it("drops a view started in another sign-in, or with none", () => {
    const value = formatViewAs({ userId: "cm1user", sessionId: session });
    assert.equal(parseViewAs(value, "sess_other"), null);
    assert.equal(parseViewAs(value, null), null);
  });

  it("drops a missing or malformed value", () => {
    for (const value of [
      undefined,
      "",
      "cm1user",
      "cm1user.",
      `.${session}`,
      `CM1.${session}`,
      `a.b.${session}`,
      `cm1user.${session}!`,
    ]) {
      assert.equal(parseViewAs(value, session), null, String(value));
    }
  });
});

describe("mayViewAs", () => {
  it("lets SUPER alone", () => {
    assert.equal(mayViewAs({ adminProfile: { level: "SUPER" } }), true);
    assert.equal(mayViewAs({ adminProfile: { level: "REGULAR" } }), false);
    assert.equal(mayViewAs({ adminProfile: null }), false);
  });
});

describe("viewableAccount", () => {
  it("views anyone else's account, never one's own", () => {
    const viewer = { id: "admin" };
    assert.equal(viewableAccount(viewer, { id: "v" }), true);
    assert.equal(viewableAccount(viewer, { id: "admin" }), false);
  });
});
