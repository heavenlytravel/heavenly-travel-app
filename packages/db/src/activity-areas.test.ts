import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ACTIVITY_ACTIONS, activityActionMeta } from "./activity-actions";
import {
  ACTIVITY_AREAS,
  ACTIVITY_AREA_PERMISSIONS,
  LOCATION_ACTIVITY_AREAS,
  activityActionsIn,
  activityAreaOf,
  activityAreasHeld,
  entryAreaOf,
} from "./activity-areas";
import { may, PERMISSIONS, permissionsOf } from "./permissions";
import { ADMIN_TEAMS, type AdminTeam } from "./roles";

const regular = (...teams: AdminTeam[]) => ({ level: "REGULAR", teams });
const heldBy = (...teams: AdminTeam[]) =>
  activityAreasHeld(permissionsOf(regular(...teams), true));

describe("activityAreaOf", () => {
  it("gives every action an area", () => {
    for (const action of ACTIVITY_ACTIONS) {
      assert.ok(ACTIVITY_AREAS.includes(activityAreaOf(action)), action);
    }
  });

  it("puts vehicles, drivers and vendors in the fleet", () => {
    for (const action of ACTIVITY_ACTIONS) {
      const { entityType } = activityActionMeta(action);
      if (!["vehicle", "driver", "vendor"].includes(entityType)) continue;
      assert.equal(activityAreaOf(action), "fleet", action);
    }
  });

  it("keeps staff, accounts, the wall and a contact shown to SUPER", () => {
    for (const action of [
      "user.created",
      "admin.promoted",
      "wall.switched",
      "booking.contact.viewed",
    ] as const) {
      assert.equal(activityAreaOf(action), "team", action);
    }
  });

  it("knows no area for an action this code does not know", () => {
    assert.equal(entryAreaOf("vehicle.washed"), null);
    assert.equal(entryAreaOf("booking.created"), "bookings");
  });
});

describe("ACTIVITY_AREA_PERMISSIONS", () => {
  it("asks a key the wall knows", () => {
    for (const area of ACTIVITY_AREAS) {
      assert.ok(PERMISSIONS.includes(ACTIVITY_AREA_PERMISSIONS[area]), area);
    }
  });

  it("keeps the team's area from every team, wall on or off", () => {
    const everyTeam = regular(...ADMIN_TEAMS);
    for (const wallActive of [true, false]) {
      const key = ACTIVITY_AREA_PERMISSIONS.team;
      assert.equal(may(everyTeam, key, wallActive), false);
    }
  });
});

describe("activityAreasHeld", () => {
  it("gives each team the areas of its work", () => {
    assert.deepEqual(heldBy("SEO"), ["pages", "website", "status"]);
    assert.deepEqual(heldBy("MARKETING"), [
      "pages",
      "website",
      "details",
      "status",
    ]);
    assert.deepEqual(heldBy("OPERATION"), [
      "bookings",
      "fleet",
      "coverage",
      "status",
    ]);
    assert.deepEqual(heldBy("FINANCE"), ["bookings", "status"]);
    assert.deepEqual(heldBy(), ["status"]);
  });

  it("gives SUPER every area", () => {
    const all = permissionsOf({ level: "SUPER", teams: [] }, true);
    assert.deepEqual(activityAreasHeld(all), [...ACTIVITY_AREAS]);
  });
});

describe("activityActionsIn", () => {
  it("asks nothing of the action for every area", () => {
    assert.equal(activityActionsIn(ACTIVITY_AREAS), null);
  });

  it("asks the actions of the areas held, and only those", () => {
    const actions = activityActionsIn(["pages", "website"]) ?? [];
    assert.ok(actions.includes("location.page.published"));
    assert.ok(actions.includes("site.footer.published"));
    assert.ok(actions.includes("location.top-choice.updated"));
    assert.ok(!actions.includes("location.rates.updated"));
    assert.ok(!actions.includes("booking.created"));
    assert.deepEqual(activityActionsIn([]), []);
  });
});

describe("LOCATION_ACTIVITY_AREAS", () => {
  it("holds the area of every action a location's log can show", () => {
    for (const action of ACTIVITY_ACTIONS) {
      const { entityType } = activityActionMeta(action);
      if (!["location", "vehicle", "driver"].includes(entityType)) continue;
      assert.ok(
        (LOCATION_ACTIVITY_AREAS as readonly string[]).includes(
          activityAreaOf(action),
        ),
        action,
      );
    }
  });
});
