import { BLOG_POST_KIND } from "@repo/db";
import { getBlogPostPublish } from "@repo/db/server";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { notFound } from "next/navigation";
import {
  PagePublishCards,
  PublishHeader,
} from "../../../../../../_components/page-editor/PublishView";
import { requireAdmin } from "../../../../../../_lib/access";
import { blogHref, blogPostHref } from "../../../../../../_lib/routes";
import { scopeOf } from "../../../../../../_lib/scope";

/**
 * Route: /~/pages/blog/history/[entryId]. One publish of a blog post: as
 * it was before and as it was published, with the parts that differ
 * marked. Console-wide: under a slug it is not found. The locations'
 * pages' team's (`pages.manage`).
 */
export default async function BlogPostPublishPage({
  params,
}: PageProps<"/[location]/pages/blog/history/[entryId]">) {
  await requireAdmin("pages.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const { entryId } = await params;
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
            <CardSkeleton rows={7} />
            <CardSkeleton rows={7} />
          </div>
        </>
      }
    >
      {() => publishDetails(entryId)}
    </Streamed>
  );
}

/** The publish under its sentence: the post before and after. */
async function publishDetails(entryId: string) {
  const publish = await getBlogPostPublish(entryId);
  if (!publish) notFound();
  return (
    <PublishHeader
      entry={publish.entry}
      // A post deleted since has no editor: the way back is Blog.
      edit={
        publish.entry.isDeleted
          ? { href: blogHref(), label: "Go to Blog" }
          : { href: blogPostHref(publish.postId), label: "Edit this post" }
      }
    >
      <PagePublishCards
        kind={BLOG_POST_KIND}
        before={publish.before}
        after={publish.after}
      />
    </PublishHeader>
  );
}
