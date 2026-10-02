import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADVANCE_PERMISSIONS,
  may,
  PERMISSIONS,
  permissionsOf,
  type Permission,
} from "./permissions";
import { ADMIN_TEAMS, type AdminTeam } from "./roles";

const regular = (...teams: AdminTeam[]) => ({ level: "REGULAR", teams });
const superAdmin = { level: "SUPER", teams: [] };

const SUPER_ONLY: Permission[] = [
  "admins.manage",
  "wall.switch",
  "activity.view",
];
const SHARED: Permission[] = [
  "dashboard.view",
  "bookings.view",
  "bookings.notes",
];

/**
 * The wall table in docs/260930-admin-teams-and-access.md, row by row, and
 * the Marketing team of docs/261001-locations-and-pages.md.
 */
const WALL: Record<AdminTeam, Permission[]> = {
  OPERATION: [...SHARED, "bookings.fulfil", "coverage.manage"],
  RESERVATION: [...SHARED, "bookings.manage", "bookings.create"],
  SALES: [...SHARED, "bookings.manage", "bookings.create"],
  FINANCE: SHARED,
  MARKETING: ["dashboard.view", "locations.manage"],
};

const sorted = (permissions: Permission[]) => [...permissions].sort();

describe("may, with the wall on", () => {
  for (const team of ADMIN_TEAMS) {
    it(`gives ${team} its row of the table and nothing else`, () => {
      assert.deepEqual(
        sorted(permissionsOf(regular(team), true)),
        sorted(WALL[team]),
      );
    });
  }

  it("adds up the teams of an admin who holds several", () => {
    const both = regular("OPERATION", "SALES");
    assert.equal(may(both, "bookings.fulfil", true), true);
    assert.equal(may(both, "bookings.manage", true), true);
  });

  it("leaves an admin with no team the Dashboard only", () => {
    assert.deepEqual(permissionsOf(regular(), true), ["dashboard.view"]);
  });

  it("ignores a team it does not know", () => {
    const admin = { level: "REGULAR", teams: ["OPS"] };
    assert.deepEqual(permissionsOf(admin, true), ["dashboard.view"]);
  });
});

describe("may, with the wall off", () => {
  it("opens every team screen and action to every admin", () => {
    const open = PERMISSIONS.filter((p) => !SUPER_ONLY.includes(p));
    assert.deepEqual(permissionsOf(regular(), false), open);
    assert.deepEqual(permissionsOf(regular("FINANCE"), false), open);
  });
});

describe("may, in both states", () => {
  for (const wallActive of [true, false]) {
    const state = wallActive ? "on" : "off";

    it(`gives SUPER everything, wall ${state}`, () => {
      assert.deepEqual(permissionsOf(superAdmin, wallActive), PERMISSIONS);
    });

    it(`keeps the SUPER screens from every team, wall ${state}`, () => {
      const everyTeam = regular(...ADMIN_TEAMS);
      for (const permission of SUPER_ONLY) {
        assert.equal(may(everyTeam, permission, wallActive), false);
      }
    });
  }

  it("reads a level it does not know as REGULAR", () => {
    const ops = { level: "OPS", teams: ["OPERATION"] };
    assert.equal(may(ops, "admins.manage", false), false);
    assert.equal(may(ops, "bookings.fulfil", true), true);
    assert.equal(may(ops, "bookings.manage", true), false);
  });
});

describe("ADVANCE_PERMISSIONS", () => {
  it("splits confirming from assigning and completing", () => {
    assert.equal(ADVANCE_PERMISSIONS.confirmed, "bookings.manage");
    assert.equal(ADVANCE_PERMISSIONS.assigned, "bookings.fulfil");
    assert.equal(ADVANCE_PERMISSIONS.completed, "bookings.fulfil");
  });
});
