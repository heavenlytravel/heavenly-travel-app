"use server";

import { changeTopChoice, isTopChoiceChange } from "@repo/db/server";
import { revalidateLocation } from "../../../../_lib/revalidate";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  type ActionState,
  FORBIDDEN,
  STALE,
  stateOf,
} from "@repo/console/action-state";
import { refreshTopChoicesAfter } from "../../../../_lib/site";

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
    // The home page's editor, the list of locations that shows each place,
    // and the activity of every location moved.
    revalidateLocation();
    refreshTopChoicesAfter();
  }
  return stateOf(result);
}
