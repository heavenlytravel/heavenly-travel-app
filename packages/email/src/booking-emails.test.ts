import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bookingEmails } from "./booking-emails";
import {
  sampleBooking,
  sampleCases,
  sampleCoachItem,
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

  it("writes only to ops for an old guest booking with no email", () => {
    const guest = sampleBooking({
      userId: null,
      user: null,
      contactEmail: null,
    });
    const received = bookingEmails("received", guest, settings);
    assert.equal(received.length, 1);
    assert.equal(received[0]!.message.to, "ops@site.test");
    assert.match(received[0]!.message.text, /Email: None given/);
    assert.equal(
      bookingEmails("confirmed", { ...guest, status: "confirmed" }, settings)
        .length,
      0,
    );
  });

  it("offers a guest an account once, above a sign-up link that claims the booking", () => {
    const guest = sampleBooking({
      userId: null,
      user: null,
      contactEmail: "aina@gmail.com",
    });
    const [customer] = bookingEmails("received", guest, settings);
    assert.equal(customer!.message.to, "aina@gmail.com");
    assert.match(
      customer!.message.text,
      /Verify your email once to see updates and cancel online\.\n\nManage booking online: https:\/\/site\.test\/sign-up\?email=aina%40gmail\.com&redirect_url=%2Faccount%2Fbookings%2FHT-7K3QZM/,
    );
    assert.doesNotMatch(customer!.message.text, /View booking/);
    assert.equal(customer!.message.text.split("Verify your email").length, 2);

    const [confirmed] = bookingEmails(
      "confirmed",
      { ...guest, status: "confirmed" },
      settings,
    );
    assert.match(confirmed!.message.text, /Manage booking online: /);
  });

  it("keeps the account holder's button and never offers them an account", () => {
    for (const event of ["received", "confirmed", "amended"] as const) {
      const [customer] = bookingEmails(
        event,
        sampleBooking({
          status: event === "received" ? "received" : "confirmed",
        }),
        settings,
      );
      assert.match(
        customer!.message.text,
        /View booking: https:\/\/site\.test\/booking\/HT-7K3QZM/,
      );
      assert.doesNotMatch(customer!.message.text, /Verify your email|sign-up/);
    }
  });

  it("tells every received customer how to disown the booking, and ops never", () => {
    const line =
      /Didn't make this booking\? Reply to this email and we will remove it\./;
    const [holder, ops] = bookingEmails("received", sampleBooking(), settings);
    assert.match(holder!.message.text, line);
    assert.match(holder!.message.html, /Didn&#39;t make this booking\?/);
    assert.doesNotMatch(ops!.message.text, line);
    const [guest] = bookingEmails(
      "received",
      sampleBooking({ userId: null, user: null }),
      settings,
    );
    assert.match(guest!.message.text, line);
    const [confirmed] = bookingEmails(
      "confirmed",
      sampleBooking({ status: "confirmed" }),
      settings,
    );
    assert.doesNotMatch(confirmed!.message.text, line);
  });

  it("reads the account's email for a booking made before contactEmail", () => {
    const [customer] = bookingEmails(
      "received",
      sampleBooking({ contactEmail: null }),
      settings,
    );
    assert.equal(customer!.message.to, "aina@example.com");
  });

  it("prefixes every subject outside production", () => {
    const subjects = sampleCases.flatMap(({ event, booking }) =>
      bookingEmails(event, booking, {
        ...settings,
        subjectPrefix: "[Development] ",
      }).map((e) => e.message.subject),
    );
    assert.equal(subjects.length, 12);
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
          sampleCoachItem({ id: "item2", position: 2, status: "cancelled" }),
        ],
      }),
      settings,
    );
    assert.equal(emails.length, 1);
    assert.equal(emails[0]!.message.subject, "Booking HT-7K3QZM updated");
    assert.match(
      emails[0]!.message.text,
      /ITEM 1: CAR WITH DRIVER \(CONFIRMED\)/,
    );
    assert.match(
      emails[0]!.message.text,
      /ITEM 2: COACH CHARTER \(CANCELLED\)/,
    );
  });

  it("an amend tells the customer what the trip now is, with the total", () => {
    const emails = bookingEmails(
      "amended",
      sampleBooking({
        status: "confirmed",
        priceTotalSen: 21000,
        items: [sampleItem({ status: "confirmed", priceTotalSen: 21000 })],
      }),
      settings,
    );
    assert.equal(emails.length, 1);
    assert.equal(emails[0]!.message.to, "aina@example.com");
    assert.equal(emails[0]!.message.subject, "Booking HT-7K3QZM updated");
    assert.match(
      emails[0]!.message.text,
      /updated booking HT-7K3QZM as agreed/,
    );
    assert.match(emails[0]!.message.text, /Pick-up: KLIA Terminal 1/);
    assert.match(emails[0]!.message.text, /Total: RM 210\.00/);
    assert.match(
      emails[0]!.message.text,
      /https:\/\/site\.test\/booking\/HT-7K3QZM/,
    );
  });

  it("heads the item with its category, to the customer and to ops", () => {
    const car = bookingEmails("received", sampleBooking(), settings);
    const coach = bookingEmails(
      "received",
      sampleBooking({ items: [sampleCoachItem()] }),
      settings,
    );
    assert.equal(car.length, 2);
    assert.equal(coach.length, 2);
    for (const { message } of car) {
      assert.match(message.text, /CAR WITH DRIVER\nTrip: One-way/);
      assert.match(message.html, />Car with driver</);
    }
    for (const { message } of coach) {
      assert.match(message.text, /COACH CHARTER\nTrip: By the hour/);
      assert.match(message.html, />Coach charter</);
      assert.match(message.text, /Vehicle: Minibus/);
      assert.match(message.text, /Duration: 8 hours/);
      assert.doesNotMatch(message.text, /Child seats|Drop-off|Flight/);
    }
  });
});
