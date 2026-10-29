import {
  PAGE_KIND_RULES,
  heroLabelsOf,
  paragraphsOf,
  type PageContent,
  type PageImage,
  type PageKind,
} from "@repo/db";
import { Badge } from "@repo/ui/badge";
import Image from "next/image";
import type { ReactNode } from "react";

function Part({
  label,
  changed,
  children,
}: {
  label: string;
  changed: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-xs font-semibold text-muted">
        {label}
        {changed ? <Badge tone="amber">Changed</Badge> : null}
      </dt>
      <dd className="mt-1 text-sm text-ink">{children}</dd>
    </div>
  );
}

const NONE = <span className="text-muted">None</span>;

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
      <span className="text-xs text-muted">Alt text: {image.alt}</span>
      <a
        href={image.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs font-semibold text-brand underline-offset-4 hover:underline"
      >
        Open the file
      </a>
    </div>
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
      <Part label="Meta title" changed={changed("metaTitle")}>
        {content.metaTitle || NONE}
      </Part>
      <Part label="Meta description" changed={changed("metaDescription")}>
        {content.metaDescription || NONE}
      </Part>
      <Part label="Search engines" changed={changed("indexable")}>
        {content.indexable ? "Shown" : "Hidden"}
      </Part>
      <Part label="Share image" changed={changed("shareImage")}>
        {content.shareImage ? (
          <Picture image={content.shareImage} />
        ) : (
          <span className="text-muted">The hero image</span>
        )}
      </Part>
      {rule.tagline ? (
        <Part label="Tagline" changed={changed("tagline")}>
          {content.tagline || NONE}
        </Part>
      ) : null}
      <Part label={labels.headline} changed={changed("heroHeadline")}>
        {content.heroHeadline || NONE}
      </Part>
      <Part label={labels.subheadline} changed={changed("heroSubheadline")}>
        {content.heroSubheadline || NONE}
      </Part>
      <Part label="Hero image" changed={changed("heroImage")}>
        <Picture image={content.heroImage} />
      </Part>
      {rule.address ? (
        <Part label="Saved address" changed={changed("addressId")}>
          {content.addressId === null
            ? NONE
            : (addressNames.get(content.addressId) ??
              "One that has since been removed")}
        </Part>
      ) : null}
      {rule.intro !== "none" ? (
        <Part label="Intro" changed={changed("intro")}>
          <Paragraphs text={content.intro} />
        </Part>
      ) : null}
      {rule.body ? (
        <Part label="Text" changed={changed("body")}>
          {content.body ? (
            <pre className="max-h-[480px] overflow-auto rounded-md bg-shade p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap text-body">
              {content.body}
            </pre>
          ) : (
            NONE
          )}
        </Part>
      ) : null}
      <Part label="FAQs" changed={changed("faqs")}>
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
      </Part>
    </dl>
  );
}
