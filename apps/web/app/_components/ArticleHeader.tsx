import type { PageContent, PageKind } from "@repo/db/server";
import type { ReactNode } from "react";
import { ArticleHeading } from "./page-headings";
import {
  Breadcrumbs,
  Cover,
  MissingMark,
  emptyPartsOf,
  formatPageDate,
  gutter,
  type Crumb,
} from "./page-parts";

/**
 * The top of a page that reads as an article, with no search card: a site
 * document, a location's blog page, a blog post. Its breadcrumb, its
 * eyebrow, its title and summary, a line of dates under them, and its
 * cover. In a staff preview each empty part shows its placeholder
 * (`emptyPartsOf`). `name` stands in for an empty title.
 */
export function ArticleHeader({
  crumbs,
  eyebrow,
  kind,
  content,
  name,
  dates,
  preview,
}: {
  crumbs: readonly Crumb[];
  eyebrow: ReactNode;
  kind: PageKind;
  content: PageContent;
  name: string;
  /** Under the summary: when it was published or updated. */
  dates?: ReactNode;
  preview: boolean;
}) {
  const empty = emptyPartsOf(kind, preview);
  return (
    <header className={`pt-7 ${gutter}`}>
      <div className="mx-auto w-full max-w-[900px]">
        <Breadcrumbs crumbs={crumbs} />
        <ArticleHeading
          eyebrow={eyebrow}
          line={content.heroSubheadline}
          emptyLine={empty.subheadline}
        >
          {content.heroHeadline || name}
          {!content.heroHeadline && empty.headline && (
            <MissingMark part={empty.headline} />
          )}
        </ArticleHeading>
        {dates && <p className="mt-5 text-copy text-muted">{dates}</p>}
      </div>
      <Cover image={content.heroImage} empty={empty.heroImage} />
    </header>
  );
}

/** A date as a page's line of dates shows it, readable by machines too. */
export function PageDate({ iso }: { iso: string }) {
  return <time dateTime={iso}>{formatPageDate(iso)}</time>;
}
