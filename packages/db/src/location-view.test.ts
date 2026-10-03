import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pageOfView,
  previewLocationViewOf,
  productPagesOf,
  publicLocationViewOf,
  topChoiceCardOf,
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
  heroHeadline,
  heroImage: image,
  highlights: [{ name: "The jetty", text: "Boats.", image, addressId }],
});

/** A live location: the landing page and one product page on, one product page off. */
function rows(over: Partial<LocationRows> = {}): LocationRows {
  return {
    slug: "langkawi",
    name: "Langkawi",
    tagline: "Island escape",
    state: "live",
    addresses: [{ id: "a1", name: "Kuah Jetty", place: place("p1") }],
    pages: [
      {
        page: "coach-charter",
        isOn: false,
        draft: content("Coach, drafted"),
        published: content("Coach, published"),
      },
      {
        page: "landing",
        isOn: true,
        draft: content("Landing, drafted", "a1"),
        published: content("Landing, published", "a1"),
      },
      {
        page: "car-with-driver",
        isOn: true,
        draft: content("Car, published"),
        published: content("Car, published"),
      },
    ],
    ...over,
  };
}

describe("the public view of a location", () => {
  it("holds the published copy of every page that is on, in order", () => {
    const view = publicLocationViewOf(rows());
    assert.ok(view);
    assert.deepEqual(
      view.pages.map((page) => [page.page, page.content.heroHeadline]),
      [
        ["landing", "Landing, published"],
        ["car-with-driver", "Car, published"],
      ],
    );
    assert.equal(pageOfView(view, "coach-charter"), undefined);
    assert.deepEqual(
      productPagesOf(view).map((page) => page.page),
      ["car-with-driver"],
    );
  });

  it("is there for a paused location too", () => {
    assert.equal(
      publicLocationViewOf(rows({ state: "paused" }))?.state,
      "paused",
    );
  });

  it("is null while the location is not public", () => {
    assert.equal(publicLocationViewOf(rows({ state: "draft" })), null);
    assert.equal(publicLocationViewOf(rows({ state: "preview" })), null);
    assert.equal(publicLocationViewOf(rows({ state: "unknown" })), null);
  });

  it("is null when the landing page is off or was never published", () => {
    const [coach, landing, car] = rows().pages;
    assert.equal(
      publicLocationViewOf(
        rows({ pages: [coach!, { ...landing!, isOn: false }, car!] }),
      ),
      null,
    );
    assert.equal(
      publicLocationViewOf(
        rows({ pages: [coach!, { ...landing!, published: null }, car!] }),
      ),
      null,
    );
  });

  it("offers the saved addresses that hold a place", () => {
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
  });

  it("reads a highlight's removed address as none", () => {
    const kept = publicLocationViewOf(rows());
    assert.equal(
      pageOfView(kept!, "landing")?.content.highlights[0]?.addressId,
      "a1",
    );
    const removed = publicLocationViewOf(rows({ addresses: [] }));
    assert.equal(
      pageOfView(removed!, "landing")?.content.highlights[0]?.addressId,
      null,
    );
  });
});

describe("the preview of a location", () => {
  it("holds the draft of every page, whatever the state and the switches say", () => {
    const view = previewLocationViewOf(rows({ state: "draft" }));
    assert.deepEqual(
      view.pages.map((page) => [
        page.page,
        page.content.heroHeadline,
        page.isOn,
        page.status,
      ]),
      [
        ["landing", "Landing, drafted", true, "changed"],
        ["car-with-driver", "Car, published", true, "published"],
        ["coach-charter", "Coach, drafted", false, "changed"],
      ],
    );
  });

  it("reads a page never written as an empty one", () => {
    const view = previewLocationViewOf(rows({ pages: [] }));
    assert.equal(view.pages.length, 3);
    const landing = pageOfView(view, "landing");
    assert.equal(landing?.content.heroHeadline, "");
    assert.equal(landing?.isOn, false);
    assert.equal(landing?.status, "unpublished");
  });

  it("links only the product pages that are on", () => {
    assert.deepEqual(
      productPagesOf(previewLocationViewOf(rows())).map((page) => page.page),
      ["car-with-driver"],
    );
  });
});

describe("a top choice card", () => {
  it("shows the name, the tagline and the landing page's hero image", () => {
    assert.deepEqual(topChoiceCardOf(publicLocationViewOf(rows())!), {
      slug: "langkawi",
      name: "Langkawi",
      tagline: "Island escape",
      image,
    });
  });
});
