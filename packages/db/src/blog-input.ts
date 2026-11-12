import { refuse, type Change } from "./change";
import { ALL_LOCATIONS_SEGMENT } from "./console-paths";
import { checkEntrySlug } from "./location-page-input";
import type { PageKind } from "./page-content";
import { SITE_NAME } from "./site-page-input";

/**
 * The site's blog, pure and browser-safe: its addresses on the customer
 * site and in the console, the rules of a post's slug, and how the blog's
 * home picks what it shows. A post is the site's, at /blog/[slug], tagged
 * with any number of locations, each of which lists it on its own blog
 * page. Its content is a page of the "article" kind (./page-content). See
 * docs/261111-catalogue-booking-flow-and-ops.md, "C. The blog".
 */

/** The kind of page a post is, which decides what it holds and needs. */
export const BLOG_POST_KIND = "article" satisfies PageKind;

/** The blog's name, in the menus, its heading and a post's breadcrumb. */
export const BLOG_LABEL = "Blog";

/** The blog's home on the customer site. */
export const BLOG_PATH = "/blog";

/** The segment under /blog of the list of every post, which no post's slug may take. */
export const BLOG_ALL_SEGMENT = "all";

/** Every published post, newest first. */
export const BLOG_ALL_PATH = `${BLOG_PATH}/${BLOG_ALL_SEGMENT}`;

/** How many highlighted posts the blog's home shows at most, first, in Marketing's order. */
export const BLOG_HIGHLIGHT_CAP = 3;

/** How many of the newest posts the blog's home shows after the highlighted ones. */
export const BLOG_HOME_NEWEST = 4;

/** Where a post is on the customer site: /blog/a-day-in-langkawi. */
export function blogPostPath(slug: string) {
  return `${BLOG_PATH}/${slug}`;
}

/** Where staff preview a post's draft: /preview/blog/a-day-in-langkawi. */
export function blogPostPreviewPath(slug: string) {
  return `/preview${blogPostPath(slug)}`;
}

/** Where the console keeps the blog: its posts, the highlighted ones. Console-wide. */
export const BLOG_EDITOR_PATH = `/${ALL_LOCATIONS_SEGMENT}/pages/blog`;

/** Where a post is edited in the console, by its id; the preview links it as Edit. */
export function blogPostEditorPath(id: string) {
  return `${BLOG_EDITOR_PATH}/${id}`;
}

/** What one publish of a post put on it, by the log entry's id. */
export function blogPostPublishPath(entryId: string) {
  return `${BLOG_EDITOR_PATH}/history/${entryId}`;
}

/** A post's title while its meta title is empty: "A day in Langkawi | Heavenly Travel". */
export function blogPostFallbackTitle(title: string) {
  return `${title} | ${SITE_NAME}`;
}

/** The blog home's title: "Blog | Heavenly Travel". */
export const BLOG_TITLE = `${BLOG_LABEL} | ${SITE_NAME}`;

/**
 * A post's slug is a page's slug added on demand (`checkEntrySlug`), but
 * for the one the list of every post is at.
 */
export function checkBlogPostSlug(slug: string): Change {
  const check = checkEntrySlug(slug);
  if (!check.ok) return check;
  if (slug === BLOG_ALL_SEGMENT) {
    return refuse(
      `/blog/${BLOG_ALL_SEGMENT} is the list of every post. Choose another slug.`,
      "slug",
    );
  }
  return { ok: true };
}

/** What the blog's home shows of a post: whether it is highlighted, and where. */
type Placed = { highlightOrder: number | null };

/**
 * What the blog's home shows of the published posts, given newest first:
 * the highlighted ones in Marketing's order, then the newest of the rest.
 * "View all" follows them.
 */
export function blogHomeOf<T extends Placed>(
  posts: readonly T[],
): { highlighted: T[]; newest: T[] } {
  const highlighted = posts
    .filter((post) => post.highlightOrder !== null)
    .sort((a, b) => (a.highlightOrder ?? 0) - (b.highlightOrder ?? 0));
  const newest = posts
    .filter((post) => post.highlightOrder === null)
    .slice(0, BLOG_HOME_NEWEST);
  return { highlighted, newest };
}
