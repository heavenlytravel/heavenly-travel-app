import type { TripCategory } from "@repo/db";

/**
 * What the manual booking form and its actions agree on. The trip's input
 * names are `TRIP_PARAM` and `TRIP_OPTION_FIELDS` in @repo/db, the same
 * names the website's URLs carry; the override's are
 * `PRICE_OVERRIDE_FIELDS`. Only the category and the customer block are
 * this form's own. Browser-safe.
 */

export const CATEGORY_FIELD = "category";

export const CONTACT_FIELDS = {
  name: "name",
  phone: "phone",
  email: "email",
} as const;

/** One class as priced for the trip. Plain data, sent to the browser. */
export type ClassQuoteView = {
  id: string;
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  totalSen: number;
  /** Why the class cannot take this trip, or null when it can. */
  unavailable: string | null;
};

/** What "Get prices" answers: the trip as resolved and every class priced. */
export type TripQuoteView =
  | {
      ok: true;
      category: TripCategory;
      pickup: string;
      dropoff: string | null;
      /** As people read it: "Sat, 3 Oct 2026, 09:30". */
      startsAt: string;
      hours: number | null;
      distanceKm: number | null;
      /** "Petaling, Selangor" */
      district: string;
      multiplier: number;
      classes: ClassQuoteView[];
    }
  | { ok: false; error: string };
