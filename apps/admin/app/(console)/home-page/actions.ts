"use server";

import { changeTopChoice, isTopChoiceChange } from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../_lib/access";
import { FORBIDDEN, stateOf, type ActionState } from "../../_lib/action-state";
import { HOME_PAGE_PATH, LOCATIONS_PATH } from "../../_lib/routes";
import { refreshTopChoicesAfter } from "../../_lib/site";

/**
 * The Home page screen's action: adds, removes or moves a location among
 * the home page's top choices. It checks `locations.manage` again and its
 * arguments' types, since an action is reachable by direct POST, and lets
 * the writer in @repo/db check the rest. The customer site's home page is
 * refreshed with it.
 */
export async function changeTopChoiceAction(
  locationId: string,
  change: string,
): Promise<ActionState> {
  const admin = await getAdmin("locations.manage");
  if (!admin) return FORBIDDEN;
  if (typeof locationId !== "string" || locationId === "") {
    return { error: "Choose a location." };
  }
  if (!isTopChoiceChange(change)) return { error: "Choose a change." };

  const result = await changeTopChoice(actorOf(admin), locationId, change);
  if (result.ok) {
    revalidatePath(HOME_PAGE_PATH);
    // The Locations list shows each place, and every location moved logs it.
    revalidatePath(LOCATIONS_PATH, "layout");
    refreshTopChoicesAfter();
  }
  return stateOf(result);
}
