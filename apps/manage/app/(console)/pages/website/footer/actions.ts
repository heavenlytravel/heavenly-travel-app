"use server";

import {
  publishFooter,
  saveFooterDraft,
  type PageSaved,
} from "@repo/db/server";
import { revalidatePath } from "next/cache";
import { actorOf, getAdmin } from "../../../../_lib/access";
import {
  FORBIDDEN_MESSAGE,
  STALE_MESSAGE,
} from "../../../../_lib/action-state";
import { SITE_PAGES_PATH } from "../../../../_lib/routes";
import { refreshSitePagesAfter } from "../../../../_lib/site";

/**
 * The footer editor's writes: save the draft, publish. Each checks
 * `website.manage` again, since an action is reachable by direct POST, and
 * reads the version for its type; the writers in @repo/db check the
 * content. A publish refreshes the customer site's pages after the answer:
 * the footer is on every one. `version` names the content the editor was
 * opened with, so a footer someone else changed meanwhile is not
 * overwritten; the answer carries the new one.
 */

async function writeFooter(
  version: unknown,
  content: unknown,
  publish: boolean,
): Promise<PageSaved> {
  if (version !== null && typeof version !== "string") {
    return { ok: false, error: STALE_MESSAGE };
  }
  const admin = await getAdmin("website.manage");
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };

  const result = publish
    ? await publishFooter(actorOf(admin), version, content)
    : await saveFooterDraft(version, content);
  if (result.ok) {
    revalidatePath(SITE_PAGES_PATH, "layout");
    // A draft changes nothing in public.
    if (publish) refreshSitePagesAfter();
  }
  return result;
}

/** Overwrites the footer's draft. Nothing changes in public. */
export async function saveFooterDraftAction(
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writeFooter(version, content, false);
}

/** Saves the footer and makes it what every page shows, when it is complete. */
export async function publishFooterAction(
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writeFooter(version, content, true);
}
