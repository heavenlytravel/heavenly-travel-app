import type { Refusal } from "./change";
import { samePageContent } from "./page-content";

/**
 * What a write on a location's page (./location-pages), on a site page
 * (./site-pages) and on the footer (./site-footer) share: the version a
 * form holds, the refusal when someone else saved meanwhile, the columns a
 * save and a publish set, and whether a publish is worth an entry in the
 * log. Server side, no database access of its own.
 */

/** A page write's answer: the content's new version, or why not. */
export type PageSaved = { ok: true; version: string } | Refusal;

export const PAGE_CHANGED: Refusal = {
  ok: false,
  error: "This page was changed by someone else. Reload to see it.",
};

/** What a stored page row holds of its standing. */
type StoredPage = {
  isOn: boolean;
  updatedAt: Date;
  firstPublishedAt: Date | null;
};

/**
 * Names the stored content: when it last changed. A save hands it back
 * and is refused when the content changed since. Unpublishing does not
 * move it. Null for a page never saved.
 */
export function versionOf(row: { updatedAt: Date } | null) {
  return row ? row.updatedAt.toISOString() : null;
}

/**
 * The columns a save writes: the draft, and on a publish the public copy,
 * its date, the page turned on, and the date of the first publish, set
 * once.
 */
export function pageWriteData<T>(
  content: T,
  publish: boolean,
  was: StoredPage | null,
  now: Date,
) {
  return {
    draft: content,
    updatedAt: now,
    ...(publish
      ? {
          published: content,
          publishedAt: now,
          isOn: true,
          firstPublishedAt: was?.firstPublishedAt ?? now,
        }
      : {}),
  };
}

/**
 * Whether a publish changes what the public sees, which is what the log
 * records: a page that was not on, or whose public copy differs. `before`
 * is the copy last published, kept through an unpublish; null before the
 * first.
 */
export function publishChanges<T>(
  was: StoredPage | null,
  before: T | null,
  after: T,
) {
  return !was?.isOn || !before || !samePageContent(before, after);
}
