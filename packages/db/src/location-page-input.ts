import { TRIP_CATEGORIES, TRIP_CATEGORY_LABELS } from "./booking-status";
import type { Change } from "./change";
import { guardFor } from "./const-enum";

/**
 * The content of a location's pages and the rules it is checked against,
 * pure and browser-safe: the editor shows the limits and what is still
 * missing as it is typed, the writers in ./location-pages apply the same
 * checks before they write. Every page has the same fields in the same
 * order; only the landing page has highlights. See
 * docs/261001-locations-and-pages.md, "The content of a page".
 */

export const LANDING_PAGE = "landing";

/** The pages of a location: its landing page, then one per product. */
export const LOCATION_PAGES = [LANDING_PAGE, ...TRIP_CATEGORIES] as const;
export type LocationPageKey = (typeof LOCATION_PAGES)[number];
export const isLocationPageKey = guardFor(LOCATION_PAGES);
export const LOCATION_PAGE_LABELS: Record<LocationPageKey, string> = {
  landing: "Landing",
  ...TRIP_CATEGORY_LABELS,
};

/** How a sentence names a page: "the landing page", "the Coach charter page". */
export function pageNameOf(page: LocationPageKey) {
  return page === LANDING_PAGE
    ? "the landing page"
    : `the ${LOCATION_PAGE_LABELS[page]} page`;
}

/** The locale every page row is written in. Malay pages are future work. */
export const PAGE_LOCALE = "en";

/** An uploaded image as the content keeps it. */
export type PageImage = {
  /** The file's address on UploadThing. */
  url: string;
  /** Its UploadThing key, for clearing unused files later. */
  key: string;
  width: number;
  height: number;
  alt: string;
};

/** A file as the upload answers it, before Marketing writes its alt text. */
export type UploadedImage = Omit<PageImage, "alt">;

export type PageFaq = { question: string; answer: string };

export type PageHighlight = {
  name: string;
  text: string;
  image: PageImage | null;
  /** The saved address "Take me here" fills in; null for none. */
  addressId: string | null;
};

/** What Marketing writes on one page. The working draft and the published copy both hold one. */
export type PageContent = {
  metaTitle: string;
  metaDescription: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImage: PageImage | null;
  /** Plain paragraphs, a blank line between them. */
  intro: string;
  faqs: PageFaq[];
  /** The landing page's only; empty on a product page. */
  highlights: PageHighlight[];
};

export const PAGE_LIMITS = {
  /** Characters. */
  metaTitle: 60,
  metaDescription: 160,
  heroHeadline: 80,
  heroSubheadline: 160,
  imageAlt: 160,
  intro: 5000,
  faqQuestion: 160,
  faqAnswer: 1000,
  highlightName: 60,
  highlightText: 300,
  /** Words the intro needs to be complete. */
  introWords: 100,
  /** How many a complete page needs, and how many it can hold. */
  minFaqs: 3,
  maxFaqs: 12,
  minHighlights: 3,
  maxHighlights: 8,
} as const;

export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ImageType = (typeof IMAGE_TYPES)[number];
export const isImageType = guardFor(IMAGE_TYPES);

export const IMAGE_MAX_MB = 4;
export const IMAGE_MAX_BYTES = IMAGE_MAX_MB * 1024 * 1024;

const fail = (error: string): Change => ({ ok: false, error });

/** A file is an image the pages take: a JPEG, a PNG or a WebP within the size limit. */
export function checkImageFile(file: { type: string; size: number }): Change {
  if (!isImageType(file.type)) {
    return fail("Upload a JPEG, a PNG or a WebP image.");
  }
  if (file.size > IMAGE_MAX_BYTES) {
    return fail(`An image is at most ${IMAGE_MAX_MB} MB.`);
  }
  return { ok: true };
}

/** Where UploadThing serves a file: https://<app id>.ufs.sh/f/<key>. */
const UPLOAD_HOST_SUFFIX = ".ufs.sh";

/** Whether the address is a file on UploadThing, the one host the pages load images from. */
export function isUploadUrl(value: unknown): value is string {
  if (typeof value !== "string" || !URL.canParse(value)) return false;
  const url = new URL(value);
  return (
    url.protocol === "https:" &&
    url.hostname.endsWith(UPLOAD_HOST_SUFFIX) &&
    url.pathname.startsWith("/f/")
  );
}

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

/** One line: runs of white space become one space. */
function lineOf(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

/** Plain paragraphs with one blank line between them. */
function paragraphTextOf(value: unknown) {
  return typeof value === "string" ? paragraphsOf(value).join("\n\n") : "";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

const isSize = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** The image, or null for anything that is not an uploaded one. */
function imageOf(value: unknown): PageImage | null {
  const { url, key, width, height, alt } = record(value);
  if (!isUploadUrl(url) || typeof key !== "string" || key === "") return null;
  if (!isSize(width) || !isSize(height)) return null;
  return { url, key, width, height, alt: lineOf(alt) };
}

/**
 * The content a stored or submitted value holds, in its one shape: text
 * trimmed, paragraphs normalised, anything unreadable left empty. It never
 * fails, so an empty or damaged draft reads as an empty page; the limits and
 * what is missing are separate checks.
 */
export function pageContentOf(
  page: LocationPageKey,
  value: unknown,
): PageContent {
  const raw = record(value);
  const list = (rows: unknown) =>
    Array.isArray(rows) ? (rows as unknown[]) : [];
  return {
    metaTitle: lineOf(raw.metaTitle),
    metaDescription: lineOf(raw.metaDescription),
    heroHeadline: lineOf(raw.heroHeadline),
    heroSubheadline: lineOf(raw.heroSubheadline),
    heroImage: imageOf(raw.heroImage),
    intro: paragraphTextOf(raw.intro),
    faqs: list(raw.faqs).map((row) => {
      const { question, answer } = record(row);
      return { question: lineOf(question), answer: paragraphTextOf(answer) };
    }),
    highlights:
      page === LANDING_PAGE
        ? list(raw.highlights).map((row) => {
            const { name, text, image, addressId } = record(row);
            return {
              name: lineOf(name),
              text: lineOf(text),
              image: imageOf(image),
              addressId:
                typeof addressId === "string" && addressId !== ""
                  ? addressId
                  : null,
            };
          })
        : [],
  };
}

/** Whether two contents are the same, field for field. Both are `pageContentOf` values. */
export function samePageContent(a: PageContent, b: PageContent) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * The length limits, which a draft is checked against every time it is
 * saved. What a page still needs to be complete is `missingFields`.
 */
export function checkPageLimits(content: PageContent): Change {
  const over = (text: string, limit: number) => text.length > limit;
  const L = PAGE_LIMITS;
  if (over(content.metaTitle, L.metaTitle)) {
    return fail(`The meta title is at most ${L.metaTitle} characters.`);
  }
  if (over(content.metaDescription, L.metaDescription)) {
    return fail(
      `The meta description is at most ${L.metaDescription} characters.`,
    );
  }
  if (over(content.heroHeadline, L.heroHeadline)) {
    return fail(`The hero headline is at most ${L.heroHeadline} characters.`);
  }
  if (over(content.heroSubheadline, L.heroSubheadline)) {
    return fail(
      `The hero subheadline is at most ${L.heroSubheadline} characters.`,
    );
  }
  if (over(content.intro, L.intro)) {
    return fail(`The intro is at most ${L.intro} characters.`);
  }
  const images = [
    content.heroImage,
    ...content.highlights.map((highlight) => highlight.image),
  ];
  if (images.some((image) => image && over(image.alt, L.imageAlt))) {
    return fail(`An alt text is at most ${L.imageAlt} characters.`);
  }
  if (content.faqs.length > L.maxFaqs) {
    return fail(`A page holds at most ${L.maxFaqs} FAQs.`);
  }
  for (const [i, faq] of content.faqs.entries()) {
    if (over(faq.question, L.faqQuestion)) {
      return fail(
        `The question of FAQ ${i + 1} is at most ${L.faqQuestion} characters.`,
      );
    }
    if (over(faq.answer, L.faqAnswer)) {
      return fail(
        `The answer of FAQ ${i + 1} is at most ${L.faqAnswer} characters.`,
      );
    }
  }
  if (content.highlights.length > L.maxHighlights) {
    return fail(`A page holds at most ${L.maxHighlights} highlights.`);
  }
  for (const [i, highlight] of content.highlights.entries()) {
    if (over(highlight.name, L.highlightName)) {
      return fail(
        `The name of highlight ${i + 1} is at most ${L.highlightName} characters.`,
      );
    }
    if (over(highlight.text, L.highlightText)) {
      return fail(
        `The text of highlight ${i + 1} is at most ${L.highlightText} characters.`,
      );
    }
  }
  return { ok: true };
}

/** What an image still needs: the image itself, or its alt text. */
function missingOfImage(
  image: PageImage | null,
  theImage: string,
  itsAltText: string,
) {
  if (!image) return [theImage];
  return image.alt === "" ? [itsAltText] : [];
}

/**
 * What the page still needs before it can be published, in the order of the
 * form: "Meta title", "Intro: at least 100 words (62 so far)", "FAQ 2: the
 * answer". Empty when the page is complete.
 */
export function missingFields(
  page: LocationPageKey,
  content: PageContent,
): string[] {
  const L = PAGE_LIMITS;
  const missing: string[] = [];
  if (content.metaTitle === "") missing.push("Meta title");
  if (content.metaDescription === "") missing.push("Meta description");
  if (content.heroHeadline === "") missing.push("Hero headline");
  if (content.heroSubheadline === "") missing.push("Hero subheadline");
  missing.push(
    ...missingOfImage(
      content.heroImage,
      "Hero image",
      "Hero image: the alt text",
    ),
  );

  const words = wordCount(content.intro);
  if (words < L.introWords) {
    missing.push(`Intro: at least ${L.introWords} words (${words} so far)`);
  }

  if (content.faqs.length < L.minFaqs) {
    missing.push(`FAQs: at least ${L.minFaqs} (${content.faqs.length} so far)`);
  }
  for (const [i, faq] of content.faqs.entries()) {
    if (faq.question === "") missing.push(`FAQ ${i + 1}: the question`);
    if (faq.answer === "") missing.push(`FAQ ${i + 1}: the answer`);
  }

  if (page !== LANDING_PAGE) return missing;
  if (content.highlights.length < L.minHighlights) {
    missing.push(
      `Highlights: at least ${L.minHighlights} (${content.highlights.length} so far)`,
    );
  }
  for (const [i, highlight] of content.highlights.entries()) {
    const what = `Highlight ${i + 1}`;
    if (highlight.name === "") missing.push(`${what}: the name`);
    if (highlight.text === "") missing.push(`${what}: the text`);
    missing.push(
      ...missingOfImage(
        highlight.image,
        `${what}: the image`,
        `${what}: the alt text of the image`,
      ),
    );
  }
  return missing;
}

/** Whether the page can be published: within the limits with nothing missing. */
export function checkPageComplete(
  page: LocationPageKey,
  content: PageContent,
): Change {
  const limits = checkPageLimits(content);
  if (!limits.ok) return limits;
  const missing = missingFields(page, content);
  if (missing.length === 0) return { ok: true };
  const more = missing.length - 1;
  return fail(
    `The page is not complete. Still missing: ${missing[0]}${
      more > 0 ? `, and ${more} more` : ""
    }.`,
  );
}

/**
 * Where a page stands between its draft and its published copy: never
 * published, published as it is drafted, or published with newer changes in
 * the draft.
 */
export const PAGE_STATUSES = ["unpublished", "published", "changed"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];
export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  unpublished: "Not published",
  published: "Published",
  changed: "Unpublished changes",
};

/** `published` is null until the first publish. */
export function pageStatusOf(
  draft: PageContent,
  published: PageContent | null,
): PageStatus {
  if (!published) return "unpublished";
  return samePageContent(draft, published) ? "published" : "changed";
}
