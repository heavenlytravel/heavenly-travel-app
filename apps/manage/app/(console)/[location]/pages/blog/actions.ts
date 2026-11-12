"use server";

import { isPickChange } from "@repo/db";
import {
  changeBlogHighlight,
  createBlogPost,
  deleteBlogPost,
  renameBlogPost,
  setBlogPostLocations,
  textOf,
} from "@repo/db/server";
import {
  FORBIDDEN,
  STALE,
  stateOf,
  type ActionState,
} from "@repo/console/action-state";
import { actorOf, getAdmin } from "../../../../_lib/access";
import { revalidateLocation } from "../../../../_lib/revalidate";
import { blogHref, blogPostHref } from "../../../../_lib/routes";
import { refreshBlogAfter } from "../../../../_lib/site";

/**
 * The blog's actions besides a post's content, which is the page editor's
 * (_components/page-editor/actions): add a post, change its slug, delete
 * it, tag it with locations, and highlight it. Each checks `pages.manage`
 * again and its arguments' types, since an action is reachable by direct
 * POST, and lets the writer in @repo/db check the rest. A change the
 * public can see refreshes the customer site's blog after the answer.
 */

/** After a change: every console screen, and when the public sees it, the customer site's blog. */
function refreshAfter(publicChange: boolean) {
  revalidateLocation();
  if (publicChange) refreshBlogAfter();
}

/** Adds a post as a draft, from the dialog on Blog, and opens its editor. */
export async function createBlogPostAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("pages.manage");
  if (!admin) return FORBIDDEN;
  const result = await createBlogPost(actorOf(admin), {
    title: textOf(formData.get("title")),
    slug: textOf(formData.get("slug")),
  });
  if (!result.ok) return stateOf(result);
  refreshAfter(false);
  return { href: blogPostHref(result.id) };
}

/** Gives a post not yet published a new slug. Its editor stays at its id. */
export async function renameBlogPostAction(
  postId: string,
  slug: string,
): Promise<ActionState> {
  const admin = await getAdmin("pages.manage");
  if (!admin) return FORBIDDEN;
  if (typeof postId !== "string" || typeof slug !== "string") return STALE;
  const result = await renameBlogPost(actorOf(admin), postId, slug);
  if (result.ok) refreshAfter(false);
  return stateOf(result);
}

/** Deletes a post and opens Blog. A published one leaves the customer site too. */
export async function deleteBlogPostAction(
  postId: string,
): Promise<ActionState> {
  const admin = await getAdmin("pages.manage");
  if (!admin) return FORBIDDEN;
  if (typeof postId !== "string") return STALE;
  const result = await deleteBlogPost(actorOf(admin), postId);
  if (!result.ok) return stateOf(result);
  refreshAfter(true);
  return { href: blogHref() };
}

/** Tags a post with the locations ticked on its editor, each a `locationIds` field. */
export async function setBlogPostLocationsAction(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await getAdmin("pages.manage");
  if (!admin) return FORBIDDEN;
  const postId = textOf(formData.get("postId"));
  if (!postId) return STALE;
  const result = await setBlogPostLocations(
    actorOf(admin),
    postId,
    formData.getAll("locationIds").map(textOf).filter(Boolean),
  );
  if (result.ok) refreshAfter(true);
  return stateOf(result);
}

/** Adds a post to the blog's highlighted posts, takes it off, or moves it a place. */
export async function changeBlogHighlightAction(
  postId: string,
  change: string,
): Promise<ActionState> {
  const admin = await getAdmin("pages.manage");
  if (!admin) return FORBIDDEN;
  if (typeof postId !== "string" || postId === "") return STALE;
  if (!isPickChange(change)) return STALE;
  const result = await changeBlogHighlight(actorOf(admin), postId, change);
  if (result.ok) refreshAfter(true);
  return stateOf(result);
}
