import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  type TripCategory,
} from "./booking-status";
import { db } from "./client";
import type { LocationState } from "./location-input";

/** A service a live location sells, with its classes: a row of the "Open now" board. */
export type VendorOpening = {
  location: string;
  category: TripCategory;
  categoryLabel: string;
  /** The classes on sale there, in the catalogue's order. */
  classes: string[];
};

/**
 * Where Connect takes vendors now: each live location's services, with the
 * classes it sells. Connect's landing page draws its "Open now" board from
 * it, so the board is never written by hand and never out of date.
 */
export async function listVendorOpenings(): Promise<VendorOpening[]> {
  const rows = await db.locationVehicleClass.findMany({
    where: {
      isActive: true,
      vehicleClass: { isActive: true },
      location: { state: "live" satisfies LocationState },
    },
    select: {
      location: { select: { name: true } },
      vehicleClass: {
        select: { name: true, category: true, sortOrder: true },
      },
    },
    orderBy: [
      { location: { name: "asc" } },
      { vehicleClass: { sortOrder: "asc" } },
    ],
  });
  const openings = new Map<string, VendorOpening>();
  for (const row of rows) {
    const category = TRIP_CATEGORIES.find(
      (entry) => entry === row.vehicleClass.category,
    );
    if (!category) continue;
    const key = `${row.location.name}\u0000${category}`;
    const opening = openings.get(key) ?? {
      location: row.location.name,
      category,
      categoryLabel: TRIP_CATEGORY_LABELS[category],
      classes: [],
    };
    opening.classes.push(row.vehicleClass.name);
    openings.set(key, opening);
  }
  return [...openings.values()];
}
