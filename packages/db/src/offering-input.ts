import { BOOKING_RULES, type OfferingRules } from "./booking-rules";
import { refuse, type Change } from "./change";
import { flagOf, numberOf, textOf, type Parsed } from "./fields";
import { parseRinggit } from "./money";
import type { TripRates } from "./pricing";
import {
  chargeOf,
  checkCharge,
  parseCharge,
  type SurchargeCharge,
} from "./rates-input";

/**
 * What a location's Vehicle classes tab edits of an offering and the rules
 * it checks, pure and browser-safe: the form displays the messages, the
 * writers in ./offerings apply the same checks before they write. The
 * class's own fields are ./vehicle-class-input. See
 * docs/261015-locations-as-operation-areas.md, "Vehicle classes", and
 * docs/261018-location-work-and-class-catalogue.md for the rules.
 */

/**
 * What choosing a model costs at the location, as the offering stores it:
 * a percentage or a flat amount in sen, at most one of the two; both null
 * when customers there cannot choose.
 */
export type ModelChoiceColumns = {
  modelChoicePercent: number | null;
  modelChoiceFlatSen: number | null;
};

/** The editable columns of `LocationVehicleClass`. Money is sen. */
export type OfferingFields = TripRates &
  OfferingRules &
  ModelChoiceColumns & { isActive: boolean };

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
  modelChoicePercent: "Charge to choose a model",
  modelChoiceFlatSen: "Charge to choose a model",
  isActive: "On sale",
};

/** The form names of the charge to choose a model: a percentage or a flat amount, and the amount. */
export const MODEL_CHOICE_FIELDS = {
  kind: "modelChoiceKind",
  amount: "modelChoiceAmount",
} as const;

const MODEL_CHOICE = "the charge to choose a model";

/**
 * What a customer pays to choose the model they ride in at the location,
 * as the pricing reads it; null when they cannot choose there. Choosing
 * needs two models or more with a vehicle in service there, which the
 * quote checks.
 */
export function modelChoiceOf(
  offering: ModelChoiceColumns,
): SurchargeCharge | null {
  return chargeOf(offering.modelChoicePercent, offering.modelChoiceFlatSen);
}

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

const lowerLabel = (key: OfferingField) =>
  OFFERING_FIELD_LABELS[key].toLowerCase();

const isWhole = (n: number) => Number.isInteger(n);

/** The rules on an offering's fields; a field left out is not checked. */
export function checkOfferingFields(fields: Partial<OfferingFields>): Change {
  for (const key of MONEY_FIELDS) {
    const value = fields[key];
    if (value !== undefined && (!isWhole(value) || value < 0)) {
      return refuse(
        `Enter the ${lowerLabel(key)} in RM, with at most two decimals.`,
        OFFERING_MONEY_FIELDS[key],
      );
    }
  }
  for (const key of HOUR_FIELDS) {
    const value = fields[key];
    if (value !== undefined && (!isWhole(value) || value < 0)) {
      return refuse(
        `${OFFERING_FIELD_LABELS[key]} is a whole number of hours, 0 or more.`,
        key,
      );
    }
  }
  if (fields.minHourlyHours !== undefined) {
    const { hourlyFloorHours, maxHourlyHours } = BOOKING_RULES;
    const value = fields.minHourlyHours;
    if (!isWhole(value) || value < hourlyFloorHours || value > maxHourlyHours) {
      return refuse(
        `Minimum hours is a whole number between ${hourlyFloorHours} and ${maxHourlyHours}.`,
        "minHourlyHours",
      );
    }
  }
  const { modelChoicePercent: percent, modelChoiceFlatSen: flatSen } = fields;
  if (percent != null && flatSen != null) {
    return refuse(
      "Charge a percentage or an amount to choose a model, not both.",
      MODEL_CHOICE_FIELDS.amount,
    );
  }
  const modelChoice = chargeOf(percent ?? null, flatSen ?? null);
  if (modelChoice) {
    const check = checkCharge(
      modelChoice,
      MODEL_CHOICE,
      MODEL_CHOICE_FIELDS.amount,
    );
    if (!check.ok) return check;
  }
  return { ok: true };
}

/** The charge to choose a model as the form posts it; an empty amount is none. */
function modelChoiceColumnsOf(
  values: Record<string, unknown>,
): Parsed<ModelChoiceColumns> {
  const amount = textOf(values[MODEL_CHOICE_FIELDS.amount]);
  if (amount === "") {
    return {
      ok: true,
      value: { modelChoicePercent: null, modelChoiceFlatSen: null },
    };
  }
  const charge = parseCharge(
    values[MODEL_CHOICE_FIELDS.kind],
    amount,
    MODEL_CHOICE,
    MODEL_CHOICE_FIELDS.amount,
  );
  if (!charge.ok) return charge;
  return {
    ok: true,
    value: {
      modelChoicePercent: charge.value.percent,
      modelChoiceFlatSen: charge.value.flatSen,
    },
  };
}

/**
 * The offering form's values, read and checked. Money arrives in ringgit
 * under the `OFFERING_MONEY_FIELDS` names, the rules in hours under their
 * own, the charge to choose a model under `MODEL_CHOICE_FIELDS`;
 * `isActive` is a checkbox.
 */
export function parseOfferingFields(
  values: Record<string, unknown>,
): Parsed<OfferingFields> {
  const money = {} as Record<keyof TripRates, number>;
  for (const key of MONEY_FIELDS) {
    const sen = parseRinggit(textOf(values[OFFERING_MONEY_FIELDS[key]]));
    if (sen === null) {
      return refuse(
        `Enter the ${lowerLabel(key)} in RM, with at most two decimals.`,
        OFFERING_MONEY_FIELDS[key],
      );
    }
    money[key] = sen;
  }
  const modelChoice = modelChoiceColumnsOf(values);
  if (!modelChoice.ok) return modelChoice;
  const fields: OfferingFields = {
    ...money,
    minLeadHours: numberOf(values.minLeadHours),
    cancellationCutoffHours: numberOf(values.cancellationCutoffHours),
    minHourlyHours: numberOf(values.minHourlyHours),
    ...modelChoice.value,
    isActive: flagOf(values.isActive),
  };
  const check = checkOfferingFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
