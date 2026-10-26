import "server-only";
import {
  SITE_NAME,
  SITE_URL,
  paragraphsOf,
  type PageContent,
} from "@repo/db/server";
import type { Metadata } from "next";

/**
 * What a marketing page tells search engines and link previews, a
 * location's or the site's: its metadata, with the canonical address on
 * `SITE_URL` so it follows the host at cutover, and the structured data of
 * its FAQs. See docs/261001-locations-and-pages.md, "Search engines".
 */

/**
 * A page's title, description, canonical address and share image: the
 * one Marketing set for shared links, else the hero image, shown as a large
 * card. `fallbackTitle` stands in while no meta title is written. The
 * preview has no canonical address and is never listed.
 */
export function pageMetadata(
  content: PageContent,
  {
    path,
    fallbackTitle,
    preview = false,
    article,
  }: {
    path: string;
    fallbackTitle: string;
    preview?: boolean;
    /** A post's dates, as text. */
    article?: { publishedTime: string | null; modifiedTime: string | null };
  },
): Metadata {
  const { metaTitle, metaDescription, shareImage, heroImage } = content;
  const shared = shareImage ?? heroImage;
  const title = metaTitle || fallbackTitle;
  if (preview) {
    return { title: `Preview: ${title}`, robots: { index: false } };
  }
  const url = SITE_URL + path;
  return {
    title,
    description: metaDescription,
    // Marketing turned it off: not listed, its links still followed.
    ...(content.indexable ? {} : { robots: { index: false, follow: true } }),
    alternates: { canonical: url },
    openGraph: {
      ...(article
        ? {
            type: "article",
            publishedTime: article.publishedTime ?? undefined,
            modifiedTime: article.modifiedTime ?? undefined,
          }
        : { type: "website" }),
      siteName: SITE_NAME,
      title,
      description: metaDescription,
      url,
      images: shared
        ? [
            {
              url: shared.url,
              width: shared.width,
              height: shared.height,
              alt: shared.alt,
            },
          ]
        : undefined,
    },
    twitter: { card: shared ? "summary_large_image" : "summary" },
  };
}

/** The `FAQPage` of a page's FAQs, those with a question and an answer; null for none. */
export function faqDataOf(content: PageContent): object | null {
  const faqs = content.faqs.filter((faq) => faq.question && faq.answer);
  if (faqs.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: paragraphsOf(faq.answer).join("\n"),
      },
    })),
  };
}
