import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { placeSearchHandler } from "./route";
import type { PlacesProvider, SearchOptions } from "./types";

/** A provider that records what each search was asked for. */
function recorder() {
  const calls: { query: string; options?: SearchOptions }[] = [];
  const provider: PlacesProvider = {
    name: "test",
    canRoute: false,
    async searchPlaces(query, options) {
      calls.push({ query, options });
      return [{ placeId: "p1", label: query, detail: "" }];
    },
    async resolvePlace() {
      return null;
    },
    async roadDistance() {
      return null;
    },
  };
  return { provider, calls };
}

const search = (params: string) =>
  new Request(`https://example.test/api/places/search?${params}`);

describe("placeSearchHandler", () => {
  it("answers the suggestions of a query, with the session token", async () => {
    const { provider, calls } = recorder();
    const res = await placeSearchHandler(provider)(search("q=klia&session=s1"));
    assert.deepEqual(await res.json(), {
      suggestions: [{ placeId: "p1", label: "klia", detail: "" }],
    });
    assert.deepEqual(calls, [
      { query: "klia", options: { sessionToken: "s1", includeAreas: false } },
    ]);
  });

  it("asks nothing for a query that is too short", async () => {
    const { provider, calls } = recorder();
    const res = await placeSearchHandler(provider)(search("q=k"));
    assert.deepEqual(await res.json(), { suggestions: [] });
    assert.equal(calls.length, 0);
  });

  it("never offers areas on the customer site, whatever the request says", async () => {
    const { provider, calls } = recorder();
    await placeSearchHandler(provider)(search("q=langkawi&areas=1"));
    assert.equal(calls[0]?.options?.includeAreas, false);
  });

  it("offers areas where they are allowed, when the request asks", async () => {
    const { provider, calls } = recorder();
    const handler = placeSearchHandler(provider, { allowAreas: true });
    await handler(search("q=langkawi&areas=1"));
    await handler(search("q=langkawi"));
    assert.deepEqual(
      calls.map((call) => call.options?.includeAreas),
      [true, false],
    );
  });
});
