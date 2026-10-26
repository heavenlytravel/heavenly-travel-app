import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SITE_PAGES,
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
