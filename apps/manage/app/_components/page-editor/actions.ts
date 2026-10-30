"use server";

import {
  pageContentOf,
  pageKindOf,
  publishLocationPage,
  publishSitePage,
  saveLocationPageDraft,
  saveSitePageDraft,
  sitePageKindOf,
  unpublishLocationPage,
  unpublishSitePage,
  type PageSaved,
  type Permission,
} from "@repo/db/server";
import { revalidateLocation } from "../../_lib/revalidate";
import { actorOf, getAdmin } from "../../_lib/access";
import {
  FORBIDDEN,
  FORBIDDEN_MESSAGE,
  STALE,
  STALE_MESSAGE,
  stateOf,
  type ActionState,
} from "../../_lib/action-state";
import { refreshLocationAfter, refreshSitePagesAfter } from "../../_lib/site";
import { pageTargetOf, type PageTarget } from "./target";

/**
 * The page editor's writes, for a location's page and a site page alike:
 * save the draft, publish, unpublish. Each checks the target's permission
 * again (`locations.manage` for a location's page, `website.manage` for a
 * site page) and reads the target and the version for their type, since an action is
 * reachable by direct POST; the writers in @repo/db check the rest. A
 * change the public can see refreshes the customer site after the answer.
 * `version` names the content the editor was opened with, so a page
 * someone else changed meanwhile is not overwritten; the answer carries the
 * new one.
 */

/**
 * After a change: every console screen (the page's status on Pages, its
 * images on Media, its publish in the activity), and on a publish or an
 * unpublish the customer site's.
 */
function refreshAfter(target: PageTarget, publicChange: boolean) {
  revalidateLocation();
  if (!publicChange) return;
  if (target.scope === "location") refreshLocationAfter(target.locationId);
  else refreshSitePagesAfter();
}

/** Who may write the target: Marketing a location's page, SUPER a site page. */
function permissionOf(target: PageTarget): Permission {
  return target.scope === "location" ? "locations.manage" : "website.manage";
}

async function writePage(
  value: unknown,
  version: unknown,
  content: unknown,
  publish: boolean,
): Promise<PageSaved> {
  const target = pageTargetOf(value);
  if (!target || (version !== null && typeof version !== "string")) {
    return { ok: false, error: STALE_MESSAGE };
  }
  const admin = await getAdmin(permissionOf(target));
  if (!admin) return { ok: false, error: FORBIDDEN_MESSAGE };

  let result: PageSaved;
  if (target.scope === "location") {
    const draft = pageContentOf(pageKindOf(target.ref), content);
    result = publish
      ? await publishLocationPage(
          actorOf(admin),
          target.locationId,
          target.ref,
          version,
          draft,
        )
      : await saveLocationPageDraft(
          target.locationId,
          target.ref,
          version,
          draft,
        );
  } else {
    const draft = pageContentOf(sitePageKindOf(target.page), content);
    result = publish
      ? await publishSitePage(actorOf(admin), target.page, version, draft)
      : await saveSitePageDraft(target.page, version, draft);
  }
  // A draft changes nothing in public.
  if (result.ok) refreshAfter(target, publish);
  return result;
}

/** Overwrites the page's draft. Nothing changes in public. */
export async function savePageDraftAction(
  target: PageTarget,
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writePage(target, version, content, false);
}

/** Saves the content and makes it the page's public copy, when it is complete. */
export async function publishPageAction(
  target: PageTarget,
  version: string | null,
  content: unknown,
): Promise<PageSaved> {
  return writePage(target, version, content, true);
}

/** Takes the page from the public and keeps its text. */
export async function unpublishPageAction(
  value: PageTarget,
): Promise<ActionState> {
  const target = pageTargetOf(value);
  if (!target) return STALE;
  const admin = await getAdmin(permissionOf(target));
  if (!admin) return FORBIDDEN;

  const result =
    target.scope === "location"
      ? await unpublishLocationPage(
          actorOf(admin),
          target.locationId,
          target.ref,
        )
      : await unpublishSitePage(actorOf(admin), target.page);
  if (result.ok) refreshAfter(target, true);
  return stateOf(result);
}
