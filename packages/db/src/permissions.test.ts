import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADVANCE_PERMISSIONS,
  may,
  PERMISSIONS,
  permissionsOf,
  SETTINGS_CARDS,
  type Permission,
} from "./permissions";
import { ADMIN_TEAMS, type AdminTeam } from "./roles";

const regular = (...teams: AdminTeam[]) => ({ level: "REGULAR", teams });
const superAdmin = { level: "SUPER", teams: [] };

const SUPER_ONLY: Permission[] = [
  "admins.manage",
  "vendors.review",
  "users.manage",
  "wall.switch",
  "locations.activate",
  "locations.create",
];
/** What every admin holds, team or not: a location, and the activity of the areas it holds. */
const ANYONE: Permission[] = ["locations.view", "activity.view"];
/** The booking teams': the dashboard, the bookings and their notes. */
const SHARED: Permission[] = [
  ...ANYONE,
  "dashboard.view",
  "bookings.view",
  "bookings.notes",
];

/**
 * The wall table in docs/260930-admin-teams-and-access.md, row by row, the
 * Marketing team of docs/261001-locations-and-pages.md, the two location
 * permissions of docs/261015-locations-as-operation-areas.md, the
 * read-only classes, coverage and rates for Reservation and Sales, and
 * Operation's vehicles and drivers of docs/261019-vehicles-and-drivers.md,
 * the SEO team, which shares Marketing's pages, website and media, and
 * the Dashboard and Settings by team of
 * docs/261030-sign-in-connect-onboarding-and-media.md.
 */
const WALL: Record<AdminTeam, Permission[]> = {
  OPERATION: [
    ...SHARED,
    "bookings.fulfil",
    "coverage.manage",
    "coverage.view",
    "fleet.manage",
    "settings.view",
    "media.manage",
  ],
  RESERVATION: [
    ...SHARED,
    "bookings.manage",
    "bookings.create",
    "coverage.view",
  ],
  SALES: [...SHARED, "bookings.manage", "bookings.create", "coverage.view"],
  FINANCE: SHARED,
  MARKETING: [
    ...ANYONE,
    "locations.manage",
    "settings.view",
    "pages.manage",
    "website.manage",
    "media.manage",
  ],
  SEO: [...ANYONE, "pages.manage", "website.manage", "media.manage"],
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

  it("leaves an admin with no team a location and its activity only", () => {
    assert.deepEqual(sorted(permissionsOf(regular(), true)), sorted(ANYONE));
  });

  it("ignores a team it does not know", () => {
    const admin = { level: "REGULAR", teams: ["OPS"] };
    assert.deepEqual(sorted(permissionsOf(admin, true)), sorted(ANYONE));
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

describe("settings.view", () => {
  it("is held by exactly the admins who hold a key of one of its cards", () => {
    const holders = [
      ...ADMIN_TEAMS.map((team) => regular(team)),
      regular(),
      superAdmin,
    ];
    for (const wallActive of [true, false]) {
      for (const admin of holders) {
        assert.equal(
          may(admin, "settings.view", wallActive),
          SETTINGS_CARDS.some((card) => may(admin, card, wallActive)),
          `${admin.level} ${admin.teams.join(",")}, wall ${wallActive}`,
        );
      }
    }
  });
});

describe("ADVANCE_PERMISSIONS", () => {
  it("splits confirming from assigning and completing", () => {
    assert.equal(ADVANCE_PERMISSIONS.confirmed, "bookings.manage");
    assert.equal(ADVANCE_PERMISSIONS.completed, "bookings.fulfil");
  });
});
