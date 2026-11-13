import { formatMyr } from "./money";
import { titleCase } from "./names";
import { isUploadUrl } from "./images";

/**
 * How a history reads on screen, pure and browser-safe: entries folded
 * into lines, and what an entry changed, field by field. Nothing here
 * changes what the log writes; see docs/261105-activity-log.md for what
 * it holds.
 */

/** What folding needs of an entry. */
export type FoldableEntry = {
  id: string;
  createdAt: Date;
  actorId: string | null;
  actorKind: string;
  entityType: string;
  entityId: string;
};

/**
 * One line of a history: one entry, or several the same person wrote on
 * the same record together, or one thing they did again and again.
 */
export type ActivityLine<E extends FoldableEntry> = {
  /** Newest first, as the history reads. */
  entries: E[];
  /** What the line says, in the order it happened, each with how many times. */
  sentences: { text: string; count: number }[];
};

/** Entries this close together, by one person on one record, are one save. */
const SAVE_WINDOW_MS = 5000;

const sameHands = (a: FoldableEntry, b: FoldableEntry) =>
  a.actorId === b.actorId &&
  a.actorKind === b.actorKind &&
  a.entityType === b.entityType &&
  a.entityId === b.entityId;

/**
 * The entries of a history, newest first, as lines: a run by one person
 * on one record within a few seconds is one save, one line listing what
 * it did; the same sentence again and again, one after the other, is one
 * line that counts it, "5 times". Another person or record between them
 * starts a new line, so nothing moves out of its order.
 */
export function activityLinesOf<E extends FoldableEntry>(
  entries: readonly E[],
  describe: (entry: E) => string,
): ActivityLine<E>[] {
  const lines: ActivityLine<E>[] = [];
  for (const entry of entries) {
    const text = describe(entry);
    const line = lines.at(-1);
    const oldest = line?.entries.at(-1);
    const repeat =
      line?.sentences.length === 1 && line.sentences[0]!.text === text;
    const together =
      oldest !== undefined &&
      oldest.createdAt.getTime() - entry.createdAt.getTime() <= SAVE_WINDOW_MS;
    if (line && oldest && sameHands(oldest, entry) && (repeat || together)) {
      line.entries.push(entry);
      // Written before the rest of the line: it goes first.
      const same = line.sentences.find((s) => s.text === text);
      if (same) same.count += 1;
      else line.sentences.unshift({ text, count: 1 });
      continue;
    }
    lines.push({ entries: [entry], sentences: [{ text, count: 1 }] });
  }
  return lines;
}

/** One field an entry changed: its name, and what it was and became; null for none. */
export type ActivityChange = {
  label: string;
  before: string | null;
  after: string | null;
};

/** Fields that name a record or a place in a list, not something a person reads. */
const UNREAD = /(^id$|Id$|Ids$|^key$|^position$|^via$|^moved$)/;

/** The most fields a line opens on: a record created is listed whole. */
const MOST_CHANGES = 12;

/** "pickupTime" as a person reads it: "Pickup Time"; "priceTotalSen", "Price Total". */
function labelOf(key: string) {
  const words = key
    .replace(/Sen$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return titleCase(words);
}

/** A stored value as text, or null when it is not one a line can show. */
function valueOf(key: string, value: unknown): string | null {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") {
    return key.endsWith("Sen") ? formatMyr(value) : String(value);
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  // A stored file's address says nothing to a reader; how many does.
  if (isUploadUrl(value)) return "1 image";
  if (Array.isArray(value) && value.length > 0 && value.every(isUploadUrl)) {
    return value.length === 1 ? "1 image" : `${value.length} images`;
  }
  if (typeof value === "string") {
    return value.length > 120 ? `${value.slice(0, 117)}…` : value;
  }
  if (
    Array.isArray(value) &&
    value.every((each) => typeof each === "string" || typeof each === "number")
  ) {
    return value.length === 0 ? "—" : value.join(", ");
  }
  // A list of records or a whole page: the line's sentence says it.
  return null;
}

const recordOf = (json: unknown): Record<string, unknown> =>
  json && typeof json === "object" && !Array.isArray(json)
    ? (json as Record<string, unknown>)
    : {};

/**
 * What an entry changed, field by field, as its line opens on it: each
 * field whose value differs between `before` and `after`, or, for a
 * record created or removed, each field it held. Ids, places in a list and
 * values too big for a line (a page, a list of prices) are left to the
 * sentence. Empty when there is nothing more to show than the sentence.
 */
export function activityChangesOf(entry: {
  before: unknown;
  after: unknown;
}): ActivityChange[] {
  const before = recordOf(entry.before);
  const after = recordOf(entry.after);
  const hasBefore = entry.before !== null && entry.before !== undefined;
  const hasAfter = entry.after !== null && entry.after !== undefined;
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  const changes: ActivityChange[] = [];
  for (const key of keys) {
    if (UNREAD.test(key)) continue;
    const was = before[key];
    const now = after[key];
    if (hasBefore && hasAfter && JSON.stringify(was) === JSON.stringify(now)) {
      continue;
    }
    const wasText = hasBefore && key in before ? valueOf(key, was) : null;
    const nowText = hasAfter && key in after ? valueOf(key, now) : null;
    // A value too big for a line, on either side, is the sentence's.
    if (
      (key in before && wasText === null) ||
      (key in after && nowText === null)
    ) {
      continue;
    }
    changes.push({ label: labelOf(key), before: wasText, after: nowText });
    if (changes.length === MOST_CHANGES) break;
  }
  return changes;
}
