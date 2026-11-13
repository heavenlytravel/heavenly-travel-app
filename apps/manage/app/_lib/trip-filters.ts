import {
  isTripCategory,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  TRIP_MODE_LABELS,
  TRIP_MODES,
  type TripCategory,
  type TripMode,
} from "@repo/db";
import type { FilterGroup } from "../_components/ListFilters";

/**
 * The Filters about the trip itself, one copy for Bookings and Assign: the
 * service (car with driver or coach charter), the vehicle class, narrowed
 * to the service chosen, and the kind of trip (one-way or hourly). Each
 * list reads them from its address and matches them its own way.
 */

/** A vehicle class as the Filters offer it. */
export type FilterClass = { id: string; name: string; category: string };

/** The service an address names; anything else is none. */
export function serviceOf(value: unknown): TripCategory | undefined {
  return isTripCategory(value) ? value : undefined;
}

/**
 * The class in force: one of those offered, of the service in force when
 * there is one. A class no longer offered, or of the other service, is no
 * filter, so choosing the other service never leaves an empty list.
 */
export function classIn(
  classes: readonly FilterClass[],
  classId: string | undefined,
  service: TripCategory | undefined,
): string | undefined {
  const found = classes.find((c) => c.id === classId);
  return found && (!service || found.category === service)
    ? found.id
    : undefined;
}

/** The service, the class and the kind of trip, as the Filters panel groups them. */
export function tripFilterGroups({
  classes,
  service,
  classId,
  trip,
}: {
  classes: readonly FilterClass[];
  service: TripCategory | undefined;
  classId: string | undefined;
  trip: TripMode | undefined;
}): FilterGroup[] {
  return [
    {
      param: "service",
      label: "Service",
      value: service ?? "",
      options: TRIP_CATEGORIES.map((value) => ({
        value,
        label: TRIP_CATEGORY_LABELS[value],
      })),
    },
    {
      param: "class",
      label: "Vehicle Class",
      value: classId ?? "",
      options: classes
        .filter((c) => !service || c.category === service)
        .map((c) => ({ value: c.id, label: c.name })),
    },
    {
      param: "trip",
      label: "Trip Type",
      value: trip ?? "",
      options: TRIP_MODES.map((value) => ({
        value,
        label: TRIP_MODE_LABELS[value],
      })),
    },
  ];
}
