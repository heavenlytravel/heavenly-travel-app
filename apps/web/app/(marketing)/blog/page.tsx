import { BLOG_PATH, BLOG_TITLE } from "@repo/db/server";
import type { Metadata } from "next";
import { BLOG_LINE, BlogHome } from "../../_blog/BlogViews";
import { blogListMetadata } from "../../_blog/routes";
import { SiteFrame } from "../../_site/SiteFrame";

export const metadata: Metadata = blogListMetadata({
  title: BLOG_TITLE,
  description: BLOG_LINE,
  path: BLOG_PATH,
});

/**
 * Route: /blog. The blog's home: the highlighted posts in Marketing's
 * order, the newest of the rest, and "View All". Static: it reads the
 * cached posts and nothing of the request, so the CDN keeps it until a
 * change to a post refreshes the `blog` tag.
 */
export default function BlogPage() {
  return (
    <SiteFrame>
      <BlogHome />
    </SiteFrame>
  );
}
