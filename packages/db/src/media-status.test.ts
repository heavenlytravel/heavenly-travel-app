import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEDIA_GRACE_HOURS,
  isMediaFilter,
  mediaDeleteImpact,
  mediaDeleteRefusal,
  mediaStatusOf,
  type MediaToDelete,
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

const file = (
  name: string,
  uses: MediaUse[] = [],
  status: MediaToDelete["status"] = "unused",
): MediaToDelete => ({ name, size: 1024 * 1024, status, uses });
const photoOf = (plate: string): MediaUse => ({
  kind: "vehicle",
  vehicle: { id: plate, plate },
  location: { slug: "langkawi" },
});

describe("mediaDeleteImpact", () => {
  it("removes images nothing uses on a plain yes", () => {
    assert.deepEqual(mediaDeleteImpact([file("a.jpg")]), {
      lines: ["a.jpg, 1.0 MB, is removed from storage for good."],
      confirmWith: null,
    });
    assert.deepEqual(mediaDeleteImpact([file("a.jpg"), file("b.jpg")]).lines, [
      "2 images, 2.0 MB, are removed from storage for good.",
    ]);
  });

  it("names what loses them, in one order whatever the choice's", () => {
    const chosen = [
      file("a.jpg", [photoOf("VLE1"), earlier]),
      file("b.jpg", [photoOf("AB1")]),
      file("c.jpg", [photoOf("VLE1")]),
      file("d.jpg", [
        { kind: "class", vehicleClass: { id: "c", name: "Van" } },
      ]),
      file("e.jpg", [], "recent"),
    ];
    const impact = mediaDeleteImpact(chosen);
    assert.deepEqual(impact.lines, [
      "5 images, 5.0 MB, are removed from storage for good.",
      "Vehicle AB1 loses a photo.",
      "Vehicle VLE1 loses 2 photos.",
      "Van loses its catalogue picture.",
      "Langkawi · Main page: its History shows a past version without it.",
      "e.jpg was uploaded in the last day: a form not saved yet may still use it.",
    ]);
    assert.equal(impact.confirmWith, "delete");
    assert.deepEqual(mediaDeleteImpact([...chosen].reverse()), impact);
  });
});

describe("mediaDeleteRefusal", () => {
  it("keeps an image on a page for the page editor to replace", () => {
    assert.equal(mediaDeleteRefusal([file("a.jpg", [earlier])]), null);
    assert.equal(
      mediaDeleteRefusal([file("a.jpg", [onPage]), file("b.jpg")]),
      "a.jpg is on a location's page. Replace it there first.",
    );
  });
});
