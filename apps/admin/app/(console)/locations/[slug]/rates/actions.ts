"use server";

import {
  isDropoffRule,
  parseOddHoursFields,
  parseRateCells,
  setDropoffRule,
  setOddHours,
  setZoneRates,
  textOf,
} from "@repo/db/server";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  FORBIDDEN,
  stateOf,
  type ActionState,
} from "../../../../_lib/action-state";
import { revalidateLocation } from "../../_lib/revalidate";

/**
 * The Rates tab's actions: the grid, the odd-hours surcharge and the
 * drop-off rule. Each checks `coverage.manage` again, passes the admin as
 * the actor and lets the writer in @repo/db check the rest. Arguments
 * passed directly, not through a form, are checked for their type here:
 * an action is reachable by direct POST. Nothing here is public, so the
 * customer site is not refreshed: the quote reads the rows.
 */

/** The whole grid as the form holds it: every cell, a price or empty. */
export async function setZoneRatesAction(
  locationId: string,
  rows: unknown,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string") return { error: "Missing location." };
  const parsed = parseRateCells(rows);
  if (!parsed.ok) return { error: parsed.error };
  const result = await setZoneRates(actorOf(admin), locationId, parsed.value);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

export async function setOddHoursAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const locationId = textOf(formData.get("locationId"));
  if (!locationId) return { error: "Missing location." };
  const parsed = parseOddHoursFields(Object.fromEntries(formData));
  if (!parsed.ok) return { error: parsed.error };
  const result = await setOddHours(actorOf(admin), locationId, parsed.value);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}

export async function setDropoffRuleAction(
  locationId: string,
  rule: unknown,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string" || !isDropoffRule(rule)) {
    return { error: "Choose a rule." };
  }
  const result = await setDropoffRule(actorOf(admin), locationId, rule);
  if (result.ok) revalidateLocation();
  return stateOf(result);
}
