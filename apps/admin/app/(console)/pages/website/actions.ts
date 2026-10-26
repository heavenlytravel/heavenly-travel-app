"use server";

import { HOME_PAGE, changeTopChoice, isTopChoiceChange } from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  STALE,
  stateOf,
} from "../../../_lib/action-state";
import { LOCATIONS_PATH, sitePageHref } from "../../../_lib/routes";
import { refreshTopChoicesAfter } from "../../../_lib/site";

/**
 * The home page editor's action for its top choices: adds, removes or
 * moves a location among the home page's top choices. It checks `website.manage` again and its
 * arguments' types, since an action is reachable by direct POST, and lets
 * the writer in @repo/db check the rest. The customer site's home page is
 * refreshed with it.
 */
export async function changeTopChoiceAction(
  locationId: string,
  change: string,
): Promise<ActionState> {
  const admin = await getAdmin("website.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string" || locationId === "") return STALE;
  if (!isTopChoiceChange(change)) return STALE;

  const result = await changeTopChoice(actorOf(admin), locationId, change);
  if (result.ok) {
    revalidatePath(sitePageHref(HOME_PAGE));
    // The Locations list shows each place, and every location moved logs it.
    revalidatePath(LOCATIONS_PATH, "layout");
    refreshTopChoicesAfter();
  }
  return stateOf(result);
}
