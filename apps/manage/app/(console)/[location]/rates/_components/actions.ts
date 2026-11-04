"use server";

import {
  parseGuideRates,
  parseHourlyList,
  parseRateCells,
  parseTripRulesFields,
  setGuideRates,
  setHourlyList,
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
} from "@repo/console/action-state";
import { refreshLocationAfter } from "../../../../_lib/site";
import { revalidateLocation } from "../../../../_lib/revalidate";

/**
 * Rates' actions: the grid, the hourly list, the tour guide rates and the
 * trip rules. Each checks
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

/** The whole hourly list as Hourly Rates holds it: each zone's durations and prices, and the extra hour rates. */
export async function setHourlyListAction(
  locationId: string,
  list: unknown,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string") return STALE;
  const parsed = parseHourlyList(list);
  if (!parsed.ok) return refusalOf(parsed);
  const result = await setHourlyList(actorOf(admin), locationId, parsed.value);
  if (result.ok) {
    revalidateLocation();
    refreshLocationAfter(locationId);
  }
  return stateOf(result);
}

/** The whole tour guide list as Tour Guide Rates holds it: each language, on the website or not, and its prices. The quote reads it; nothing on the location's pages shows it. */
export async function setGuideRatesAction(
  locationId: string,
  rows: unknown,
): Promise<ActionState> {
  const admin = await getAdmin("coverage.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string") return STALE;
  const parsed = parseGuideRates(rows);
  if (!parsed.ok) return refusalOf(parsed);
  const result = await setGuideRates(actorOf(admin), locationId, parsed.value);
  if (result.ok) revalidateLocation();
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
