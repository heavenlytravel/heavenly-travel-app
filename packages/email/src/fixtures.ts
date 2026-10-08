import type { Place } from "@repo/db";
import type { BookingItemWithDetails, BookingWithItems } from "@repo/db/server";
import type { BookingEmailEvent, EmailSettings } from "./booking-emails";

/**
 * A sample booking for the unit tests and the preview script: one sedan
 * from KLIA to Kuala Lumpur, and a minibus by the hour to put in its place.
 * Pass overrides to move it through the lifecycle.
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
    product: "transportation",
    status: "received",
    startsAt: at,
    endsAt: null,
    cancellationCutoffHours: 24,
    districtCode: "sepang",
    district: { code: "sepang", name: "Sepang", state: { name: "Selangor" } },
    priceTotalSen: 18000,
    priceBreakdown: {},
    priceOverrideSen: null,
    priceOverrideReason: null,
    confirmedAt: null,
    cancelledAt: null,
    createdAt: at,
    updatedAt: at,
    tripDetails: {
      id: "d1",
      itemId: "item1",
      vehicleClassId: "vc1",
      vehicleClassName: "Executive sedan",
      vehicleClassCategory: "car-with-driver",
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

/** A coach item: a minibus for 8 hours from Kuala Lumpur, no child seats. */
export function sampleCoachItem(
  overrides: Partial<BookingItemWithDetails> = {},
): BookingItemWithDetails {
  const car = sampleItem();
  return {
    ...car,
    endsAt: new Date(at.getTime() + 8 * 60 * 60 * 1000),
    cancellationCutoffHours: 48,
    priceTotalSen: 144000,
    tripDetails: {
      ...car.tripDetails!,
      vehicleClassId: "vc4",
      vehicleClassName: "Minibus",
      vehicleClassCategory: "coach-charter",
      mode: "hourly",
      pickupPlace: kl,
      dropoffPlace: null,
      hours: 8,
      distanceKm: null,
      passengers: 20,
      childSeats: 0,
      flightNumber: null,
      notes: "Company outing, two stops on the way.",
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
    contactEmail: "aina@example.com",
    createdIp: null,
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
    name: "received-guest",
    event: "received",
    booking: sampleBooking({ userId: null, user: null }),
  },
  {
    name: "received-coach",
    event: "received",
    booking: sampleBooking({
      priceTotalSen: 144000,
      items: [sampleCoachItem()],
    }),
  },
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
        sampleCoachItem({ id: "item2", position: 2, status: "cancelled" }),
      ],
    }),
  },
  {
    name: "amended",
    event: "amended",
    booking: sampleBooking({
      status: "confirmed",
      priceTotalSen: 21000,
      items: [sampleItem({ status: "confirmed", priceTotalSen: 21000 })],
    }),
  },
];
