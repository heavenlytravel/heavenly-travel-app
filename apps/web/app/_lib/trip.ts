"use client";

import { useState } from "react";
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
  passengers: string;
};

const EMPTY: Trip = {
  service: "car",
  from: "",
  to: "",
  date: "",
  passengers: "",
};

/**
 * One piece of state for every search form on the reimagined pages. The
 * forms look different (pill, tabbed box, outlined bar) but capture the same
 * trip and hand it to WhatsApp as a pre-written message.
 */
export function useTrip(initial: Partial<Trip> = {}) {
  const [trip, setTrip] = useState<Trip>({ ...EMPTY, ...initial });
  const set = <K extends keyof Trip>(key: K, value: Trip[K]) =>
    setTrip((t) => ({ ...t, [key]: value }));
  return { trip, set, whatsappHref: whatsappHrefFor(trip) };
}

export function whatsappHrefFor(trip: Trip) {
  const lines = [
    `Hi Heavenly Travel, I'd like a quote for a ${SERVICE_LABELS[trip.service].toLowerCase()}.`,
    trip.from && `From: ${trip.from}`,
    trip.to && `To: ${trip.to}`,
    trip.date && `Date: ${trip.date}`,
    trip.passengers && `Passengers: ${trip.passengers}`,
  ].filter(Boolean);
  return `${WHATSAPP_HREF}?text=${encodeURIComponent(lines.join("\n"))}`;
}
