import type { Change } from "./change";
import { textOf, numberOf, type Parsed } from "./fields";
import { formatMyr, toSen } from "./money";

/**
 * What the Zones screen edits and the rules it checks, pure and
 * browser-safe: the forms display the messages, the writers in ./zones
 * apply the same checks before they write. See docs/260930-ops-screens.md,
 * "The Zones screen".
 */

/** The multiplier applies to every price with a pickup in the zone. */
export const ZONE_MULTIPLIER = { min: 0.5, max: 3 } as const;

export type ZoneFields = { name: string; multiplier: number };

/** A district as `ZoneDistrict` stores it: the town as Google spells it, and its state. */
export type ZoneDistrictFields = { state: string; district: string };

/** 1.2 -> "×1.20". The screen says "no change" for 1 itself. */
export function formatMultiplier(multiplier: number) {
  return `×${multiplier.toFixed(2)}`;
}

/** "A RM 100 trip becomes RM 120.00": the multiplier's effect, for the form. */
export function multiplierEffect(multiplier: number) {
  return `A RM 100 trip becomes ${formatMyr(toSen(100 * multiplier))}`;
}

const hasTwoDecimals = (n: number) =>
  Math.abs(n * 100 - Math.round(n * 100)) < 1e-9;

/** The rules on a zone's editable fields; a field left out is not checked. */
export function checkZoneFields(fields: Partial<ZoneFields>): Change {
  if (fields.name !== undefined && fields.name.trim() === "") {
    return { ok: false, error: "Enter a name." };
  }
  if (fields.multiplier !== undefined) {
    const { min, max } = ZONE_MULTIPLIER;
    const m = fields.multiplier;
    if (!Number.isFinite(m) || m < min || m > max) {
      return {
        ok: false,
        error: `The multiplier is a number between ${min} and ${max}.`,
      };
    }
    if (!hasTwoDecimals(m)) {
      return { ok: false, error: "The multiplier has at most two decimals." };
    }
  }
  return { ok: true };
}

/** The zone form's values, `name` and `multiplier`, read and checked. */
export function parseZoneFields(
  values: Record<string, unknown>,
): Parsed<ZoneFields> {
  const fields = {
    name: textOf(values.name),
    multiplier: numberOf(values.multiplier),
  };
  const check = checkZoneFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}

export function checkZoneDistrictFields(fields: ZoneDistrictFields): Change {
  if (fields.district.trim() === "") {
    return { ok: false, error: "Enter the town name as Google spells it." };
  }
  if (fields.state.trim() === "") {
    return { ok: false, error: "Enter the state." };
  }
  return { ok: true };
}

/** The add-district form's values, `district` and `state`, read and checked. */
export function parseZoneDistrictFields(
  values: Record<string, unknown>,
): Parsed<ZoneDistrictFields> {
  const fields = {
    state: textOf(values.state),
    district: textOf(values.district),
  };
  const check = checkZoneDistrictFields(fields);
  return check.ok ? { ok: true, value: fields } : check;
}
