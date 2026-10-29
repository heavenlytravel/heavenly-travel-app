import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  LOCATION_LIMITS,
  LOCATION_MOVE_LABELS,
  LOCATION_STATES,
  LOCATION_STATE_MOVE,
  RESERVED_SLUGS,
  checkAddressNames,
  checkLocationSlug,
  checkPageUnpublish,
  hasBeenLive,
  stateCodesOf,
  isLocationState,
  isSlugLocked,
  locationDeleteImpact,
  parseAddressEntries,
  parseLocationFields,
  setupProgress,
  setupSteps,
  stateMoveBlockers,
  type OperationStanding,
  type PageStanding,
} from "./location-input";
import { LANDING_REF, LOCATION_SECTIONS } from "./location-page-input";

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

/** An operation with something to sell: classes on sale, zones drawn, a route priced. */
const ready: OperationStanding = {
  stateNames: ["Kedah"],
  classesOnSale: 3,
  zones: 2,
  routesPriced: 1,
};

/** An operation just added: its states and nothing else. */
const bare: OperationStanding = {
  stateNames: ["Kuala Lumpur", "Selangor"],
  classesOnSale: 0,
  zones: 0,
  routesPriced: 0,
};

/** Three pages, each published as drafted unless the patch says otherwise. */
function pages(
  patch: Partial<Record<PageStanding["page"], PageStanding["status"]>> = {},
): PageStanding[] {
  return (["landing", "car-with-driver", "coach-charter"] as const).map(
    (page) => ({
      page,
      slug: "",
      name: "",
      status: patch[page] ?? "published",
    }),
  );
}

describe("stateMoveBlockers", () => {
  it("allows only the one move of each state", () => {
    const allowed = new Set(["draft>live", "live>paused", "paused>live"]);
    for (const from of LOCATION_STATES) {
      for (const to of LOCATION_STATES) {
        if (from === to) continue;
        const blockers = stateMoveBlockers(from, to, pages(), ready);
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
    assert.deepEqual(stateMoveBlockers("live", "draft", pages(), ready), [
      "A live location cannot move to draft.",
    ]);
    assert.deepEqual(stateMoveBlockers("draft", "paused", pages(), ready), [
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

  it("needs only the main page published to go live", () => {
    const move = (patch: Parameters<typeof pages>[0]) =>
      stateMoveBlockers("draft", "live", pages(patch), ready);
    assert.deepEqual(
      move({
        "car-with-driver": "unpublished",
        "coach-charter": "unpublished",
      }),
      [],
    );
    assert.deepEqual(move({ landing: "unpublished" }), [
      "Publish the main page",
    ]);
    assert.deepEqual(stateMoveBlockers("draft", "live", [], ready), [
      "Publish the main page",
    ]);
  });

  it("does not go live while a published page has edits waiting", () => {
    assert.deepEqual(
      stateMoveBlockers(
        "draft",
        "live",
        pages({ landing: "changed", "coach-charter": "changed" }),
        ready,
      ),
      [
        "Publish the changes on the main page",
        "Publish the changes on the Coach charter page",
      ],
    );
  });

  it("does not go live with nothing to sell or no zone to serve", () => {
    assert.deepEqual(stateMoveBlockers("draft", "live", pages(), bare), [
      "Put at least one vehicle class on sale, with its rates, on the Vehicle classes tab",
      "Draw at least one zone on the Coverage tab; the zones are what the location serves",
    ]);
    // A grid is not required: a trip in a zone with no row is metered.
    assert.deepEqual(
      stateMoveBlockers("draft", "live", pages(), {
        ...ready,
        zones: 1,
        routesPriced: 0,
      }),
      [],
    );
  });

  it("checks nothing on the moves that keep the pages public", () => {
    const unready = pages({
      "car-with-driver": "unpublished",
      "coach-charter": "unpublished",
      landing: "changed",
    });
    assert.deepEqual(stateMoveBlockers("live", "paused", unready, bare), []);
    assert.deepEqual(stateMoveBlockers("paused", "live", unready, bare), []);
  });
});

describe("setupSteps", () => {
  it("walks the four tabs in order, each with its standing", () => {
    const steps = setupSteps(pages(), ready);
    assert.deepEqual(
      steps.map((step) => [step.key, step.status, step.done]),
      [
        ["details", "Kedah", true],
        ["vehicle-classes", "3 classes on sale", true],
        ["coverage", "2 zones", true],
        ["pages", "Main page published, 2 section pages published", true],
      ],
    );
    assert.deepEqual(setupProgress(steps), {
      done: 4,
      total: 4,
      next: null,
    });
  });

  it("names the first step not done as the next one", () => {
    const steps = setupSteps(
      pages({ landing: "changed", "car-with-driver": "unpublished" }),
      { ...bare, classesOnSale: 1 },
    );
    assert.deepEqual(
      steps.map((step) => [step.key, step.status, step.done]),
      [
        ["details", "Kuala Lumpur and Selangor", true],
        ["vehicle-classes", "1 class on sale", true],
        ["coverage", "No zones yet", false],
        [
          "pages",
          "Main page published, 1 section page published, edits waiting",
          false,
        ],
      ],
    );
    const progress = setupProgress(steps);
    assert.equal(progress.done, 2);
    assert.equal(progress.next?.key, "coverage");
    assert.deepEqual(steps[3]?.todos, ["Publish the changes on the main page"]);
  });

  it("asks for a state only when the location has none", () => {
    const steps = setupSteps(pages(), { ...bare, stateNames: [] });
    assert.deepEqual(steps[0], {
      key: "details",
      title: "Details",
      status: "No state yet",
      todos: ["Tick at least one state in the location's settings"],
      done: false,
    });
  });
});

describe("checkPageUnpublish", () => {
  it("keeps the main page published once the location has left draft", () => {
    assert.equal(checkPageUnpublish("draft", LANDING_REF).ok, true);
    for (const state of ["live", "paused"] as const) {
      assert.match(
        errorOf(checkPageUnpublish(state, LANDING_REF)),
        /stays published/,
        state,
      );
    }
  });

  it("lets any other page be unpublished in any state", () => {
    for (const state of LOCATION_STATES) {
      for (const ref of [
        { page: "car-with-driver", slug: "" },
        { page: "car-with-driver", slug: "sedan" },
        { page: "blog", slug: "a-day" },
      ] as const) {
        assert.equal(checkPageUnpublish(state, ref).ok, true, state);
      }
    }
  });

  it("names a page under a section by its name in a step's to-do", () => {
    const steps = setupSteps(
      [
        ...pages(),
        {
          page: "popular-places",
          slug: "eagle-square",
          name: "Eagle Square",
          status: "changed",
        },
      ],
      ready,
    );
    assert.deepEqual(steps[3]?.todos, [
      "Publish the changes on the popular place “Eagle Square”",
    ]);
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

  it("refuses the site's own paths, the sections, the locales, the set-aside names and the console's", () => {
    const reserved = [
      ...["account", "booking", "preview", "sign-in", "sign-up", "api"],
      ...["about-us", "contact-us", "terms", "privacy-policy"],
      ...["refund-policy"],
      ...LOCATION_SECTIONS,
      ...["en", "ms", "zh"],
      ...["admin", "search", "manage", "quote", "packages"],
      ...["vehicles", "transfer", "driver", "sitemap", "robots"],
      ...["no-access", "restricted"],
    ];
    for (const slug of reserved) {
      assert.match(errorOf(checkLocationSlug(slug)), /something else/, slug);
    }
    assert.equal(RESERVED_SLUGS.size, reserved.length);
  });
});

describe("locationDeleteImpact", () => {
  it("lets go of a draft no other location prices routes to on a plain yes", () => {
    const draft = { slug: "penang-test", wentLiveAt: null };
    assert.equal(hasBeenLive(draft), false);
    assert.deepEqual(locationDeleteImpact(draft, []), {
      lines: [
        "Its pages, saved addresses, zones and rates are deleted with it.",
      ],
      confirmWith: null,
    });
  });

  it("names the public address and asks for the slug once it has been live", () => {
    const impact = locationDeleteImpact(
      { slug: "penang", wentLiveAt: new Date() },
      [],
    );
    assert.equal(
      impact.lines[1],
      "/penang turns into “page not found”: links to it break and search engines drop it.",
    );
    assert.equal(impact.confirmWith, "penang");
  });

  it("names each location losing routes and asks for the slug", () => {
    const impact = locationDeleteImpact(
      { slug: "selangor", wentLiveAt: null },
      [
        { name: "Kuala Lumpur", routes: 2 },
        { name: "Penang", routes: 1 },
      ],
    );
    assert.deepEqual(impact.lines.slice(1), [
      "Kuala Lumpur loses its 2 routes to these zones and stops selling those trips.",
      "Penang loses its route to these zones and stops selling that trip.",
    ]);
    assert.equal(impact.confirmWith, "selangor");
  });
});

describe("isSlugLocked", () => {
  it("locks the slug from the first time the location goes live", () => {
    assert.equal(isSlugLocked({ wentLiveAt: null }), false);
    assert.equal(isSlugLocked({ wentLiveAt: new Date() }), true);
  });
});

describe("stateCodesOf", () => {
  it("keeps each code once, sorted, and drops what is not a code", () => {
    assert.deepEqual(stateCodesOf(["MY-07", " MY-02 ", "MY-07", "", 7]), [
      "MY-02",
      "MY-07",
    ]);
    assert.deepEqual(stateCodesOf("MY-02"), []);
    assert.deepEqual(stateCodesOf(undefined), []);
  });
});

describe("parseLocationFields", () => {
  const states = ["MY-02"];

  it("trims the text and keeps the states", () => {
    assert.deepEqual(
      parseLocationFields({ name: " Langkawi ", slug: "langkawi", states }),
      {
        ok: true,
        value: { name: "Langkawi", slug: "langkawi", stateCodes: ["MY-02"] },
      },
    );
  });

  it("asks for at least one state", () => {
    const base = { name: "Klang Valley", slug: "klang-valley" };
    assert.match(errorOf(parseLocationFields(base)), /at least one state/);
    assert.match(
      errorOf(parseLocationFields({ ...base, states: [] })),
      /at least one state/,
    );
    const parsed = parseLocationFields({
      ...base,
      states: ["MY-14", "MY-10"],
    });
    assert.deepEqual(parsed.ok && parsed.value.stateCodes, ["MY-10", "MY-14"]);
  });

  it("asks for a name and keeps each field in its limit", () => {
    const base = { name: "Langkawi", slug: "langkawi", states };
    assert.match(
      errorOf(parseLocationFields({ ...base, name: "" })),
      /Enter the name/,
    );
    assert.match(
      errorOf(parseLocationFields({ ...base, name: "a".repeat(61) })),
      /name is at most 60/,
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
