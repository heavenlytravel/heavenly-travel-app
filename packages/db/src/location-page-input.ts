import { TRIP_CATEGORY_LABELS, type TripCategory } from "./booking-status";
import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import type { PageKind } from "./page-content";
import { plural } from "./names";
import { SITE_NAME } from "./site-page-input";
import { slugify } from "./slug";

/**
 * A location's pages, pure and browser-safe: its main page, then its
 * sections, each with a page of its own and, for most, pages under it.
 * Car with driver and coach charter have one page per vehicle class the
 * location offers; popular places, attractions, hotels and the blog have
 * pages Marketing adds on demand. What a page holds is its kind's
 * (./page-content). See docs/261025-marketing-pages.md, "A location's site
 * is sections".
 */

/**
 * The location's own page, at its address: /langkawi. Its key stays
 * "landing", in the rows, the log and the code; staff read it as the main
 * page.
 */
export const LANDING_PAGE = "landing";

/** The sections of every location, in the order its pages and the console list them. */
export const LOCATION_SECTIONS = [
  "car-with-driver",
  "coach-charter",
  "car-rental",
  "attractions",
  "hotels",
  "popular-places",
  "blog",
] as const;
export type LocationSection = (typeof LOCATION_SECTIONS)[number];
export const isLocationSection = guardFor(LOCATION_SECTIONS);

/** The pages a location's row can be: its main page, or a section's. A page under a section shares its section's key, with a slug. */
export const LOCATION_PAGES = [LANDING_PAGE, ...LOCATION_SECTIONS] as const;
export type LocationPageKey = (typeof LOCATION_PAGES)[number];
export const isLocationPageKey = guardFor(LOCATION_PAGES);

/** What a section's pages under it are. */
export type SectionChildren =
  /** One per vehicle class the location offers in the product, keyed by the class's slug. */
  | { type: "classes"; category: TripCategory }
  /** Added by Marketing, each with a slug of its own. */
  | {
      type: "entries";
      kind: Extract<PageKind, "place" | "article">;
      /** What one is called: "popular place". */
      one: string;
      /** And several: "popular places". */
      many: string;
      /** Shown in Marketing's order; else newest first, by their first publish. */
      ordered: boolean;
    };

export type SectionDef = {
  label: string;
  /** The kind of the section's own page. */
  kind: Extract<PageKind, "service" | "listing">;
  /** The pages under it; null for none yet. */
  children: SectionChildren | null;
  /**
   * A service that cannot be booked online yet: its pages are written and
   * published, and say that online booking is coming.
   */
  comingSoon: boolean;
  /** One line about it, on the card that opens its page. */
  note: string;
};

export const SECTIONS: Record<LocationSection, SectionDef> = {
  "car-with-driver": {
    label: TRIP_CATEGORY_LABELS["car-with-driver"],
    kind: "service",
    children: { type: "classes", category: "car-with-driver" },
    comingSoon: false,
    note: "Sedan, MPV or van, with a driver",
  },
  "coach-charter": {
    label: TRIP_CATEGORY_LABELS["coach-charter"],
    kind: "service",
    children: { type: "classes", category: "coach-charter" },
    comingSoon: false,
    note: "Minibus or coach for groups",
  },
  "car-rental": {
    label: "Car rental",
    kind: "service",
    // One page per class, as car with driver, once car rental is a
    // category with classes of its own.
    children: null,
    comingSoon: true,
    note: "Drive yourself, by the day or the week",
  },
  attractions: {
    label: "Attractions",
    kind: "service",
    children: {
      type: "entries",
      kind: "place",
      one: "attraction",
      many: "attractions",
      ordered: true,
    },
    comingSoon: true,
    note: "Tickets and tours, skip the queue",
  },
  hotels: {
    label: "Hotels",
    kind: "service",
    children: {
      type: "entries",
      kind: "place",
      one: "hotel",
      many: "hotels",
      ordered: true,
    },
    comingSoon: true,
    note: "Stays picked by people who live here",
  },
  "popular-places": {
    label: "Popular places",
    kind: "listing",
    children: {
      type: "entries",
      kind: "place",
      one: "popular place",
      many: "popular places",
      ordered: true,
    },
    comingSoon: false,
    note: "Where most visitors go",
  },
  blog: {
    label: "Blog",
    kind: "listing",
    children: {
      type: "entries",
      kind: "article",
      one: "post",
      many: "posts",
      ordered: false,
    },
    comingSoon: false,
    note: "Guides and stories",
  },
};

/** The sections that are services, whose pages the main page offers as cards. */
export const SERVICE_SECTIONS = LOCATION_SECTIONS.filter(
  (section) => SECTIONS[section].kind === "service",
);

export const LOCATION_PAGE_LABELS: Record<LocationPageKey, string> = {
  landing: "Main page",
  ...(Object.fromEntries(
    LOCATION_SECTIONS.map((section) => [section, SECTIONS[section].label]),
  ) as Record<LocationSection, string>),
};

/**
 * One page of a location: its main page or a section's own, with an empty
 * slug, or a page under a section, by its slug: `{ page: "car-with-driver",
 * slug: "sedan" }`.
 */
export type LocationPageRef = { page: LocationPageKey; slug: string };

/** The main page. */
export const LANDING_REF: LocationPageRef = { page: LANDING_PAGE, slug: "" };

/** Whether the page is under a section, not the main page or a section's own. */
export function isChildPage(ref: LocationPageRef) {
  return ref.slug !== "";
}

/** What the section's pages under it are; null for the main page, or a section with none. */
export function childrenOf(page: LocationPageKey): SectionChildren | null {
  return page === LANDING_PAGE ? null : SECTIONS[page].children;
}

/** How many pages a section has under it, as a list says it: "3 classes", "4 popular places", "1 post". */
export function childrenCount(children: SectionChildren, n: number) {
  return children.type === "classes"
    ? plural(n, "class", "classes")
    : plural(n, children.one, children.many);
}

/** The kind of a page, which decides what it holds. */
export function pageKindOf(ref: LocationPageRef): PageKind {
  if (ref.page === LANDING_PAGE) return "landing";
  const section = SECTIONS[ref.page];
  if (!isChildPage(ref)) return section.kind;
  if (section.children?.type === "entries") return section.children.kind;
  return "class";
}

/** Whether a page can exist: its main page and each section's own, or one under a section that has pages under it. */
export function isLocationPageRef(ref: {
  page: unknown;
  slug: unknown;
}): ref is LocationPageRef {
  if (!isLocationPageKey(ref.page) || typeof ref.slug !== "string") {
    return false;
  }
  if (ref.slug === "") return true;
  return childrenOf(ref.page) !== null && ref.slug === slugify(ref.slug);
}

/** The page a log entry's `{ page, slug }` names; one from before sections has no slug. */
export function loggedPageRef(json: unknown): LocationPageRef | null {
  if (typeof json !== "object" || json === null) return null;
  const { page, slug } = json as { page?: unknown; slug?: unknown };
  const ref = { page, slug: slug ?? "" };
  return isLocationPageRef(ref) ? ref : null;
}

/**
 * How a heading names a page: "Main page", "Coach charter page", and a page
 * under a section by its name, "Sedan", "Eagle Square". `name` is the
 * page's name where it has one: its class's, or its headline.
 */
export function pageTitleOf(ref: LocationPageRef, name?: string) {
  if (ref.page === LANDING_PAGE) return LOCATION_PAGE_LABELS.landing;
  if (!isChildPage(ref)) return `${LOCATION_PAGE_LABELS[ref.page]} page`;
  return name || ref.slug;
}

/**
 * A location page's title while its meta title is empty, on the site and
 * in the editor's search preview alike: "Langkawi | Heavenly Travel",
 * "Car with driver in Langkawi | …", "Eagle Square in Langkawi | …".
 * `name` names a page under a section: its class's, or its headline.
 */
export function locationPageFallbackTitle(
  locationName: string,
  ref: LocationPageRef,
  name: string,
): string {
  if (ref.page === LANDING_PAGE) return `${locationName} | ${SITE_NAME}`;
  const shown = isChildPage(ref) ? name : SECTIONS[ref.page].label;
  return `${shown} in ${locationName} | ${SITE_NAME}`;
}

/**
 * How a sentence names a page: "the main page", "the Coach charter page",
 * "the Sedan page", "the popular place “Eagle Square”".
 */
export function pageNameOf(ref: LocationPageRef, name?: string) {
  if (ref.page === LANDING_PAGE) return "the main page";
  if (!isChildPage(ref)) return `the ${LOCATION_PAGE_LABELS[ref.page]} page`;
  const children = childrenOf(ref.page);
  if (children?.type === "entries") {
    return `the ${children.one} “${name || ref.slug}”`;
  }
  return `the ${name || ref.slug} page`;
}

/**
 * Where a page of a location is on the customer site: /langkawi,
 * /langkawi/coach-charter, /langkawi/popular-places/eagle-square.
 */
export function locationPagePath(
  locationSlug: string,
  ref: LocationPageRef = LANDING_REF,
) {
  if (ref.page === LANDING_PAGE) return `/${locationSlug}`;
  return isChildPage(ref)
    ? `/${locationSlug}/${ref.page}/${ref.slug}`
    : `/${locationSlug}/${ref.page}`;
}

/**
 * The main page as the console's addresses name it, where a section is
 * named by its key: its editor at /langkawi/pages/main, the
 * Pages list narrowed to it at ?section=main. No section is keyed so.
 */
export const MAIN_PAGE_SEGMENT = "main";

/** A page's key as the console's addresses name it: `main` for the main page. */
export function pageSegmentOf(page: LocationPageKey): string {
  return page === LANDING_PAGE ? MAIN_PAGE_SEGMENT : page;
}

/** The page a console address names by `pageSegmentOf`; null for none, the stored key "landing" too. */
export function pageKeyOfSegment(segment: unknown): LocationPageKey | null {
  if (segment === MAIN_PAGE_SEGMENT) return LANDING_PAGE;
  return isLocationSection(segment) ? segment : null;
}

/**
 * The sections whose pages are places, each place a page under one of
 * them: its type, which decides its address and the list its card is in.
 * A place in two lists is two pages, each with its own name and text,
 * which may point at the same saved address. One catalogue of places, in
 * three lists. See docs/261025-marketing-pages.md, "Places".
 */
export const PLACE_SECTIONS = [
  "popular-places",
  "attractions",
  "hotels",
] as const;
export type PlaceSection = (typeof PLACE_SECTIONS)[number];
export const isPlaceSection = guardFor(PLACE_SECTIONS);

/** What a place of each section is, as its type: "Attraction". */
export const PLACE_TYPE_LABELS: Record<PlaceSection, string> = {
  "popular-places": "Popular place",
  attractions: "Attraction",
  hotels: "Hotel",
};

/**
 * Where a page is edited in the console: under the location's Pages, at
 * its address on the site without the location's, the main page at
 * `MAIN_PAGE_SEGMENT`. /langkawi/pages/main, /langkawi/pages/car-with-driver,
 * /langkawi/pages/car-with-driver/sedan. A section's list of its
 * pages is the Pages list narrowed to it. Shared by the console's links
 * and the customer site's preview, whose Edit opens it.
 */
export function pageEditorPath(locationSlug: string, ref: LocationPageRef) {
  const own = `/${locationSlug}/pages/${pageSegmentOf(ref.page)}`;
  return isChildPage(ref) ? `${own}/${ref.slug}` : own;
}

/** Where staff preview the same page: /preview/langkawi. */
export function locationPreviewPath(
  locationSlug: string,
  ref?: LocationPageRef,
) {
  return `/preview${locationPagePath(locationSlug, ref)}`;
}

export const ENTRY_LIMITS = {
  /** Characters of a slug. */
  slug: 80,
} as const;

/** A page added on demand is titled and given a slug: the slug is what `slugify` makes, within the limit. */
export function checkEntrySlug(slug: string): Change {
  if (slug === "") return refuse("Enter the slug.", "slug");
  if (slug !== slugify(slug)) {
    return refuse(
      "A slug is lower-case letters, digits and dashes, such as eagle-square.",
      "slug",
    );
  }
  if (slug.length > ENTRY_LIMITS.slug) {
    return refuse(
      `The slug is at most ${ENTRY_LIMITS.slug} characters.`,
      "slug",
    );
  }
  return { ok: true };
}

/**
 * Whether a page added on demand may still change its slug: until it is
 * first published. A new address after that needs a redirect from the old
 * one, which waits for the redirect table at cutover.
 */
export function isEntrySlugLocked(page: { firstPublishedAt: unknown }) {
  return page.firstPublishedAt != null;
}
