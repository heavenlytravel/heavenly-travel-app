import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LANDING_PAGE,
  LANDING_REF,
  LOCATION_PAGES,
  LOCATION_SECTIONS,
  PLACE_SECTIONS,
  SECTIONS,
  SERVICE_SECTIONS,
  checkEntrySlug,
  isEntrySlugLocked,
  isLocationPageKey,
  isLocationPageRef,
  locationPagePath,
  locationPreviewPath,
  loggedPageRef,
  pageKindOf,
  pageEditorPath,
  pageKeyOfSegment,
  pageNameOf,
  pageSegmentOf,
  pageTitleOf,
} from "./location-page-input";

describe("the pages of a location", () => {
  it("are the main page and one per section", () => {
    assert.deepEqual(LOCATION_PAGES, [
      "landing",
      "car-with-driver",
      "coach-charter",
      "car-rental",
      "attractions",
      "hotels",
      "popular-places",
      "blog",
    ]);
    assert.equal(isLocationPageKey("coach-charter"), true);
    assert.equal(isLocationPageKey("hotel"), false);
    assert.deepEqual(SERVICE_SECTIONS, [
      "car-with-driver",
      "coach-charter",
      "car-rental",
      "attractions",
      "hotels",
    ]);
  });

  it("have pages under a section only where the section takes them", () => {
    assert.equal(isLocationPageRef(LANDING_REF), true);
    assert.equal(isLocationPageRef({ page: "blog", slug: "" }), true);
    assert.equal(isLocationPageRef({ page: "blog", slug: "a-day" }), true);
    assert.equal(
      isLocationPageRef({ page: "car-with-driver", slug: "sedan" }),
      true,
    );
    assert.equal(isLocationPageRef({ page: "landing", slug: "x" }), false);
    assert.equal(isLocationPageRef({ page: "car-rental", slug: "x" }), false);
    assert.equal(isLocationPageRef({ page: "blog", slug: "A Day" }), false);
    assert.equal(isLocationPageRef({ page: "hotel", slug: "" }), false);
    assert.equal(isLocationPageRef({ page: "blog", slug: 3 }), false);
  });

  it("have the kind their place makes them", () => {
    assert.equal(pageKindOf(LANDING_REF), "landing");
    assert.equal(pageKindOf({ page: "coach-charter", slug: "" }), "service");
    assert.equal(pageKindOf({ page: "attractions", slug: "" }), "service");
    assert.equal(pageKindOf({ page: "popular-places", slug: "" }), "listing");
    assert.equal(pageKindOf({ page: "coach-charter", slug: "coach" }), "class");
    assert.equal(pageKindOf({ page: "hotels", slug: "the-datai" }), "place");
    assert.equal(pageKindOf({ page: "blog", slug: "a-day" }), "article");
  });

  it("are named as a heading and a sentence name them", () => {
    const place = { page: "popular-places", slug: "eagle-square" } as const;
    const sedan = { page: "car-with-driver", slug: "sedan" } as const;
    assert.equal(pageTitleOf(LANDING_REF), "Main page");
    assert.equal(
      pageTitleOf({ page: "coach-charter", slug: "" }),
      "Coach charter page",
    );
    assert.equal(pageTitleOf(place, "Eagle Square"), "Eagle Square");
    assert.equal(pageTitleOf(place), "eagle-square");
    assert.equal(pageNameOf(LANDING_REF), "the main page");
    assert.equal(
      pageNameOf({ page: "coach-charter", slug: "" }),
      "the Coach charter page",
    );
    assert.equal(
      pageNameOf(place, "Eagle Square"),
      "the popular place “Eagle Square”",
    );
    assert.equal(pageNameOf(sedan, "Sedan"), "the Sedan page");
  });

  it("are at their addresses, and previewed under /preview", () => {
    assert.equal(locationPagePath("langkawi"), "/langkawi");
    assert.equal(
      locationPagePath("langkawi", { page: "blog", slug: "" }),
      "/langkawi/blog",
    );
    assert.equal(
      locationPagePath("langkawi", { page: "blog", slug: "a-day" }),
      "/langkawi/blog/a-day",
    );
    assert.equal(
      locationPreviewPath("langkawi", { page: "car-with-driver", slug: "" }),
      "/preview/langkawi/car-with-driver",
    );
  });
});

describe("loggedPageRef", () => {
  it("reads the page an entry names, with no slug for one from before sections", () => {
    assert.deepEqual(loggedPageRef({ page: "coach-charter" }), {
      page: "coach-charter",
      slug: "",
    });
    assert.deepEqual(loggedPageRef({ page: "blog", slug: "a-day", x: 1 }), {
      page: "blog",
      slug: "a-day",
    });
    assert.equal(loggedPageRef({ page: "landing", slug: "x" }), null);
    assert.equal(loggedPageRef(null), null);
    assert.equal(loggedPageRef("landing"), null);
  });
});

describe("the sections of places", () => {
  it("are those whose pages under them are places", () => {
    assert.deepEqual(
      [...PLACE_SECTIONS].sort(),
      LOCATION_SECTIONS.filter((section) => {
        const children = SECTIONS[section].children;
        return children?.type === "entries" && children.kind === "place";
      }).sort(),
    );
  });
});

describe("where a page is edited in the console", () => {
  it("is the page's address on the site under the location's Pages, the main page at main", () => {
    assert.equal(
      pageEditorPath("langkawi", LANDING_REF),
      "/locations/langkawi/pages/main",
    );
    assert.equal(
      pageEditorPath("langkawi", { page: "car-rental", slug: "" }),
      "/locations/langkawi/pages/car-rental",
    );
    assert.equal(
      pageEditorPath("langkawi", { page: "popular-places", slug: "" }),
      "/locations/langkawi/pages/popular-places",
    );
    assert.equal(
      pageEditorPath("langkawi", { page: "car-with-driver", slug: "sedan" }),
      "/locations/langkawi/pages/car-with-driver/sedan",
    );
  });
});

describe("a page as the console's addresses name it", () => {
  it("is its key, the main page main", () => {
    assert.equal(pageSegmentOf(LANDING_PAGE), "main");
    assert.equal(pageSegmentOf("popular-places"), "popular-places");
    assert.equal(pageKeyOfSegment("main"), LANDING_PAGE);
    assert.equal(pageKeyOfSegment("popular-places"), "popular-places");
    assert.equal(pageKeyOfSegment("landing"), null);
    assert.equal(pageKeyOfSegment(undefined), null);
  });
});

describe("the slug of a page added on demand", () => {
  it("is what slugify makes, within the limit", () => {
    assert.equal(checkEntrySlug("eagle-square").ok, true);
    assert.equal(checkEntrySlug("").ok, false);
    assert.equal(checkEntrySlug("Eagle Square").ok, false);
    assert.equal(checkEntrySlug("a".repeat(81)).ok, false);
    assert.equal(checkEntrySlug("a".repeat(80)).ok, true);
  });

  it("is locked once the page has been published", () => {
    assert.equal(isEntrySlugLocked({ firstPublishedAt: null }), false);
    assert.equal(isEntrySlugLocked({ firstPublishedAt: new Date() }), true);
  });
});
