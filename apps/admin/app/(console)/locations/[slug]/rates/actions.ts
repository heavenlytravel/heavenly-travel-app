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
  type ActionState,
  FORBIDDEN,
  refusalOf,
  STALE,
  stateOf,
} from "../../../../_lib/action-state";
import { refreshLocationAfter } from "../../../../_lib/site";
import { revalidateLocation } from "../../_lib/revalidate";

/**
 * The Rates tab's actions: the grid, the odd-hours surcharge and the
 * drop-off rule. Each checks `coverage.manage` again, passes the admin as
 * the actor and lets the writer in @repo/db check the rest. Arguments
 * passed directly, not through a form, are checked for their type here:
 * an action is reachable by direct POST. The grid and the drop-off rule
 * decide where the search card on the location's pages lets a trip end,
 * so they refresh those pages on the customer site; the quote reads the
 * rows, and the surcharge shows nowhere else.
 */

/** The whole grid as the form holds it: every cell, a price or empty. */
export async function setZoneRatesAction(
  locationId: string,
  rows: unknown,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string") return STALE;
  const parsed = parseRateCells(rows);
  if (!parsed.ok) return refusalOf(parsed);
  const result = await setZoneRates(actorOf(admin), locationId, parsed.value);
  if (result.ok) {
    revalidateLocation();
    refreshLocationAfter(locationId);
  }
  return stateOf(result);
}

export async function setOddHoursAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const locationId = textOf(formData.get("locationId"));
  if (!locationId) return STALE;
  const parsed = parseOddHoursFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
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
  if (typeof locationId !== "string" || !isDropoffRule(rule)) return STALE;
  const result = await setDropoffRule(actorOf(admin), locationId, rule);
  if (result.ok) {
    revalidateLocation();
    refreshLocationAfter(locationId);
  }
  return stateOf(result);
}
