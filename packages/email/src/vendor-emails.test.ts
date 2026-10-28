import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sampleSettings } from "./fixtures";
import { vendorApprovedEmails, vendorRegisteredEmails } from "./vendor-emails";

const vendor = {
  id: "ven1",
  name: "Pulau Coach Sdn Bhd",
  contactName: "Aminah",
  contactEmail: "ops@pulaucoach.my",
  contactPhone: "+60123456789",
  at: new Date("2026-11-01T00:00:00Z"),
};

describe("vendorRegisteredEmails", () => {
  it("tells the team, with the vendor's page in the console", () => {
    const [ops, ...rest] = vendorRegisteredEmails(vendor, sampleSettings);
    assert.equal(rest.length, 0);
    assert.equal(ops!.message.to, "ops@site.test");
    assert.equal(
      ops!.message.subject,
      "New vendor sign-up: Pulau Coach Sdn Bhd",
    );
    assert.match(ops!.message.text, /https:\/\/admin\.test\/vendors\/ven1/);
    assert.match(ops!.message.text, /Phone: \+60123456789/);
  });
});

describe("vendorApprovedEmails", () => {
  it("tells the vendor Connect is open, with its address", () => {
    const [mail, ...rest] = vendorApprovedEmails(vendor, sampleSettings);
    assert.equal(rest.length, 0);
    assert.equal(mail!.message.to, "ops@pulaucoach.my");
    assert.match(mail!.message.text, /https:\/\/connect\.test/);
    assert.match(mail!.message.text, /Hi Aminah/);
  });

  it("keys on the vendor and the time, so a retry does not send twice", () => {
    const [a] = vendorApprovedEmails(vendor, sampleSettings);
    const [b] = vendorApprovedEmails(vendor, sampleSettings);
    assert.equal(a!.key, b!.key);
  });
});
