import type { Metadata } from "next";
import { BlogPostPage } from "../../../_blog/BlogViews";
import { postMetadata, publishedPostAt } from "../../../_blog/routes";
import { SiteFrame } from "../../../_site/SiteFrame";

type Props = PageProps<"/blog/[slug]">;

/**
 * No slug is known at build time, so the build reads no database. Having
 * this export makes the page static: each post is rendered on its first
 * visit and kept at the CDN under the `blog` tag, until the admin
 * refreshes it or the hour passes. So nothing here may read the request.
 */
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return postMetadata(await publishedPostAt((await params).slug));
}

/** Route: /blog/a-day-in-langkawi. A post, as published; a 404 while it is not. */
export default async function BlogPostRoute({ params }: Props) {
  const post = await publishedPostAt((await params).slug);
  return (
    <SiteFrame>
      <BlogPostPage post={post} />
    </SiteFrame>
  );
}
