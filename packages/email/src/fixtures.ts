import { priceTrip, withModelChoice, type Place } from "@repo/db";
import type { BookingItemWithDetails, BookingWithItems } from "@repo/db/server";
import type { BookingEmailEvent, EmailSettings } from "./booking-emails";

/**
 * A sample booking for the unit tests and the preview script: a Sedan VIP
 * from KLIA to Kuala Lumpur, its Toyota Camry chosen for 10% more, and a
 * Coach VIP by the hour to put in its place. Each carries the receipt its
 * price comes from. Pass overrides to move it through the lifecycle.
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

/** The sedan's receipt: the grid's KLIA to Kuala Lumpur, and the Camry chosen at 10%. */
const sedanPrice = withModelChoice(
  priceTrip({
    trip: { mode: "oneway", distanceKm: 55.2 },
    rates: { perKmSen: 250, hourlyRateSen: 8000 },
    route: { fromZone: "KLIA", toZone: "Kuala Lumpur", rateSen: 16800 },
  }),
  "Toyota Camry",
  { percent: 10, flatSen: null },
);

/** The coach's receipt: 8 hours, any coach of the class. */
const coachPrice = priceTrip({
  trip: { mode: "hourly", hours: 8 },
  rates: { perKmSen: 0, hourlyRateSen: 18000 },
});

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
    locationId: "loc1",
    location: { id: "loc1", name: "Klang Valley", slug: "klang-valley" },
    priceTotalSen: sedanPrice.totalSen,
    priceBreakdown: sedanPrice,
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
      vehicleClassName: "Sedan VIP",
      vehicleModelId: "vm1",
      vehicleModelName: "Toyota Camry",
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

/** A coach item: a Coach VIP for 8 hours from Kuala Lumpur, any of its models, no child seats. */
export function sampleCoachItem(
  overrides: Partial<BookingItemWithDetails> = {},
): BookingItemWithDetails {
  const car = sampleItem();
  return {
    ...car,
    endsAt: new Date(at.getTime() + 8 * 60 * 60 * 1000),
    cancellationCutoffHours: 48,
    priceTotalSen: coachPrice.totalSen,
    priceBreakdown: coachPrice,
    tripDetails: {
      ...car.tripDetails!,
      vehicleClassId: "vc4",
      vehicleClassName: "Coach VIP",
      vehicleModelId: null,
      vehicleModelName: null,
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
    priceTotalSen: sedanPrice.totalSen,
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
      priceTotalSen: coachPrice.totalSen,
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
