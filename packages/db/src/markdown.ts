/**
 * The Markdown of a blog post or a site document, pure and browser-safe:
 * its images, the size an uploaded image carries in its address, the
 * words a reader reads, and a file written elsewhere read into a page's
 * fields. The page checks and the editor read the same text through these.
 * The rendering is @repo/ui's `Markdown`. See
 * docs/261025-marketing-pages.md, "The blog".
 */

/** An image in a body, `![alt](url)`, with its place among the body's images. */
export type MarkdownImage = { alt: string; url: string; index: number };

/**
 * An image: its alt text, with `\]` and the like escaped; its address,
 * bare or in angle brackets; and an optional title in quotes or brackets.
 */
const IMAGE =
  /!\[((?:\\.|[^\]\\])*)\]\(\s*(<[^>\n]*>|[^\s)]+)(?:\s+("[^"\n]*"|'[^'\n]*'|\([^)\n]*\)))?\s*\)/g;

/** Code fences and inline code, whose text is shown as it is written. */
const FENCED_CODE = /^(```|~~~)[^\n]*\n[\s\S]*?(?:^\1[^\n]*$|(?![\s\S]))/gm;
const INLINE_CODE = /`[^`\n]*`/g;

/**
 * The body with every code block and code span blanked to spaces of the
 * same length, so an image written as code is not taken for one and the
 * places of the others stay those of the body.
 */
function withoutCode(body: string) {
  const blank = (code: string) => code.replace(/[^\n]/g, " ");
  return body.replace(FENCED_CODE, blank).replace(INLINE_CODE, blank);
}

const unescape = (text: string) => text.replace(/\\(.)/g, "$1");

/** The address as written: without the angle brackets that may wrap it. */
const bareUrl = (url: string) =>
  url.startsWith("<") && url.endsWith(">") ? url.slice(1, -1) : url;

type ImageMatch = MarkdownImage & {
  start: number;
  end: number;
  title: string | undefined;
};

function imageMatchesOf(body: string): ImageMatch[] {
  return [...withoutCode(body).matchAll(IMAGE)].map((match, index) => ({
    alt: unescape(match[1] ?? ""),
    url: bareUrl(match[2] ?? ""),
    title: match[3],
    index,
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/** Every image in the body, in order; none written as code. */
export function markdownImagesOf(body: string): MarkdownImage[] {
  return imageMatchesOf(body).map(({ alt, url, index }) => ({
    alt,
    url,
    index,
  }));
}

/** A size kept at the end of an image's address: "#1200x800". */
const SIZE = /#(\d{1,5})x(\d{1,5})$/;

/**
 * The address with the image's size as its fragment, any fragment it had
 * replaced: the page reserves the image's box from it, so nothing moves
 * as the image loads.
 */
export function withImageSize(url: string, width: number, height: number) {
  return `${url.replace(/#.*$/, "")}#${Math.round(width)}x${Math.round(height)}`;
}

/** The size an address carries in its fragment; null for none. */
export function imageSizeOf(
  url: string,
): { width: number; height: number } | null {
  const match = SIZE.exec(url);
  if (!match) return null;
  const width = Number(match[1]);
  const height = Number(match[2]);
  return width > 0 && height > 0 ? { width, height } : null;
}

/**
 * Alt text as Markdown holds it: one line, its brackets escaped. Spaces are
 * kept as typed, so an alt text written a key at a time can end in one.
 */
const altOf = (alt: string) =>
  alt.replace(/[^\S\n]*\n\s*/g, " ").replace(/[\\[\]]/g, (char) => `\\${char}`);

/** An address as Markdown holds it: in angle brackets when a space or a bracket would end it. */
const urlOf = (url: string) => (/[\s()<>]/.test(url) ? `<${url}>` : url);

/**
 * The body with one image changed, by its place among the images: a new
 * address, a new alt text, or both. Its title, if it has one, is kept. An
 * index with no image there leaves the body as it is.
 */
export function replaceMarkdownImage(
  body: string,
  index: number,
  next: { url?: string; alt?: string },
): string {
  const image = imageMatchesOf(body).find((match) => match.index === index);
  if (!image) return body;
  const alt = altOf(next.alt ?? image.alt);
  const url = urlOf(next.url ?? image.url);
  const title = image.title ? ` ${image.title}` : "";
  return `${body.slice(0, image.start)}![${alt}](${url}${title})${body.slice(image.end)}`;
}

/**
 * The text a reader reads, without the markup: no images, no addresses,
 * no heading, list, quote or emphasis marks, and no HTML tags. Code is kept
 * as its text. Blocks are on lines of their own, with no blank lines.
 */
export function markdownText(body: string): string {
  return (
    body
      .replace(/\r\n?/g, "\n")
      // Code fences lose their fence lines and keep their text.
      .replace(/^(```|~~~)[^\n]*$/gm, "")
      .replace(IMAGE, " ")
      // A link reads as its text; a reference definition not at all.
      .replace(/\[((?:\\.|[^\]\\])*)\]\([^)\n]*\)/g, "$1")
      .replace(/\[((?:\\.|[^\]\\])*)\]\[[^\]\n]*\]/g, "$1")
      .replace(/^\s{0,3}\[[^\]\n]+\]:\s*\S.*$/gm, "")
      .replace(/<(?:https?:|mailto:)[^>\s]*>/g, " ")
      .replace(/<\/?[a-z][^>\n]*>/gi, " ")
      // Rules and the separator rows of tables.
      .replace(/^\s*(?:[-*_]\s*){3,}$/gm, "")
      .replace(/^[\s|:-]*-{3,}[\s|:-]*$/gm, "")
      // Heading, quote and list marks at the start of a line.
      .replace(/^\s{0,3}#{1,6}\s+/gm, "")
      .replace(/\s+#+\s*$/gm, "")
      .replace(/^\s*(?:>\s?)+/gm, "")
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "")
      // A setext heading's underline.
      .replace(/^\s*(?:=+|-+)\s*$/gm, "")
      .replace(/\|/g, " ")
      .replace(/(\*\*|__|\*|_|~~|`)/g, "")
      .replace(/\\(.)/g, "$1")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n")
  );
}

/** How many words a reader reads in the body. */
export function markdownWordCount(body: string): number {
  return markdownText(body).split(/\s+/).filter(Boolean).length;
}

/** What a Markdown file written elsewhere gives the page's fields. */
export type MarkdownImport = {
  title: string;
  description: string;
  summary: string;
  body: string;
};

const BOM = String.fromCharCode(0xfeff);

/** The front matter's keys, as the fields read them; any other key is ignored. */
const FRONT_MATTER_KEYS: Record<string, keyof Omit<MarkdownImport, "body">> = {
  title: "title",
  description: "description",
  meta_description: "description",
  metadescription: "description",
  summary: "summary",
  excerpt: "summary",
};

/** A front matter value: one line, the quotes around it dropped. */
function frontMatterValue(raw: string) {
  const value = raw.trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(value);
  return (quoted?.[2] ?? value).replace(/\s+/g, " ").trim();
}

/** A heading's text without its marks: "## Kuah *town*" reads "Kuah town". */
const headingText = (line: string) => markdownText(line).replace(/\n/g, " ");

/**
 * A Markdown file read into a page: the front matter's `title`,
 * `description` (or `meta_description`) and `summary` (or `excerpt`), and
 * the body after it. With no title there, a first `# Heading` is the title
 * and leaves the body; a first heading that repeats the title leaves it
 * too, as the page shows the title on its own. A byte order mark and
 * Windows line ends are dropped.
 */
export function parseMarkdownImport(text: string): MarkdownImport {
  const fields = { title: "", description: "", summary: "" };
  let body = text.replace(new RegExp(`^${BOM}`), "").replace(/\r\n?/g, "\n");

  const front = /^---[ \t]*\n([\s\S]*?)\n(?:---|\.\.\.)[ \t]*(?:\n|$)/.exec(
    body,
  );
  if (front) {
    for (const line of (front[1] ?? "").split("\n")) {
      const pair = /^\s*([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(line);
      if (!pair) continue;
      const field = FRONT_MATTER_KEYS[(pair[1] ?? "").toLowerCase()];
      if (field && fields[field] === "") {
        fields[field] = frontMatterValue(pair[2] ?? "");
      }
    }
    body = body.slice(front[0].length);
  }

  // The first heading, ATX ("# Title") or setext ("Title" over "==="),
  // with the blank lines before it.
  const heading =
    /^\s*\n?(?:#[ \t]+([^\n]+)|([^\n#][^\n]*)\n=+[ \t]*)(?:\n|$)/.exec(body);
  if (heading) {
    const title = headingText((heading[1] ?? heading[2] ?? "").trim());
    const repeats =
      fields.title !== "" && title.toLowerCase() === fields.title.toLowerCase();
    if (fields.title === "" || repeats) {
      if (fields.title === "") fields.title = title;
      body = body.slice(heading[0].length);
    }
  }

  return { ...fields, body: body.replace(/^\s*\n/, "").trimEnd() };
}
