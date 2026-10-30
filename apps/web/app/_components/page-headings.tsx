import type { ReactNode } from "react";
import { eyebrow as eyebrowLook } from "../(site)/_components/Page";
import { MissingPart, type EmptyPart } from "./page-parts";

/**
 * The headings of the marketing pages, each kind once: the hero's over a
 * photo (a hub, a location's page), an article's (a site document, a
 * location's post) and a home section's. Each is its eyebrow, its title
 * and the line under it; in a staff preview a missing line keeps its room
 * as a placeholder.
 */

/** The line under a title, or in a preview the placeholder that stands for it. */
function TitleLine({
  line,
  emptyLine,
  look,
  width,
}: {
  line?: ReactNode;
  emptyLine?: EmptyPart;
  look: string;
  /** The line's measure, the placeholder's too. */
  width: string;
}) {
  if (line) return <p className={`mt-4 ${width} ${look}`}>{line}</p>;
  if (!emptyLine) return null;
  return (
    <MissingPart
      part={emptyLine}
      className={`mt-4 min-h-11 ${width} rounded-xl`}
    />
  );
}

/** The hero's words over its photo: eyebrow, the page's one h1, its line. */
export function HeroHeading({
  eyebrow,
  line,
  emptyLine,
  children,
}: {
  eyebrow: ReactNode;
  line?: ReactNode;
  emptyLine?: EmptyPart;
  /** The title. */
  children: ReactNode;
}) {
  return (
    <>
      <p className={`${eyebrowLook} mt-7 mb-3`}>{eyebrow}</p>
      <h1
        id="hero-title"
        className="max-w-[18ch] font-serif text-display-lg leading-[0.98] text-ink"
      >
        {children}
      </h1>
      <TitleLine
        line={line}
        emptyLine={emptyLine}
        look="text-body sm:text-lg"
        width="max-w-[540px]"
      />
    </>
  );
}

/** An article's header words: eyebrow, the page's one h1, its line. */
export function ArticleHeading({
  eyebrow,
  line,
  emptyLine,
  children,
}: {
  eyebrow: ReactNode;
  line?: ReactNode;
  emptyLine?: EmptyPart;
  /** The title. */
  children: ReactNode;
}) {
  return (
    <>
      <p className={`${eyebrowLook} mt-8 mb-3`}>{eyebrow}</p>
      <h1
        id="hero-title"
        className="font-serif text-display leading-[1.02] text-ink"
      >
        {children}
      </h1>
      <TitleLine
        line={line}
        emptyLine={emptyLine}
        look="text-lg text-body"
        width="max-w-[640px]"
      />
    </>
  );
}

/** A home section's heading, centred by its section: eyebrow, h2, its lead. */
export function HomeSectionHeading({
  id,
  eyebrow,
  lead,
  children,
}: {
  /** The h2's id, for the section's `aria-labelledby`. */
  id: string;
  eyebrow: ReactNode;
  lead: ReactNode;
  /** The title. */
  children: ReactNode;
}) {
  return (
    <>
      <p className={`${eyebrowLook} mb-2`}>{eyebrow}</p>
      <h2 id={id} className="font-serif text-display leading-none">
        {children}
      </h2>
      <p className="mt-[13px] mb-[34px] text-lead text-muted">{lead}</p>
    </>
  );
}
