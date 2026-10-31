import { getActivityEntry, logActivity, type ActivityEntry } from "./activity";
import type { Actor } from "./activity-actions";
import { db } from "./client";
import {
  CONNECT_FOOTER_KEY,
  FOOTER_KEY,
  checkFooterComplete,
  checkFooterLimits,
  defaultFooterContent,
  footerAudienceOf,
  footerContentOf,
  footerImageUrls,
  isFooterKey,
  visibleFooterOf,
  type FooterContent,
  type FooterKey,
} from "./footer-content";
import { listPublicLocationSlugs, listTopChoiceCards } from "./location-pages";
import { listPublishedSitePages } from "./site-pages";
import { deletedMediaRefusal } from "./media";
import { PAGE_LOCALE, pageStatusOf, type PageStatus } from "./page-content";
import {
  PAGE_CHANGED,
  pageWriteData,
  publishChanges,
  versionOf,
  type PageSaved,
} from "./page-writes";

/**
 * The footers' rows of `SitePage`: the website's under `FOOTER_KEY`,
 * Connect's under `CONNECT_FOOTER_KEY`. Their readers for the apps and
 * the editor, and their writers, which check what ./footer-content says
 * and log a publish. Each works as a site page does (./site-pages), but
 * holds a footer, and stays published once it is. See
 * docs/261026-site-footer.md.
 */

const rowOf = (key: FooterKey) => ({
  page_locale: { page: key, locale: PAGE_LOCALE },
});

/** The copy the public is shown, from the stored row: null until the first publish. */
function publicFooterOf(row: {
  isOn: boolean;
  published: unknown;
}): FooterContent | null {
  return row.isOn && row.published != null
    ? footerContentOf(row.published)
    : null;
}

/**
 * The footer an app shows before one is published, and its editor opens
 * with: the website's, today's details with the home page's top choices;
 * Connect's, the website's as it is published, set to show it.
 */
export async function getDefaultFooter(key: FooterKey): Promise<FooterContent> {
  const website = defaultFooterContent(await listTopChoiceCards());
  if (key === FOOTER_KEY) return website;
  const published = await getPublishedFooter(FOOTER_KEY);
  return { ...(published ?? website), sameAsWebsite: true };
}

/** A footer as the public is shown it; null until it is first published, when the app shows the default. */
export async function getPublishedFooter(
  key: FooterKey,
): Promise<FooterContent | null> {
  const row = await db.sitePage.findUnique({ where: rowOf(key) });
  return row ? publicFooterOf(row) : null;
}

/** The website's footer as published, else its default. */
async function websiteFooter(): Promise<FooterContent> {
  return (
    (await getPublishedFooter(FOOTER_KEY)) ??
    (await getDefaultFooter(FOOTER_KEY))
  );
}

/**
 * The footer Connect's public pages end with: its own, or, set to show
 * it, the website's as published; the staff preview reads Connect's
 * draft. Each link to a page the public cannot open left out. Read fresh:
 * Connect caches nothing of the website's.
 */
export async function getConnectFooter(
  preview: boolean,
): Promise<FooterContent> {
  const own = preview
    ? (await getFooter(CONNECT_FOOTER_KEY)).draft
    : ((await getPublishedFooter(CONNECT_FOOTER_KEY)) ??
      (await getDefaultFooter(CONNECT_FOOTER_KEY)));
  const [content, published, locations] = await Promise.all([
    own.sameAsWebsite ? websiteFooter() : own,
    listPublishedSitePages(),
    listPublicLocationSlugs(),
  ]);
  return visibleFooterOf(content, footerAudienceOf(published, locations));
}

/** The footer as its editor opens it, or as the preview shows its draft. */
export type FooterDetails = {
  draft: FooterContent;
  /** The copy the public is shown; null until the first publish. */
  published: FooterContent | null;
  publishedAt: Date | null;
  /** Names the stored content, for `saveFooterDraft`. Null until first saved. */
  version: string | null;
};

/** A footer's draft and its public copy. Never saved, the draft is the default. */
export async function getFooter(key: FooterKey): Promise<FooterDetails> {
  const row = await db.sitePage.findUnique({ where: rowOf(key) });
  return {
    draft: row ? footerContentOf(row.draft) : await getDefaultFooter(key),
    published: row ? publicFooterOf(row) : null,
    publishedAt: row?.isOn ? row.publishedAt : null,
    version: versionOf(row),
  };
}

/** Where a footer stands, for its app's pages in the console's Pages. */
export type FooterSummary = {
  status: PageStatus;
  /** When its draft or its public copy last changed; null while never saved. */
  updatedAt: Date | null;
  /** Connect's, as its draft has it: showing the website's. */
  sameAsWebsite: boolean;
};

export async function getFooterSummary(key: FooterKey): Promise<FooterSummary> {
  const row = await db.sitePage.findUnique({ where: rowOf(key) });
  if (!row) {
    return {
      status: "unpublished",
      updatedAt: null,
      sameAsWebsite: key === CONNECT_FOOTER_KEY,
    };
  }
  const draft = footerContentOf(row.draft);
  return {
    status: pageStatusOf(draft, publicFooterOf(row)),
    updatedAt: row.updatedAt,
    sameAsWebsite: draft.sameAsWebsite,
  };
}

/** One publish of a footer: which, and its content before and after. */
export type FooterPublish = {
  entry: ActivityEntry;
  key: FooterKey;
  /** Null on the first publish. */
  before: FooterContent | null;
  after: FooterContent;
};

/** The publish a log entry records, or null when the entry is not one of the footer's. */
export async function getFooterPublish(
  entryId: string,
): Promise<FooterPublish | null> {
  const entry = await getActivityEntry(entryId);
  if (!entry || entry.action !== "site.footer.published") return null;
  if (!isFooterKey(entry.entityId)) return null;
  const after = entry.after as { content?: unknown } | null;
  const before = entry.before as { content?: unknown } | null;
  return {
    entry,
    key: entry.entityId,
    before: before?.content ? footerContentOf(before.content) : null,
    after: footerContentOf(after?.content),
  };
}

/**
 * Writes the content when the stored content is still the version the form
 * was opened with. With an actor, it publishes: the content becomes the
 * public copy too, and the publish is logged when it changes what the
 * public sees.
 */
async function writeFooter(
  key: FooterKey,
  version: string | null,
  content: FooterContent,
  publisher: Actor | null,
): Promise<PageSaved> {
  return db.$transaction(async (tx) => {
    const was = await tx.sitePage.findUnique({ where: rowOf(key) });
    if (versionOf(was) !== version) return PAGE_CHANGED;
    // A logo uploaded in this form and deleted on Media before it saved.
    const gone = await deletedMediaRefusal(
      tx,
      footerImageUrls(content),
      "A logo",
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
          data: [{ page: key, locale: PAGE_LOCALE, ...data }],
          skipDuplicates: true,
        });
    if (count !== 1) return PAGE_CHANGED;

    if (publisher) {
      const before =
        was?.published == null ? null : footerContentOf(was.published);
      if (publishChanges(was, before, content)) {
        await logActivity(tx, publisher, {
          action: "site.footer.published",
          entityId: key,
          before: { content: before },
          after: { content },
        });
      }
    }
    return { ok: true, version: now.toISOString() };
  });
}

/** Overwrites the footer's draft. Nothing changes in public, and nothing is logged; only the limits are checked. */
export async function saveFooterDraft(
  key: FooterKey,
  version: string | null,
  draft: unknown,
): Promise<PageSaved> {
  const content = ownFooterOf(key, draft);
  const check = checkFooterLimits(content);
  if (!check.ok) return check;
  return writeFooter(key, version, content, null);
}

/**
 * Saves the content and makes it the footer every page shows, when it is
 * complete. Publishing what is already public logs nothing.
 */
export async function publishFooter(
  key: FooterKey,
  actor: Actor,
  version: string | null,
  draft: unknown,
): Promise<PageSaved> {
  const content = ownFooterOf(key, draft);
  const check = checkFooterComplete(content);
  if (!check.ok) return check;
  return writeFooter(key, version, content, actor);
}

/** A submitted footer read for its row: only Connect's can show the website's. */
function ownFooterOf(key: FooterKey, draft: unknown): FooterContent {
  const content = footerContentOf(draft);
  return key === FOOTER_KEY ? { ...content, sameAsWebsite: false } : content;
}
