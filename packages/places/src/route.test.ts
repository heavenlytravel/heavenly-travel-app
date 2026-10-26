import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseBounds, placeSearchHandler } from "./route";
import type { PlacesProvider, SearchOptions } from "./types";

// Langkawi's box, as the search card sends it.
const LANGKAWI = "99.54,6.07,100.03,6.58";

/** The handler over a provider that keeps what each search asked. */
function handler() {
  const asked: { query: string; options?: SearchOptions }[] = [];
  const provider: PlacesProvider = {
    name: "test",
    searchPlaces: (query, options) => {
      asked.push({ query, options });
      return Promise.resolve([]);
    },
    resolvePlace: () => Promise.resolve(null),
    route: () => Promise.resolve(null),
  };
  return { GET: placeSearchHandler(provider), asked };
}

const search = (query: string) =>
  new Request(`https://example.test/api/places/search?${query}`);

describe("parseBounds", () => {
  it("reads four numbers in range, west to north", () => {
    assert.deepEqual(parseBounds(LANGKAWI), [99.54, 6.07, 100.03, 6.58]);
    assert.equal(parseBounds("100.03,6.07,99.54,6.58"), null);
    assert.equal(parseBounds("99.54,6.07,100.03"), null);
    assert.equal(parseBounds("a,b,c,d"), null);
    assert.equal(parseBounds(null), null);
  });
});

describe("placeSearchHandler", () => {
  it("keeps to `within` and puts `near` first, as the field asks", async () => {
    const { GET, asked } = handler();
    await GET(search(`q=Kuah&session=s1&within=${LANGKAWI}`));
    await GET(search(`q=Kuah&near=${LANGKAWI}`));
    assert.deepEqual(asked, [
      {
        query: "Kuah",
        options: {
          sessionToken: "s1",
          within: [99.54, 6.07, 100.03, 6.58],
          near: undefined,
        },
      },
      {
        query: "Kuah",
        options: {
          sessionToken: undefined,
          within: undefined,
          near: [99.54, 6.07, 100.03, 6.58],
        },
      },
    ]);
  });

  it("searches all of Malaysia for a box it cannot read, and asks nothing for a short query", async () => {
    const { GET, asked } = handler();
    await GET(search("q=Kuah&near=1,2,3"));
    await GET(search("q=K"));
    assert.equal(asked.length, 1);
    assert.equal(asked[0]?.options?.near, undefined);
  });
});
