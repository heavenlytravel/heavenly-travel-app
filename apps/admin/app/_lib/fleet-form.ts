import { TRIP_CATEGORIES, TRIP_CATEGORY_LABELS } from "@repo/db";
import type { ClassOption } from "@repo/db/server";
import type { SelectGroup } from "@repo/ui/select";

/**
 * What the vehicle and driver forms share: the catalogue's classes as
 * they pick them, a vehicle's class and a driver's classes. Browser-safe.
 */

/** The classes under their category, car with driver first; a class off in the catalogue says so. */
export function classGroups(
  classes: readonly ClassOption[],
): SelectGroup[] {
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
