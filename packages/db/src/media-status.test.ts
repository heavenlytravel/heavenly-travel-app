import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  MEDIA_GRACE_HOURS,
  isMediaFilter,
  isMediaInReach,
  mediaDeleteImpact,
  mediaDeleteRefusal,
  mediaReachOf,
  mediaStatusOf,
  type MediaPage,
  type MediaReach,
  type MediaToDelete,
  type MediaUse,
} from "./media-status";
import { PERMISSIONS } from "./permissions";

const langkawi = { id: "l1", name: "Langkawi", slug: "langkawi" };
const mainPage: MediaPage = {
  site: false,
  location: langkawi,
  ref: { page: "landing", slug: "" },
  title: "Main page",
};
const onPage: MediaUse = {
  kind: "page",
  on: mainPage,
  draft: true,
  published: false,
};
const earlier: MediaUse = {
  kind: "earlier",
  on: mainPage,
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

const pictureOf = (name: string): MediaUse => ({
  kind: "class",
  vehicleClass: { id: name, name },
});

const every: MediaReach = { pages: true, fleet: true, unused: true };

describe("mediaReachOf", () => {
  it("reaches the pages' files with a key to the pages or the website", () => {
    assert.deepEqual(mediaReachOf(["pages.manage"]), {
      pages: true,
      fleet: false,
      unused: false,
    });
    assert.deepEqual(mediaReachOf(["website.manage", "media.manage"]), {
      pages: true,
      fleet: false,
      unused: true,
    });
  });

  it("reaches the fleet's with the fleet's key, and all of them with every key", () => {
    assert.deepEqual(mediaReachOf(["fleet.manage", "coverage.manage"]), {
      pages: false,
      fleet: true,
      unused: false,
    });
    assert.deepEqual(mediaReachOf(PERMISSIONS), every);
    assert.deepEqual(mediaReachOf([]), {
      pages: false,
      fleet: false,
      unused: false,
    });
  });
});

describe("isMediaInReach", () => {
  const pages = mediaReachOf(["pages.manage", "media.manage"]);
  const fleet = mediaReachOf(["fleet.manage"]);

  it("shows a page's file, now or in its History, to the pages only", () => {
    for (const uses of [[onPage], [earlier]]) {
      assert.equal(isMediaInReach(pages, uses), true);
      assert.equal(isMediaInReach(fleet, uses), false);
    }
  });

  it("shows a vehicle's photo and a class's picture to the fleet only", () => {
    for (const uses of [[photoOf("VLE1")], [pictureOf("Van")]]) {
      assert.equal(isMediaInReach(fleet, uses), true);
      assert.equal(isMediaInReach(pages, uses), false);
    }
  });

  it("shows a file both use to both", () => {
    const uses = [earlier, photoOf("VLE1")];
    assert.equal(isMediaInReach(pages, uses), true);
    assert.equal(isMediaInReach(fleet, uses), true);
  });

  it("shows a file nothing uses to Media's key only", () => {
    assert.equal(isMediaInReach(pages, []), true);
    assert.equal(isMediaInReach(fleet, []), false);
  });

  it("shows every file to an admin with every key", () => {
    for (const uses of [[], [onPage], [earlier], [pictureOf("Van")]]) {
      assert.equal(isMediaInReach(every, uses), true);
    }
  });
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

  it("names the past versions and the uploads it reaches, in one order whatever the choice's", () => {
    const aboutUs: MediaUse = {
      kind: "earlier",
      on: { site: true, page: "about-us", title: "About us" },
      entryId: "e2",
    };
    const chosen = [
      file("a.jpg", [earlier], "earlier"),
      file("b.jpg", [aboutUs], "earlier"),
      file("c.jpg", [earlier], "earlier"),
      file("e.jpg", [], "recent"),
    ];
    const impact = mediaDeleteImpact(chosen);
    assert.deepEqual(impact.lines, [
      "4 images, 4.0 MB, are removed from storage for good.",
      "Langkawi · Main page: its History shows a past version without them.",
      "Site · About us: its History shows a past version without it.",
      "e.jpg was uploaded in the last day: a form not saved yet may still use it.",
    ]);
    assert.equal(impact.confirmWith, "delete");
    assert.deepEqual(mediaDeleteImpact([...chosen].reverse()), impact);
  });
});

describe("mediaDeleteRefusal", () => {
  it("keeps an image in use, a vehicle's photo and a class's picture too, for where it is used", () => {
    assert.equal(mediaDeleteRefusal([file("a.jpg", [earlier])], every), null);
    assert.equal(
      mediaDeleteRefusal([file("a.jpg", [onPage]), file("b.jpg")], every),
      "a.jpg is in use. Change it where it is used first.",
    );
    assert.equal(
      mediaDeleteRefusal(
        [
          file("a.jpg", [photoOf("VLE1"), earlier]),
          file("b.jpg", [pictureOf("Van")]),
        ],
        every,
      ),
      "a.jpg and b.jpg are in use. Change them where they are used first.",
    );
  });

  it("deletes only what the admin sees", () => {
    const fleet = mediaReachOf(["fleet.manage", "media.manage"]);
    assert.equal(mediaDeleteRefusal([file("a.jpg")], fleet), null);
    assert.equal(
      mediaDeleteRefusal([file("a.jpg", [earlier], "earlier")], fleet),
      "a.jpg is not an image your team works with.",
    );
  });
});
