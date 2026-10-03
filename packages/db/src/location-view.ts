import type { TripCategory } from "./booking-status";
import {
  isPublicState,
  locationStateOf,
  type LocationState,
} from "./location-input";
import {
  LANDING_PAGE,
  LOCATION_PAGES,
  isPagePublished,
  pageContentOf,
  pageStatusOf,
  publicCopyOf,
  type LocationPageKey,
  type PageContent,
  type PageImage,
  type PageStatus,
} from "./location-page-input";
import { isPlace } from "./place";

/**
 * A location as the customer site shows it, pure and browser-safe. The
 * public pages and the staff preview render one set of components over one
 * shape; they differ in which copy of each page the shape holds. A view is
 * plain data with no dates, because the customer site caches it. See
 * docs/261001-locations-and-pages.md, "The customer site".
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

/** One page of a view, with the content it shows. */
export type LocationViewPage = {
  page: LocationPageKey;
  content: PageContent;
  /** Always "published" in the public view, which holds only published pages. */
  status: PageStatus;
};

export type LocationView = {
  slug: string;
  name: string;
  tagline: string | null;
  state: LocationState;
  /** The saved addresses, in Marketing's order. */
  addresses: LocationViewAddress[];
  /** The pages the view can open, in the order of `LOCATION_PAGES`. */
  pages: LocationViewPage[];
};

/** What a view is built from: a location's row with its addresses, in order, and its pages. */
export type LocationRows = {
  slug: string;
  name: string;
  tagline: string | null;
  state: string;
  addresses: readonly { id: string; name: string; place: unknown }[];
  pages: readonly {
    page: string;
    isOn: boolean;
    draft: unknown;
    published: unknown;
  }[];
};

function addressesOf(rows: LocationRows): LocationViewAddress[] {
  return rows.addresses.flatMap(({ id, name, place }) =>
    isPlace(place)
      ? [{ id, name, placeId: place.placeId, address: place.address }]
      : [],
  );
}

/** The content with every highlight's address checked: one the location no longer holds reads as none. */
function withKnownAddresses(
  content: PageContent,
  addresses: readonly LocationViewAddress[],
): PageContent {
  const known = new Set(addresses.map((address) => address.id));
  return {
    ...content,
    highlights: content.highlights.map((highlight) => ({
      ...highlight,
      addressId:
        highlight.addressId !== null && known.has(highlight.addressId)
          ? highlight.addressId
          : null,
    })),
  };
}

function viewOf(
  rows: LocationRows,
  pageOf: (
    page: LocationPageKey,
    row: LocationRows["pages"][number] | undefined,
  ) => Omit<LocationViewPage, "page"> | null,
): LocationView {
  const addresses = addressesOf(rows);
  return {
    slug: rows.slug,
    name: rows.name,
    tagline: rows.tagline,
    state: locationStateOf(rows.state),
    addresses,
    pages: LOCATION_PAGES.flatMap((page) => {
      const shown = pageOf(
        page,
        rows.pages.find((row) => row.page === page),
      );
      return shown
        ? [
            {
              ...shown,
              page,
              content: withKnownAddresses(shown.content, addresses),
            },
          ]
        : [];
    }),
  };
}

/**
 * What the public sees of a location: the public copy of every page that is
 * published. Null when the public sees nothing: the location is not live or
 * paused, or its landing page is not published.
 */
export function publicLocationViewOf(rows: LocationRows): LocationView | null {
  const view = viewOf(rows, (page, row) => {
    const content = row ? publicCopyOf(page, row) : null;
    return content ? { content, status: "published" } : null;
  });
  return isPublicState(view.state) && pageOfView(view, LANDING_PAGE)
    ? view
    : null;
}

/**
 * What staff check before a publish: the working draft of every page,
 * whatever the location's state and whether the page is published. A page
 * never written reads as an empty one.
 */
export function previewLocationViewOf(rows: LocationRows): LocationView {
  return viewOf(rows, (page, row) => {
    const draft = pageContentOf(page, row?.draft);
    return {
      content: draft,
      status: pageStatusOf(draft, row ? publicCopyOf(page, row) : null),
    };
  });
}

/** The page of the view, or undefined when the view does not hold it. */
export function pageOfView(view: LocationView, page: LocationPageKey) {
  return view.pages.find((entry) => entry.page === page);
}

/** A page of a view that is a product's, not the landing page. */
export type LocationProductPage = LocationViewPage & { page: TripCategory };

export function isProductPage(
  entry: LocationViewPage,
): entry is LocationProductPage {
  return entry.page !== LANDING_PAGE;
}

/** The product pages the landing page links to: those that are published. */
export function productPagesOf(view: LocationView): LocationProductPage[] {
  return view.pages
    .filter(isProductPage)
    .filter((entry) => isPagePublished(entry.status));
}

/** A top choice as the home page shows it on a card. */
export type TopChoiceCard = {
  slug: string;
  name: string;
  tagline: string | null;
  /** The landing page's hero image. */
  image: PageImage | null;
};

export function topChoiceCardOf(view: LocationView): TopChoiceCard {
  return {
    slug: view.slug,
    name: view.name,
    tagline: view.tagline,
    image: pageOfView(view, LANDING_PAGE)?.content.heroImage ?? null,
  };
}

/** Where a page of a location is on the customer site: /langkawi, /langkawi/coach-charter. */
export function locationPagePath(
  slug: string,
  page: LocationPageKey = LANDING_PAGE,
) {
  return page === LANDING_PAGE ? `/${slug}` : `/${slug}/${page}`;
}

/** Where staff preview the same page: /preview/langkawi. */
export function locationPreviewPath(slug: string, page?: LocationPageKey) {
  return `/preview${locationPagePath(slug, page)}`;
}
