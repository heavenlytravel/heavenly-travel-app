import { getActivityEntry, logActivity, type ActivityEntry } from "./activity";
import type { Actor } from "./activity-actions";
import { refuse, type Change } from "./change";
import { db } from "./client";
import { deletedMediaRefusal } from "./media";
import {
  PAGE_LOCALE,
  checkPageComplete,
  checkPageLimits,
  emptyPageContent,
  pageContentOf,
  pageImageUrls,
  pageStatusOf,
  publicCopyOf,
  type PageContent,
  type PageImage,
  type PageKind,
  type PageStatus,
} from "./page-content";
import {
  PAGE_CHANGED,
  pageWriteData,
  publishChanges,
  versionOf,
  type PageSaved,
} from "./page-writes";
import {
  SITE_PAGES,
  checkSitePageUnpublish,
  isSitePageKey,
  sitePageKindOf,
  type SitePageKey,
} from "./site-page-input";

/**
 * The site's own pages, `SitePage`: their readers for the Site pages
 * screen and the customer site, and their writers, which check what
 * ./page-content says and, but for a draft save, log against the page's
 * key. They work as a location's pages do (./location-pages), with no
 * location around them: a published site page is public at once. See
 * docs/261025-marketing-pages.md, "Site pages".
 */

const pageKey = (page: SitePageKey) => ({
  page_locale: { page, locale: PAGE_LOCALE },
});

/** A site page as the Site pages screen lists it. */
export type SitePageSummary = {
  page: SitePageKey;
  kind: PageKind;
  status: PageStatus;
  /** The draft's hero image, else that of the copy last published. */
  heroImage: PageImage | null;
  /** Whether its draft lets search engines list it. */
  indexable: boolean;
  /** When its draft or its public copy last changed; null for a page never written. */
  updatedAt: Date | null;
};

/** Every site page, written or not, in the order of `SITE_PAGES`. */
export async function listSitePageSummaries(): Promise<SitePageSummary[]> {
  const rows = await db.sitePage.findMany({
    where: { locale: PAGE_LOCALE },
  });
  return SITE_PAGES.map((page) => {
    const kind = sitePageKindOf(page);
    const row = rows.find((entry) => entry.page === page);
    const draft = row ? pageContentOf(kind, row.draft) : emptyPageContent(kind);
    const publicCopy = row ? publicCopyOf(kind, row) : null;
    return {
      page,
      kind,
      status: pageStatusOf(draft, publicCopy),
      heroImage: draft.heroImage ?? publicCopy?.heroImage ?? null,
      indexable: draft.indexable,
      updatedAt: row?.updatedAt ?? null,
    };
  });
}

/** A site page as the customer site shows it: the public copy, its dates as text, since it is cached. */
export type PublishedSitePage = {
  content: PageContent;
  publishedAt: string | null;
  firstPublishedAt: string | null;
};

/**
 * The site pages that are published, by key: what the customer site shows
 * on the home page, the documents and the footer's links. A page not
 * published is not in it.
 */
export async function listPublishedSitePages(): Promise<
  Partial<Record<SitePageKey, PublishedSitePage>>
> {
  const rows = await db.sitePage.findMany({
    where: { locale: PAGE_LOCALE, isOn: true },
  });
  return Object.fromEntries(
    rows.flatMap((row) => {
      if (!isSitePageKey(row.page)) return [];
      const content = publicCopyOf(sitePageKindOf(row.page), row);
      return content
        ? [
            [
              row.page,
              {
                content,
                publishedAt: row.publishedAt?.toISOString() ?? null,
                firstPublishedAt: row.firstPublishedAt?.toISOString() ?? null,
              },
            ],
          ]
        : [];
    }),
  );
}

/** One site page, as its editor opens it, or as the preview shows its draft. */
export type SitePageDetails = {
  page: SitePageKey;
  kind: PageKind;
  draft: PageContent;
  /** The copy the public is shown; null while the page is not published. */
  published: PageContent | null;
  publishedAt: Date | null;
  firstPublishedAt: Date | null;
  /** Names the stored content, for `saveSitePageDraft`. Null until first saved. */
  version: string | null;
};

export async function getSitePage(page: SitePageKey): Promise<SitePageDetails> {
  const row = await db.sitePage.findUnique({ where: pageKey(page) });
  const kind = sitePageKindOf(page);
  return {
    page,
    kind,
    draft: row ? pageContentOf(kind, row.draft) : emptyPageContent(kind),
    published: row ? publicCopyOf(kind, row) : null,
    publishedAt: row?.isOn ? row.publishedAt : null,
    firstPublishedAt: row?.firstPublishedAt ?? null,
    version: versionOf(row),
  };
}

/** One publish of a site page: its content before and after. */
export type SitePagePublish = {
  entry: ActivityEntry;
  page: SitePageKey;
  kind: PageKind;
  /** Null on the page's first publish. */
  before: PageContent | null;
  after: PageContent;
};

/** The publish a log entry records, or null when the entry is not a site page's publish. */
export async function getSitePagePublish(
  entryId: string,
): Promise<SitePagePublish | null> {
  const entry = await getActivityEntry(entryId);
  if (
    !entry ||
    entry.entityType !== "site-page" ||
    entry.action !== "site.page.published" ||
    !isSitePageKey(entry.entityId)
  ) {
    return null;
  }
  const page = entry.entityId;
  const kind = sitePageKindOf(page);
  const after = entry.after as { content?: unknown } | null;
  const before = entry.before as { content?: unknown } | null;
  return {
    entry,
    page,
    kind,
    before: before?.content ? pageContentOf(kind, before.content) : null,
    after: pageContentOf(kind, after?.content),
  };
}

/**
 * Writes the content when the stored content is still the version the form
 * was opened with. With an actor, it publishes: the content becomes the
 * public copy too, and the publish is logged when it changes what the
 * public sees.
 */
async function writeSitePage(
  page: SitePageKey,
  version: string | null,
  content: PageContent,
  publisher: Actor | null,
): Promise<PageSaved> {
  return db.$transaction(async (tx) => {
    const was = await tx.sitePage.findUnique({ where: pageKey(page) });
    if (versionOf(was) !== version) return PAGE_CHANGED;
    // An image uploaded in this form and deleted on Media before it saved.
    const gone = await deletedMediaRefusal(
      tx,
      pageImageUrls(content),
      "An image",
    );
    if (gone) return gone;

    const now = new Date();
    const data = pageWriteData(content, publisher !== null, was, now);
    // Conditional on the version read above, so two saves at once cannot both land.
    const { count } = was
      ? await tx.sitePage.updateMany({
          where: { id: was.id, updatedAt: was.updatedAt },
          data,
        })
      : await tx.sitePage.createMany({
          data: [{ page, locale: PAGE_LOCALE, ...data }],
          skipDuplicates: true,
        });
    if (count !== 1) return PAGE_CHANGED;

    if (publisher) {
      const before =
        was?.published == null
          ? null
          : pageContentOf(sitePageKindOf(page), was.published);
      if (publishChanges(was, before, content)) {
        await logActivity(tx, publisher, {
          action: "site.page.published",
          entityId: page,
          before: { page, content: before },
          after: { page, content },
        });
      }
    }
    return { ok: true, version: now.toISOString() };
  });
}

/** Overwrites the page's draft. Nothing changes in public, and nothing is logged; only the length limits are checked. */
export async function saveSitePageDraft(
  page: SitePageKey,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const content = pageContentOf(sitePageKindOf(page), draft);
  const check = checkPageLimits(content);
  if (!check.ok) return check;
  return writeSitePage(page, version, content, null);
}

/**
 * Saves the content and makes it the page's public copy, when it is
 * complete. The public sees it at once. Publishing what is already public
 * logs nothing.
 */
export async function publishSitePage(
  actor: Actor,
  page: SitePageKey,
  version: string | null,
  draft: PageContent,
): Promise<PageSaved> {
  const kind = sitePageKindOf(page);
  const content = pageContentOf(kind, draft);
  const check = checkPageComplete(kind, content);
  if (!check.ok) return check;
  return writeSitePage(page, version, content, actor);
}

/**
 * Takes a document from the public and keeps its text; the home page
 * stays published once it is. Unpublishing what is not published logs
 * nothing, and the content's version stays, so an open form still saves.
 */
export async function unpublishSitePage(
  actor: Actor,
  page: SitePageKey,
): Promise<Change> {
  const check = checkSitePageUnpublish(page);
  if (!check.ok) return check;
  return db.$transaction(async (tx) => {
    const row = await tx.sitePage.findUnique({ where: pageKey(page) });
    if (!row?.isOn) return { ok: true };
    const { count } = await tx.sitePage.updateMany({
      where: { id: row.id, updatedAt: row.updatedAt },
      data: { isOn: false, updatedAt: row.updatedAt },
    });
    if (count !== 1) return refuse("The page was just saved. Try again.");
    await logActivity(tx, actor, {
      action: "site.page.updated",
      entityId: page,
      before: { page, isOn: true },
      after: { page, isOn: false },
    });
    return { ok: true };
  });
}
