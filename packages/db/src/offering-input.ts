import type { Change } from "./change";
import { flagOf, textOf, type Parsed } from "./fields";
import { parseRinggit } from "./money";
import type { TripRates } from "./pricing";

/**
 * What a location's Vehicle classes tab edits of an offering and the rules
 * it checks, pure and browser-safe: the form displays the messages, the
 * writers in ./offerings apply the same checks before they write. The
 * class's own fields are ./vehicle-class-input. See
 * docs/261015-locations-as-operation-areas.md, "Vehicle classes".
 */

/** The editable columns of `LocationVehicleClass`. Money is sen. */
export type OfferingFields = TripRates & { isActive: boolean };

export type OfferingField = keyof OfferingFields;

/** How the screen and the activity log name each field. */
export const OFFERING_FIELD_LABELS: Record<OfferingField, string> = {
  baseFareSen: "Base fare",
  perKmSen: "Per km",
  hourlyRateSen: "Per hour",
  minimumFareSen: "Minimum fare",
  isActive: "On sale",
};

/** The money fields, entered in ringgit under these form names. */
export const OFFERING_MONEY_FIELDS = {
  baseFareSen: "baseFare",
  perKmSen: "perKm",
  hourlyRateSen: "hourlyRate",
  minimumFareSen: "minimumFare",
} as const satisfies Record<keyof TripRates, string>;

const MONEY_FIELDS = Object.keys(OFFERING_MONEY_FIELDS) as (keyof TripRates)[];

const fail = (error: string): Change => ({ ok: false, error });

const lowerLabel = (key: OfferingField) =>
  OFFERING_FIELD_LABELS[key].toLowerCase();

/** The rules on an offering's fields; a field left out is not checked. */
export function checkOfferingFields(fields: Partial<OfferingFields>): Change {
  for (const key of MONEY_FIELDS) {
    const value = fields[key];
    if (value !== undefined && (!Number.isInteger(value) || value < 0)) {
      return fail(
        `Enter the ${lowerLabel(key)} in RM, with at most two decimals.`,
      );
    }
  }
  return { ok: true };
}

/**
 * The offering form's values, read and checked. Money arrives in ringgit
 * under the `OFFERING_MONEY_FIELDS` names; `isActive` is a checkbox.
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
    isActive: flagOf(values.isActive),
  };
  const check = checkOfferingFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
