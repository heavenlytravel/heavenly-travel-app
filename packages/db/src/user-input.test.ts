import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNewStaff, parseNewUser, parseStaffAccess } from "./user-input";

const FORM: Record<string, string> = {
  email: " Aina@Example.COM ",
  firstName: " Nurul ",
  lastName: "Aina",
  phone: "+60 12-345 6789",
};

function fieldOf(values: Record<string, string>) {
  const result = parseNewUser({ ...FORM, ...values });
  return result.ok ? null : result.field;
}

describe("parseNewUser", () => {
  it("reads the form: the email in lower case, the phone as kept", () => {
    assert.deepEqual(parseNewUser(FORM), {
      ok: true,
      value: {
        email: "aina@example.com",
        firstName: "Nurul",
        lastName: "Aina",
        phone: "+60123456789",
      },
    });
  });

  it("takes no last name and no phone", () => {
    const result = parseNewUser({ ...FORM, lastName: "", phone: " " });
    assert.ok(result.ok);
    assert.equal(result.value.lastName, "");
    assert.equal(result.value.phone, null);
  });

  it("refuses at the field that is wrong", () => {
    assert.equal(fieldOf({ email: "" }), "email");
    assert.equal(fieldOf({ email: "not-an-email" }), "email");
    assert.equal(fieldOf({ firstName: "" }), "firstName");
    assert.equal(fieldOf({ lastName: "x".repeat(81) }), "lastName");
    assert.equal(fieldOf({ phone: "123" }), "phone");
  });
});

describe("parseNewStaff", () => {
  it("takes an email alone: an account that exists keeps its names", () => {
    assert.deepEqual(parseNewStaff({ email: "Aina@Example.com" }), {
      ok: true,
      value: {
        email: "aina@example.com",
        firstName: "",
        lastName: "",
        phone: null,
      },
    });
  });

  it("checks the email and the names as Customers does", () => {
    const refused = (values: Record<string, string>) => {
      const result = parseNewStaff({ ...FORM, ...values });
      return result.ok ? null : result.field;
    };
    assert.equal(refused({ email: "not-an-email" }), "email");
    assert.equal(refused({ firstName: "x".repeat(81) }), "firstName");
  });
});

describe("parseStaffAccess", () => {
  it("reads the level and the teams, in their order", () => {
    assert.deepEqual(parseStaffAccess("REGULAR", ["SEO", "OPERATION"]), {
      ok: true,
      value: { level: "REGULAR", teams: ["OPERATION", "SEO"] },
    });
  });

  it("lets SUPER hold no team", () => {
    assert.deepEqual(parseStaffAccess("SUPER", []), {
      ok: true,
      value: { level: "SUPER", teams: [] },
    });
  });

  it("refuses a REGULAR admin with no team, a team it does not know left out", () => {
    const result = parseStaffAccess("REGULAR", ["OPS"]);
    assert.equal(result.ok ? null : result.field, "teams");
  });

  it("refuses a level it does not know", () => {
    const result = parseStaffAccess("OPS", ["OPERATION"]);
    assert.equal(result.ok ? null : result.field, "level");
  });
});
