import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RESERVED_SLUGS } from "./location-input";
import { isLocationSection } from "./location-page-input";
import {
  HUB_PAGES,
  SITE_PAGES,
  checkSitePageUnpublish,
  hasBuiltInCopy,
  isSitePagePublic,
  sitePageKindOf,
  sitePageFallbackTitle,
  sitePagePath,
  sitePagePreviewPath,
} from "./site-page-input";

describe("site page paths", () => {
  it("are at their addresses, and previewed under /preview", () => {
    assert.equal(sitePagePath("home"), "/");
    assert.equal(sitePagePath("about-us"), "/about-us");
    assert.equal(sitePagePreviewPath("home"), "/preview");
    assert.equal(sitePagePreviewPath("about-us"), "/preview/about-us");
    assert.equal(
      sitePagePreviewPath("refund-policy"),
      "/preview/refund-policy",
    );
  });

  it("preview every page at /preview and its public address", () => {
    for (const page of SITE_PAGES) {
      assert.equal(
        sitePagePreviewPath(page),
        `/preview${sitePagePath(page)}`.replace(/\/$/, ""),
        page,
      );
    }
  });
});

describe("a site page's title without a meta title", () => {
  it("is the home page's own, and a document's name before the site's", () => {
    assert.equal(
      sitePageFallbackTitle("home"),
      "Heavenly Travel — Travel made simple",
    );
    assert.equal(
      sitePageFallbackTitle("about-us"),
      "About us | Heavenly Travel",
    );
  });
});

describe("the services' hubs", () => {
  it("are service pages at the sections' names", () => {
    for (const page of HUB_PAGES) {
      assert.equal(sitePageKindOf(page), "service");
      assert.equal(sitePagePath(page), `/${page}`);
      assert.ok(isLocationSection(page));
    }
  });

  it("show their built-in copy before a publish, and stay published", () => {
    assert.ok(hasBuiltInCopy("car-with-driver"));
    assert.ok(!hasBuiltInCopy("about-us"));
    assert.equal(checkSitePageUnpublish("coach-charter").ok, false);
    assert.equal(checkSitePageUnpublish("terms").ok, true);
  });

  it("are open to the public before a publish, as the home page is", () => {
    assert.ok(isSitePagePublic("car-with-driver", false));
    assert.ok(isSitePagePublic("home", false));
    assert.ok(!isSitePagePublic("about-us", false));
    assert.ok(isSitePagePublic("about-us", true));
  });

  it("take addresses no location may", () => {
    for (const page of HUB_PAGES) assert.ok(RESERVED_SLUGS.has(page));
  });
});
