import type { Change } from "./change";
import { guardFor } from "./const-enum";
import { isUploadUrl, uploadKeyOf, type UploadedImage } from "./images";
import { markdownImagesOf, markdownWordCount } from "./markdown";

/**
 * The content of the pages Marketing writes and the rules it is checked
 * against, pure and browser-safe: a location's pages (./location-page-input)
 * and the site's own (./site-page-input) share it. Every page has one
 * shape; its kind decides which fields it uses and what it needs before it
 * is published. The editor shows the limits and what is still missing as
 * it is typed; the writers apply the same checks before they write. See
 * docs/261001-locations-and-pages.md, "The content of a page", and
 * docs/261025-marketing-pages.md, "What a page holds depends on its kind".
 */

/**
 * What a page is, which decides its fields: a location's main page; a
 * service's page, such as car with driver; a page that lists others, such
 * as popular places; a vehicle class's page; a place, an attraction or a
 * hotel; a blog post; the site's home page; one of the site's documents,
 * such as the terms.
 */
export const PAGE_KINDS = [
  "landing",
  "service",
  "listing",
  "class",
  "place",
  "article",
  "home",
  "document",
] as const;
export type PageKind = (typeof PAGE_KINDS)[number];

/** Whether a part is needed before a publish, may be left empty, or is not on the page at all. */
type Need = "required" | "optional" | "none";

type KindRule = {
  /** The short line over the headline. */
  tagline: boolean;
  heroImage: Exclude<Need, "none">;
  /** Plain paragraphs. */
  intro: Need;
  /** Markdown, for a post or a document. */
  body: boolean;
  faqs: Exclude<Need, "none">;
  /** The saved address "Take me here" fills in. */
  address: boolean;
};

/** What each kind of page holds and needs. Every kind needs its meta title and description and a hero headline and subheadline. */
export const PAGE_KIND_RULES: Record<PageKind, KindRule> = {
  landing: {
    tagline: true,
    heroImage: "required",
    intro: "required",
    body: false,
    faqs: "required",
    address: false,
  },
  service: {
    tagline: false,
    heroImage: "required",
    intro: "required",
    body: false,
    faqs: "required",
    address: false,
  },
  listing: {
    tagline: false,
    heroImage: "required",
    intro: "optional",
    body: false,
    faqs: "optional",
    address: false,
  },
  class: {
    tagline: false,
    heroImage: "required",
    intro: "required",
    body: false,
    faqs: "required",
    address: false,
  },
  place: {
    tagline: false,
    heroImage: "required",
    intro: "required",
    body: false,
    faqs: "optional",
    address: true,
  },
  article: {
    tagline: false,
    heroImage: "required",
    intro: "none",
    body: true,
    faqs: "optional",
    address: false,
  },
  home: {
    tagline: true,
    heroImage: "required",
    intro: "optional",
    body: false,
    faqs: "optional",
    address: false,
  },
  document: {
    tagline: false,
    heroImage: "optional",
    intro: "none",
    body: true,
    faqs: "optional",
    address: false,
  },
};

/**
 * How the editor and the checks name the hero's two lines. On a place, a
 * post or a document the headline is the page's name, which its card, its
 * breadcrumb and the lists show; the subheadline is the line under it.
 */
export function heroLabelsOf(kind: PageKind): {
  headline: string;
  subheadline: string;
} {
  switch (kind) {
    case "place":
      return { headline: "Name", subheadline: "Short description" };
    case "article":
    case "document":
      return { headline: "Title", subheadline: "Summary" };
    default:
      return { headline: "Headline", subheadline: "Subheadline" };
  }
}

/** The locale every page row is written in. Malay pages are future work. */
export const PAGE_LOCALE = "en";

/** An uploaded image as the content keeps it, with the alt text Marketing writes. */
export type PageImage = UploadedImage & { alt: string };

export type PageFaq = { question: string; answer: string };

/** What Marketing writes on one page. The working draft and the published copy both hold one. */
export type PageContent = {
  metaTitle: string;
  metaDescription: string;
  /**
   * The picture a shared link shows; null to show the hero image. Optional:
   * for a hero that crops badly on a 1200 by 630 card.
   */
  shareImage: PageImage | null;
  /**
   * The short line over the headline: "Island escape" on a location's main
   * page, also under its name on a home page card; the handwritten word on
   * the home page. Empty on the other kinds. Optional.
   */
  tagline: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImage: PageImage | null;
  /** Plain paragraphs, a blank line between them. Empty on a post or a document. */
  intro: string;
  /** Markdown, on a post or a document only. */
  body: string;
  faqs: PageFaq[];
  /** On a place only: the saved address "Take me here" fills in; null for none. */
  addressId: string | null;
  /**
   * Whether search engines may list the page; true until Marketing turns it
   * off. Off, the page asks them not to list it. It stays public by its
   * link, and a shared link still shows its meta title and description.
   */
  indexable: boolean;
};

export const PAGE_LIMITS = {
  /** Characters. */
  metaTitle: 60,
  metaDescription: 160,
  tagline: 80,
  heroHeadline: 80,
  heroSubheadline: 160,
  imageAlt: 160,
  intro: 5000,
  body: 50000,
  faqQuestion: 160,
  faqAnswer: 1000,
  /** Words the intro and the body need to be complete. */
  introWords: 100,
  bodyWords: 100,
  /** How many FAQs a page needs where they are required, and how many it can hold. */
  minFaqs: 3,
  maxFaqs: 12,
} as const;

const fail = (error: string): Change => ({ ok: false, error });

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

/** Markdown as typed, with its line ends made one kind and its ends trimmed: its spaces mean something. */
function markdownOf(value: unknown) {
  return typeof value === "string"
    ? value.replace(/\r\n?/g, "\n").replace(/^\n+|\s+$/g, "")
    : "";
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
 * The content a stored or submitted value holds, in its one shape for the
 * kind: text trimmed, paragraphs normalised, the fields the kind does not
 * use left empty, anything unreadable left empty. It never fails, so an
 * empty or damaged draft reads as an empty page; the limits and what is
 * missing are separate checks. Highlights, which a main page held until
 * docs/261025-marketing-pages.md, are dropped: they are popular places now.
 */
export function pageContentOf(kind: PageKind, value: unknown): PageContent {
  const rule = PAGE_KIND_RULES[kind];
  const raw = record(value);
  const faqs = Array.isArray(raw.faqs) ? (raw.faqs as unknown[]) : [];
  return {
    metaTitle: lineOf(raw.metaTitle),
    metaDescription: lineOf(raw.metaDescription),
    shareImage: imageOf(raw.shareImage),
    tagline: rule.tagline ? lineOf(raw.tagline) : "",
    heroHeadline: lineOf(raw.heroHeadline),
    heroSubheadline: lineOf(raw.heroSubheadline),
    heroImage: imageOf(raw.heroImage),
    intro: rule.intro === "none" ? "" : paragraphTextOf(raw.intro),
    body: rule.body ? markdownOf(raw.body) : "",
    faqs: faqs.map((row) => {
      const { question, answer } = record(row);
      return { question: lineOf(question), answer: paragraphTextOf(answer) };
    }),
    addressId:
      rule.address && typeof raw.addressId === "string" && raw.addressId !== ""
        ? raw.addressId
        : null,
    // Stored before the switch, a page has none: it is listed.
    indexable: raw.indexable !== false,
  };
}

/** An empty page, as one never written reads. */
export function emptyPageContent(kind: PageKind): PageContent {
  return pageContentOf(kind, null);
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
  if (over(content.tagline, L.tagline)) {
    return fail(`The tagline is at most ${L.tagline} characters.`);
  }
  if (over(content.heroHeadline, L.heroHeadline)) {
    return fail(`The headline is at most ${L.heroHeadline} characters.`);
  }
  if (over(content.heroSubheadline, L.heroSubheadline)) {
    return fail(
      `The line under the headline is at most ${L.heroSubheadline} characters.`,
    );
  }
  if (over(content.intro, L.intro)) {
    return fail(`The intro is at most ${L.intro} characters.`);
  }
  if (over(content.body, L.body)) {
    return fail(
      `The text is at most ${L.body.toLocaleString("en")} characters.`,
    );
  }
  const alts = [
    content.shareImage?.alt ?? "",
    content.heroImage?.alt ?? "",
    ...markdownImagesOf(content.body).map((image) => image.alt),
  ];
  if (alts.some((alt) => over(alt, L.imageAlt))) {
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

/** The two tabs of the page editor: what the page shows, and what search engines and shared links show. */
export type PageEditorTab = "content" | "search";

/**
 * One thing a page needs before it is published, as the publish dialog
 * lists them: what a complete page has there, the tab it is edited on, and
 * what is still missing, empty once it is done.
 */
export type PageCheck = {
  key: "search" | "hero" | "intro" | "body" | "faqs";
  label: string;
  tab: PageEditorTab;
  missing: string[];
};

/**
 * Everything a page of the kind needs before it can be published, in the
 * order of the editor: the meta title and description, the hero, then the
 * intro or the text, and the FAQs, those its kind holds. A share image is
 * optional, but one that is set needs its alt text; so does an optional
 * hero image, and every image in a text, which must be one uploaded here.
 */
export function pageChecks(kind: PageKind, content: PageContent): PageCheck[] {
  const L = PAGE_LIMITS;
  const rule = PAGE_KIND_RULES[kind];
  const labels = heroLabelsOf(kind);

  const search: string[] = [];
  if (content.metaTitle === "") search.push("Meta title");
  if (content.metaDescription === "") search.push("Meta description");
  if (content.shareImage && content.shareImage.alt === "") {
    search.push("Share image: the alt text");
  }

  const hero: string[] = [];
  if (content.heroHeadline === "") hero.push(labels.headline);
  if (content.heroSubheadline === "") hero.push(labels.subheadline);
  if (rule.heroImage === "required" || content.heroImage) {
    hero.push(
      ...missingOfImage(
        content.heroImage,
        "Hero image",
        "Hero image: the alt text",
      ),
    );
  }

  const checks: PageCheck[] = [
    {
      key: "search",
      label: "A meta title and description for search results",
      tab: "search",
      missing: search,
    },
    {
      key: "hero",
      label:
        rule.heroImage === "required"
          ? `${labels.headline}, ${labels.subheadline.toLowerCase()} and a hero image with its alt text`
          : `${labels.headline} and ${labels.subheadline.toLowerCase()}`,
      tab: "content",
      missing: hero,
    },
  ];

  if (rule.intro === "required") {
    const words = wordCount(content.intro);
    checks.push({
      key: "intro",
      label: `An intro of at least ${L.introWords} words`,
      tab: "content",
      missing:
        words < L.introWords
          ? [`Intro: at least ${L.introWords} words (${words} so far)`]
          : [],
    });
  }

  if (rule.body) {
    const body: string[] = [];
    const words = markdownWordCount(content.body);
    if (words < L.bodyWords) {
      body.push(`Text: at least ${L.bodyWords} words (${words} so far)`);
    }
    for (const image of markdownImagesOf(content.body)) {
      const what = `Image ${image.index + 1} in the text`;
      if (!isUploadUrl(image.url)) body.push(`${what}: upload it here`);
      if (image.alt.trim() === "") body.push(`${what}: the alt text`);
    }
    checks.push({
      key: "body",
      label: `A text of at least ${L.bodyWords} words, its images uploaded here with their alt text`,
      tab: "content",
      missing: body,
    });
  }

  const faqs: string[] = [];
  if (rule.faqs === "required" && content.faqs.length < L.minFaqs) {
    faqs.push(`FAQs: at least ${L.minFaqs} (${content.faqs.length} so far)`);
  }
  for (const [i, faq] of content.faqs.entries()) {
    if (faq.question === "") faqs.push(`FAQ ${i + 1}: the question`);
    if (faq.answer === "") faqs.push(`FAQ ${i + 1}: the answer`);
  }
  checks.push({
    key: "faqs",
    label:
      rule.faqs === "required"
        ? `At least ${L.minFaqs} FAQs, each with its answer`
        : "Each FAQ with its question and answer",
    tab: "content",
    missing: faqs,
  });
  return checks;
}

/**
 * What the page still needs before it can be published, in the order of the
 * editor: "Meta title", "Intro: at least 100 words (62 so far)", "FAQ 2:
 * the answer". Empty when the page is complete.
 */
export function missingFields(kind: PageKind, content: PageContent): string[] {
  return pageChecks(kind, content).flatMap((check) => check.missing);
}

/** The parts of a page as a person names them, in the order of the editor. */
const PAGE_PARTS: readonly (readonly [keyof PageContent, string])[] = [
  ["metaTitle", "Meta title"],
  ["metaDescription", "Meta description"],
  ["shareImage", "Share image"],
  ["tagline", "Tagline"],
  ["heroHeadline", "Headline"],
  ["heroSubheadline", "Subheadline"],
  ["heroImage", "Hero image"],
  ["intro", "Intro"],
  ["body", "Text"],
  ["faqs", "FAQs"],
  ["addressId", "Saved address"],
  ["indexable", "Search engines"],
];

/** The parts in which two contents differ, by name: what a publish would change. */
export function changedPageParts(a: PageContent, b: PageContent): string[] {
  return PAGE_PARTS.filter(
    ([key]) => JSON.stringify(a[key]) !== JSON.stringify(b[key]),
  ).map(([, label]) => label);
}

/** Whether the page can be published: within the limits with nothing missing. */
export function checkPageComplete(
  kind: PageKind,
  content: PageContent,
): Change {
  const limits = checkPageLimits(content);
  if (!limits.ok) return limits;
  const missing = missingFields(kind, content);
  if (missing.length === 0) return { ok: true };
  const more = missing.length - 1;
  return fail(
    `The page is not complete. Still missing: ${missing[0]}${
      more > 0 ? `, and ${more} more` : ""
    }.`,
  );
}

/**
 * The files of uploaded images on a page: its share image, its hero, and
 * those in its text. What the Media screen counts as used, and what a save
 * checks was not deleted meanwhile.
 */
export function pageImageUrls(content: PageContent): string[] {
  return [
    content.shareImage?.url,
    content.heroImage?.url,
    ...markdownImagesOf(content.body).map((image) => image.url),
  ].filter((url): url is string => url !== undefined && isUploadUrl(url));
}

/** The UploadThing keys of the images on a page, as `pageImageUrls` finds them. */
export function pageImageKeys(content: PageContent): string[] {
  return [
    ...new Set(
      pageImageUrls(content).flatMap((url) => {
        const key = uploadKeyOf(url);
        return key ? [key] : [];
      }),
    ),
  ];
}

/**
 * Where a page stands between its draft and its public copy: not published,
 * published as it is drafted, or published with newer edits waiting in the
 * draft. Published means the public can see the page, once what it sits in
 * is public: its location live, its section's page published. A page that
 * was unpublished reads as not published, whatever it once showed.
 */
export const PAGE_STATUSES = ["unpublished", "published", "changed"] as const;
export type PageStatus = (typeof PAGE_STATUSES)[number];
export const PAGE_STATUS_LABELS: Record<PageStatus, string> = {
  unpublished: "Not published",
  published: "Published",
  changed: "Published, edits waiting",
};

/** What a list of pages narrows to: a page's standing, or a class's page paused. */
export const PAGE_FILTERS = [...PAGE_STATUSES, "paused"] as const;
export type PageFilter = (typeof PAGE_FILTERS)[number];
export const isPageFilter = guardFor(PAGE_FILTERS);
export const PAGE_FILTER_LABELS: Record<PageFilter, string> = {
  ...PAGE_STATUS_LABELS,
  paused: "Paused",
};

/**
 * Whether a page is in a list narrowed by a standing and by a search,
 * which matches its name or its address, whatever their case.
 */
export function isPageInList(
  page: { name: string; status: PageStatus; paused: boolean },
  path: string,
  filter: { status?: PageFilter; q?: string },
): boolean {
  if (
    filter.status === "paused"
      ? !page.paused
      : filter.status && page.status !== filter.status
  ) {
    return false;
  }
  const term = filter.q?.trim().toLowerCase();
  return (
    !term ||
    page.name.toLowerCase().includes(term) ||
    path.toLowerCase().includes(term)
  );
}

/**
 * The copy the public is shown of a page, from its stored row: null while
 * the page is not published. `isOn` is true from a publish until the page
 * is unpublished; `published` keeps the copy last published either way.
 */
export function publicCopyOf(
  kind: PageKind,
  row: { isOn: boolean; published: unknown },
): PageContent | null {
  return row.isOn && row.published != null
    ? pageContentOf(kind, row.published)
    : null;
}

/** `publicCopy` is what the public is shown: null while the page is not published. */
export function pageStatusOf(
  draft: PageContent,
  publicCopy: PageContent | null,
): PageStatus {
  if (!publicCopy) return "unpublished";
  return samePageContent(draft, publicCopy) ? "published" : "changed";
}

/** Whether the page has a public copy: it is published, with or without edits waiting. */
export function isPagePublished(status: PageStatus) {
  return status !== "unpublished";
}
