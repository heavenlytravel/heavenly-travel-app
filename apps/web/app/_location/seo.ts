import "server-only";
import {
  LANDING_PAGE,
  SITE_NAME,
  locationPageFallbackTitle,
  SECTIONS,
  SITE_URL,
  locationPagePath,
  locationPreviewPath,
  pageNameInView,
  type LocationView,
  type LocationViewPage,
} from "@repo/db/server";
import type { Metadata } from "next";
import type { Crumb } from "../_components/page-parts";
import { faqDataOf, pageMetadata } from "../_lib/seo";

/**
 * What a location page tells search engines and link previews: its
 * metadata (../_lib/seo) and its structured data, with the breadcrumb
 * through its section. See docs/261001-locations-and-pages.md, "Search
 * engines".
 */

/**
 * The page's steps from the home page, as its breadcrumb shows them:
 * home, the location, then the section on a section's page, then the page
 * itself under a section. `preview` keeps the links in the preview.
 */
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
  if (page.page === LANDING_PAGE) return crumbs;
  crumbs.push({
    name: SECTIONS[page.page].label,
    path: pathOf(location.slug, { page: page.page, slug: "" }),
  });
  if (page.slug !== "") {
    crumbs.push({
      name: pageNameInView(location, page),
      path: pathOf(location.slug, page),
    });
  }
  return crumbs;
}

/** A location page's metadata, as `pageMetadata` makes it. */
export function locationMetadata(
  location: LocationView,
  page: LocationViewPage,
  preview = false,
): Metadata {
  const name = pageNameInView(location, page);
  return pageMetadata(page.content, {
    path: locationPagePath(location.slug, page),
    fallbackTitle: locationPageFallbackTitle(location.name, page, name),
    preview,
    article:
      page.kind === "article"
        ? {
            publishedTime: page.firstPublishedAt,
            modifiedTime: page.publishedAt,
          }
        : undefined,
  });
}

/**
 * The page's `BreadcrumbList`, its `FAQPage` when it has FAQs, and on a post
 * its `Article`. Addresses are public ones.
 */
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
  const faqs = faqDataOf(page.content);
  if (faqs) data.push(faqs);
  if (page.kind === "article") {
    const { heroHeadline, heroSubheadline, heroImage } = page.content;
    data.push({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: heroHeadline,
      description: heroSubheadline,
      image: heroImage ? [heroImage.url] : undefined,
      datePublished: page.firstPublishedAt ?? undefined,
      dateModified: page.publishedAt ?? undefined,
      mainEntityOfPage: SITE_URL + locationPagePath(location.slug, page),
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
    });
  }
  return data;
}
