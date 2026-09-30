import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { customerEmailOf, parseContact } from "./booking-contact";

describe("customerEmailOf", () => {
  it("prefers the booking's own email, then the account's, then nothing", () => {
    const account = { email: "aina@example.com" };
    assert.equal(
      customerEmailOf({ contactEmail: "other@example.com", user: account }),
      "other@example.com",
    );
    assert.equal(
      customerEmailOf({ contactEmail: null, user: account }),
      "aina@example.com",
    );
    assert.equal(customerEmailOf({ contactEmail: null, user: null }), null);
  });
});

describe("parseContact", () => {
  it("normalises the phone and the email and allows no email", () => {
    assert.deepEqual(
      parseContact({
        name: " Nurul Aina ",
        phone: "+60 12-345 6789",
        email: " Aina@Example.com ",
      }),
      {
        ok: true,
        value: {
          contactName: "Nurul Aina",
          contactPhone: "+60123456789",
          contactEmail: "aina@example.com",
        },
      },
    );
    const guest = parseContact({ name: "Ali", phone: "0123456789" });
    assert.equal(guest.ok && guest.value.contactEmail, null);
  });

  it("refuses a missing name, a short phone or a malformed email", () => {
    assert.equal(parseContact({ name: "", phone: "0123456789" }).ok, false);
    assert.equal(parseContact({ name: "Ali", phone: "12345" }).ok, false);
    assert.equal(
      parseContact({ name: "Ali", phone: "0123456789", email: "ali@" }).ok,
      false,
    );
  });
});
