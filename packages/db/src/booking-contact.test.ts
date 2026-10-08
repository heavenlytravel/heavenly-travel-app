import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  customerEmailOf,
  EMAIL_REQUIRED_MESSAGE,
  isMaskedEmail,
  maskEmail,
  parseContact,
} from "./booking-contact";

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

describe("maskEmail", () => {
  it("keeps the first letter and the domain", () => {
    assert.equal(maskEmail("aina@gmail.com"), "a***@gmail.com");
    assert.equal(maskEmail("a@b.co"), "a***@b.co");
    assert.equal(maskEmail("first.last@sub.example.my"), "f***@sub.example.my");
  });

  it("shows nothing of a string that is not an address", () => {
    assert.equal(maskEmail("@example.com"), "***");
    assert.equal(maskEmail("nothing"), "***");
  });
});

describe("isMaskedEmail", () => {
  it("recognises only what maskEmail makes", () => {
    assert.equal(isMaskedEmail(maskEmail("aina@gmail.com")), true);
    assert.equal(isMaskedEmail("f***@example.com"), true);
    assert.equal(isMaskedEmail("f*2*@example.com"), false);
    assert.equal(isMaskedEmail("aina@gmail.com"), false);
    assert.equal(isMaskedEmail("***"), false);
    assert.equal(isMaskedEmail("a***@gmail"), false);
    assert.equal(isMaskedEmail("<b>***@x.com"), false);
    assert.equal(isMaskedEmail(undefined), false);
  });
});

describe("parseContact", () => {
  it("normalises the phone and the email", () => {
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
  });

  it("requires the email, saying why", () => {
    const blank = parseContact({ name: "Ali", phone: "0123456789", email: "" });
    assert.deepEqual(blank, { ok: false, error: EMAIL_REQUIRED_MESSAGE });
    const missing = parseContact({
      name: "Ali",
      phone: "0123456789",
      email: null,
    });
    assert.equal(missing.ok, false);
  });

  it("refuses a missing name, a short phone or a malformed email", () => {
    const email = "ali@example.com";
    assert.equal(
      parseContact({ name: "", phone: "0123456789", email }).ok,
      false,
    );
    assert.equal(
      parseContact({ name: "Ali", phone: "12345", email }).ok,
      false,
    );
    assert.equal(
      parseContact({ name: "Ali", phone: "0123456789", email: "ali@" }).ok,
      false,
    );
  });
});
