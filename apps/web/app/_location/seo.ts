import "server-only";
import {
  LANDING_PAGE,
  LOCATION_PAGE_LABELS,
  SITE_URL,
  locationPagePath,
  locationPreviewPath,
  paragraphsOf,
  type LocationView,
  type LocationViewPage,
} from "@repo/db/server";
import type { Metadata } from "next";

/**
 * What a location page tells search engines and link previews: its
 * metadata, with the canonical address on `SITE_URL` so it follows the host
 * at cutover, and its structured data. See
 * docs/261001-locations-and-pages.md, "Search engines".
 */

const SITE_NAME = "Heavenly Travel";

/** The page's steps from the home page, as its breadcrumb shows them. */
export type Crumb = { name: string; path: string };

/** Home, the location, then the product on a product page. `preview` keeps the links in the preview. */
export function crumbsOf(
  location: LocationView,
  page: LocationViewPage,
  preview = false,
): Crumb[] {
  const pathOf = preview ? locationPreviewPath : locationPagePath;
  const crumbs: Crumb[] = [
    { name: "Home", path: "/" },
    { name: location.name, path: pathOf(location.slug) },
  ];
  if (page.page !== LANDING_PAGE) {
    crumbs.push({
      name: LOCATION_PAGE_LABELS[page.page],
      path: pathOf(location.slug, page.page),
    });
  }
  return crumbs;
}

/**
 * The page's title, description, canonical address and share image, which
 * is the hero image. The preview has no canonical address and is never
 * listed.
 */
export function locationMetadata(
  location: LocationView,
  page: LocationViewPage,
  preview = false,
): Metadata {
  const { metaTitle, metaDescription, heroImage } = page.content;
  const title = metaTitle || `${location.name} | ${SITE_NAME}`;
  if (preview) {
    return { title: `Preview: ${title}`, robots: { index: false } };
  }
  const url = SITE_URL + locationPagePath(location.slug, page.page);
  return {
    title,
    description: metaDescription,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description: metaDescription,
      url,
      images: heroImage
        ? [
            {
              url: heroImage.url,
              width: heroImage.width,
              height: heroImage.height,
              alt: heroImage.alt,
            },
          ]
        : undefined,
    },
  };
}

/** The page's `BreadcrumbList`, and its `FAQPage` when it has FAQs. Addresses are public ones. */
export function structuredDataOf(
  location: LocationView,
  page: LocationViewPage,
): object[] {
  const data: object[] = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: crumbsOf(location, page).map((crumb, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: crumb.name,
        item: SITE_URL + crumb.path,
      })),
    },
  ];
  const faqs = page.content.faqs.filter((faq) => faq.question && faq.answer);
  if (faqs.length > 0) {
    data.push({
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
    });
  }
  return data;
}
