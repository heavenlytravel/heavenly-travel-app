import {
  ADMIN_URL,
  BLOG_LABEL,
  blogPostEditorPath,
  blogPostPreviewPath,
  listBlogPostSummaries,
} from "@repo/db/server";
import type { Metadata } from "next";
import { BlogPostPage } from "../../../../_blog/BlogViews";
import {
  postMetadata,
  postTitleOf,
  previewPostAt,
} from "../../../../_blog/routes";
import { SiteFrame } from "../../../../_site/SiteFrame";

type Props = PageProps<"/preview/blog/[slug]">;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return postMetadata(await previewPostAt((await params).slug), true);
}

/**
 * Route: /preview/blog/a-day-in-langkawi. A post as drafted, published or
 * not, for staff who hold `pages.manage`, with the preview bar: where the
 * post stands, its editor, and the way to every post. The access check is
 * `previewPostAt`'s, before anything else is read.
 */
export default async function BlogPostPreview({ params }: Props) {
  const post = await previewPostAt((await params).slug);
  const posts = await listBlogPostSummaries();
  return (
    <SiteFrame
      preview={{
        name: postTitleOf(post),
        standing: post.status,
        editHref: `${ADMIN_URL}${blogPostEditorPath(post.id)}`,
        title: BLOG_LABEL,
        searchLabel: "Find a post",
        groups: posts.map((other) => ({
          href: blogPostPreviewPath(other.slug),
          name: other.title,
          standing: other.status,
          current: other.id === post.id,
          children: [],
        })),
      }}
    >
      <BlogPostPage post={post} preview />
    </SiteFrame>
  );
}
