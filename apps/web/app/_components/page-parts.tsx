import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  PAGE_KIND_RULES,
  PAGE_LIMITS,
  heroLabelsOf,
  imageSizeOf,
  paragraphsOf,
  type PageFaq,
  type PageImage,
  type PageKind,
} from "@repo/db";
import { Markdown } from "@repo/ui/markdown";
import { eyebrow } from "../(site)/_components/Page";

/**
 * The parts the marketing pages are built of, a location's and the site's
 * alike: a section with its heading, the intro, a text in Markdown, the
 * FAQs, a grid of cards that each open a page, and the links at the foot.
 * Each leaves itself out of a public page when it has nothing to show, so
 * a half-written draft still reads. In a staff preview, given what goes
 * there (`emptyPartsOf`), it keeps its frame, its heading and its room,
 * and a dashed placeholder takes the place of what is missing, so
 * Marketing sees the page as it will read and what it still needs. In the
 * family of the home page (docs/260923-home-design.md).
 */

export const gutter = "px-5 sm:px-[clamp(20px,5vw,78px)]";
export const column = "mx-auto w-full max-w-[1240px]";
export const heading = "font-serif text-display-sm leading-[1.05] text-ink";

/** The room above a part of the page and at its sides, as every section has it. */
const sectionBand = `pt-[60px] sm:pt-[88px] ${gutter}`;

/**
 * What a staff preview says where a part has nothing in it, in a few
 * words: what to add when a publish needs it, "Add an intro to publish",
 * or that it may stay empty, "No FAQs yet · optional". A public page never
 * shows one.
 */
export type EmptyPart = string;

/** The placeholders of the parts a page's kind holds, by part; none on a public page. */
type EmptyParts = Partial<
  Record<
    | "headline"
    | "subheadline"
    | "tagline"
    | "heroImage"
    | "address"
    | "intro"
    | "body"
    | "faqs",
    EmptyPart
  >
>;

/** A part a publish needs: "Add an intro to publish". */
const neededPart = (what: string): EmptyPart => `Add ${what} to publish`;

/** A part that may stay empty: "No FAQs yet · optional". */
const optionalPart = (what: string): EmptyPart => `No ${what} yet · optional`;

/**
 * What a staff preview shows in place of each part a page of the kind
 * holds, while that part is empty: worded from the kind's rules, as the
 * editor's checks are (`pageChecks`), which also give the limits. On a
 * public page, nothing: an empty part is left out.
 */
export function emptyPartsOf(kind: PageKind, preview: boolean): EmptyParts {
  if (!preview) return {};
  const rule = PAGE_KIND_RULES[kind];
  const labels = heroLabelsOf(kind);
  return {
    headline: neededPart(`a ${labels.headline.toLowerCase()}`),
    subheadline: neededPart(`a ${labels.subheadline.toLowerCase()}`),
    tagline: rule.tagline ? optionalPart("tagline") : undefined,
    heroImage:
      rule.heroImage === "required"
        ? neededPart("a hero image")
        : optionalPart("hero image"),
    address: rule.address ? optionalPart("saved address") : undefined,
    intro:
      rule.intro === "required"
        ? neededPart("an intro")
        : rule.intro === "optional"
          ? optionalPart("intro")
          : undefined,
    body: rule.body ? neededPart("the text") : undefined,
    faqs:
      rule.faqs === "required"
        ? neededPart(`at least ${PAGE_LIMITS.minFaqs} FAQs`)
        : optionalPart("FAQs"),
  };
}

/** How a placeholder looks: a dashed frame on a pale wash of the primary. */
const dashed = "border-dashed border-azure/40 bg-brand-tint/40";

/** The placeholder's look for an area that keeps its own shape, such as a hero's photo. */
export const missingLook = `border-2 ${dashed}`;

/** The shape of a placeholder where a block goes: paragraphs, questions, cards. */
export const missingBlock = "min-h-[180px] rounded-card";

/**
 * A placeholder: a dashed box where the part's content would go, with its
 * few words. `className` gives it the shape of what it stands in for: its
 * size, its rounding and the room around it, as `missingBlock` does.
 */
export function MissingPart({
  part,
  className = "",
}: {
  part: EmptyPart;
  className?: string;
}) {
  return (
    <p
      className={`flex items-center justify-center ${missingLook} px-5 py-2 text-center text-copy font-semibold text-slate-600 ${className}`}
    >
      {part}
    </p>
  );
}

/**
 * The small mark a preview puts beside a part that shows a stand-in while
 * it is empty, such as a headline showing the page's name, with the part's
 * few words. `alone` when it has a line of its own, as over a hero without
 * its photo.
 */
export function MissingMark({
  part,
  alone = false,
}: {
  part: EmptyPart;
  alone?: boolean;
}) {
  return (
    <span
      className={`${alone ? "" : "ml-3"} inline-block rounded-full border ${dashed} px-2.5 py-0.5 align-middle font-sans text-xs leading-normal font-bold tracking-normal text-slate-600 normal-case`}
    >
      {part}
    </span>
  );
}

export function Section({
  id,
  eyebrow: above,
  title,
  action,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  /** A link beside the heading: "All popular places". */
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-title`} className={sectionBand}>
      <div className={column}>
        {above && <p className={`${eyebrow} mb-2`}>{above}</p>}
        <div className="mb-7 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
          <h2 id={`${id}-title`} className={heading}>
            {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

/** The intro: its title beside its paragraphs from lg up. */
export function Intro({
  title,
  text,
  empty,
}: {
  title: string;
  text: string;
  /** In a preview, what stands in for an empty intro. */
  empty?: EmptyPart;
}) {
  const paragraphs = paragraphsOf(text);
  if (paragraphs.length === 0 && !empty) return null;
  return (
    <section aria-labelledby="intro-title" className={sectionBand}>
      <div className={`${column} grid gap-x-16 gap-y-6 lg:grid-cols-[1fr_2fr]`}>
        <h2 id="intro-title" className={heading}>
          {title}
        </h2>
        {paragraphs.length > 0 ? (
          <div className="grid max-w-[70ch] gap-4 text-lead leading-relaxed text-slate-700">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        ) : (
          empty && (
            <MissingPart
              part={empty}
              className={`${missingBlock} max-w-[70ch]`}
            />
          )
        )}
      </div>
    </section>
  );
}

/** How a text in Markdown reads on the site: the home page's type, a measure for reading. */
const PROSE = [
  "max-w-[70ch] text-lead leading-relaxed text-slate-700",
  "[&_h2]:mt-11 [&_h2]:mb-3 [&_h2]:font-serif [&_h2]:text-heading [&_h2]:leading-tight [&_h2]:text-ink",
  "[&_h3]:mt-8 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-ink",
  "[&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:font-bold [&_h4]:text-ink",
  "[&_p]:my-4 [&_strong]:text-ink",
  "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5 [&_li]:pl-1",
  "[&_a]:font-semibold [&_a]:text-brand [&_a]:underline [&_a]:underline-offset-4",
  "[&_blockquote]:my-7 [&_blockquote]:border-l-4 [&_blockquote]:border-azure [&_blockquote]:pl-5 [&_blockquote]:text-lg [&_blockquote]:text-ink",
  "[&_img]:my-8 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-card [&_img]:bg-mist",
  "[&_hr]:my-10 [&_hr]:border-slate-200",
  "[&_table]:my-6 [&_table]:w-full [&_table]:text-copy [&_th]:border-b [&_th]:border-slate-300 [&_th]:py-2 [&_th]:pr-4 [&_th]:text-left [&_th]:text-ink [&_td]:border-b [&_td]:border-slate-100 [&_td]:py-2 [&_td]:pr-4",
  "[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:text-[0.92em] [&_pre]:my-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-slate-100 [&_pre]:p-4",
  "[&>div>:first-child]:mt-0",
].join(" ");

/** A post's or a document's text. */
export function Prose({
  text,
  empty,
}: {
  text: string;
  /** In a preview, what stands in for an empty text. */
  empty?: EmptyPart;
}) {
  if (text === "") {
    return empty ? (
      <MissingPart part={empty} className={`${missingBlock} max-w-[70ch]`} />
    ) : null;
  }
  return <Markdown text={text} className={PROSE} sizeOf={imageSizeOf} />;
}

/** The frame of the picture under a post's or a document's title. */
const coverFrame =
  "mx-auto mt-9 aspect-[16/9] w-full max-w-[1100px] rounded-panel";

/**
 * The picture under a post's or a document's title. In a preview with
 * none, a placeholder in the picture's frame.
 */
export function Cover({
  image,
  empty,
}: {
  image: PageImage | null;
  /** In a preview, what stands in for a missing picture. */
  empty?: EmptyPart;
}) {
  if (!image) {
    return empty ? <MissingPart part={empty} className={coverFrame} /> : null;
  }
  return (
    <div className={`relative ${coverFrame} overflow-hidden bg-mist`}>
      <Image
        src={image.url}
        alt={image.alt}
        fill
        preload
        sizes="(min-width: 1100px) 1100px, 100vw"
        className="object-cover"
      />
    </div>
  );
}

/** The FAQs: each a question that opens its answer. */
export function Faqs({
  title,
  faqs,
  empty,
}: {
  title: string;
  faqs: PageFaq[];
  /** In a preview, what stands in when no FAQ has both its question and its answer. */
  empty?: EmptyPart;
}) {
  const filled = faqs.filter((faq) => faq.question && faq.answer);
  if (filled.length === 0 && !empty) return null;
  return (
    <Section id="faqs" eyebrow="Good to know" title={title}>
      {filled.length > 0 ? (
        <div className="max-w-[820px] border-t border-slate-200">
          {filled.map((faq, i) => (
            <details key={i} className="group border-b border-slate-200">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-5 text-lead font-semibold text-ink focus-ring [&::-webkit-details-marker]:hidden">
                {faq.question}
                <span
                  aria-hidden
                  className="mt-0.5 text-xl leading-none text-brand transition-transform group-open:rotate-45 motion-reduce:transition-none"
                >
                  +
                </span>
              </summary>
              <div className="grid max-w-[70ch] gap-3 pb-6 text-slate-700">
                {paragraphsOf(faq.answer).map((paragraph, j) => (
                  <p key={j}>{paragraph}</p>
                ))}
              </div>
            </details>
          ))}
        </div>
      ) : (
        empty && (
          <MissingPart
            part={empty}
            className={`${missingBlock} max-w-[820px]`}
          />
        )
      )}
    </Section>
  );
}

/** One card that opens a page: its hero image, its name and its line. */
export type PageCardData = {
  key: string;
  href: string;
  title: string;
  text: string;
  image: PageImage | null;
  /** A small mark over the picture: "Soon". */
  badge?: string;
  /** Under the text, what the card leads to: "See vehicles and prices". */
  cta?: string;
  /** Something to press besides the card itself, such as "Take me here". */
  extra?: ReactNode;
};

/**
 * A grid of cards, each opening its page. The title's link covers the card,
 * so the whole card opens it, and an extra button inside stays its own.
 */
export function PageCards({
  cards,
  columns = 3,
}: {
  cards: PageCardData[];
  columns?: 2 | 3;
}) {
  if (cards.length === 0) return null;
  return (
    <ul
      className={`grid gap-x-5 gap-y-9 sm:grid-cols-2 ${columns === 3 ? "lg:grid-cols-3" : ""}`}
    >
      {cards.map((card) => (
        <li key={card.key} className="group relative flex flex-col items-start">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card bg-mist">
            {card.image && (
              <Image
                src={card.image.url}
                alt={card.image.alt}
                fill
                sizes="(min-width: 64rem) 400px, (min-width: 40rem) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03] motion-reduce:transition-none"
              />
            )}
            {card.badge && (
              <span className="absolute top-3 left-3 rounded-full bg-white/95 px-3 py-1 text-caps font-bold text-brand">
                {card.badge}
              </span>
            )}
          </div>
          <h3 className="mt-4 font-serif text-2xl leading-tight text-ink">
            <Link
              href={card.href}
              className="after:absolute after:inset-0 after:rounded-card after:content-[''] hover:text-brand focus-ring"
            >
              {card.title}
            </Link>
          </h3>
          {card.text && <p className="mt-1.5 text-slate-700">{card.text}</p>}
          {card.cta && (
            <span className="mt-3 text-copy font-bold text-brand underline-offset-4 group-hover:underline">
              {card.cta}{" "}
              <span aria-hidden className="ml-1.5">
                →
              </span>
            </span>
          )}
          {card.extra && <div className="relative z-[1]">{card.extra}</div>}
        </li>
      ))}
    </ul>
  );
}

/** A step of a page's breadcrumb from the home page: its name and where it opens. */
export type Crumb = { name: string; path: string };

/**
 * A page's breadcrumb, "Home / Langkawi / Car with driver": each step a
 * link but the last, the page itself. On a touch screen each link's hit
 * area grows to a finger's, without moving the line.
 */
export function Breadcrumbs({ crumbs }: { crumbs: readonly Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 text-caption text-slate-700">
        {crumbs.map((crumb, i) => (
          <li key={crumb.path} className="flex items-center gap-x-2">
            {i === crumbs.length - 1 ? (
              <span aria-current="page" className="font-semibold">
                {crumb.name}
              </span>
            ) : (
              <>
                <Link
                  href={crumb.path}
                  className="touch-target underline-offset-4 hover:underline focus-ring"
                >
                  {crumb.name}
                </Link>
                <span aria-hidden>/</span>
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** The breadcrumb of a page of the site's own, one step under the home page: "Home / About us". */
export function HomeCrumbs({ current }: { current: string }) {
  return (
    <Breadcrumbs
      crumbs={[
        { name: "Home", path: "/" },
        { name: current, path: "" },
      ]}
    />
  );
}

/** A link at the foot of a page or beside a heading, with its arrow. */
export function MoreLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="font-bold text-brand underline-offset-4 hover:underline focus-ring"
    >
      {children}{" "}
      <span aria-hidden className="ml-1.5">
        →
      </span>
    </Link>
  );
}

/** The structured data a page carries, one script each; "<" is escaped so no text Marketing wrote can close the script. */
export function JsonLd({ data }: { data: object[] }) {
  return data.map((entry, i) => (
    <script
      key={i}
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(entry).replace(/</g, "\\u003c"),
      }}
    />
  ));
}

/** A date as the site writes it: "25 October 2026". */
export function formatPageDate(iso: string) {
  return new Intl.DateTimeFormat("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  }).format(new Date(iso));
}
