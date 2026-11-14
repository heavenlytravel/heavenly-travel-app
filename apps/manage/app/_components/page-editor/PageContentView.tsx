import {
  PAGE_KIND_RULES,
  SECTION_LABELS,
  SITE_LINK_KIND_LABELS,
  heroLabelsOf,
  paragraphsOf,
  plural,
  siteLinkHref,
  type PageContent,
  type PageImage,
  type PageKind,
  type PageSection,
} from "@repo/db";
import Image from "next/image";
import { ContentPart, NONE } from "./ContentPart";

function Paragraphs({ text }: { text: string }) {
  const paragraphs = paragraphsOf(text);
  if (paragraphs.length === 0) return NONE;
  return (
    <div className="grid gap-2">
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

function Picture({ image }: { image: PageImage | null }) {
  if (!image) return NONE;
  return (
    <div className="grid gap-1.5">
      <Image
        src={image.url}
        width={image.width}
        height={image.height}
        alt={image.alt}
        sizes="240px"
        className="h-28 w-auto max-w-full rounded-md border border-card-edge object-contain"
      />
      <span className="text-xs text-muted">Alt Text: {image.alt}</span>
      <a
        href={image.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-brand underline-offset-4 hover:underline"
      >
        Open the File
      </a>
    </div>
  );
}

/** What a section holds, in a few words or a short list. */
function SectionItems({ section }: { section: PageSection }) {
  const list = (lines: string[]) =>
    lines.length === 0 ? (
      <span className="text-muted">Nothing in it</span>
    ) : (
      <ol className="list-decimal pl-5">
        {lines.map((line, i) => (
          <li key={i}>{line}</li>
        ))}
      </ol>
    );
  switch (section.type) {
    case "why-us":
      return list(section.points.map((p) => `${p.title}: ${p.text}`));
    case "services":
      return list(
        section.cards.map(
          (c) =>
            `${c.title} · "${c.button}" · ${SITE_LINK_KIND_LABELS[c.link.kind]} ${siteLinkHref(c.link)}`,
        ),
      );
    case "vehicles":
      return <span>{plural(section.classIds.length, "class", "classes")}</span>;
    case "steps":
      return list(section.steps.map((s) => `${s.title}: ${s.text}`));
    case "trusted-by":
      return list(
        section.logos.map((l) => (l.link ? `${l.name} · ${l.link}` : l.name)),
      );
    case "testimonials":
      return list(
        section.quotes.map(
          (q) => `“${q.quote}” · ${q.name}${q.detail ? `, ${q.detail}` : ""}`,
        ),
      );
    case "news":
      return <span>The newest {plural(section.count, "post")}</span>;
    case "destinations":
    case "locations":
      return <span className="text-muted">Read from the site</span>;
  }
}

/** The sections, in their order: each shown or hidden, its heading and what it holds. */
function Sections({ sections }: { sections: readonly PageSection[] }) {
  if (sections.length === 0) return NONE;
  return (
    <ol className="grid gap-3">
      {sections.map((section) => (
        <li key={section.type}>
          <p className="font-medium">
            {SECTION_LABELS[section.type]}{" "}
            <span className="font-normal text-muted">
              · {section.on ? "Shown" : "Hidden"}
            </span>
          </p>
          {section.eyebrow || section.title || section.lead ? (
            <p className="text-body">
              {[section.eyebrow, section.title, section.lead]
                .filter(Boolean)
                .join(" · ")}
            </p>
          ) : null}
          <div className="mt-1 text-body">
            <SectionItems section={section} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * The content of a page, read-only, in the order of the editor: every part
 * its kind holds, every text in full, to be read and copied back by hand. A
 * text in Markdown is shown as written. Beside another content, each part
 * that differs from it is marked.
 */
export function PageContentView({
  kind,
  content,
  comparedTo,
  addressNames,
}: {
  kind: PageKind;
  content: PageContent;
  /** The content on the other side of a publish; absent when there is none. */
  comparedTo?: PageContent;
  /** The location's saved addresses by id, to name the one a place points at. */
  addressNames: ReadonlyMap<string, string>;
}) {
  const rule = PAGE_KIND_RULES[kind];
  const labels = heroLabelsOf(kind);
  const changed = (key: keyof PageContent) =>
    comparedTo !== undefined &&
    JSON.stringify(content[key]) !== JSON.stringify(comparedTo[key]);

  return (
    <dl className="grid gap-4">
      <ContentPart label="Meta Title" changed={changed("metaTitle")}>
        {content.metaTitle || NONE}
      </ContentPart>
      <ContentPart
        label="Meta Description"
        changed={changed("metaDescription")}
      >
        {content.metaDescription || NONE}
      </ContentPart>
      <ContentPart label="Search Engines" changed={changed("indexable")}>
        {content.indexable ? "Shown" : "Hidden"}
      </ContentPart>
      <ContentPart label="Share Image" changed={changed("shareImage")}>
        {content.shareImage ? (
          <Picture image={content.shareImage} />
        ) : (
          <span className="text-muted">The hero image</span>
        )}
      </ContentPart>
      {rule.tagline ? (
        <ContentPart label="Tagline" changed={changed("tagline")}>
          {content.tagline || NONE}
        </ContentPart>
      ) : null}
      <ContentPart label={labels.headline} changed={changed("heroHeadline")}>
        {content.heroHeadline || NONE}
      </ContentPart>
      <ContentPart
        label={labels.subheadline}
        changed={changed("heroSubheadline")}
      >
        {content.heroSubheadline || NONE}
      </ContentPart>
      <ContentPart label="Hero Image" changed={changed("heroImage")}>
        <Picture image={content.heroImage} />
      </ContentPart>
      {rule.address ? (
        <ContentPart label="Saved Address" changed={changed("addressId")}>
          {content.addressId === null
            ? NONE
            : (addressNames.get(content.addressId) ??
              "One that has since been removed")}
        </ContentPart>
      ) : null}
      {rule.intro !== "none" ? (
        <ContentPart label="Intro" changed={changed("intro")}>
          <Paragraphs text={content.intro} />
        </ContentPart>
      ) : null}
      {rule.body ? (
        <ContentPart label="Text" changed={changed("body")}>
          {content.body ? (
            <pre className="max-h-[480px] overflow-auto rounded-md bg-shade p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-body">
              {content.body}
            </pre>
          ) : (
            NONE
          )}
        </ContentPart>
      ) : null}
      {rule.sections ? (
        <ContentPart label="Sections" changed={changed("sections")}>
          <Sections sections={content.sections} />
        </ContentPart>
      ) : null}
      <ContentPart label="FAQs" changed={changed("faqs")}>
        {content.faqs.length === 0 ? (
          NONE
        ) : (
          <ol className="grid gap-3">
            {content.faqs.map((faq, i) => (
              <li key={i}>
                <p className="font-medium">{faq.question}</p>
                <div className="mt-1 text-body">
                  <Paragraphs text={faq.answer} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </ContentPart>
    </dl>
  );
}
