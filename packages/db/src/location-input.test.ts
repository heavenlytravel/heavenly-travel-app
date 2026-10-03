import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRIP_CATEGORIES } from "./booking-status";
import {
  LOCATION_LIMITS,
  LOCATION_MOVE_LABELS,
  LOCATION_STATES,
  LOCATION_STATE_MOVE,
  RESERVED_SLUGS,
  checkAddressNames,
  checkLocationDelete,
  checkLocationSlug,
  checkPageUnpublish,
  hasBeenLive,
  districtCodesOf,
  isLocationState,
  isSlugLocked,
  parseAddressEntries,
  parseLocationFields,
  stateMoveBlockers,
  type PageStanding,
} from "./location-input";

const errorOf = (result: { ok: true } | { ok: false; error: string }) =>
  result.ok ? "" : result.error;

describe("location states", () => {
  it("are draft, live and paused only", () => {
    for (const state of ["draft", "live", "paused"]) {
      assert.equal(isLocationState(state), true, state);
    }
    assert.equal(isLocationState("preview"), false);
    assert.equal(isLocationState("retired"), false);
    assert.equal(isLocationState("Live"), false);
  });
});

/** The three pages, each published as drafted unless the patch says otherwise. */
function pages(
  patch: Partial<Record<PageStanding["page"], PageStanding["status"]>> = {},
): PageStanding[] {
  return (["landing", "car-with-driver", "coach-charter"] as const).map(
    (page) => ({ page, status: patch[page] ?? "published" }),
  );
}

describe("stateMoveBlockers", () => {
  it("allows only the one move of each state", () => {
    const allowed = new Set(["draft>live", "live>paused", "paused>live"]);
    for (const from of LOCATION_STATES) {
      for (const to of LOCATION_STATES) {
        if (from === to) continue;
        const blockers = stateMoveBlockers(from, to, pages());
        assert.equal(
          blockers.length === 0,
          allowed.has(`${from}>${to}`),
          `${from}>${to}`,
        );
        assert.equal(
          LOCATION_STATE_MOVE[from] === to,
          allowed.has(`${from}>${to}`),
        );
      }
    }
    assert.deepEqual(stateMoveBlockers("live", "draft", pages()), [
      "A live location cannot move to draft.",
    ]);
    assert.deepEqual(stateMoveBlockers("draft", "paused", pages()), [
      "A draft location cannot move to paused.",
    ]);
  });

  it("names each state's move for its button", () => {
    assert.deepEqual(LOCATION_MOVE_LABELS, {
      draft: "Go live",
      live: "Pause",
      paused: "Resume",
    });
  });

  it("needs only the landing page published to go live", () => {
    const move = (patch: Parameters<typeof pages>[0]) =>
      stateMoveBlockers("draft", "live", pages(patch));
    assert.deepEqual(
      move({
        "car-with-driver": "unpublished",
        "coach-charter": "unpublished",
      }),
      [],
    );
    assert.deepEqual(move({ landing: "unpublished" }), [
      "Publish the landing page",
    ]);
    assert.deepEqual(stateMoveBlockers("draft", "live", []), [
      "Publish the landing page",
    ]);
  });

  it("does not go live while a published page has edits waiting", () => {
    assert.deepEqual(
      stateMoveBlockers(
        "draft",
        "live",
        pages({ landing: "changed", "coach-charter": "changed" }),
      ),
      [
        "Publish the changes on the landing page",
        "Publish the changes on the Coach charter page",
      ],
    );
  });

  it("checks nothing on the moves that keep the pages public", () => {
    const bare = pages({
      "car-with-driver": "unpublished",
      "coach-charter": "unpublished",
      landing: "changed",
    });
    assert.deepEqual(stateMoveBlockers("live", "paused", bare), []);
    assert.deepEqual(stateMoveBlockers("paused", "live", bare), []);
  });
});

describe("checkPageUnpublish", () => {
  it("keeps the landing page published once the location has left draft", () => {
    assert.equal(checkPageUnpublish("draft", "landing").ok, true);
    for (const state of ["live", "paused"] as const) {
      assert.match(
        errorOf(checkPageUnpublish(state, "landing")),
        /stays published/,
        state,
      );
    }
  });

  it("lets a product page be unpublished in any state", () => {
    for (const state of LOCATION_STATES) {
      assert.equal(
        checkPageUnpublish(state, "car-with-driver").ok,
        true,
        state,
      );
    }
  });
});

describe("checkLocationSlug", () => {
  it("accepts what slugify makes", () => {
    for (const slug of ["langkawi", "kuala-kubu-bharu", "area-51"]) {
      assert.equal(checkLocationSlug(slug).ok, true, slug);
    }
  });

  it("refuses anything that is not lower-case letters, digits and dashes", () => {
    for (const slug of ["Langkawi", "kuala kubu", "-kl", "kl-", "a--b", "é"]) {
      assert.match(errorOf(checkLocationSlug(slug)), /lower-case/, slug);
    }
    assert.match(errorOf(checkLocationSlug("")), /Enter the slug/);
  });

  it("refuses one longer than the limit", () => {
    const slug = "a".repeat(LOCATION_LIMITS.slug + 1);
    assert.match(errorOf(checkLocationSlug(slug)), /at most 60/);
    assert.equal(checkLocationSlug("a".repeat(LOCATION_LIMITS.slug)).ok, true);
  });

  it("refuses the site's own paths, the products, the locales and the set-aside names", () => {
    const reserved = [
      ...["account", "booking", "preview", "sign-in", "sign-up", "api"],
      ...TRIP_CATEGORIES,
      ...["en", "ms", "zh"],
      ...["admin", "search", "manage", "quote", "packages"],
      ...["vehicles", "transfer", "driver", "sitemap", "robots"],
    ];
    for (const slug of reserved) {
      assert.match(errorOf(checkLocationSlug(slug)), /something else/, slug);
    }
    assert.equal(RESERVED_SLUGS.size, reserved.length);
  });
});

describe("checkLocationDelete", () => {
  it("lets go of a location that has never been live on a plain yes", () => {
    const draft = { slug: "penang-test", wentLiveAt: null };
    assert.equal(hasBeenLive(draft), false);
    assert.equal(checkLocationDelete(draft, null).ok, true);
  });

  it("asks for the slug, typed exactly, once the location has been live", () => {
    const live = { slug: "penang", wentLiveAt: new Date() };
    assert.equal(hasBeenLive(live), true);
    assert.match(
      errorOf(checkLocationDelete(live, null)),
      /Type the slug, penang, to delete/,
    );
    for (const typed of ["", "Penang", "penang ", "penan"]) {
      assert.equal(checkLocationDelete(live, typed).ok, false, typed);
    }
    assert.equal(checkLocationDelete(live, "penang").ok, true);
  });
});

describe("isSlugLocked", () => {
  it("locks the slug from the first time the location goes live", () => {
    assert.equal(isSlugLocked({ wentLiveAt: null }), false);
    assert.equal(isSlugLocked({ wentLiveAt: new Date() }), true);
  });
});

describe("districtCodesOf", () => {
  it("keeps each code once, sorted, and drops what is not a code", () => {
    assert.deepEqual(
      districtCodesOf(["timur-laut", " barat-daya ", "timur-laut", "", 7]),
      ["barat-daya", "timur-laut"],
    );
    assert.deepEqual(districtCodesOf("barat-daya"), []);
    assert.deepEqual(districtCodesOf(undefined), []);
  });
});

describe("parseLocationFields", () => {
  const districts = ["langkawi"];

  it("trims the text and reads an empty tagline as none", () => {
    assert.deepEqual(
      parseLocationFields({
        name: " Langkawi ",
        slug: "langkawi",
        tagline: "  ",
        districts,
      }),
      {
        ok: true,
        value: {
          name: "Langkawi",
          slug: "langkawi",
          tagline: null,
          districtCodes: ["langkawi"],
        },
      },
    );
    const parsed = parseLocationFields({
      name: "Langkawi",
      slug: "langkawi",
      tagline: " Beaches and duty-free ",
      districts,
    });
    assert.equal(parsed.ok && parsed.value.tagline, "Beaches and duty-free");
  });

  it("asks for at least one district", () => {
    const base = { name: "Penang", slug: "penang", tagline: "" };
    assert.match(errorOf(parseLocationFields(base)), /at least one district/);
    assert.match(
      errorOf(parseLocationFields({ ...base, districts: [] })),
      /at least one district/,
    );
    const parsed = parseLocationFields({
      ...base,
      districts: ["timur-laut", "barat-daya"],
    });
    assert.deepEqual(parsed.ok && parsed.value.districtCodes, [
      "barat-daya",
      "timur-laut",
    ]);
  });

  it("asks for a name and keeps each field in its limit", () => {
    const base = {
      name: "Langkawi",
      slug: "langkawi",
      tagline: "",
      districts,
    };
    assert.match(
      errorOf(parseLocationFields({ ...base, name: "" })),
      /Enter the name/,
    );
    assert.match(
      errorOf(parseLocationFields({ ...base, name: "a".repeat(61) })),
      /name is at most 60/,
    );
    assert.match(
      errorOf(parseLocationFields({ ...base, tagline: "a".repeat(81) })),
      /tagline is at most 80/,
    );
    assert.match(
      errorOf(parseLocationFields({ ...base, slug: "api" })),
      /something else/,
    );
  });
});

describe("checkAddressNames", () => {
  it("accepts an empty list: saved addresses have no minimum", () => {
    assert.equal(checkAddressNames([]).ok, true);
  });

  it("asks for a name on every address, within the limit and used once", () => {
    assert.match(errorOf(checkAddressNames(["Kuah Jetty", ""])), /every/);
    assert.match(
      errorOf(checkAddressNames(["a".repeat(61)])),
      /at most 60 characters/,
    );
    assert.match(
      errorOf(checkAddressNames(["Kuah Jetty", "kuah jetty"])),
      /Two addresses are named kuah jetty/,
    );
  });

  it("caps the list", () => {
    const names = Array.from(
      { length: LOCATION_LIMITS.addresses + 1 },
      (_, i) => `Spot ${i}`,
    );
    assert.match(errorOf(checkAddressNames(names)), /at most 20/);
    assert.equal(checkAddressNames(names.slice(1)).ok, true);
  });
});

describe("parseAddressEntries", () => {
  it("reads kept addresses by id and new ones by place id, in order", () => {
    const rows = [
      { id: "a1", name: " Langkawi Airport " },
      { placeId: "ChIJ1", name: "Kuah Jetty" },
    ];
    assert.deepEqual(parseAddressEntries(rows), {
      ok: true,
      value: [
        { id: "a1", name: "Langkawi Airport" },
        { placeId: "ChIJ1", name: "Kuah Jetty" },
      ],
    });
    assert.deepEqual(parseAddressEntries([]), { ok: true, value: [] });
  });

  it("refuses anything that is not the list it expects", () => {
    const unreadable = [
      undefined,
      "[]",
      {},
      [1],
      [{ name: "No place" }],
      [
        { id: "a1", name: "One" },
        { id: "a1", name: "Two" },
      ],
    ];
    for (const value of unreadable) {
      assert.match(
        errorOf(parseAddressEntries(value)),
        /could not be read/,
        JSON.stringify(value),
      );
    }
  });

  it("applies the name rules", () => {
    const rows = [{ placeId: "ChIJ1", name: " " }];
    assert.match(errorOf(parseAddressEntries(rows)), /every address a name/);
  });
});
