"use server";

import {
  FOOTER_KEY,
  isFooterKey,
  publishFooter,
  saveFooterDraft,
  type PageSaved,
} from "@repo/db/server";
import { revalidateLocation } from "../../../../../_lib/revalidate";
import { actorOf, getAdmin } from "../../../../../_lib/access";
import { FORBIDDEN_MESSAGE, STALE_MESSAGE } from "@repo/console/action-state";
import { refreshSitePagesAfter } from "../../../../../_lib/site";

/**
 * The footer editors' writes, the website's footer's or Connect's: save
 * the draft, publish. Each checks `website.manage` again, since an action
 * is reachable by direct POST, and reads the key and the version for
 * their types; the writers in @repo/db check the content. Publishing the
 * website's refreshes the customer site's pages after the answer: the
 * footer is on every one. Connect reads its footer fresh. `version` names the content the editor was
 * opened with, so a footer someone else changed meanwhile is not
 * overwritten; the answer carries the new one.
 */

async function writeFooter(
  key: unknown,
  version: unknown,
  content: unknown,
  publish: boolean,
): Promise<PageSaved> {
  if (!isFooterKey(key) || (version !== null && typeof version !== "string")) {
    return { ok: false, error: STALE_MESSAGE };
  }
  const admin = await getAdmin("website.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };

  const result = publish
    ? await publishFooter(key, actorOf(admin), version, content)
    : await saveFooterDraft(key, version, content);
  if (result.ok) {
    revalidateLocation();
    // A draft changes nothing in public.
    if (publish && key === FOOTER_KEY) refreshSitePagesAfter();
  }
  return result;
}

/** Overwrites a footer's draft. Nothing changes in public. */
export async function saveFooterDraftAction(
  key: string,
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writeFooter(key, version, content, false);
}

/** Saves a footer and makes it what its app shows, when it is complete. */
export async function publishFooterAction(
  key: string,
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writeFooter(key, version, content, true);
}
