import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRIP_CATEGORIES } from "./booking-status";
import {
  LOCATION_LIMITS,
  LOCATION_STATES,
  LOCATION_STATE_MOVES,
  RESERVED_SLUGS,
  checkAddressNames,
  checkLocationSlug,
  checkPageSwitch,
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
  it("are draft, preview, live and paused only", () => {
    for (const state of ["draft", "preview", "live", "paused"]) {
      assert.equal(isLocationState(state), true, state);
    }
    assert.equal(isLocationState("retired"), false);
    assert.equal(isLocationState("Live"), false);
  });
});

/** The three pages, each on and published unless the patch says otherwise. */
function pages(
  patch: Partial<Record<PageStanding["page"], Partial<PageStanding>>> = {},
): PageStanding[] {
  return (["landing", "car-with-driver", "coach-charter"] as const).map(
    (page) => ({ page, isOn: true, status: "published", ...patch[page] }),
  );
}

const off = { isOn: false };

describe("stateMoveBlockers", () => {
  it("allows only the moves of each state", () => {
    const allowed = new Set(
      ["draft>preview", "preview>live", "preview>draft"].concat(
        "live>paused",
        "paused>live",
      ),
    );
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
          LOCATION_STATE_MOVES[from].includes(to),
          allowed.has(`${from}>${to}`),
        );
      }
    }
    assert.deepEqual(stateMoveBlockers("live", "draft", pages()), [
      "A live location cannot move to draft.",
    ]);
  });

  it("needs the landing page and a product page on to leave draft", () => {
    const move = (patch: Parameters<typeof pages>[0]) =>
      stateMoveBlockers("draft", "preview", pages(patch));
    assert.deepEqual(
      move({ landing: off, "car-with-driver": off, "coach-charter": off }),
      ["Switch on the landing page and at least one product page"],
    );
    assert.deepEqual(move({ landing: off }), ["Switch on the landing page"]);
    assert.deepEqual(move({ "car-with-driver": off, "coach-charter": off }), [
      "Switch on at least one product page",
    ]);
    assert.deepEqual(move({ "coach-charter": off }), []);
  });

  it("lets unpublished changes into preview but not out to live", () => {
    const changed = { status: "changed" } as const;
    const patch = { landing: changed, "coach-charter": changed };
    assert.deepEqual(stateMoveBlockers("draft", "preview", pages(patch)), []);
    assert.deepEqual(stateMoveBlockers("preview", "live", pages(patch)), [
      "Publish the changes on the landing page",
      "Publish the changes on the Coach charter page",
    ]);
  });

  it("ignores the changes of a page that is off", () => {
    const patch = {
      "coach-charter": { isOn: false, status: "changed" },
    } as const;
    assert.deepEqual(stateMoveBlockers("preview", "live", pages(patch)), []);
  });

  it("runs the page check again on the move to live", () => {
    assert.deepEqual(
      stateMoveBlockers(
        "preview",
        "live",
        pages({ "car-with-driver": off, "coach-charter": off }),
      ),
      ["Switch on at least one product page"],
    );
  });

  it("checks nothing on the moves that keep the pages public or hide them", () => {
    const bare = pages({
      "car-with-driver": off,
      "coach-charter": off,
      landing: { status: "changed" },
    });
    assert.deepEqual(stateMoveBlockers("live", "paused", bare), []);
    assert.deepEqual(stateMoveBlockers("paused", "live", bare), []);
    assert.deepEqual(stateMoveBlockers("preview", "draft", bare), []);
  });
});

describe("checkPageSwitch", () => {
  it("switches a page on only once it is published", () => {
    const on = (status: PageStanding["status"]) =>
      checkPageSwitch("draft", { page: "coach-charter", status }, true);
    assert.match(errorOf(on("unpublished")), /Publish the page before/);
    assert.equal(on("published").ok, true);
    assert.equal(on("changed").ok, true);
  });

  it("keeps the landing page on once the location has left draft", () => {
    const landing = { page: "landing", status: "published" } as const;
    assert.equal(checkPageSwitch("draft", landing, false).ok, true);
    for (const state of ["preview", "live", "paused"] as const) {
      assert.match(
        errorOf(checkPageSwitch(state, landing, false)),
        /stays on/,
        state,
      );
    }
  });

  it("lets a product page go off in any state", () => {
    const product = { page: "car-with-driver", status: "published" } as const;
    for (const state of LOCATION_STATES) {
      assert.equal(checkPageSwitch(state, product, false).ok, true, state);
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
