import { getActivityEntry, logActivity, type ActivityEntry } from "./activity";
import type { Actor } from "./activity-actions";
import {
  BLOG_HIGHLIGHT_CAP,
  BLOG_POST_KIND,
  checkBlogPostSlug,
} from "./blog-input";
import { refuse, type Change, type Created, type Refusal } from "./change";
import { db } from "./client";
import type { BlogPost, Prisma } from "./generated/prisma/client";
import { pickedAfter, type PickChange } from "./list-move";
import {
  checkEntryTitle,
  entryTitleOf,
  isEntrySlugLocked,
} from "./location-page-input";
import { deletedMediaRefusal } from "./media";
import {
  checkPageComplete,
  checkPageLimits,
  heroLabelsOf,
  pageContentOf,
  pageImageUrls,
  pageStatusOf,
  publicCopyOf,
  type PageContent,
  type PageStatus,
} from "./page-content";
import { type PageImage } from "./page-text";
import {
  PAGE_CHANGED,
  pageWriteData,
  publishChanges,
  versionOf,
  type PageSaved,
} from "./page-writes";
import { isUniqueViolation } from "./prisma-errors";

/**
 * The site's blog posts, `BlogPost`: their readers for the console's Blog
 * and the customer site, and their writers, which check what
 * ./blog-input and ./page-content say and, but for a draft save, log
 * against the post's id. A post is written as a site page is
 * (./site-pages): a draft, a public copy while it is on. Its location
 * tags and its place among the highlighted posts are saved at once and
 * leave the content's version as it is, so an open editor saves on. See
 * docs/261111-catalogue-booking-flow-and-ops.md, "C. The blog".
 */

const POST_GONE = refuse("This post was deleted meanwhile. Go back to Blog.");

const SLUG_TAKEN = refuse(
  "Another post already has this slug. Choose another.",
  "slug",
);

/** A post's title: its headline, else its slug. */
function titleOf(row: Pick<BlogPost, "slug" | "draft">) {
  return pageContentOf(BLOG_POST_KIND, row.draft).heroHeadline || row.slug;
}

/** The newest first; a post never published, a draft, before them all. */
const newestFirst = [
  { firstPublishedAt: { sort: "desc", nulls: "first" } },
  { slug: "asc" },
] satisfies Prisma.BlogPostOrderByWithRelationInput[];

/** A location a post is tagged with. */
export type BlogPostLocation = { id: string; slug: string; name: string };

const taggedLocations = {
  locations: {
    select: { id: true, slug: true, name: true },
    orderBy: { name: "asc" },
  },
} satisfies Prisma.BlogPostInclude;

/** A post as the console's Blog lists it. */
export type BlogPostSummary = {
  id: string;
  slug: string;
  title: string;
  status: PageStatus;
  /** The draft's cover, else that of the copy last published. */
  heroImage: PageImage | null;
  firstPublishedAt: Date | null;
  updatedAt: Date;
  /** Its place among the highlighted posts, from 1; null when it is not one. */
  highlightOrder: number | null;
  locations: BlogPostLocation[];
  /** Whether its draft lets search engines list it. */
  indexable: boolean;
};

/** Every post, the newest first and drafts before them. */
export async function listBlogPostSummaries(): Promise<BlogPostSummary[]> {
  const rows = await db.blogPost.findMany({
    orderBy: newestFirst,
    include: taggedLocations,
  });
  return rows.map((row) => {
    const draft = pageContentOf(BLOG_POST_KIND, row.draft);
    const publicCopy = publicCopyOf(BLOG_POST_KIND, row);
    return {
      id: row.id,
      slug: row.slug,
      title: draft.heroHeadline || row.slug,
      status: pageStatusOf(draft, publicCopy),
      heroImage:
        draft.heroImage ??
        (row.published == null
          ? null
          : pageContentOf(BLOG_POST_KIND, row.published).heroImage),
      firstPublishedAt: row.firstPublishedAt,
      updatedAt: row.updatedAt,
      highlightOrder: row.highlightOrder,
      locations: row.locations,
      indexable: draft.indexable,
    };
  });
}

/** One post, as its editor opens it. */
export type BlogPostDetails = {
  id: string;
  slug: string;
  title: string;
  draft: PageContent;
  /** The copy the public is shown; null while the post is not published. */
  published: PageContent | null;
  publishedAt: Date | null;
  /** Set at the first publish; the slug is locked from then. */
  firstPublishedAt: Date | null;
  /** Names the stored content, for `saveBlogPostDraft`. */
  version: string;
  highlightOrder: number | null;
  locations: BlogPostLocation[];
};

/** The post in its editor; null when it is gone. */
export async function getBlogPost(id: string): Promise<BlogPostDetails | null> {
  const row = await db.blogPost.findUnique({
    where: { id },
    include: taggedLocations,
  });
  if (!row) return null;
  const draft = pageContentOf(BLOG_POST_KIND, row.draft);
  return {
    id: row.id,
    slug: row.slug,
    title: draft.heroHeadline || row.slug,
    draft,
    published: publicCopyOf(BLOG_POST_KIND, row),
    publishedAt: row.isOn ? row.publishedAt : null,
    firstPublishedAt: row.firstPublishedAt,
    version: row.updatedAt.toISOString(),
    highlightOrder: row.highlightOrder,
    locations: row.locations,
  };
}

/**
 * A post as the customer site shows it: plain data, its dates as text,
 * since it is cached. A list leaves its text out; only its own page reads it.
 */
export type BlogPostView = {
  id: string;
  slug: string;
  content: PageContent;
  /** Always "published" on the public site; the preview's draft says where it stands. */
  status: PageStatus;
  firstPublishedAt: string | null;
  publishedAt: string | null;
  highlightOrder: number | null;
  /** The slugs of the locations it is tagged with. */
  locationSlugs: string[];
};

/** A post as a view reads it: its columns, the draft aside, and its locations. */
type ViewRow = Omit<BlogPost, "draft"> & { locations: { slug: string }[] };

const forView = {
  locations: { select: { slug: true } },
} satisfies Prisma.BlogPostInclude;

function viewOf(
  row: ViewRow,
  content: PageContent,
  status: PageStatus,
): BlogPostView {
  return {
    id: row.id,
    slug: row.slug,
    content,
    status,
    firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    highlightOrder: row.highlightOrder,
    locationSlugs: row.locations.map((location) => location.slug),
  };
}

/** Every published post, newest first, without its text: the blog's lists and the locations'. */
export async function listPublishedBlogPosts(): Promise<BlogPostView[]> {
  const rows = await db.blogPost.findMany({
    where: { isOn: true },
    orderBy: newestFirst,
    // The lists read the published copy alone: the draft stays unread.
    omit: { draft: true },
    include: forView,
  });
  return rows.flatMap((row) => {
    const content = publicCopyOf(BLOG_POST_KIND, row);
    return content ? [viewOf(row, { ...content, body: "" }, "published")] : [];
  });
}

/**
 * The post at the slug with its text: the public copy, null while it is
 * not published; or with `preview` the draft, whatever its standing.
 */
export async function getBlogPostView(
  slug: string,
  preview: boolean,
): Promise<BlogPostView | null> {
  if (!checkBlogPostSlug(slug).ok) return null;
  const row = await db.blogPost.findUnique({
    where: { slug },
    include: forView,
  });
  if (!row) return null;
  const publicCopy = publicCopyOf(BLOG_POST_KIND, row);
  if (!preview) return publicCopy ? viewOf(row, publicCopy, "published") : null;
  const draft = pageContentOf(BLOG_POST_KIND, row.draft);
  return viewOf(row, draft, pageStatusOf(draft, publicCopy));
}

/** One publish of a post: its content before and after. */
export type BlogPostPublish = {
  entry: ActivityEntry;
  /** The post's id, which its editor is at. */
  postId: string;
  /** Null on the post's first publish. */
  before: PageContent | null;
  after: PageContent;
};

/** The publish a log entry records, or null when the entry is not a post's publish. */
export async function getBlogPostPublish(
  entryId: string,
): Promise<BlogPostPublish | null> {
  const entry = await getActivityEntry(entryId);
  if (
    !entry ||
    entry.entityType !== "blog-post" ||
    entry.action !== "blog.post.published"
  ) {
    return null;
  }
  const after = entry.after as { content?: unknown } | null;
  const before = entry.before as { content?: unknown } | null;
  return {
    entry,
    postId: entry.entityId,
    before: before?.content
      ? pageContentOf(BLOG_POST_KIND, before.content)
      : null,
    after: pageContentOf(BLOG_POST_KIND, after?.content),
  };
}

/** What a new post is given: its title, which starts its headline, and its slug. */
export type BlogPostFields = { title: string; slug: string };

/**
 * A write that gives a post its slug, refused as taken when another admin
 * gave the same one at the same moment: the check before the write cannot
 * see a write not yet committed, the unique index can.
 */
async function claimingSlug<T extends { ok: boolean }>(
  write: () => Promise<T | Refusal>,
): Promise<T | Refusal> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error, "slug")) return SLUG_TAKEN;
    throw error;
  }
}

/** Why another post has the slug; null when none has. */
async function slugTaken(
  tx: Prisma.TransactionClient,
  slug: string,
): Promise<Refusal | null> {
  const taken = await tx.blogPost.findUnique({
    where: { slug },
    select: { id: true },
  });
  return taken ? SLUG_TAKEN : null;
}

/** Adds a post as a draft, its headline the title; answers its id, which its editor opens at. */
export async function createBlogPost(
  actor: Actor,
  fields: BlogPostFields,
): Promise<Created> {
  const slugCheck = checkBlogPostSlug(fields.slug);
  if (!slugCheck.ok) return slugCheck;
  const name = entryTitleOf(fields.title);
  const titleCheck = checkEntryTitle(
    name,
    heroLabelsOf(BLOG_POST_KIND).headline,
  );
  if (!titleCheck.ok) return titleCheck;

  return claimingSlug(() =>
    db.$transaction(async (tx): Promise<Created> => {
      const taken = await slugTaken(tx, fields.slug);
      if (taken) return taken;
      const post = await tx.blogPost.create({
        data: { slug: fields.slug, draft: { heroHeadline: name } },
      });
      await logActivity(tx, actor, {
        action: "blog.post.created",
        entityId: post.id,
        after: { slug: post.slug, name },
      });
      return { ok: true, id: post.id };
    }),
  );
}

/**
 * Gives a post a new slug until it is first published: after that the
 * address is locked, as a location's page added on demand. Its content and
 * its version stay, so its editor saves on.
 */
export async function renameBlogPost(
  actor: Actor,
  id: string,
  slug: string,
): Promise<Change> {
  const slugCheck = checkBlogPostSlug(slug);
  if (!slugCheck.ok) return slugCheck;
  return claimingSlug(() =>
    db.$transaction(async (tx): Promise<Change> => {
      const row = await tx.blogPost.findUnique({ where: { id } });
      if (!row) return POST_GONE;
      if (row.slug === slug) return { ok: true };
      if (isEntrySlugLocked(row)) {
        return refuse(
          "The address is locked: the post has been published. A new one needs a redirect from the old, which comes with the move to heavenlytravel.my.",
          "slug",
        );
      }
      const taken = await slugTaken(tx, slug);
      if (taken) return taken;
      await tx.blogPost.update({
        where: { id },
        data: { slug, updatedAt: row.updatedAt },
      });
      await logActivity(tx, actor, {
        action: "blog.post.renamed",
        entityId: id,
        before: { slug: row.slug },
        after: { slug, name: titleOf(row) },
      });
      return { ok: true };
    }),
  );
}

/**
 * Writes the highlighted posts' places as 1, 2, 3 in the order of `ids`,
 * and takes the place of every other post that had one, logging each
 * change. The content's version stays.
 */
async function writeHighlights(
  tx: Prisma.TransactionClient,
  actor: Actor,
  rows: readonly BlogPost[],
  ids: readonly string[],
) {
  for (const row of rows) {
    const place = ids.indexOf(row.id);
    const highlightOrder = place < 0 ? null : place + 1;
    if (row.highlightOrder === highlightOrder) continue;
    await tx.blogPost.update({
      where: { id: row.id },
      data: { highlightOrder, updatedAt: row.updatedAt },
    });
    await logActivity(tx, actor, {
      action: "blog.post.highlighted",
      entityId: row.id,
      before: { highlightOrder: row.highlightOrder },
      after: { highlightOrder },
    });
  }
}

/** The highlighted posts, in their order. */
function highlightedPosts(tx: Prisma.TransactionClient) {
  return tx.blogPost.findMany({
    where: { highlightOrder: { not: null } },
    orderBy: [{ highlightOrder: "asc" }, { slug: "asc" }],
  });
}

/**
 * Deletes a post, its draft and its public copy, and closes the gap it
 * leaves among the highlighted posts. Its address becomes a 404; its
 * publishes stay in the log.
 */
export async function deleteBlogPost(
  actor: Actor,
  id: string,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const row = await tx.blogPost.findUnique({ where: { id } });
    if (!row) return { ok: true };
    await tx.blogPost.delete({ where: { id } });
    await logActivity(tx, actor, {
      action: "blog.post.deleted",
      entityId: id,
      before: {
        slug: row.slug,
        name: titleOf(row),
        isOn: row.isOn,
      },
    });
    if (row.highlightOrder !== null) {
      const rest = await highlightedPosts(tx);
      await writeHighlights(
        tx,
        actor,
        rest,
        rest.map((post) => post.id),
      );
    }
    return { ok: true };
  });
}

/**
 * Writes the content when the stored content is still the version the
 * form was opened with. With an actor, it publishes: the content becomes
 * the public copy too, and the publish is logged when it changes what the
 * public sees.
 */
async function writeBlogPost(
  id: string,
  version: string | null,
  content: PageContent,
  publisher: Actor | null,
): Promise<PageSaved> {
  return db.$transaction(async (tx) => {
    const was = await tx.blogPost.findUnique({ where: { id } });
    if (!was) return POST_GONE;
    if (versionOf(was) !== version) return PAGE_CHANGED;
    // An image uploaded in this form and deleted on Media before it saved.
    const gone = await deletedMediaRefusal(
      tx,
      pageImageUrls(content),
      "An image",
    );
    if (gone) return gone;

    const now = new Date();
    // Conditional on the version read above, so two saves at once cannot both land.
    const { count } = await tx.blogPost.updateMany({
      where: { id, updatedAt: was.updatedAt },
      data: pageWriteData(content, publisher !== null, was, now),
    });
    if (count !== 1) return PAGE_CHANGED;

    if (publisher) {
      const before =
        was.published == null
          ? null
          : pageContentOf(BLOG_POST_KIND, was.published);
      if (publishChanges(was, before, content)) {
        const name = content.heroHeadline || was.slug;
        await logActivity(tx, publisher, {
          action: "blog.post.published",
          entityId: id,
          before: { slug: was.slug, content: before },
          after: { slug: was.slug, name, content },
        });
      }
    }
    return { ok: true, version: now.toISOString() };
  });
}

/** Overwrites the post's draft. Nothing changes in public, and nothing is logged; only the length limits are checked. */
export async function saveBlogPostDraft(
  id: string,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const content = pageContentOf(BLOG_POST_KIND, draft);
  const check = checkPageLimits(content);
  if (!check.ok) return check;
  return writeBlogPost(id, version, content, null);
}

/**
 * Saves the content and makes it the post's public copy, when it is
 * complete. The public sees it at once, on the blog and on the blog page
 * of each location it is tagged with. Publishing what is already public
 * logs nothing.
 */
export async function publishBlogPost(
  actor: Actor,
  id: string,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const content = pageContentOf(BLOG_POST_KIND, draft);
  const check = checkPageComplete(BLOG_POST_KIND, content);
  if (!check.ok) return check;
  return writeBlogPost(id, version, content, actor);
}

/**
 * Takes a post from the public and keeps its text; a highlighted one keeps
 * its place, left off the blog's home until it is published again.
 * Unpublishing what is not published logs nothing, and the content's
 * version stays, so an open form still saves.
 */
export async function unpublishBlogPost(
  actor: Actor,
  id: string,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const row = await tx.blogPost.findUnique({ where: { id } });
    if (!row) return POST_GONE;
    if (!row.isOn) return { ok: true };
    const { count } = await tx.blogPost.updateMany({
      where: { id, updatedAt: row.updatedAt },
      data: { isOn: false, updatedAt: row.updatedAt },
    });
    if (count !== 1) return refuse("The post was just saved. Try again.");
    await logActivity(tx, actor, {
      action: "blog.post.updated",
      entityId: id,
      before: { slug: row.slug, isOn: true },
      after: { slug: row.slug, name: titleOf(row), isOn: false },
    });
    return { ok: true };
  });
}

/**
 * Tags the post with these locations, and no others: each lists it on its
 * blog page. A location deleted meanwhile is refused. Saved at once,
 * whether the post is published or not; the content's version stays.
 */
export async function setBlogPostLocations(
  actor: Actor,
  id: string,
  locationIds: readonly string[],
): Promise<Change> {
  const wanted = [...new Set(locationIds)];
  return db.$transaction(async (tx) => {
    const row = await tx.blogPost.findUnique({
      where: { id },
      include: taggedLocations,
    });
    if (!row) return POST_GONE;
    const locations = await tx.location.findMany({
      where: { id: { in: wanted } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
    if (locations.length !== wanted.length) {
      return refuse(
        "A location you ticked was deleted meanwhile. Reload to see the list.",
        "locationIds",
      );
    }
    const before = row.locations.map((location) => location.name);
    const after = locations.map((location) => location.name);
    if (before.join("\n") === after.join("\n")) return { ok: true };
    await tx.blogPost.update({
      where: { id },
      data: {
        locations: { set: wanted.map((locationId) => ({ id: locationId })) },
        updatedAt: row.updatedAt,
      },
    });
    await logActivity(tx, actor, {
      action: "blog.post.tagged",
      entityId: id,
      before: { locations: before },
      after: { locations: after },
    });
    return { ok: true };
  });
}

/**
 * Adds the post to the blog's highlighted posts, at the end, takes it off,
 * or moves it a place up or down. Their places are kept as 1, 2, 3 with no
 * gaps, so every post whose place changes is written and logged. Only a
 * published post is added; one unpublished since keeps its place.
 */
export async function changeBlogHighlight(
  actor: Actor,
  id: string,
  change: PickChange,
): Promise<Change> {
  return db.$transaction(async (tx) => {
    const post = await tx.blogPost.findUnique({ where: { id } });
    if (!post) return POST_GONE;
    const current = await highlightedPosts(tx);
    const picked = current.map((row) => row.id);
    const isPicked = picked.includes(id);
    if (change === "add" && !isPicked && !post.isOn) {
      return refuse(
        "Publish the post first: only a published post is highlighted.",
      );
    }
    const ids = pickedAfter(picked, id, change, BLOG_HIGHLIGHT_CAP);
    if (ids === "full") {
      return refuse(
        `The blog highlights at most ${BLOG_HIGHLIGHT_CAP} posts. Take one off first.`,
      );
    }
    if (ids === "gone") {
      return refuse("This post is no longer highlighted. Reload to see them.");
    }
    await writeHighlights(
      tx,
      actor,
      isPicked ? current : [...current, post],
      ids,
    );
    return { ok: true };
  });
}
