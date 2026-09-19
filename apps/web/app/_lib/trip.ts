import { WHATSAPP_HREF } from "./content";

export type ServiceKey = "car" | "coach" | "transfer" | "tour";

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  car: "Car with driver",
  coach: "Coach charter",
  transfer: "Airport transfer",
  tour: "Day tour",
};

export type Trip = {
  service: ServiceKey;
  from: string;
  to: string;
  date: string;
  /** Pick-up time, HH:MM. */
  time: string;
  /** Hours booked when the driver is hired by the hour; empty for a one-way trip. */
  hours: string;
  passengers: string;
};

export const EMPTY_TRIP: Trip = {
  service: "car",
  from: "",
  to: "",
  date: "",
  time: "",
  hours: "",
  passengers: "",
};

export function whatsappHrefFor(trip: Trip) {
  const lines = [
    `Hi Heavenly Travel, I'd like a quote for a ${SERVICE_LABELS[trip.service].toLowerCase()}.`,
    trip.from && `From: ${trip.from}`,
    trip.to && `To: ${trip.to}`,
    trip.date && `Date: ${trip.date}`,
    trip.time && `Pick-up time: ${trip.time}`,
    trip.hours && `Duration: ${trip.hours} hours, driver stays with us`,
    trip.passengers && `Passengers: ${trip.passengers}`,
  ].filter(Boolean);
  return `${WHATSAPP_HREF}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/**
 * The two main products. Transfers and tours are ways of using one of them,
 * so forms that lead with the product offer only these.
 */
export const MAIN_SERVICES = ["car", "coach"] as const;
export type MainService = (typeof MAIN_SERVICES)[number];

export const MAIN_SERVICE_NOTES: Record<MainService, string> = {
  car: "Sedan, MPV or van, up to 10 seats",
  coach: "Minibus or coach, 26 to 44 seats",
};

/** Which of the two products a trip falls under; anything not a coach is a car. */
export function mainServiceOf(service: ServiceKey): MainService {
  return service === "coach" ? "coach" : "car";
}
