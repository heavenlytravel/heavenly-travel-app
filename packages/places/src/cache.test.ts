import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { memoize, ttlStore } from "./cache";

const byFirst = ([key]: [string, ...unknown[]]) => key;

describe("ttlStore", () => {
  it("keeps a value until it expires, and drops the oldest past the limit", () => {
    let clock = 0;
    const store = ttlStore<string>({ ttlMs: 100, max: 2, now: () => clock });
    store.set("a", "A");
    assert.equal(store.get("a"), "A");
    clock = 100;
    assert.equal(store.get("a"), undefined);
    store.set("a", "A");
    store.set("b", "B");
    store.set("c", "C");
    assert.equal(store.get("a"), undefined);
    assert.equal(store.get("c"), "C");
  });
});

describe("memoize", () => {
  it("calls once per key until the entry expires", async () => {
    let clock = 0;
    let calls = 0;
    const get = memoize(
      async (key: string) => {
        calls++;
        return key.toUpperCase();
      },
      { key: byFirst, ttlMs: 100, max: 10, now: () => clock },
    );

    assert.equal(await get("a"), "A");
    assert.equal(await get("a"), "A");
    assert.equal(calls, 1);

    clock = 100;
    assert.equal(await get("a"), "A");
    assert.equal(calls, 2);
  });

  it("keys on what the caller says, not on every argument", async () => {
    let calls = 0;
    const get = memoize(
      async (query: string, token?: string) => {
        calls++;
        return `${query}:${token}`;
      },
      { key: byFirst, ttlMs: 1000, max: 10 },
    );
    assert.equal(await get("klia", "t1"), "klia:t1");
    assert.equal(await get("klia", "t2"), "klia:t1");
    assert.equal(calls, 1);
  });

  it("shares one in-flight promise between concurrent callers", async () => {
    let calls = 0;
    const get = memoize(
      async () => {
        calls++;
        return calls;
      },
      { key: () => "k", ttlMs: 1000, max: 10 },
    );
    const [x, y] = await Promise.all([get(), get()]);
    assert.equal(x, 1);
    assert.equal(y, 1);
  });

  it("forgets a failed lookup", async () => {
    let calls = 0;
    const get = memoize(
      async () => {
        calls++;
        if (calls === 1) throw new Error("upstream down");
        return "ok";
      },
      { key: () => "k", ttlMs: 1000, max: 10 },
    );
    await assert.rejects(get());
    assert.equal(await get(), "ok");
  });

  it("drops the oldest entry past the size limit", async () => {
    let calls = 0;
    const get = memoize(
      async (key: string) => {
        calls++;
        return key;
      },
      { key: byFirst, ttlMs: 1000, max: 2 },
    );
    await get("a");
    await get("b");
    await get("c"); // evicts a
    await get("b"); // still cached
    assert.equal(calls, 3);
    await get("a");
    assert.equal(calls, 4);
  });
});
