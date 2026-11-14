import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isExternalSiteLink,
  isSiteLinkShown,
  isSiteUrl,
  searchTripOf,
  siteLinkHref,
  siteLinkTargetOf,
} from "./site-link";

describe("siteLinkHref", () => {
  it("sends each kind of link to its address", () => {
    assert.equal(siteLinkHref({ kind: "page", page: "about-us" }), "/about-us");
    assert.equal(
      siteLinkHref({ kind: "location", slug: "langkawi" }),
      "/langkawi",
    );
    assert.equal(
      siteLinkHref({ kind: "post", slug: "island-hopping" }),
      "/blog/island-hopping",
    );
    assert.equal(
      siteLinkHref({
        kind: "search",
        service: "coach-charter",
        mode: "hourly",
      }),
      "/coach-charter?trip=hourly#booking",
    );
    assert.equal(
      siteLinkHref({ kind: "url", url: "https://hitpayapp.com" }),
      "https://hitpayapp.com",
    );
    assert.ok(isExternalSiteLink({ kind: "url", url: "https://x.my" }));
    assert.ok(!isExternalSiteLink({ kind: "url", url: "/booking" }));
  });
});

describe("isSiteUrl", () => {
  it("takes web addresses, site paths, email and phone links", () => {
    assert.ok(isSiteUrl("https://hitpayapp.com"));
    assert.ok(isSiteUrl("/booking"));
    assert.ok(isSiteUrl("mailto:sales@heavenlytravel.my"));
    assert.ok(!isSiteUrl("//evil.example"));
    assert.ok(!isSiteUrl(String.raw`/\evil.example`));
    assert.ok(!isSiteUrl("/booking now"));
    assert.ok(!isSiteUrl("javascript:alert(1)"));
    assert.ok(!isSiteUrl("hitpayapp.com"));
  });
});

describe("siteLinkTargetOf", () => {
  it("reads a target of an allowed kind", () => {
    assert.deepEqual(
      siteLinkTargetOf(
        { kind: "search", service: "car-with-driver", mode: "hourly" },
        ["search", "page"],
      ),
      { kind: "search", service: "car-with-driver", mode: "hourly" },
    );
  });

  it("reads a kind not allowed, or a damaged one, as an empty one of the last kind", () => {
    assert.deepEqual(
      siteLinkTargetOf({ kind: "url", url: "https://x.my" }, [
        "search",
        "post",
      ]),
      { kind: "post", slug: "" },
    );
    assert.deepEqual(
      siteLinkTargetOf({ kind: "search", service: "boats", mode: "hourly" }, [
        "search",
      ]),
      { kind: "search", service: "car-with-driver", mode: "oneway" },
    );
  });

  it("keeps a footer link's address when its kind is missing", () => {
    assert.deepEqual(
      siteLinkTargetOf({ url: " https://x.my " }, ["page", "location", "url"]),
      { kind: "url", url: "https://x.my" },
    );
  });
});

describe("isSiteLinkShown", () => {
  const shown = {
    pages: new Set(["about-us"] as const),
    locations: new Set(["langkawi"]),
    posts: new Set(["island-hopping"]),
  };

  it("shows a link only where the public can open it", () => {
    assert.ok(isSiteLinkShown({ kind: "page", page: "about-us" }, shown));
    assert.ok(!isSiteLinkShown({ kind: "page", page: "terms" }, shown));
    assert.ok(!isSiteLinkShown({ kind: "location", slug: "penang" }, shown));
    assert.ok(!isSiteLinkShown({ kind: "post", slug: "gone" }, shown));
    assert.ok(
      isSiteLinkShown(
        { kind: "search", service: "coach-charter", mode: "oneway" },
        shown,
      ),
    );
  });
});

describe("searchTripOf", () => {
  it("reads a kind of trip from an address, nothing else", () => {
    assert.equal(searchTripOf("hourly"), "hourly");
    assert.equal(searchTripOf("boat"), null);
    assert.equal(searchTripOf(undefined), null);
  });
});
