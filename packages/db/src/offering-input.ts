import { BOOKING_RULES, type OfferingRules } from "./booking-rules";
import type { Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
import { parseRinggit } from "./money";
import type { TripRates } from "./pricing";

/**
 * What a location's Vehicle classes tab edits of an offering and the rules
 * it checks, pure and browser-safe: the form displays the messages, the
 * writers in ./offerings apply the same checks before they write. The
 * class's own fields are ./vehicle-class-input. See
 * docs/261015-locations-as-operation-areas.md, "Vehicle classes", and
 * docs/261018-location-work-and-class-catalogue.md for the rules.
 */

/** The editable columns of `LocationVehicleClass`. Money is sen. */
export type OfferingFields = TripRates & OfferingRules & { isActive: boolean };

export type OfferingField = keyof OfferingFields;

/** How the screen and the activity log name each field. */
export const OFFERING_FIELD_LABELS: Record<OfferingField, string> = {
  baseFareSen: "Base fare",
  perKmSen: "Per km",
  hourlyRateSen: "Per hour",
  minimumFareSen: "Minimum fare",
  minLeadHours: "Notice needed",
  cancellationCutoffHours: "Cancel up to",
  minHourlyHours: "Minimum hours",
  isActive: "On sale",
};

/** The money fields, entered in ringgit under these form names. */
export const OFFERING_MONEY_FIELDS = {
  baseFareSen: "baseFare",
  perKmSen: "perKm",
  hourlyRateSen: "hourlyRate",
  minimumFareSen: "minimumFare",
} as const satisfies Record<keyof TripRates, string>;

/** The three rules, in the order the form shows them; entered in hours under their own names. */
export const OFFERING_RULE_FIELDS = [
  "minLeadHours",
  "cancellationCutoffHours",
  "minHourlyHours",
] as const satisfies readonly (keyof OfferingRules)[];

const MONEY_FIELDS = Object.keys(OFFERING_MONEY_FIELDS) as (keyof TripRates)[];

/** The rules counted from 0; the minimum hours has its own range. */
const HOUR_FIELDS = ["minLeadHours", "cancellationCutoffHours"] as const;

const fail = (error: string): Change => ({ ok: false, error });

const lowerLabel = (key: OfferingField) =>
  OFFERING_FIELD_LABELS[key].toLowerCase();

const isWhole = (n: number) => Number.isInteger(n);

/** The rules on an offering's fields; a field left out is not checked. */
export function checkOfferingFields(fields: Partial<OfferingFields>): Change {
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
        `${OFFERING_FIELD_LABELS[key]} is a whole number of hours, 0 or more.`,
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
 * The offering form's values, read and checked. Money arrives in ringgit
 * under the `OFFERING_MONEY_FIELDS` names, the rules in hours under their
 * own; `isActive` is a checkbox.
 */
export function parseOfferingFields(
  values: Record<string, unknown>,
): Parsed<OfferingFields> {
  const money = {} as Record<keyof TripRates, number>;
  for (const key of MONEY_FIELDS) {
    const sen = parseRinggit(textOf(values[OFFERING_MONEY_FIELDS[key]]));
    if (sen === null) {
      return {
        ok: false,
        error: `Enter the ${lowerLabel(key)} in RM, with at most two decimals.`,
      };
    }
    money[key] = sen;
  }
  const fields: OfferingFields = {
    ...money,
    minLeadHours: numberOf(values.minLeadHours),
    cancellationCutoffHours: numberOf(values.cancellationCutoffHours),
    minHourlyHours: numberOf(values.minHourlyHours),
    isActive: flagOf(values.isActive),
  };
  const check = checkOfferingFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
