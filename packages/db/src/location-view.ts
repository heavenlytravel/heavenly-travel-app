import type { TripCategory } from "./booking-status";
import { isTripCategory } from "./booking-status";
import {
  isPublicState,
  locationStateOf,
  type LocationState,
} from "./location-input";
import {
  LANDING_PAGE,
  LANDING_REF,
  LOCATION_SECTIONS,
  SECTIONS,
  SERVICE_SECTIONS,
  childrenOf,
  isChildPage,
  isLocationPageKey,
  pageKindOf,
  type LocationPageKey,
  type LocationPageRef,
  type LocationSection,
} from "./location-page-input";
import {
  emptyPageContent,
  isPagePublished,
  pageContentOf,
  pageStatusOf,
  publicCopyOf,
  type PageContent,
  type PageImage,
  type PageKind,
  type PageStatus,
} from "./page-content";
import { isPlace } from "./place";
import { slugify } from "./slug";

/**
 * A location as the customer site shows it, pure and browser-safe. The
 * public pages and the staff preview render one set of components over one
 * shape; they differ in which copy of each page the shape holds. A view is
 * plain data, its dates as text, because the customer site caches it. It
 * holds every page's content but a post's or a document's text, which only
 * its own page reads (`locationPageBody`). See
 * docs/261001-locations-and-pages.md, "The customer site", and
 * docs/261025-marketing-pages.md.
 */

/** A saved address as the search card offers it and "Take me here" fills it in. */
export type LocationViewAddress = {
  id: string;
  /** What the customer reads: "Kuah Jetty". */
  name: string;
  /** The Google place it stands for. */
  placeId: string;
  /** The place's full address, for the second line. */
  address: string;
};

/** A vehicle class the location offers, which the page under its product follows. */
export type LocationViewClass = {
  slug: string;
  name: string;
  category: TripCategory;
  /** On sale there: the offering is on and the class is in the catalogue. Its page shows only then. */
  onSale: boolean;
};

/** One page of a view, with the content it shows. */
export type LocationViewPage = LocationPageRef & {
  kind: PageKind;
  /** Its content; a post's or a document's text is left out. */
  content: PageContent;
  /** Always "published" in the public view, which holds only published pages. */
  status: PageStatus;
  /** Its place among the pages Marketing added to its section. */
  position: number;
  /** When it was first published, as ISO text; null before. A post shows it. */
  firstPublishedAt: string | null;
  /** When the copy last published was, as ISO text; null before. */
  publishedAt: string | null;
};

export type LocationView = {
  slug: string;
  name: string;
  /** The main page's tagline, from the copy the view holds; null when it has none. */
  tagline: string | null;
  state: LocationState;
  /** The saved addresses, in Marketing's order. */
  addresses: LocationViewAddress[];
  /** The classes it offers in the products with class pages, in the catalogue's order. */
  classes: LocationViewClass[];
  /**
   * The pages the view can open: the main page, then each section's own
   * page followed by the pages under it, in their order.
   */
  pages: LocationViewPage[];
};

/** A stored page row, as a view reads it. */
export type LocationPageRow = {
  page: string;
  slug: string;
  isOn: boolean;
  draft: unknown;
  published: unknown;
  position: number;
  publishedAt: Date | null;
  firstPublishedAt: Date | null;
};

/** What a view is built from: a location's row with its addresses, in order, its pages and its offerings. */
export type LocationRows = {
  slug: string;
  name: string;
  state: string;
  addresses: readonly { id: string; name: string; place: unknown }[];
  pages: readonly LocationPageRow[];
  offerings: readonly {
    isActive: boolean;
    vehicleClass: {
      slug: string;
      name: string;
      category: string;
      isActive: boolean;
      sortOrder: number;
    };
  }[];
};

function addressesOf(rows: LocationRows): LocationViewAddress[] {
  return rows.addresses.flatMap(({ id, name, place }) =>
    isPlace(place)
      ? [{ id, name, placeId: place.placeId, address: place.address }]
      : [],
  );
}

/** The classes offered in the products with class pages, in the catalogue's order, then by name. */
export function offeredClassesOf(
  offerings: LocationRows["offerings"],
): LocationViewClass[] {
  return [...offerings]
    .sort(
      (a, b) =>
        a.vehicleClass.sortOrder - b.vehicleClass.sortOrder ||
        a.vehicleClass.name.localeCompare(b.vehicleClass.name),
    )
    .flatMap(({ isActive, vehicleClass }) =>
      isTripCategory(vehicleClass.category)
        ? [
            {
              slug: vehicleClass.slug,
              name: vehicleClass.name,
              category: vehicleClass.category,
              onSale: isActive && vehicleClass.isActive,
            },
          ]
        : [],
    );
}

/** The content with its saved address checked: one the location no longer holds reads as none. */
function withKnownAddress(
  content: PageContent,
  addresses: readonly LocationViewAddress[],
): PageContent {
  return content.addressId !== null &&
    !addresses.some((address) => address.id === content.addressId)
    ? { ...content, addressId: null }
    : content;
}

/** What a view keeps of one page: the copy it shows and where that stands. */
type Shown = { content: PageContent; status: PageStatus };

const iso = (date: Date | null) => (date ? date.toISOString() : null);

/**
 * The pages a location has or can have, each with its row when it has one:
 * the main page, each section's own, the pages under each section: one per
 * class offered in a product (and one for a class no longer offered that
 * still has a page), and the pages Marketing added, in their order.
 */
export function pageSlotsOf<
  Row extends Pick<
    LocationPageRow,
    "page" | "slug" | "position" | "firstPublishedAt"
  >,
>(
  pages: readonly Row[],
  classes: readonly LocationViewClass[],
): { ref: LocationPageRef; row: Row | undefined }[] {
  const rowOf = (ref: LocationPageRef) =>
    pages.find((row) => row.page === ref.page && row.slug === ref.slug);
  const known = (row: Row) =>
    isLocationPageKey(row.page) &&
    row.slug !== "" &&
    row.slug === slugify(row.slug);

  const out = [{ ref: LANDING_REF, row: rowOf(LANDING_REF) }];
  for (const section of LOCATION_SECTIONS) {
    const own = { page: section, slug: "" };
    out.push({ ref: own, row: rowOf(own) });
    const children = SECTIONS[section].children;
    if (!children) continue;
    const rowsHere = pages.filter((row) => row.page === section && known(row));
    if (children.type === "classes") {
      const offered = classes
        .filter((entry) => entry.category === children.category)
        .map((entry) => entry.slug);
      const slugs = [
        ...offered,
        ...rowsHere
          .map((row) => row.slug)
          .filter((slug) => !offered.includes(slug))
          .sort(),
      ];
      for (const slug of slugs) {
        const ref = { page: section, slug };
        out.push({ ref, row: rowOf(ref) });
      }
      continue;
    }
    const sorted = [...rowsHere].sort(
      children.ordered
        ? (a, b) => a.position - b.position || a.slug.localeCompare(b.slug)
        : // Newest first; a page never published, a draft, before them all.
          (a, b) =>
            (b.firstPublishedAt?.getTime() ?? Infinity) -
              (a.firstPublishedAt?.getTime() ?? Infinity) ||
            a.slug.localeCompare(b.slug),
    );
    for (const row of sorted) {
      out.push({ ref: { page: section, slug: row.slug }, row });
    }
  }
  return out;
}

function viewOf(
  rows: LocationRows,
  pick: (kind: PageKind, row: LocationPageRow | undefined) => Shown | null,
): LocationView {
  const addresses = addressesOf(rows);
  const classes = offeredClassesOf(rows.offerings);
  const pages: LocationViewPage[] = pageSlotsOf(rows.pages, classes).flatMap(
    ({ ref, row }) => {
      const kind = pageKindOf(ref);
      const shown = pick(kind, row);
      if (!shown) return [];
      return [
        {
          ...ref,
          kind,
          content: {
            ...withKnownAddress(shown.content, addresses),
            body: "",
          },
          status: shown.status,
          position: row?.position ?? 0,
          firstPublishedAt: iso(row?.firstPublishedAt ?? null),
          publishedAt: iso(row?.publishedAt ?? null),
        },
      ];
    },
  );
  const landing = pages.find((entry) => entry.page === LANDING_PAGE);
  return {
    slug: rows.slug,
    name: rows.name,
    tagline: landing?.content.tagline || null,
    state: locationStateOf(rows.state),
    addresses,
    classes,
    pages,
  };
}

/**
 * Whether the public sees a published page of the view: one under a
 * section only while its section's own page is there too, and a class's
 * only while the class is on sale at the location.
 */
function isReachable(view: LocationView, entry: LocationViewPage) {
  if (!isChildPage(entry)) return true;
  if (!pageOfView(view, { page: entry.page, slug: "" })) return false;
  if (entry.kind !== "class") return true;
  return view.classes.some((c) => c.slug === entry.slug && c.onSale);
}

/**
 * What the public sees of a location: the public copy of every page that is
 * published and reachable. Null when the public sees nothing: the location
 * is not live or paused, or its main page is not published.
 */
export function publicLocationViewOf(rows: LocationRows): LocationView | null {
  const all = viewOf(rows, (kind, row) => {
    const content = row ? publicCopyOf(kind, row) : null;
    return content ? { content, status: "published" } : null;
  });
  const view = { ...all, pages: all.pages.filter((p) => isReachable(all, p)) };
  return isPublicState(view.state) && pageOfView(view, LANDING_REF)
    ? view
    : null;
}

/**
 * What staff check before a publish: the working draft of every page,
 * whatever the location's state and whether the page is published. A page
 * never written reads as an empty one.
 */
export function previewLocationViewOf(rows: LocationRows): LocationView {
  return viewOf(rows, (kind, row) => {
    const draft = row ? pageContentOf(kind, row.draft) : emptyPageContent(kind);
    return {
      content: draft,
      status: pageStatusOf(draft, row ? publicCopyOf(kind, row) : null),
    };
  });
}

/** The page of the view, or undefined when the view does not hold it. */
export function pageOfView(view: LocationView, ref: LocationPageRef) {
  return view.pages.find(
    (entry) => entry.page === ref.page && entry.slug === ref.slug,
  );
}

/**
 * Whether a page of the view shows in the links on another: published, and
 * under a section published too. The preview follows the same rule, so
 * what staff click through is what the public will.
 */
export function isLinkedPage(view: LocationView, entry: LocationViewPage) {
  if (!isPagePublished(entry.status)) return false;
  if (!isChildPage(entry)) return true;
  const section = pageOfView(view, { page: entry.page, slug: "" });
  if (!section || !isPagePublished(section.status)) return false;
  return (
    entry.kind !== "class" ||
    view.classes.some((c) => c.slug === entry.slug && c.onSale)
  );
}

/** The service pages the main page offers as cards: those linked, in the sections' order. */
export function servicePagesOf(view: LocationView): LocationViewPage[] {
  return SERVICE_SECTIONS.flatMap((section) => {
    const entry = pageOfView(view, { page: section, slug: "" });
    return entry && isLinkedPage(view, entry) ? [entry] : [];
  });
}

/** The pages under a section that other pages link to, in their order. */
export function linkedChildrenOf(
  view: LocationView,
  section: LocationSection,
): LocationViewPage[] {
  return view.pages.filter(
    (entry) =>
      entry.page === section && isChildPage(entry) && isLinkedPage(view, entry),
  );
}

/** Every page under a section the view holds, published or not, in their order: the preview bar's. */
export function childrenInView(
  view: LocationView,
  section: LocationPageKey,
): LocationViewPage[] {
  return view.pages.filter(
    (entry) => entry.page === section && isChildPage(entry),
  );
}

/** The class a page under a product is about; undefined when the location no longer offers it. */
export function classOfPage(view: LocationView, entry: LocationPageRef) {
  return childrenOf(entry.page)?.type === "classes"
    ? view.classes.find((c) => c.slug === entry.slug)
    : undefined;
}

/**
 * What the page is called on a card, in a breadcrumb and in a list: the
 * main page by the location's name, a section's page by its label, a class's
 * by the class's name, and a page Marketing added by its headline.
 */
export function pageNameInView(
  view: LocationView,
  entry: LocationViewPage,
): string {
  if (entry.page === LANDING_PAGE) return view.name;
  if (!isChildPage(entry)) return SECTIONS[entry.page].label;
  return (
    classOfPage(view, entry)?.name || entry.content.heroHeadline || entry.slug
  );
}

/** A top choice as the home page shows it on a card. */
export type TopChoiceCard = {
  slug: string;
  name: string;
  tagline: string | null;
  /** The main page's hero image. */
  image: PageImage | null;
};

export function topChoiceCardOf(view: LocationView): TopChoiceCard {
  return {
    slug: view.slug,
    name: view.name,
    tagline: view.tagline,
    image: pageOfView(view, LANDING_REF)?.content.heroImage ?? null,
  };
}
