import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingEmails } from "./booking-emails";
import {
  sampleBooking,
  sampleCases,
  sampleItem,
  sampleSettings,
} from "./fixtures";

const settings = sampleSettings;

describe("bookingEmails", () => {
  it("received writes to the customer and to ops with the right links", () => {
    const [customer, ops, ...rest] = bookingEmails(
      "received",
      sampleBooking(),
      settings,
    );
    assert.equal(rest.length, 0);

    assert.equal(customer!.message.to, "aina@example.com");
    assert.equal(customer!.message.subject, "Booking HT-7K3QZM received");
    assert.match(customer!.message.text, /Pick-up: KLIA Terminal 1/);
    assert.match(customer!.message.text, /Total: RM 180\.00/);
    assert.match(
      customer!.message.text,
      /https:\/\/site\.test\/booking\/HT-7K3QZM/,
    );
    assert.match(customer!.message.text, /Sat, 3 Oct 2026, 09:30/);

    assert.equal(ops!.message.to, "ops@site.test");
    assert.equal(ops!.message.subject, "New booking HT-7K3QZM");
    assert.match(ops!.message.text, /Phone: \+60123456789/);
    assert.match(ops!.message.text, /https:\/\/admin\.test\/bookings\/b1/);
  });

  it("prefixes every subject outside production", () => {
    const subjects = sampleCases.flatMap(({ event, booking }) =>
      bookingEmails(event, booking, {
        ...settings,
        subjectPrefix: "[Development] ",
      }).map((e) => e.message.subject),
    );
    assert.equal(subjects.length, 7);
    for (const subject of subjects) assert.match(subject, /^\[Development\] /);
  });

  it("escapes what the customer typed in the HTML body only", () => {
    const [customer] = bookingEmails(
      "received",
      sampleBooking({ contactName: "Nurul <Aina>" }),
      settings,
    );
    assert.match(customer!.message.html, /Nurul &lt;Aina&gt;/);
    assert.doesNotMatch(customer!.message.html, /<Aina>/);
    assert.match(customer!.message.text, /Nurul <Aina>/);
  });

  it("keys each message on the booking, the event and the write", () => {
    const keys = bookingEmails("received", sampleBooking(), settings).map(
      (e) => e.key,
    );
    const stamp = new Date("2026-09-23T10:00:00Z").getTime();
    assert.deepEqual(keys, [
      `b1:received:${stamp}:customer`,
      `b1:received:${stamp}:ops`,
    ]);
  });

  it("confirmed goes to the customer only, with the pick-up time", () => {
    const emails = bookingEmails(
      "confirmed",
      sampleBooking({ status: "confirmed" }),
      settings,
    );
    assert.equal(emails.length, 1);
    assert.equal(emails[0]!.message.subject, "Booking HT-7K3QZM confirmed");
    assert.match(emails[0]!.message.text, /Sat, 3 Oct 2026, 09:30/);
  });

  it("a customer cancel tells the customer and ops", () => {
    const emails = bookingEmails(
      "cancelled",
      sampleBooking({
        status: "cancelled",
        cancelledBy: "customer",
        items: [sampleItem({ status: "cancelled" })],
      }),
      settings,
    );
    assert.deepEqual(
      emails.map((e) => e.message.subject),
      [
        "Booking HT-7K3QZM cancelled",
        "Booking HT-7K3QZM cancelled by the customer",
      ],
    );
    assert.match(emails[0]!.message.text, /you cancelled/);
  });

  it("an admin cancel tells the customer only and apologises", () => {
    const emails = bookingEmails(
      "cancelled",
      sampleBooking({
        status: "cancelled",
        cancelledBy: "admin",
        items: [sampleItem({ status: "cancelled" })],
      }),
      settings,
    );
    assert.equal(emails.length, 1);
    assert.match(emails[0]!.message.text, /we are sorry/);
  });

  it("a partial admin cancel lists every item with its status", () => {
    const emails = bookingEmails(
      "cancelled",
      sampleBooking({
        status: "confirmed",
        items: [
          sampleItem({ status: "confirmed" }),
          sampleItem({ id: "item2", position: 2, status: "cancelled" }),
        ],
      }),
      settings,
    );
    assert.equal(emails.length, 1);
    assert.equal(emails[0]!.message.subject, "Booking HT-7K3QZM updated");
    assert.match(emails[0]!.message.text, /ITEM 1: CONFIRMED/);
    assert.match(emails[0]!.message.text, /ITEM 2: CANCELLED/);
  });
});
