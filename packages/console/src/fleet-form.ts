import { TRIP_CATEGORIES, TRIP_CATEGORY_LABELS } from "@repo/db";
import type { ClassOption } from "@repo/db/server";
import type { SelectGroup } from "@repo/ui/select";

/**
 * What the vehicle and driver forms share with each other and with their
 * actions: the catalogue's classes as they pick them, a vehicle's class
 * and a driver's classes, and the scope a form was opened in.
 * Browser-safe.
 */

/** The field a vehicle or driver form posts with the scope it was opened in: a slug, or `~`. */
export const SCOPE_FIELD = "scope";

/**
 * The card of a form that holds the expiry dates, its id and its name:
 * the banner over a record with one due links down to it.
 */
export const DATES_CARDS = {
  vehicles: { id: "documents", name: "Documents" },
  drivers: { id: "licences", name: "Licences" },
} as const;

/** The classes under their category, car with driver first; a class off in the catalogue says so. */
export function classGroups(classes: readonly ClassOption[]): SelectGroup[] {
  return TRIP_CATEGORIES.flatMap((category) => {
    const options = classes
      .filter((c) => c.category === category)
      .map((c) => ({
        value: c.id,
        label: c.isActive ? c.name : `${c.name} (off)`,
      }));
    return options.length > 0
      ? [{ label: TRIP_CATEGORY_LABELS[category], options }]
      : [];
  });
}
