import { isUploadUrl, type UploadedImage } from "./images";

/**
 * How the content the console writes is read, pure and browser-safe: a
 * line, paragraphs, an uploaded image with its alt text, the fields of a
 * stored object. A page's content (./page-content), its sections
 * (./page-sections) and the footer (./footer-content) read their values
 * through these, so a damaged or hand-edited value reads as empty rather
 * than failing.
 */

/** An uploaded image as the content keeps it, with the alt text Marketing writes. */
export type PageImage = UploadedImage & { alt: string };

export function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

/** The paragraphs of a plain text, as the page renders them. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** One line: runs of white space become one space; "" for anything that is not text. */
export function lineOf(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Plain paragraphs with one blank line between them. */
export function paragraphTextOf(value: unknown) {
  return typeof value === "string" ? paragraphsOf(value).join("\n\n") : "";
}

/** The fields of a stored or submitted object; none for anything else. */
export function recordOf(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

/** The items of a stored or submitted list; none for anything else. */
export function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

export const isSize = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** The image, with its alt text as one line, or null for anything that is not an uploaded one. */
export function pageImageOf(value: unknown): PageImage | null {
  const { url, key, width, height, alt } = recordOf(value);
  if (!isUploadUrl(url) || typeof key !== "string" || key === "") return null;
  if (!isSize(width) || !isSize(height)) return null;
  return { url, key, width, height, alt: lineOf(alt) };
}
