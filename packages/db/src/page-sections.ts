import { guardFor } from "./const-enum";
import { SECTIONS } from "./location-page-input";
import type { PageKind } from "./page-content";
import {
  isSize,
  lineOf,
  listOf,
  pageImageOf,
  paragraphTextOf,
  recordOf,
  type PageImage,
} from "./page-text";
import {
  isWebUrl,
  siteLinkTargetOf,
  type SiteLinkKind,
  type SiteLinkTargetOf,
} from "./site-link";
import { HUB_PAGES, SITE_PAGE_LABELS } from "./site-page-input";

/**
 * The sections of the home page and of a service's hub, between the hero
 * and the intro, pure and browser-safe: what each holds, the order and the
 * switches Marketing sets, the limits and what a section switched on still
 * needs. They are kept in the page's content (./page-content), so they are
 * drafted, published and compared with the rest of it. A page stored
 * before sections, or never written, reads as its built-in sections: what
 * the page showed before. See docs/261114-landing-sections.md.
 */

export const SECTION_TYPES = [
  "why-us",
  "services",
  "vehicles",
  "steps",
  "destinations",
  "locations",
  "trusted-by",
  "testimonials",
  "news",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];
export const isSectionType = guardFor(SECTION_TYPES);

export const SECTION_LABELS: Record<SectionType, string> = {
  "why-us": "Why Us",
  services: "Our Services",
  vehicles: "Vehicle Options",
  steps: "How It Works",
  destinations: "Destinations",
  locations: "Locations",
  "trusted-by": "Trusted By",
  testimonials: "Testimonials",
  news: "Latest News",
};

/** What each section is for, as the editor says under its name. */
export const SECTION_HINTS: Record<SectionType, string> = {
  "why-us":
    "A few reasons to book with us, each an icon, a title and a line. On the home page, the strip under the hero.",
  services:
    "Up to 6 photo cards, each leading to a page of the site or to a search card set to a kind of trip.",
  vehicles:
    "The vehicle classes you pick, in your order, with their photo, seats and luggage from the class catalogue.",
  steps: "How booking works, in 3 or 4 steps.",
  destinations: "The top choices, picked on the Website screen.",
  locations: "Every location whose page of the service is published.",
  "trusted-by": "Logos of clients who allow us to show them.",
  testimonials: "What clients said, with their permission.",
  news: "The newest posts of the blog.",
};

/** The sections each kind of page holds, in their built-in order; none on the other kinds. */
export const PAGE_SECTION_TYPES: Partial<
  Record<PageKind, readonly SectionType[]>
> = {
  home: [
    "why-us",
    "services",
    "vehicles",
    "destinations",
    "trusted-by",
    "testimonials",
    "news",
  ],
  hub: [
    "why-us",
    "vehicles",
    "steps",
    "locations",
    "trusted-by",
    "testimonials",
    "news",
  ],
};

/** The icons a Why Us point may show. */
export const WHY_US_ICONS = [
  "check",
  "shield",
  "price",
  "support",
  "clock",
  "team",
  "map",
  "route",
  "car",
  "coach",
] as const;
export type WhyUsIcon = (typeof WHY_US_ICONS)[number];
export const isWhyUsIcon = guardFor(WHY_US_ICONS);

export const WHY_US_ICON_LABELS: Record<WhyUsIcon, string> = {
  check: "Tick",
  shield: "Shield",
  price: "Price",
  support: "Support",
  clock: "Clock",
  team: "Team",
  map: "Map",
  route: "Route",
  car: "Car",
  coach: "Coach",
};

/** Where a service card may lead: a page of ours, or a search card. */
export const SERVICE_CARD_LINK_KINDS = [
  "search",
  "page",
  "location",
  "post",
] as const satisfies readonly SiteLinkKind[];
export type ServiceCardLink = SiteLinkTargetOf<
  (typeof SERVICE_CARD_LINK_KINDS)[number]
>;

export type WhyUsPoint = { icon: WhyUsIcon; title: string; text: string };

/** A client's logo: its name is its alt text. */
export type ClientLogo = {
  image: PageImage | null;
  name: string;
  /** The client's site, opened in a new tab. Optional. */
  link: string;
};

export type ServiceCard = {
  /** Optional: without one, the photo of the page it leads to. */
  image: PageImage | null;
  title: string;
  text: string;
  /** The button's words: "Book a Transfer". Optional: without, an arrow. */
  button: string;
  link: ServiceCardLink;
};

export type BookingStep = { title: string; text: string };

export type Testimonial = {
  /** Plain paragraphs. */
  quote: string;
  name: string;
  /** The line under the name: "Corporate client, Kuala Lumpur". Optional. */
  detail: string;
  /** Optional. Shown beside the name, which says who it is. */
  image: PageImage | null;
};

/** What every section has: whether it shows, and its heading. */
type SectionBase = {
  on: boolean;
  /** The small line over the title. Optional. */
  eyebrow: string;
  title: string;
  /** The line under the title. Optional. */
  lead: string;
};

/** What each type of section holds besides its heading. */
type SectionItems =
  | { type: "why-us"; points: WhyUsPoint[] }
  | { type: "services"; cards: ServiceCard[] }
  | { type: "vehicles"; classIds: string[] }
  | { type: "steps"; steps: BookingStep[] }
  | { type: "destinations" }
  | { type: "locations" }
  | { type: "trusted-by"; logos: ClientLogo[] }
  | { type: "testimonials"; quotes: Testimonial[] }
  | { type: "news"; count: number };

/** One section: a union by its type, each with the heading and the switch. */
export type PageSection = SectionItems extends infer Items
  ? Items extends SectionItems
    ? SectionBase & Items
    : never
  : never;

export type PageSectionOf<T extends SectionType> = Extract<
  PageSection,
  { type: T }
>;

export const SECTION_LIMITS = {
  /** Characters. */
  eyebrow: 40,
  title: 80,
  lead: 200,
  pointTitle: 60,
  pointText: 160,
  logoName: 80,
  url: 500,
  cardTitle: 60,
  cardText: 160,
  cardButton: 30,
  stepTitle: 60,
  stepText: 240,
  quote: 600,
  quoteName: 80,
  quoteDetail: 80,
  imageAlt: 160,
  /** How many of each a section holds. */
  points: 6,
  /** How many points or steps a section switched on with any needs, at least. */
  minPoints: 3,
  minSteps: 3,
  logos: 16,
  cards: 6,
  classes: 12,
  steps: 4,
  quotes: 12,
  /** How many posts Latest News shows, at least and at most. */
  minNews: 1,
  maxNews: 6,
} as const;

/** How many posts Latest News shows until Marketing sets it. */
const NEWS_COUNT = 3;

/** The words a section starts with, before Marketing writes its own. */
const HEADINGS: Record<
  SectionType,
  Record<"home" | "hub", Omit<SectionBase, "on">>
> = (() => {
  const same = (eyebrow: string, title: string, lead = "") => {
    const heading = { eyebrow, title, lead };
    return { home: heading, hub: heading };
  };
  return {
    "why-us": {
      // The strip under the hero, as the site has long had it, with no heading.
      home: { eyebrow: "", title: "", lead: "" },
      hub: { eyebrow: "Why Us", title: "Why Book with Us", lead: "" },
    },
    services: same("What We Offer", "Our Services", "See where each one runs."),
    vehicles: {
      home: { eyebrow: "Our Fleet", title: "Class of Services", lead: "" },
      hub: { eyebrow: "Our Fleet", title: "Vehicle Options", lead: "" },
    },
    steps: same("How It Works", "Transportation Made Easy"),
    destinations: same(
      "Locations We Cover",
      "Choose Your Destination",
      "Start with where you are going.",
    ),
    locations: same("Choose a Location", "Where We Offer It"),
    "trusted-by": same("", "Trusted By"),
    testimonials: same("What Clients Say", "Client Testimonials"),
    news: same("From the Blog", "Latest News"),
  };
})();

/** The home page's strip of reasons, as the site showed it before sections. */
const HOME_POINTS: WhyUsPoint[] = [
  {
    icon: "check",
    title: "Trusted Local Team",
    text: "Quality you can rely on",
  },
  { icon: "price", title: "Clear, Fair Pricing", text: "No surprise charges" },
  {
    icon: "support",
    title: "Support When Needed",
    text: "Real people, ready to help",
  },
];

/** A section of the type, empty, with its built-in heading, off. */
export function emptySection<T extends SectionType>(
  type: T,
  kind: PageKind,
): PageSectionOf<T> {
  const heading = HEADINGS[type][kind === "home" ? "home" : "hub"];
  const base = { on: false, ...heading };
  const section = ((): PageSection => {
    switch (type) {
      case "why-us":
        return { ...base, type, points: [] };
      case "services":
        return { ...base, type, cards: [] };
      case "vehicles":
        return { ...base, type, classIds: [] };
      case "steps":
        return { ...base, type, steps: [] };
      case "trusted-by":
        return { ...base, type, logos: [] };
      case "testimonials":
        return { ...base, type, quotes: [] };
      case "news":
        return { ...base, type, count: NEWS_COUNT };
      default:
        return { ...base, type: type as "destinations" | "locations" };
    }
  })();
  return section as PageSectionOf<T>;
}

/**
 * The sections a page shows before Marketing sets its own: on the home
 * page, the strip of reasons, the two hubs as its services and the top
 * choices; on a hub, its locations. The others are there, off.
 */
export function builtInSections(kind: PageKind): PageSection[] {
  return (PAGE_SECTION_TYPES[kind] ?? []).map((type): PageSection => {
    const section = emptySection(type, kind);
    switch (section.type) {
      case "why-us":
        return kind === "home"
          ? { ...section, on: true, points: HOME_POINTS }
          : section;
      case "services":
        return {
          ...section,
          on: true,
          cards: HUB_PAGES.map((page) => ({
            image: null,
            title: SITE_PAGE_LABELS[page],
            text: SECTIONS[page].note,
            // No button: the card as the home page has long drawn it, with an arrow.
            button: "",
            link: { kind: "page", page },
          })),
        };
      case "destinations":
      case "locations":
        return { ...section, on: true };
      default:
        return section;
    }
  });
}

function pointOf(value: unknown): WhyUsPoint {
  const { icon, title, text } = recordOf(value);
  return {
    icon: isWhyUsIcon(icon) ? icon : "check",
    title: lineOf(title),
    text: lineOf(text),
  };
}

function logoOf(value: unknown): ClientLogo {
  const { image, name, link } = recordOf(value);
  return { image: pageImageOf(image), name: lineOf(name), link: lineOf(link) };
}

function cardOf(value: unknown): ServiceCard {
  const { image, title, text, button, link } = recordOf(value);
  return {
    image: pageImageOf(image),
    title: lineOf(title),
    text: lineOf(text),
    button: lineOf(button),
    link: siteLinkTargetOf(link, SERVICE_CARD_LINK_KINDS),
  };
}

function stepOf(value: unknown): BookingStep {
  const { title, text } = recordOf(value);
  return { title: lineOf(title), text: lineOf(text) };
}

function quoteOf(value: unknown): Testimonial {
  const { quote, name, detail, image } = recordOf(value);
  return {
    quote: paragraphTextOf(quote),
    name: lineOf(name),
    detail: lineOf(detail),
    image: pageImageOf(image),
  };
}

/** A stored section of the type, read field by field. */
function sectionOf(
  type: SectionType,
  raw: Record<string, unknown>,
): PageSection {
  const base: SectionBase = {
    on: raw.on === true,
    eyebrow: lineOf(raw.eyebrow),
    title: lineOf(raw.title),
    lead: lineOf(raw.lead),
  };
  switch (type) {
    case "why-us":
      return { ...base, type, points: listOf(raw.points).map(pointOf) };
    case "services":
      return { ...base, type, cards: listOf(raw.cards).map(cardOf) };
    case "vehicles":
      return {
        ...base,
        type,
        classIds: [
          ...new Set(
            listOf(raw.classIds).filter(
              (id): id is string => typeof id === "string" && id !== "",
            ),
          ),
        ],
      };
    case "steps":
      return { ...base, type, steps: listOf(raw.steps).map(stepOf) };
    case "trusted-by":
      return { ...base, type, logos: listOf(raw.logos).map(logoOf) };
    case "testimonials":
      return { ...base, type, quotes: listOf(raw.quotes).map(quoteOf) };
    case "news":
      return {
        ...base,
        type,
        count: isSize(raw.count)
          ? Math.min(raw.count, SECTION_LIMITS.maxNews)
          : NEWS_COUNT,
      };
    case "destinations":
    case "locations":
      return { ...base, type };
  }
}

/**
 * The sections a stored or submitted value holds for a page of the kind:
 * each of the kind's types once, in the stored order, read field by field.
 * A type the value lacks, one added since it was stored, comes after them,
 * empty and off. A value that is not a list, a page stored before
 * sections, reads as the built-in sections. None on a kind without them.
 */
export function pageSectionsOf(kind: PageKind, value: unknown): PageSection[] {
  const types = PAGE_SECTION_TYPES[kind];
  if (!types) return [];
  if (!Array.isArray(value)) return builtInSections(kind);
  const read = new Map<SectionType, PageSection>();
  for (const row of value) {
    const raw = recordOf(row);
    if (isSectionType(raw.type) && types.includes(raw.type)) {
      if (!read.has(raw.type)) read.set(raw.type, sectionOf(raw.type, raw));
    }
  }
  return [
    ...read.values(),
    ...types
      .filter((type) => !read.has(type))
      .map((type) => emptySection(type, kind)),
  ];
}

/** The section of the type on the page; undefined on a kind without it. */
export function sectionOfType<T extends SectionType>(
  sections: readonly PageSection[],
  type: T,
): PageSectionOf<T> | undefined {
  return sections.find((s): s is PageSectionOf<T> => s.type === type);
}

/** How a list's limit is said: "at most 6 points". */
const atMost = (what: string, count: number, limit: number) =>
  count > limit ? `${what}: at most ${limit}, not ${count}` : null;

/**
 * The length and count limits of every section, on or off, which a draft
 * is checked against every time it is saved: the first one broken, as a
 * sentence, or null.
 */
export function sectionLimitError(
  sections: readonly PageSection[],
): string | null {
  const L = SECTION_LIMITS;
  for (const section of sections) {
    const name = SECTION_LABELS[section.type];
    const over = (text: string, limit: number, what: string) =>
      text.length > limit
        ? `${name}: ${what} is at most ${limit} characters.`
        : null;
    const error =
      over(section.eyebrow, L.eyebrow, "the small line over the title") ??
      over(section.title, L.title, "the title") ??
      over(section.lead, L.lead, "the line under the title") ??
      itemLimitError(section);
    if (error) return error;
  }
  return null;
}

function itemLimitError(section: PageSection): string | null {
  const L = SECTION_LIMITS;
  const name = SECTION_LABELS[section.type];
  const over = (text: string, limit: number, what: string) =>
    text.length > limit
      ? `${name}, ${what} is at most ${limit} characters.`
      : null;
  const count = (have: number, limit: number, what: string) => {
    const said = atMost(what, have, limit);
    return said ? `${name}: ${said}.` : null;
  };
  const first = <T>(
    items: readonly T[],
    check: (item: T, n: number) => string | null,
  ) => {
    for (const [i, item] of items.entries()) {
      const error = check(item, i + 1);
      if (error) return error;
    }
    return null;
  };
  switch (section.type) {
    case "why-us":
      return (
        count(section.points.length, L.points, "points") ??
        first(
          section.points,
          (p, n) =>
            over(p.title, L.pointTitle, `point ${n}: the title`) ??
            over(p.text, L.pointText, `point ${n}: the line`),
        )
      );
    case "services":
      return (
        count(section.cards.length, L.cards, "cards") ??
        first(
          section.cards,
          (c, n) =>
            over(c.title, L.cardTitle, `card ${n}: the title`) ??
            over(c.text, L.cardText, `card ${n}: the line`) ??
            over(c.button, L.cardButton, `card ${n}: the button`) ??
            over(c.image?.alt ?? "", L.imageAlt, `card ${n}: the alt text`),
        )
      );
    case "vehicles":
      return count(section.classIds.length, L.classes, "classes");
    case "steps":
      return (
        count(section.steps.length, L.steps, "steps") ??
        first(
          section.steps,
          (s, n) =>
            over(s.title, L.stepTitle, `step ${n}: the title`) ??
            over(s.text, L.stepText, `step ${n}: the line`),
        )
      );
    case "trusted-by":
      return (
        count(section.logos.length, L.logos, "logos") ??
        first(
          section.logos,
          (l, n) =>
            over(l.name, L.logoName, `logo ${n}: the name`) ??
            over(l.link, L.url, `logo ${n}: the link`),
        )
      );
    case "testimonials":
      return (
        count(section.quotes.length, L.quotes, "quotes") ??
        first(
          section.quotes,
          (q, n) =>
            over(q.quote, L.quote, `quote ${n}: the words`) ??
            over(q.name, L.quoteName, `quote ${n}: the name`) ??
            over(
              q.detail,
              L.quoteDetail,
              `quote ${n}: the line under the name`,
            ),
        )
      );
    case "news":
    case "destinations":
    case "locations":
      return null;
  }
}

/**
 * What the sections switched on still need before a page of the kind is
 * published, in the editor's order: "Trusted By: a title", "Testimonials,
 * quote 2: the name". A section switched on with nothing in it needs
 * nothing: the site leaves it out. One switched off needs nothing either.
 */
export function missingInSections(
  kind: PageKind,
  sections: readonly PageSection[],
): string[] {
  const L = SECTION_LIMITS;
  const missing: string[] = [];
  for (const section of sections) {
    if (!section.on) continue;
    const name = SECTION_LABELS[section.type];
    const need = (what: string) => missing.push(`${name}, ${what}`);
    // The home page's strip of reasons may go without a heading.
    const untitled = kind === "home" && section.type === "why-us";
    if (section.title === "" && !untitled) {
      missing.push(`${name}: a title`);
    }
    const atLeast = (have: number, min: number, what: string) => {
      if (have > 0 && have < min) {
        missing.push(`${name}: at least ${min} ${what} (${have} so far)`);
      }
    };
    switch (section.type) {
      case "why-us":
        atLeast(section.points.length, L.minPoints, "points");
        section.points.forEach((p, i) => {
          if (p.title === "") need(`point ${i + 1}: the title`);
        });
        break;
      case "services":
        section.cards.forEach((c, i) => {
          const n = `card ${i + 1}`;
          if (c.title === "") need(`${n}: the title`);
          if (
            (c.link.kind === "location" || c.link.kind === "post") &&
            c.link.slug === ""
          ) {
            need(`${n}: where it leads`);
          }
          if (c.image && c.image.alt === "") need(`${n}: the alt text`);
        });
        break;
      case "steps":
        atLeast(section.steps.length, L.minSteps, "steps");
        section.steps.forEach((s, i) => {
          if (s.title === "") need(`step ${i + 1}: the title`);
        });
        break;
      case "trusted-by":
        section.logos.forEach((l, i) => {
          const n = `logo ${i + 1}`;
          if (!l.image) need(`${n}: the image`);
          if (l.name === "") need(`${n}: the client's name`);
          if (l.link !== "" && !isWebUrl(l.link)) {
            need(`${n}: a web address starting with https://`);
          }
        });
        break;
      case "testimonials":
        section.quotes.forEach((q, i) => {
          const n = `quote ${i + 1}`;
          if (q.quote === "") need(`${n}: the words`);
          if (q.name === "") need(`${n}: the name`);
        });
        break;
      case "vehicles":
      case "destinations":
      case "locations":
      case "news":
        break;
    }
  }
  return missing;
}

/** Every image the sections hold, on or off: what the Media screen counts as used. */
export function sectionImages(sections: readonly PageSection[]): PageImage[] {
  return sections.flatMap((section) => {
    switch (section.type) {
      case "services":
        return section.cards.flatMap((c) => (c.image ? [c.image] : []));
      case "trusted-by":
        return section.logos.flatMap((l) => (l.image ? [l.image] : []));
      case "testimonials":
        return section.quotes.flatMap((q) => (q.image ? [q.image] : []));
      default:
        return [];
    }
  });
}

/** Whether a section shows anything once it is on: a list with something in it, or one read live. */
export function sectionHasItems(section: PageSection): boolean {
  switch (section.type) {
    case "why-us":
      return section.points.length > 0;
    case "services":
      return section.cards.length > 0;
    case "vehicles":
      return section.classIds.length > 0;
    case "steps":
      return section.steps.length > 0;
    case "trusted-by":
      return section.logos.length > 0;
    case "testimonials":
      return section.quotes.length > 0;
    case "destinations":
    case "locations":
    case "news":
      return true;
  }
}

/** The sections whose items another page may copy: they are kept per page. */
export const COPYABLE_SECTIONS = ["trusted-by", "testimonials"] as const;
export type CopyableSection = (typeof COPYABLE_SECTIONS)[number];
export const isCopyableSection = guardFor(COPYABLE_SECTIONS);

/**
 * `into` with the items of `from` it lacks added after its own, up to the
 * section's limit: a logo is the same as another by its image, or its
 * name where it has none; a quote by its name and words. How "Copy from"
 * brings another page's logos or quotes. `added` counts what came over,
 * `skipped` what was there already or past the limit. Sections of two
 * types copy nothing.
 */
export function copySectionItems<S extends PageSectionOf<CopyableSection>>(
  into: S,
  from: PageSectionOf<CopyableSection>,
): { section: S; added: number; skipped: number } {
  if (into.type === "trusted-by" && from.type === "trusted-by") {
    const { items, added, skipped } = merged(
      into.logos,
      from.logos,
      (l) => l.image?.url ?? `name:${l.name}`,
      SECTION_LIMITS.logos,
    );
    return { section: { ...into, logos: items }, added, skipped };
  }
  if (into.type === "testimonials" && from.type === "testimonials") {
    const { items, added, skipped } = merged(
      into.quotes,
      from.quotes,
      (q) => `${q.name}
${q.quote}`,
      SECTION_LIMITS.quotes,
    );
    return { section: { ...into, quotes: items }, added, skipped };
  }
  return { section: into, added: 0, skipped: 0 };
}

function merged<T>(
  into: readonly T[],
  from: readonly T[],
  keyOf: (item: T) => string,
  limit: number,
) {
  const seen = new Set(into.map(keyOf));
  const items = [...into];
  let added = 0;
  for (const item of from) {
    const key = keyOf(item);
    if (seen.has(key) || items.length >= limit) continue;
    seen.add(key);
    items.push(item);
    added += 1;
  }
  return { items, added, skipped: from.length - added };
}
