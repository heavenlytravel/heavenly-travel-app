import type { Place } from "@repo/db";
import type { BookingItemWithDetails, BookingWithItems } from "@repo/db/server";
import type { BookingEmailEvent, EmailSettings } from "./booking-emails";

/**
 * A sample booking for the unit tests and the preview script: one sedan
 * from KLIA to Kuala Lumpur. Pass overrides to move it through the
 * lifecycle.
 */

export const sampleSettings: EmailSettings = {
  siteUrl: "https://site.test",
  adminUrl: "https://admin.test",
  opsTo: "ops@site.test",
  subjectPrefix: "",
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

export function sampleItem(
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
      childSeats: 1,
      flightNumber: "MH123",
      notes: null,
    },
    ...overrides,
  };
}

export function sampleBooking(
  overrides: Partial<BookingWithItems> = {},
): BookingWithItems {
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
    contactName: "Nurul Aina",
    contactPhone: "+60123456789",
    priceTotalSen: 18000,
    currency: "MYR",
    startsAt: at,
    confirmedAt: null,
    cancelledAt: null,
    cancelledBy: null,
    createdAt: at,
    updatedAt: new Date("2026-09-23T10:00:00Z"),
    items: [sampleItem()],
    ...overrides,
  };
}

/** Every message the templates can produce, one booking state per event. */
export const sampleCases: {
  name: string;
  event: BookingEmailEvent;
  booking: BookingWithItems;
}[] = [
  { name: "received", event: "received", booking: sampleBooking() },
  {
    name: "confirmed",
    event: "confirmed",
    booking: sampleBooking({
      status: "confirmed",
      items: [sampleItem({ status: "confirmed" })],
    }),
  },
  {
    name: "cancelled-by-customer",
    event: "cancelled",
    booking: sampleBooking({
      status: "cancelled",
      cancelledBy: "customer",
      items: [sampleItem({ status: "cancelled" })],
    }),
  },
  {
    name: "cancelled-by-admin",
    event: "cancelled",
    booking: sampleBooking({
      status: "cancelled",
      cancelledBy: "admin",
      items: [sampleItem({ status: "cancelled" })],
    }),
  },
  {
    name: "item-cancelled-by-admin",
    event: "cancelled",
    booking: sampleBooking({
      status: "confirmed",
      items: [
        sampleItem({ status: "confirmed" }),
        sampleItem({ id: "item2", position: 2, status: "cancelled" }),
      ],
    }),
  },
];
