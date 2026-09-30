import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  adminLevelOf,
  adminTeamsOf,
  isAdminLevel,
  isAdminTeam,
  needsTeam,
} from "./roles";

describe("admin levels", () => {
  it("are SUPER and REGULAR only", () => {
    assert.equal(isAdminLevel("SUPER"), true);
    assert.equal(isAdminLevel("REGULAR"), true);
    assert.equal(isAdminLevel("OPS"), false);
  });

  it("read a level they do not know as REGULAR", () => {
    assert.equal(adminLevelOf("SUPER"), "SUPER");
    assert.equal(adminLevelOf("OPS"), "REGULAR");
    assert.equal(adminLevelOf(""), "REGULAR");
  });
});

describe("admin teams", () => {
  it("accept only the four departments", () => {
    assert.equal(isAdminTeam("FINANCE"), true);
    assert.equal(isAdminTeam("finance"), false);
    assert.equal(isAdminTeam("OPS"), false);
  });

  it("keep the known ones, once each, in a fixed order", () => {
    assert.deepEqual(
      adminTeamsOf(["SALES", "OPS", "OPERATION", "SALES", null]),
      ["OPERATION", "SALES"],
    );
    assert.deepEqual(adminTeamsOf([]), []);
  });
});

describe("needsTeam", () => {
  it("flags a REGULAR admin who holds no known team", () => {
    assert.equal(needsTeam({ level: "REGULAR", teams: [] }), true);
    assert.equal(needsTeam({ level: "OPS", teams: [] }), true);
    assert.equal(needsTeam({ level: "REGULAR", teams: ["OPS"] }), true);
    assert.equal(needsTeam({ level: "REGULAR", teams: ["SALES"] }), false);
  });

  it("never flags a SUPER admin", () => {
    assert.equal(needsTeam({ level: "SUPER", teams: [] }), false);
  });
});
