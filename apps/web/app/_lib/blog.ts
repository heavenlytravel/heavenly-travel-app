import "server-only";
import {
  BLOG_TAG,
  getBlogPostView,
  listPublishedBlogPosts,
  type BlogPostView,
} from "@repo/db/server";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { REFRESH_SECONDS } from "./locations";

/**
 * What the customer site reads of the blog, cached under one tag, which
 * the admin names after a post is published, unpublished, deleted, tagged
 * or highlighted. The preview reads the drafts directly. See
 * docs/261111-catalogue-booking-flow-and-ops.md, "C. The blog".
 */

/** The version of `BlogPostView` the cache holds; a change to its shape bumps it. */
const BLOG_VERSION = 2;

/** Every published post, newest first, without its text. */
export const publishedBlogPosts = unstable_cache(
  listPublishedBlogPosts,
  ["published-blog-posts", String(BLOG_VERSION)],
  { tags: [BLOG_TAG], revalidate: REFRESH_SECONDS },
);

/** The published posts tagged with the location, newest first. */
export async function blogPostsAt(locationSlug: string) {
  return (await publishedBlogPosts()).filter((post) =>
    post.locationSlugs.includes(locationSlug),
  );
}

/** The published post at the slug, with its text; null for none. Once per request. */
export const publishedBlogPost = cache(
  (slug: string): Promise<BlogPostView | null> =>
    unstable_cache(
      () => getBlogPostView(slug, false),
      ["published-blog-post", String(BLOG_VERSION), slug],
      { tags: [BLOG_TAG], revalidate: REFRESH_SECONDS },
    )(),
);

/** The post at the slug as drafted, for the staff preview, read fresh. Once per request. */
export const blogPostDraft = cache((slug: string) =>
  getBlogPostView(slug, true),
);
