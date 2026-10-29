"use server";

import {
  parseRateCells,
  parseTripRulesFields,
  setTripRules,
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
import { revalidateLocation } from "../../../../_lib/revalidate";

/**
 * Rates' actions: the grid and the trip rules. Each checks
 * `coverage.manage` again, passes the admin as the actor and lets the
 * writer in @repo/db check the rest. Arguments passed directly, not
 * through a form, are checked for their type here: an action is
 * reachable by direct POST. The grid and the rules' reach decide where
 * the search card on the location's pages lets a trip end, and the grid
 * its "from RM", so they refresh those pages on the customer site; the
 * quote reads the rows, and the surcharges show nowhere else. Try a trip
 * has its own action (../try/actions).
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

/** The trip rules card: the reach and both surcharges, saved together. */
export async function setTripRulesAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  const locationId = textOf(formData.get("locationId"));
  if (!locationId) return STALE;
  const parsed = parseTripRulesFields(Object.fromEntries(formData));
  if (!parsed.ok) return refusalOf(parsed);
  const result = await setTripRules(actorOf(admin), locationId, parsed.value);
  if (result.ok) {
    revalidateLocation();
    refreshLocationAfter(locationId);
  }
  return stateOf(result);
}
