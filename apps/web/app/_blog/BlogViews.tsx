import {
  BLOG_ALL_PATH,
  BLOG_LABEL,
  BLOG_PATH,
  BLOG_POST_KIND,
  blogHomeOf,
  blogPostPath,
  type BlogPostView,
} from "@repo/db/server";
import { ArticleHeader, PageDate } from "../_components/ArticleHeader";
import { ArticleHeading } from "../_components/page-headings";
import {
  Breadcrumbs,
  Faqs,
  JsonLd,
  MoreLink,
  Prose,
  column,
  emptyPartsOf,
  gutter,
  type Crumb,
} from "../_components/page-parts";
import { publishedBlogPosts } from "../_lib/blog";
import { BlogCards } from "./BlogCards";
import { blogCrumbsOf, postStructuredData, postTitleOf } from "./routes";

/**
 * The blog's pages on the customer site, inside the site's frame: its
 * home, the list of every post, and a post. They read as the site's
 * documents do, with no search card. See
 * docs/261111-catalogue-booking-flow-and-ops.md, "C. The blog".
 */

/** How many other posts a post offers at its foot. */
const MORE_POSTS = 3;

/** The blog home's line under its title. */
export const BLOG_LINE =
  "Guides and stories from the places we take you, by the people who drive them.";

/** The top of one of the blog's lists: its breadcrumb, its title and its line. */
function ListHeader({
  crumbs,
  title,
  line,
}: {
  crumbs: readonly Crumb[];
  title: string;
  line: string;
}) {
  return (
    <header className={`pt-7 ${gutter}`}>
      <div className="mx-auto w-full max-w-[900px]">
        <Breadcrumbs crumbs={crumbs} />
        <ArticleHeading eyebrow="Heavenly Travel" line={line}>
          {title}
        </ArticleHeading>
      </div>
    </header>
  );
}

/**
 * /blog: the highlighted posts first, in Marketing's order, then the
 * newest of the rest, then "View all".
 */
export async function BlogHome() {
  const posts = await publishedBlogPosts();
  const { highlighted, newest } = blogHomeOf(posts);
  return (
    <main className="pb-[60px] sm:pb-[88px]">
      <ListHeader crumbs={blogCrumbsOf()} title={BLOG_LABEL} line={BLOG_LINE} />
      <BlogCards
        id="highlighted"
        title="Highlighted"
        posts={highlighted}
        preview={false}
      />
      <BlogCards
        id="latest"
        title="Latest posts"
        posts={newest}
        preview={false}
      />
      <div className={`pt-10 ${gutter}`}>
        <p className={column}>
          {posts.length > 0 ? (
            <MoreLink href={BLOG_ALL_PATH}>View all</MoreLink>
          ) : (
            <span className="text-muted">
              The first posts are on their way.
            </span>
          )}
        </p>
      </div>
    </main>
  );
}

/** /blog/all: every published post, newest first. */
export async function BlogAll() {
  const posts = await publishedBlogPosts();
  return (
    <main className="pb-[60px] sm:pb-[88px]">
      <ListHeader
        crumbs={blogCrumbsOf({ name: "All posts", path: BLOG_ALL_PATH })}
        title="All posts"
        line="Every post on the blog, the newest first."
      />
      <BlogCards
        id="all-posts"
        title={`${posts.length} ${posts.length === 1 ? "post" : "posts"}`}
        posts={posts}
        preview={false}
      />
    </main>
  );
}

/**
 * A post: its header with its dates, its text and FAQs, then the newest
 * other posts. The public page and the staff preview render this; the
 * preview marks each empty part and keeps the links inside the preview.
 */
export async function BlogPostPage({
  post,
  preview = false,
}: {
  post: BlogPostView;
  preview?: boolean;
}) {
  const others = (await publishedBlogPosts())
    .filter((other) => other.slug !== post.slug)
    .slice(0, MORE_POSTS);
  const empty = emptyPartsOf(BLOG_POST_KIND, preview);
  const title = postTitleOf(post);
  const published = post.firstPublishedAt;
  // "Updated" when a later publish fell on another day.
  const updated =
    published &&
    post.publishedAt &&
    post.publishedAt.slice(0, 10) !== published.slice(0, 10)
      ? post.publishedAt
      : null;
  return (
    <main className="pb-[60px] sm:pb-[88px]">
      <JsonLd data={postStructuredData(post)} />
      <article>
        <ArticleHeader
          crumbs={blogCrumbsOf({ name: title, path: blogPostPath(post.slug) })}
          eyebrow={BLOG_LABEL}
          kind={BLOG_POST_KIND}
          content={post.content}
          name={title}
          dates={
            published && (
              <>
                <PageDate iso={published} />
                {updated && (
                  <>
                    {" · Updated "}
                    <PageDate iso={updated} />
                  </>
                )}
              </>
            )
          }
          preview={preview}
        />
        <div className={`pt-10 sm:pt-14 ${gutter}`}>
          <div className="mx-auto w-full max-w-[900px]">
            <Prose text={post.content.body} empty={empty.body} />
          </div>
        </div>
      </article>
      <Faqs title="Good to know" faqs={post.content.faqs} empty={empty.faqs} />
      <BlogCards
        id="more-posts"
        eyebrow={BLOG_LABEL}
        title="More from the blog"
        posts={others}
        action={<MoreLink href={BLOG_PATH}>All posts</MoreLink>}
        preview={preview}
      />
    </main>
  );
}
