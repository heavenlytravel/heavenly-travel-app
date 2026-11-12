import {
  BLOG_HIGHLIGHT_CAP,
  blogPostPath,
  formatLocalDate,
  isPageInList,
  isPagePublished,
  type PageFilter,
} from "@repo/db";
import { listBlogPostSummaries, type BlogPostSummary } from "@repo/db/server";
import { Card } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { SectionHeader } from "@repo/console/SectionHeader";
import {
  Streamed,
  TableSkeleton,
  TileGridSkeleton,
} from "@repo/console/Skeleton";
import { InfoTip } from "@repo/ui/info-tip";
import { Bone } from "@repo/ui/skeleton";
import { blogHref, blogPostHref } from "../../../../../_lib/routes";
import { blogPostPreviewUrl } from "../../../../../_lib/site";
import {
  PageTree,
  type PageGroup,
  type PageRow,
} from "../../_components/PageList";
import {
  PageStatusTiles,
  countedOfRow,
  emptyOf,
} from "../../_components/PageStatusTiles";
import { AddPostDialog } from "./AddPostDialog";
import { HighlightControl } from "./HighlightControl";

/**
 * The blog under Website: "Add post" in its header, the highlighted
 * posts the blog's home shows first, then every post, the newest first
 * and drafts before them, as the site's pages are listed: the strip
 * counting them by status, then the list, which the strip and a search
 * narrow. Each post's row shows its locations and its first publish. The
 * route checks the access and the scope first.
 */
export function BlogScreen(props: {
  status: PageFilter | undefined;
  q: string | undefined;
}) {
  return (
    <>
      <PageHeader title="Blog" action={<AddPostDialog />} />
      <Streamed
        key={JSON.stringify(props)}
        fallback={
          <div className="grid gap-5">
            <TileGridSkeleton min="thirds" />
            <Bone className="h-[5.25rem] w-full" />
            <TableSkeleton columns={7} rows={4} />
          </div>
        }
      >
        {() => blogDetails(props)}
      </Streamed>
    </>
  );
}

/** A post as a row of the list. */
function postRow(post: BlogPostSummary): PageRow {
  return {
    key: post.id,
    label: post.title,
    path: blogPostPath(post.slug),
    image: post.heroImage,
    status: post.status,
    paused: false,
    indexable: post.indexable,
    changedAt: post.updatedAt,
    editHref: blogPostHref(post.id),
    previewHref: blogPostPreviewUrl(post.slug),
  };
}

async function blogDetails({
  status,
  q,
}: {
  status: PageFilter | undefined;
  q: string | undefined;
}) {
  const posts = await listBlogPostSummaries();
  const highlighted = posts
    .filter((post) => post.highlightOrder !== null)
    .sort((a, b) => (a.highlightOrder ?? 0) - (b.highlightOrder ?? 0));
  const candidates = posts.filter(
    (post) => post.highlightOrder === null && isPagePublished(post.status),
  );
  const rows = posts.map((post) => ({ post, row: postRow(post) }));
  const groups: PageGroup[] = rows
    .filter(({ row }) =>
      isPageInList(countedOfRow(row), row.path, { status, q }),
    )
    .map(({ post, row }) => ({
      key: row.key,
      own: {
        row,
        lead: [
          <span key="locations" className="text-muted">
            {post.locations.map((location) => location.name).join(", ") || "—"}
          </span>,
          <span key="first" className="text-muted tabular-nums">
            {post.firstPublishedAt
              ? formatLocalDate(post.firstPublishedAt)
              : "Not yet"}
          </span>,
        ],
      },
      under: [],
      folds: false,
    }));

  return (
    <div className="grid gap-8">
      <div className="grid gap-4">
        <SectionHeader
          title="Highlighted"
          badge={
            <InfoTip
              text={`The posts the blog's home shows first, in this order, at most ${BLOG_HIGHLIGHT_CAP}. Its newest posts follow them.`}
            />
          }
          meta="Saved at once"
        />
        <HighlightControl highlighted={highlighted} candidates={candidates} />
      </div>
      <div className="grid gap-5">
        <PageStatusTiles
          pages={rows.map(({ row }) => countedOfRow(row))}
          status={status}
          q={q}
          hrefOf={(cell) => blogHref({ status: cell, q })}
        />
        <Card flush>
          <PageTree
            parts={groups.length > 0 ? [{ key: "part:blog", groups }] : []}
            filters={{ searchHref: blogHref({ status }), q }}
            lead={["Locations", "First published"]}
            empty={posts.length === 0 ? "No post yet. Add one." : emptyOf(q)}
          />
        </Card>
      </div>
    </div>
  );
}
