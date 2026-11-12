import {
  BLOG_LABEL,
  BLOG_POST_KIND,
  blogPostFallbackTitle,
  blogPostPath,
  isEntrySlugLocked,
} from "@repo/db";
import {
  getBlogPost,
  listBlogPostPublishes,
  listLocationNames,
} from "@repo/db/server";
import { RecordLink } from "@repo/console/PageHeader";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { notFound } from "next/navigation";
import { EditorHeader } from "../../../../../_components/page-editor/EditorHeader";
import type { PagePublishEntry } from "../../../../../_components/page-editor/PageHistory";
import { requireAdmin } from "../../../../../_lib/access";
import {
  activityHref,
  blogHref,
  blogPostPublishHref,
} from "../../../../../_lib/routes";
import { scopeOf } from "../../../../../_lib/scope";
import {
  blogPostPreviewUrl,
  blogPostPublicUrl,
} from "../../../../../_lib/site";
import { BlogPostEditor } from "../_components/BlogPostEditor";
import { PostLocations } from "../_components/PostLocations";

/**
 * Route: /~/pages/blog/[id]. A blog post in the page editor, as a site
 * page is edited: its header leads back to Blog and opens its publish
 * history; then the publish bar, the post's content and its SEO, its
 * slug until the first publish and its delete; under them, the locations
 * it is tagged with. A post is public as soon as it is published.
 * Console-wide: under a slug it is not found. The locations' pages' team's
 * (`pages.manage`).
 */
export default async function BlogPostEditorPage({
  params,
}: PageProps<"/[location]/pages/blog/[id]">) {
  await requireAdmin("pages.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const { id } = await params;
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <div className="grid gap-5">
            <CardSkeleton rows={1} />
            <CardSkeleton rows={5} />
            <CardSkeleton rows={4} />
          </div>
        </>
      }
    >
      {() => editorDetails(id)}
    </Streamed>
  );
}

/** The post in its editor, under its header, with its locations. */
async function editorDetails(id: string) {
  const [post, published, locations] = await Promise.all([
    getBlogPost(id),
    listBlogPostPublishes(id),
    listLocationNames(),
  ]);
  if (!post) notFound();
  // Its publishes, newest first, each opening its before and after.
  const publishes: PagePublishEntry[] = published.map((entry) => ({
    id: entry.id,
    at: entry.createdAt,
    actorName: entry.actorName,
    href: blogPostPublishHref(entry.id),
  }));
  const isPublic = post.published !== null;

  return (
    <>
      <EditorHeader
        where={<RecordLink href={blogHref()}>{BLOG_LABEL}</RecordLink>}
        title={post.title}
        publishes={publishes}
        allHref={activityHref(null, { area: "pages" })}
        allLabel="All changes to the pages and the blog"
      />
      <BlogPostEditor
        target={{ scope: "blog", postId: post.id }}
        kind={BLOG_POST_KIND}
        pageName={`the post “${post.title}”`}
        path={blogPostPath(post.slug)}
        draft={post.draft}
        published={post.published}
        publishedAt={post.publishedAt}
        version={post.version}
        goesLive="This goes live at once."
        hiddenBecause={null}
        publishBlocked={null}
        canUnpublish
        askBeforeUnpublish={isPublic}
        places={null}
        previewUrl={blogPostPreviewUrl(post.slug)}
        publicUrl={blogPostPublicUrl(post.slug)}
        fallbackTitle={blogPostFallbackTitle(post.title)}
        post={{
          id: post.id,
          slug: post.slug,
          slugLocked: isEntrySlugLocked(post),
          isPublic,
        }}
      />
      <div className="mt-8">
        <PostLocations
          // A fresh form after a save elsewhere: its ticks follow the post.
          key={post.locations.map((location) => location.id).join()}
          postId={post.id}
          locations={locations.map(({ id, name }) => ({ id, name }))}
          tagged={post.locations.map((location) => location.id)}
        />
      </div>
    </>
  );
}
