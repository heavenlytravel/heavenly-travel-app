import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LANDING_REF } from "./location-page-input";
import {
  linkedChildrenOf,
  pageNameInView,
  pageOfView,
  previewLocationViewOf,
  publicLocationViewOf,
  servicePagesOf,
  topChoiceCardOf,
  type LocationPageRow,
  type LocationRows,
} from "./location-view";
import type { Place } from "./place";

const place = (placeId: string): Place => ({
  placeId,
  label: "Kuah Jetty",
  address: "Kuah, 07000 Langkawi, Kedah",
  lat: 6.3,
  lng: 99.85,
  state: "Kedah",
  district: null,
  locality: "Langkawi",
});

const image = {
  url: "https://abc123.ufs.sh/f/key-1",
  key: "key-1",
  width: 1600,
  height: 900,
  alt: "A beach at sunset",
};

const content = (heroHeadline: string, addressId: string | null = null) => ({
  tagline: "Island escape",
  heroHeadline,
  heroImage: image,
  body: "## A long text",
  addressId,
});

/** A page row: published as drafted unless `published` says otherwise. */
function row(
  page: string,
  slug: string,
  headline: string,
  over: Partial<LocationPageRow> = {},
): LocationPageRow {
  return {
    page,
    slug,
    isOn: true,
    draft: content(headline),
    published: content(headline),
    position: 0,
    publishedAt: new Date("2026-10-20T00:00:00Z"),
    firstPublishedAt: new Date("2026-10-20T00:00:00Z"),
    ...over,
  };
}

const offering = (slug: string, name: string, isActive = true) => ({
  isActive,
  vehicleClass: {
    slug,
    name,
    category: "car-with-driver",
    isActive: true,
    sortOrder: slug === "sedan" ? 1 : 2,
  },
});

/**
 * A live location: the main page, car with driver with a Sedan page, coach
 * charter unpublished since, and popular places with two places, the
 * second drafted only.
 */
function rows(over: Partial<LocationRows> = {}): LocationRows {
  return {
    slug: "langkawi",
    name: "Langkawi",
    state: "live",
    addresses: [{ id: "a1", name: "Kuah Jetty", place: place("p1") }],
    offerings: [offering("mpv", "MPV"), offering("sedan", "Sedan")],
    pages: [
      row("coach-charter", "", "Coach, published", {
        isOn: false,
        draft: content("Coach, drafted"),
      }),
      row("landing", "", "Landing, published", {
        draft: content("Landing, drafted"),
      }),
      row("car-with-driver", "", "Car, published"),
      row("car-with-driver", "sedan", "Sedan, published"),
      row("popular-places", "", "Places"),
      row("popular-places", "kuah-jetty", "Kuah Jetty", {
        position: 1,
        draft: content("Kuah Jetty", "a1"),
        published: content("Kuah Jetty", "a1"),
      }),
      row("popular-places", "eagle-square", "Eagle Square", {
        position: 0,
        isOn: false,
        published: null,
        firstPublishedAt: null,
      }),
    ],
    ...over,
  };
}

describe("the public view of a location", () => {
  it("holds the public copy of every page that is published, in order", () => {
    const view = publicLocationViewOf(rows());
    assert.ok(view);
    assert.deepEqual(
      view.pages.map((page) => [
        page.page,
        page.slug,
        page.content.heroHeadline,
      ]),
      [
        ["landing", "", "Landing, published"],
        ["car-with-driver", "", "Car, published"],
        ["car-with-driver", "sedan", "Sedan, published"],
        ["popular-places", "", "Places"],
        ["popular-places", "kuah-jetty", "Kuah Jetty"],
      ],
    );
    assert.equal(
      pageOfView(view, { page: "coach-charter", slug: "" }),
      undefined,
    );
  });

  it("leaves out the text of a post, which only its own page reads", () => {
    const view = publicLocationViewOf(rows());
    assert.equal(
      view?.pages.every((page) => page.content.body === ""),
      true,
    );
  });

  it("offers the services that are published, and the pages under a section", () => {
    const view = publicLocationViewOf(rows())!;
    assert.deepEqual(
      servicePagesOf(view).map((page) => page.page),
      ["car-with-driver"],
    );
    assert.deepEqual(
      linkedChildrenOf(view, "popular-places").map((page) => page.slug),
      ["kuah-jetty"],
    );
    assert.equal(
      pageNameInView(
        view,
        pageOfView(view, { page: "car-with-driver", slug: "sedan" })!,
      ),
      "Sedan",
    );
  });

  it("drops the pages under a section whose own page is not published", () => {
    const pages = rows().pages.map((entry) =>
      entry.page === "popular-places" && entry.slug === ""
        ? { ...entry, isOn: false }
        : entry,
    );
    const view = publicLocationViewOf(rows({ pages }))!;
    assert.deepEqual(linkedChildrenOf(view, "popular-places"), []);
    assert.equal(
      pageOfView(view, { page: "popular-places", slug: "kuah-jetty" }),
      undefined,
    );
  });

  it("pauses a class's page while the class is off at the location", () => {
    const view = publicLocationViewOf(
      rows({ offerings: [offering("sedan", "Sedan", false)] }),
    )!;
    assert.equal(
      pageOfView(view, { page: "car-with-driver", slug: "sedan" }),
      undefined,
    );
  });

  it("is there for a paused location too", () => {
    assert.equal(
      publicLocationViewOf(rows({ state: "paused" }))?.state,
      "paused",
    );
  });

  it("is null while the location is not public, or its main page is not published", () => {
    assert.equal(publicLocationViewOf(rows({ state: "draft" })), null);
    assert.equal(publicLocationViewOf(rows({ state: "unknown" })), null);
    const pages = rows().pages.map((entry) =>
      entry.page === "landing" ? { ...entry, isOn: false } : entry,
    );
    assert.equal(publicLocationViewOf(rows({ pages })), null);
  });

  it("offers the saved addresses that hold a place, and reads a removed one as none", () => {
    const view = publicLocationViewOf(
      rows({
        addresses: [
          { id: "a1", name: "Kuah Jetty", place: place("p1") },
          { id: "a2", name: "Damaged", place: { placeId: "p2" } },
        ],
      }),
    );
    assert.deepEqual(view?.addresses, [
      {
        id: "a1",
        name: "Kuah Jetty",
        placeId: "p1",
        address: "Kuah, 07000 Langkawi, Kedah",
      },
    ]);
    const jetty = { page: "popular-places", slug: "kuah-jetty" } as const;
    assert.equal(pageOfView(view!, jetty)?.content.addressId, "a1");
    const removed = publicLocationViewOf(rows({ addresses: [] }));
    assert.equal(pageOfView(removed!, jetty)?.content.addressId, null);
  });
});

describe("the preview of a location", () => {
  it("holds the draft of every page, whatever the state and whether it is published", () => {
    const view = previewLocationViewOf(rows({ state: "draft" }));
    const shown = (page: string, slug = "") =>
      view.pages.find((entry) => entry.page === page && entry.slug === slug);
    assert.deepEqual(
      [shown("landing"), shown("coach-charter")].map((page) => [
        page?.content.heroHeadline,
        page?.status,
      ]),
      [
        ["Landing, drafted", "changed"],
        // Unpublished since: the copy it once showed does not count.
        ["Coach, drafted", "unpublished"],
      ],
    );
  });

  it("holds a page for every class offered, written or not, in the catalogue's order", () => {
    const view = previewLocationViewOf(rows());
    assert.deepEqual(
      view.pages
        .filter((page) => page.page === "car-with-driver" && page.slug !== "")
        .map((page) => [page.slug, page.status]),
      [
        ["sedan", "published"],
        ["mpv", "unpublished"],
      ],
    );
  });

  it("orders the pages Marketing added by their place", () => {
    const view = previewLocationViewOf(rows());
    assert.deepEqual(
      view.pages
        .filter((page) => page.page === "popular-places" && page.slug !== "")
        .map((page) => page.slug),
      ["eagle-square", "kuah-jetty"],
    );
  });

  it("orders posts newest first, drafts before them", () => {
    const view = previewLocationViewOf(
      rows({
        pages: [
          row("blog", "older", "Older", {
            firstPublishedAt: new Date("2026-10-01T00:00:00Z"),
          }),
          row("blog", "newer", "Newer", {
            firstPublishedAt: new Date("2026-10-10T00:00:00Z"),
          }),
          row("blog", "draft", "Draft", { firstPublishedAt: null }),
        ],
      }),
    );
    assert.deepEqual(
      view.pages
        .filter((page) => page.page === "blog" && page.slug !== "")
        .map((page) => page.slug),
      ["draft", "newer", "older"],
    );
  });

  it("reads a page never written as an empty one", () => {
    const view = previewLocationViewOf(rows({ pages: [], offerings: [] }));
    // The main page and the seven sections' own.
    assert.equal(view.pages.length, 8);
    const landing = pageOfView(view, LANDING_REF);
    assert.equal(landing?.content.heroHeadline, "");
    assert.equal(landing?.status, "unpublished");
  });

  it("links only the pages the public would reach", () => {
    const view = previewLocationViewOf(rows());
    assert.deepEqual(
      servicePagesOf(view).map((page) => page.page),
      ["car-with-driver"],
    );
    assert.deepEqual(
      linkedChildrenOf(view, "popular-places").map((page) => page.slug),
      ["kuah-jetty"],
    );
  });
});

describe("a top choice card", () => {
  it("shows the name, and the main page's tagline and hero image", () => {
    assert.deepEqual(topChoiceCardOf(publicLocationViewOf(rows())!), {
      slug: "langkawi",
      name: "Langkawi",
      tagline: "Island escape",
      image,
    });
  });

  it("has no tagline when the main page has none", () => {
    const pages = rows().pages.map((entry) =>
      entry.page === "landing"
        ? { ...entry, published: { ...content("Landing"), tagline: "" } }
        : entry,
    );
    const view = publicLocationViewOf(rows({ pages }));
    assert.equal(topChoiceCardOf(view!).tagline, null);
  });
});
