import { BLOG_ALL_PATH, SITE_NAME } from "@repo/db/server";
import type { Metadata } from "next";
import { BlogAll } from "../../../_blog/BlogViews";
import { blogListMetadata } from "../../../_blog/routes";
import { SiteFrame } from "../../../_site/SiteFrame";

export const metadata: Metadata = blogListMetadata({
  title: `All posts | ${SITE_NAME}`,
  description: "Every post on the Heavenly Travel blog, the newest first.",
  path: BLOG_ALL_PATH,
});

/** Route: /blog/all. Every published post, newest first. Static, as /blog. */
export default function BlogAllPage() {
  return (
    <SiteFrame>
      <BlogAll />
    </SiteFrame>
  );
}
