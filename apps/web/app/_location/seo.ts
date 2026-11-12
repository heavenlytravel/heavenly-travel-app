import "server-only";
import {
  LANDING_PAGE,
  locationPageFallbackTitle,
  SECTIONS,
  locationPagePath,
  locationPreviewPath,
  pageNameInView,
  type LocationView,
  type LocationViewPage,
} from "@repo/db/server";
import type { Metadata } from "next";
import type { Crumb } from "../_components/page-parts";
import { breadcrumbDataOf, faqDataOf, pageMetadata } from "../_lib/seo";

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
  });
}

/** The page's `BreadcrumbList`, and its `FAQPage` when it has FAQs. Addresses are public ones. */
export function structuredDataOf(
  location: LocationView,
  page: LocationViewPage,
): object[] {
  const faqs = faqDataOf(page.content);
  return [breadcrumbDataOf(crumbsOf(location, page)), ...(faqs ? [faqs] : [])];
}
