import {
  blogPostPath,
  blogPostPreviewPath,
  type BlogPostView,
} from "@repo/db/server";
import {
  Lead,
  MissingPart,
  PageCards,
  Section,
  formatPageDate,
  missingBlock,
  type EmptyPart,
} from "../_components/page-parts";
import type { ReactNode } from "react";

/**
 * The blog's posts as cards, wherever they are listed: the blog's home,
 * every post, a location's blog page and its main page, the foot of a
 * post. Each card shows the cover, the title, the first publish date and
 * the summary, and opens the post; in a staff preview, its preview.
 */
export function BlogCards({
  id,
  eyebrow,
  title,
  posts,
  action,
  lead = "",
  emptyLead,
  empty,
  preview,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  posts: readonly BlogPostView[];
  /** A link beside the heading: "View all". */
  action?: ReactNode;
  /** Plain paragraphs under the heading: a location's blog intro. */
  lead?: string;
  /** In a preview, what stands in for an empty lead. */
  emptyLead?: EmptyPart;
  /** In a preview, what stands in while no post is listed. */
  empty?: EmptyPart;
  preview: boolean;
}) {
  if (posts.length === 0 && lead === "" && !emptyLead && !empty) return null;
  const pathOf = preview ? blogPostPreviewPath : blogPostPath;
  return (
    <Section id={id} eyebrow={eyebrow} title={title} action={action}>
      <Lead text={lead} empty={emptyLead} />
      {posts.length > 0 ? (
        <PageCards
          cards={posts.map((post) => ({
            key: post.slug,
            href: pathOf(post.slug),
            title: post.content.heroHeadline || post.slug,
            text: post.firstPublishedAt
              ? `${formatPageDate(post.firstPublishedAt)} · ${post.content.heroSubheadline}`
              : post.content.heroSubheadline,
            image: post.content.heroImage,
          }))}
        />
      ) : (
        empty && <MissingPart part={empty} className={missingBlock} />
      )}
    </Section>
  );
}
