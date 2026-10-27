import { TRIP_PARAM } from "@repo/db";

/**
 * The confirm form's field names, shared by the form and its action. The
 * trips travel as "item1.mode", "item1.pickup" (`tripItemField`), each with
 * the price the page showed for it; the vehicle, the group and what the
 * drivers need are once for the booking, under the trip parameters' own
 * names where they have one. The honeypot is named like a real field so a
 * bot fills it; people never see it. See docs/261008-guest-booking.md,
 * "Abuse", and docs/261027-multi-trip-booking.md.
 */
export const CONFIRM_FIELDS = {
  category: "category",
  vehicleClass: TRIP_PARAM.vehicleClass,
  vehicleModel: TRIP_PARAM.vehicleModel,
  passengers: TRIP_PARAM.passengers,
  /** One per trip: "item2.shownSen". */
  shownSen: "shownSen",
  arrivingFlight: "arrivingFlight",
  departingFlight: "departingFlight",
  notes: TRIP_PARAM.notes,
  name: "name",
  phone: "phone",
  email: "email",
  honeypot: "fax",
} as const;
