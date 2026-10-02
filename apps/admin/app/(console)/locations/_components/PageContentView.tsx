import {
  LANDING_PAGE,
  paragraphsOf,
  type LocationPageKey,
  type PageContent,
  type PageImage,
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
      <dt className="flex items-center gap-2 text-xs font-medium text-neutral-500">
        {label}
        {changed ? <Badge tone="amber">Changed</Badge> : null}
      </dt>
      <dd className="mt-1 text-sm text-neutral-900">{children}</dd>
    </div>
  );
}

const NONE = <span className="text-neutral-400">None</span>;

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
        className="h-28 w-auto max-w-full rounded-md border border-neutral-200 object-contain"
      />
      <span className="text-xs text-neutral-600">Alt text: {image.alt}</span>
      <a
        href={image.url}
        target="_blank"
        rel="noreferrer"
        className="text-xs text-neutral-600 underline underline-offset-4"
      >
        Open the file
      </a>
    </div>
  );
}

/**
 * The content of a page, read-only, in the order of the editor: every text
 * in full, to be read and copied back by hand. Beside another content, each
 * part that differs from it is marked.
 */
export function PageContentView({
  page,
  content,
  comparedTo,
  addressNames,
}: {
  page: LocationPageKey;
  content: PageContent;
  /** The content on the other side of a publish; absent when there is none. */
  comparedTo?: PageContent;
  /** The location's saved addresses by id, to name the one a highlight points at. */
  addressNames: ReadonlyMap<string, string>;
}) {
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
      <Part label="Hero headline" changed={changed("heroHeadline")}>
        {content.heroHeadline || NONE}
      </Part>
      <Part label="Hero subheadline" changed={changed("heroSubheadline")}>
        {content.heroSubheadline || NONE}
      </Part>
      <Part label="Hero image" changed={changed("heroImage")}>
        <Picture image={content.heroImage} />
      </Part>
      <Part label="Intro" changed={changed("intro")}>
        <Paragraphs text={content.intro} />
      </Part>
      <Part label="FAQs" changed={changed("faqs")}>
        {content.faqs.length === 0 ? (
          NONE
        ) : (
          <ol className="grid gap-3">
            {content.faqs.map((faq, i) => (
              <li key={i}>
                <p className="font-medium">{faq.question}</p>
                <div className="mt-1 text-neutral-700">
                  <Paragraphs text={faq.answer} />
                </div>
              </li>
            ))}
          </ol>
        )}
      </Part>
      {page === LANDING_PAGE ? (
        <Part label="Highlights" changed={changed("highlights")}>
          {content.highlights.length === 0 ? (
            NONE
          ) : (
            <ol className="grid gap-4">
              {content.highlights.map((highlight, i) => {
                const address =
                  highlight.addressId === null
                    ? null
                    : addressNames.get(highlight.addressId);
                return (
                  <li key={i} className="grid gap-1.5">
                    <p className="font-medium">{highlight.name}</p>
                    <p className="text-neutral-700">{highlight.text}</p>
                    <Picture image={highlight.image} />
                    <p className="text-xs text-neutral-600">
                      Saved address:{" "}
                      {highlight.addressId === null
                        ? "none"
                        : (address ?? "one that has since been removed")}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </Part>
      ) : null}
    </dl>
  );
}
