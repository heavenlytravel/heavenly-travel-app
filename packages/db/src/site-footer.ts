import { getActivityEntry, logActivity, type ActivityEntry } from "./activity";
import type { Actor } from "./activity-actions";
import { db } from "./client";
import {
  FOOTER_KEY,
  checkFooterComplete,
  checkFooterLimits,
  defaultFooterContent,
  footerContentOf,
  footerImageUrls,
  type FooterContent,
} from "./footer-content";
import { listTopChoiceCards } from "./location-pages";
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
 * The footer's row of `SitePage`, under `FOOTER_KEY`: its reader for the
 * customer site and its editor, and its writers, which check what
 * ./footer-content says and log a publish. It works as a site page does
 * (./site-pages), but holds a footer, and stays published once it is. See
 * docs/261026-site-footer.md.
 */

const footerKey = { page_locale: { page: FOOTER_KEY, locale: PAGE_LOCALE } };

/** The copy the public is shown, from the stored row: null until the first publish. */
function publicFooterOf(row: {
  isOn: boolean;
  published: unknown;
}): FooterContent | null {
  return row.isOn && row.published != null
    ? footerContentOf(row.published)
    : null;
}

/** The footer the site shows before one is published: today's, with the home page's top choices. */
export async function getDefaultFooter(): Promise<FooterContent> {
  return defaultFooterContent(await listTopChoiceCards());
}

/** The footer as the public is shown it; null until it is first published, when the site shows the default. */
export async function getPublishedFooter(): Promise<FooterContent | null> {
  const row = await db.sitePage.findUnique({ where: footerKey });
  return row ? publicFooterOf(row) : null;
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

/** The footer's draft and its public copy. Never saved, the draft is the default. */
export async function getFooter(): Promise<FooterDetails> {
  const row = await db.sitePage.findUnique({ where: footerKey });
  return {
    draft: row ? footerContentOf(row.draft) : await getDefaultFooter(),
    published: row ? publicFooterOf(row) : null,
    publishedAt: row?.isOn ? row.publishedAt : null,
    version: versionOf(row),
  };
}

/** Where the footer stands, for the website's pages in the console's Pages. */
export type FooterSummary = {
  status: PageStatus;
  /** When its draft or its public copy last changed; null while never saved. */
  updatedAt: Date | null;
};

export async function getFooterSummary(): Promise<FooterSummary> {
  const row = await db.sitePage.findUnique({ where: footerKey });
  if (!row) return { status: "unpublished", updatedAt: null };
  return {
    status: pageStatusOf(footerContentOf(row.draft), publicFooterOf(row)),
    updatedAt: row.updatedAt,
  };
}

/** One publish of the footer: its content before and after. */
export type FooterPublish = {
  entry: ActivityEntry;
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
  const after = entry.after as { content?: unknown } | null;
  const before = entry.before as { content?: unknown } | null;
  return {
    entry,
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
  version: string | null,
  content: FooterContent,
  publisher: Actor | null,
): Promise<PageSaved> {
  return db.$transaction(async (tx) => {
    const was = await tx.sitePage.findUnique({ where: footerKey });
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
          data: [{ page: FOOTER_KEY, locale: PAGE_LOCALE, ...data }],
          skipDuplicates: true,
        });
    if (count !== 1) return PAGE_CHANGED;

    if (publisher) {
      const before =
        was?.published == null ? null : footerContentOf(was.published);
      if (publishChanges(was, before, content)) {
        await logActivity(tx, publisher, {
          action: "site.footer.published",
          entityId: FOOTER_KEY,
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
  version: string | null,
  draft: unknown,
): Promise<PageSaved> {
  const content = footerContentOf(draft);
  const check = checkFooterLimits(content);
  if (!check.ok) return check;
  return writeFooter(version, content, null);
}

/**
 * Saves the content and makes it the footer every page shows, when it is
 * complete. Publishing what is already public logs nothing.
 */
export async function publishFooter(
  actor: Actor,
  version: string | null,
  draft: unknown,
): Promise<PageSaved> {
  const content = footerContentOf(draft);
  const check = checkFooterComplete(content);
  if (!check.ok) return check;
  return writeFooter(version, content, actor);
}
