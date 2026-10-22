import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEDIA_GRACE_HOURS,
  isMediaFilter,
  mediaStatusOf,
  type MediaUse,
} from "./media-status";

const langkawi = { id: "l1", name: "Langkawi", slug: "langkawi" };
const onPage: MediaUse = {
  kind: "page",
  location: langkawi,
  page: "landing",
  draft: true,
  published: false,
};
const earlier: MediaUse = {
  kind: "earlier",
  location: langkawi,
  page: "landing",
  entryId: "e1",
};
const now = new Date("2026-10-22T12:00:00Z");
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000);

describe("mediaStatusOf", () => {
  it("keeps a file a page, a class or a vehicle uses", () => {
    assert.equal(mediaStatusOf(hoursAgo(100), [onPage], now), "used");
    assert.equal(mediaStatusOf(hoursAgo(100), [earlier, onPage], now), "used");
    assert.equal(
      mediaStatusOf(
        hoursAgo(100),
        [{ kind: "class", vehicleClass: { id: "c1", name: "Sedan VIP" } }],
        now,
      ),
      "used",
    );
  });

  it("tells a file only an earlier publish shows from one nothing uses", () => {
    assert.equal(mediaStatusOf(hoursAgo(100), [earlier], now), "earlier");
    assert.equal(mediaStatusOf(hoursAgo(100), [], now), "unused");
  });

  it("keeps a file nothing uses for a day after its upload", () => {
    assert.equal(
      mediaStatusOf(hoursAgo(MEDIA_GRACE_HOURS - 0.1), [], now),
      "recent",
    );
    assert.equal(mediaStatusOf(hoursAgo(MEDIA_GRACE_HOURS), [], now), "unused");
  });
});

describe("isMediaFilter", () => {
  it("takes the filter's values only", () => {
    for (const value of ["used", "earlier", "unused"]) {
      assert.equal(isMediaFilter(value), true, value);
    }
    for (const value of ["recent", "toString", "", undefined]) {
      assert.equal(isMediaFilter(value), false, String(value));
    }
  });
});
