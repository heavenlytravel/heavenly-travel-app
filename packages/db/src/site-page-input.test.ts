import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SITE_PAGES,
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
