import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseNewUser } from "./user-input";

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
