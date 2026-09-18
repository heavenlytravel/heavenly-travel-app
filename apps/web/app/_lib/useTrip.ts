"use client";

import { useState } from "react";
import { EMPTY_TRIP, whatsappHrefFor, type Trip } from "./trip";

/**
 * One piece of state for every booking form on the landing designs. The
 * forms look different (tabbed box, booking card, side panel) but capture the
 * same trip and hand it to WhatsApp as a pre-written message.
 */
export function useTrip(initial: Partial<Trip> = {}) {
  const [trip, setTrip] = useState<Trip>({ ...EMPTY_TRIP, ...initial });
  const set = <K extends keyof Trip>(key: K, value: Trip[K]) =>
    setTrip((t) => ({ ...t, [key]: value }));
  return { trip, set, whatsappHref: whatsappHrefFor(trip) };
}
