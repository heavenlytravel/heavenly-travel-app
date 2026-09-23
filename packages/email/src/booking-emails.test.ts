import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONTACT, type Place } from "@repo/db";
import type { BookingItemWithDetails, BookingWithItems } from "@repo/db/server";
import { bookingEmails } from "./booking-emails";

const links = {
  siteUrl: "https://site.test",
  adminUrl: "https://admin.test",
};

const klia: Place = {
  placeId: "p1",
  label: "KLIA Terminal 1",
  address: "KLIA, 64000 Sepang, Selangor",
  lat: 2.74,
  lng: 101.71,
  state: "Selangor",
  district: "Sepang",
  locality: "Sepang",
};

const kl: Place = {
  ...klia,
  placeId: "p2",
  label: "Kuala Lumpur",
  address: "Kuala Lumpur, Federal Territory of Kuala Lumpur",
};

const at = new Date("2026-10-03T01:30:00Z");

function item(
  overrides: Partial<BookingItemWithDetails> = {},
): BookingItemWithDetails {
  return {
    id: "item1",
    bookingId: "b1",
    position: 1,
    product: "car-with-driver",
    status: "received",
    startsAt: at,
    zoneId: "z1",
    zone: { id: "z1", slug: "klang-valley", name: "Klang Valley" },
    priceTotalSen: 18000,
    priceBreakdown: {},
    confirmedAt: null,
    cancelledAt: null,
    createdAt: at,
    updatedAt: at,
    carDetails: {
      id: "d1",
      itemId: "item1",
      vehicleClassId: "vc1",
      vehicleClassName: "Sedan",
      mode: "oneway",
      pickupPlace: klia,
      dropoffPlace: kl,
      hours: null,
      distanceKm: 55.2,
      passengers: 2,
      childSeats: 0,
      flightNumber: "MH123",
      notes: null,
    },
    ...overrides,
  };
}

function booking(overrides: Partial<BookingWithItems> = {}): BookingWithItems {
  return {
    id: "b1",
    reference: "HT-7K3QZM",
    userId: "u1",
    user: {
      id: "u1",
      email: "aina@example.com",
      firstName: "Nurul",
      lastName: "Aina",
    },
    status: "received",
    contactName: "Nurul <Aina>",
    contactPhone: "+60123456789",
    priceTotalSen: 18000,
    currency: "MYR",
    startsAt: at,
    confirmedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: at,
    updatedAt: new Date("2026-09-23T10:00:00Z"),
    items: [item()],
    ...overrides,
  };
}

describe("bookingEmails", () => {
  it("received writes to the customer and to ops with the right links", () => {
    const [customer, ops, ...rest] = bookingEmails(
      "received",
      booking(),
      links,
    );
    assert.equal(rest.length, 0);

    assert.equal(customer!.message.to, "aina@example.com");
    assert.equal(customer!.message.subject, "Booking HT-7K3QZM received");
    assert.match(
      customer!.message.text,
      /KLIA Terminal 1 to Kuala Lumpur|Pick-up: KLIA Terminal 1/,
    );
    assert.match(customer!.message.text, /Total: RM 180\.00/);
    assert.match(
      customer!.message.text,
      /https:\/\/site\.test\/booking\/HT-7K3QZM/,
    );
    assert.match(customer!.message.text, /Sat, 3 Oct 2026, 09:30/);

    assert.equal(ops!.message.to, CONTACT.bookingEmail);
    assert.equal(ops!.message.subject, "New booking HT-7K3QZM");
    assert.match(ops!.message.text, /Phone: \+60123456789/);
    assert.match(ops!.message.text, /https:\/\/admin\.test\/bookings\/b1/);
  });

  it("escapes what the customer typed in the HTML body only", () => {
    const [customer] = bookingEmails("received", booking(), links);
    assert.match(customer!.message.html, /Nurul &lt;Aina&gt;/);
    assert.doesNotMatch(customer!.message.html, /<Aina>/);
    assert.match(customer!.message.text, /Nurul <Aina>/);
  });

  it("keys each message on the booking, the event and the write", () => {
    const keys = bookingEmails("received", booking(), links).map((e) => e.key);
    const stamp = new Date("2026-09-23T10:00:00Z").getTime();
    assert.deepEqual(keys, [
      `b1:received:${stamp}:customer`,
      `b1:received:${stamp}:ops`,
    ]);
  });

  it("confirmed goes to the customer only, with the pick-up time", () => {
    const emails = bookingEmails(
      "confirmed",
      booking({ status: "confirmed" }),
      links,
    );
    assert.equal(emails.length, 1);
    assert.equal(emails[0]!.message.subject, "Booking HT-7K3QZM confirmed");
    assert.match(emails[0]!.message.text, /Sat, 3 Oct 2026, 09:30/);
  });

  it("a customer cancel tells the customer and ops", () => {
    const emails = bookingEmails(
      "cancelled",
      booking({
        status: "cancelled",
        cancelledBy: "customer",
        items: [item({ status: "cancelled" })],
      }),
      links,
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
      booking({
        status: "cancelled",
        cancelledBy: "admin",
        items: [item({ status: "cancelled" })],
      }),
      links,
    );
    assert.equal(emails.length, 1);
    assert.match(emails[0]!.message.text, /we are sorry/);
  });

  it("a partial admin cancel lists every item with its status", () => {
    const emails = bookingEmails(
      "cancelled",
      booking({
        status: "confirmed",
        items: [
          item({ status: "confirmed" }),
          item({ id: "item2", position: 2, status: "cancelled" }),
        ],
      }),
      links,
    );
    assert.equal(emails.length, 1);
    assert.equal(emails[0]!.message.subject, "Booking HT-7K3QZM updated");
    assert.match(emails[0]!.message.text, /ITEM 1: CONFIRMED/);
    assert.match(emails[0]!.message.text, /ITEM 2: CANCELLED/);
  });
});
