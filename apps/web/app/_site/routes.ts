import "server-only";
import {
  getAdminAccess,
  pageStatusOf,
  sitePageFallbackTitle,
  sitePagePath,
  sitePagePreviewPath,
  type PageStatus,
  type SitePageDetails,
  type SitePageKey,
} from "@repo/db/server";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { signInHref } from "../_lib/routes";
import { pageMetadata } from "../_lib/seo";
import { publishedSitePage, sitePageDraft } from "../_lib/site-pages";

/**
 * What a site page's route shows: the published document, or for staff the
 * draft, with whoever may not see it answered here, by a 404 or the
 * sign-in. The routes themselves are thin.
 */

/** A published document; a 404 while it is not published. */
export async function publishedDocumentAt(page: SitePageKey) {
  const shown = await publishedSitePage(page);
  if (!shown) notFound();
  return shown;
}

/** A published document's metadata. */
export async function documentMetadata(page: SitePageKey): Promise<Metadata> {
  const shown = await publishedSitePage(page);
  if (!shown) return {};
  return pageMetadata(shown.content, {
    path: sitePagePath(page),
    fallbackTitle: sitePageFallbackTitle(page),
  });
}

/**
 * The staff preview of a site page: its draft, for a signed-in admin who
 * holds `website.manage`. A signed-out visitor is sent to sign in and
 * comes back here; anyone else gets a 404.
 */
export async function previewSitePageAt(
  page: SitePageKey,
): Promise<SitePageDetails & { status: PageStatus }> {
  const access = await getAdminAccess("website.manage");
  if (access.status === "signed-out") {
    redirect(signInHref(sitePagePreviewPath(page)));
  }
  if (access.status !== "ok") notFound();
  const details = await sitePageDraft(page);
  return { ...details, status: pageStatusOf(details.draft, details.published) };
}

/** A site page's preview metadata, from its draft. */
export async function previewMetadata(page: SitePageKey): Promise<Metadata> {
  const shown = await previewSitePageAt(page);
  return pageMetadata(shown.draft, {
    path: sitePagePath(page),
    fallbackTitle: sitePageFallbackTitle(page),
    preview: true,
  });
}
