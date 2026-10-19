import { TRIP_CATEGORIES, TRIP_CATEGORY_LABELS } from "@repo/db";
import type { SelectGroup } from "@repo/ui/select";

/**
 * What the vehicle and driver forms share: the catalogue's classes as
 * they pick them, a vehicle's class and a driver's classes. Browser-safe.
 */

/** A class a vehicle can be of or a driver may drive. Plain data, sent to the browser. */
export type FleetClassOption = {
  id: string;
  name: string;
  category: string;
  isActive: boolean;
};

/** The catalogue's classes, in its order, as the fleet forms take them. */
export function fleetClassOptions(
  classes: readonly FleetClassOption[],
): FleetClassOption[] {
  return classes.map(({ id, name, category, isActive }) => ({
    id,
    name,
    category,
    isActive,
  }));
}

/** The classes under their category, car with driver first; a class off in the catalogue says so. */
export function classGroups(
  classes: readonly FleetClassOption[],
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
