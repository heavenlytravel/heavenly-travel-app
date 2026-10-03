import { BOOKING_RULES } from "./booking-rules";
import { isTripCategory, type TripCategory } from "./booking-status";
import type { Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
import { parseRinggit } from "./money";

/**
 * What the Vehicle classes screen edits and the rules it checks, pure and
 * browser-safe: the form displays the messages, the writers in
 * ./vehicle-classes apply the same checks before they write. See
 * docs/260930-ops-screens.md, "The Vehicle classes screen".
 */

/** Every editable column of `VehicleClass`. Money is sen. */
export type VehicleClassFields = {
  name: string;
  description: string;
  category: TripCategory;
  sortOrder: number;
  minPassengers: number;
  maxPassengers: number;
  luggage: string;
  baseFareSen: number;
  perKmSen: number;
  hourlyRateSen: number;
  minimumFareSen: number;
  minLeadHours: number;
  cancellationCutoffHours: number;
  minHourlyHours: number;
  isActive: boolean;
};

export type VehicleClassField = keyof VehicleClassFields;

/** How the screen and the activity log name each field. */
export const VEHICLE_CLASS_FIELD_LABELS: Record<VehicleClassField, string> = {
  name: "Name",
  description: "Description",
  category: "Category",
  sortOrder: "Sort order",
  minPassengers: "Seats from",
  maxPassengers: "Seats to",
  luggage: "Luggage",
  baseFareSen: "Base fare",
  perKmSen: "Per km",
  hourlyRateSen: "Per hour",
  minimumFareSen: "Minimum fare",
  minLeadHours: "Notice needed",
  cancellationCutoffHours: "Cancel up to",
  minHourlyHours: "Minimum hours",
  isActive: "Active",
};

/** How many a class seats, as a customer reads it: "Up to 6 passengers". */
export function seatsLabel(vehicleClass: {
  minPassengers: number;
  maxPassengers: number;
}) {
  const { minPassengers, maxPassengers } = vehicleClass;
  return minPassengers === 1
    ? `Up to ${maxPassengers} passengers`
    : `${minPassengers} to ${maxPassengers} passengers`;
}

/** The money fields, entered in ringgit under these form names. */
export const VEHICLE_CLASS_MONEY_FIELDS = {
  baseFareSen: "baseFare",
  perKmSen: "perKm",
  hourlyRateSen: "hourlyRate",
  minimumFareSen: "minimumFare",
} as const satisfies Partial<Record<VehicleClassField, string>>;

type MoneyField = keyof typeof VEHICLE_CLASS_MONEY_FIELDS;
const MONEY_FIELDS = Object.keys(VEHICLE_CLASS_MONEY_FIELDS) as MoneyField[];

const TEXT_FIELDS = ["name", "description", "luggage"] as const;
const HOUR_FIELDS = ["minLeadHours", "cancellationCutoffHours"] as const;

const isWhole = (n: number) => Number.isInteger(n);

const fail = (error: string): Change => ({ ok: false, error });

const lowerLabel = (key: VehicleClassField) =>
  VEHICLE_CLASS_FIELD_LABELS[key].toLowerCase();

/** The rules on a class's fields; a field left out is not checked. */
export function checkVehicleClassFields(
  fields: Partial<VehicleClassFields>,
): Change {
  for (const key of TEXT_FIELDS) {
    const value = fields[key];
    if (value !== undefined && value.trim() === "") {
      return fail(`Enter the ${lowerLabel(key)}.`);
    }
  }
  if (fields.category !== undefined && !isTripCategory(fields.category)) {
    return fail("Choose a category.");
  }
  if (fields.sortOrder !== undefined && !isWhole(fields.sortOrder)) {
    return fail("The sort order is a whole number.");
  }
  for (const key of ["minPassengers", "maxPassengers"] as const) {
    const value = fields[key];
    if (value !== undefined && (!isWhole(value) || value < 1)) {
      return fail("Seats are whole numbers from 1.");
    }
  }
  if (
    fields.minPassengers !== undefined &&
    fields.maxPassengers !== undefined &&
    fields.maxPassengers < fields.minPassengers
  ) {
    return fail("Seats to is at least seats from.");
  }
  for (const key of MONEY_FIELDS) {
    const value = fields[key];
    if (value !== undefined && (!isWhole(value) || value < 0)) {
      return fail(
        `Enter the ${lowerLabel(key)} in RM, with at most two decimals.`,
      );
    }
  }
  for (const key of HOUR_FIELDS) {
    const value = fields[key];
    if (value !== undefined && (!isWhole(value) || value < 0)) {
      return fail(
        `${VEHICLE_CLASS_FIELD_LABELS[key]} is a whole number of hours, 0 or more.`,
      );
    }
  }
  if (fields.minHourlyHours !== undefined) {
    const { hourlyFloorHours, maxHourlyHours } = BOOKING_RULES;
    const value = fields.minHourlyHours;
    if (!isWhole(value) || value < hourlyFloorHours || value > maxHourlyHours) {
      return fail(
        `Minimum hours is a whole number between ${hourlyFloorHours} and ${maxHourlyHours}.`,
      );
    }
  }
  return { ok: true };
}

/**
 * The class form's values, read and checked. Money arrives in ringgit under
 * the `VEHICLE_CLASS_MONEY_FIELDS` names; `isActive` is a checkbox.
 */
export function parseVehicleClassFields(
  values: Record<string, unknown>,
): Parsed<VehicleClassFields> {
  const money = {} as Record<MoneyField, number>;
  for (const key of MONEY_FIELDS) {
    const sen = parseRinggit(textOf(values[VEHICLE_CLASS_MONEY_FIELDS[key]]));
    if (sen === null) {
      return {
        ok: false,
        error: `Enter the ${lowerLabel(key)} in RM, with at most two decimals.`,
      };
    }
    money[key] = sen;
  }
  const category = textOf(values.category);
  if (!isTripCategory(category)) {
    return { ok: false, error: "Choose a category." };
  }

  const fields: VehicleClassFields = {
    name: textOf(values.name),
    description: textOf(values.description),
    category,
    sortOrder: numberOf(values.sortOrder),
    minPassengers: numberOf(values.minPassengers),
    maxPassengers: numberOf(values.maxPassengers),
    luggage: textOf(values.luggage),
    ...money,
    minLeadHours: numberOf(values.minLeadHours),
    cancellationCutoffHours: numberOf(values.cancellationCutoffHours),
    minHourlyHours: numberOf(values.minHourlyHours),
    isActive: flagOf(values.isActive),
  };
  const check = checkVehicleClassFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
