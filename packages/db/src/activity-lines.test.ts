import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { activityChangesOf, activityLinesOf } from "./activity-lines";

const at = (time: string) => new Date(`2026-11-05T${time}+08:00`);
const entry = (
  id: string,
  time: string,
  over: Partial<{ actorId: string; entityId: string; text: string }> = {},
) => ({
  id,
  createdAt: at(time),
  actorId: over.actorId ?? "aina",
  actorKind: "admin",
  entityType: "booking",
  entityId: over.entityId ?? "b1",
  text: over.text ?? `did ${id}`,
});
const lines = (entries: ReturnType<typeof entry>[]) =>
  activityLinesOf(entries, (e) => e.text).map((line) => ({
    ids: line.entries.map((e) => e.id),
    sentences: line.sentences,
  }));

describe("activityLinesOf", () => {
  it("counts the same thing done again and again as one line", () => {
    const seen = { actorId: "ali", text: "Ali saw the customer's details" };
    assert.deepEqual(
      lines([
        entry("c", "16:40:00", seen),
        entry("b", "14:36:00", seen),
        entry("a", "10:36:00", seen),
      ]),
      [
        {
          ids: ["c", "b", "a"],
          sentences: [{ text: "Ali saw the customer's details", count: 3 }],
        },
      ],
    );
  });

  it("makes one save of one person's entries on one record within seconds, in the order written", () => {
    assert.deepEqual(lines([entry("b", "10:00:02"), entry("a", "10:00:00")]), [
      {
        ids: ["b", "a"],
        sentences: [
          { text: "did a", count: 1 },
          { text: "did b", count: 1 },
        ],
      },
    ]);
  });

  it("keeps apart another person, another record and a later change", () => {
    assert.equal(
      lines([
        entry("d", "11:00:00"),
        entry("c", "10:00:01", { actorId: "ali" }),
        entry("b", "10:00:01", { entityId: "b2" }),
        entry("a", "10:00:00"),
      ]).length,
      4,
    );
  });
});

describe("activityChangesOf", () => {
  it("lists what changed, old and new, in ringgit where it is money", () => {
    assert.deepEqual(
      activityChangesOf({
        before: { position: 2, priceTotalSen: 25000, note: "x" },
        after: { position: 2, priceTotalSen: 30000, note: "x" },
      }),
      [{ label: "Price Total", before: "RM 250.00", after: "RM 300.00" }],
    );
  });

  it("lists a record created whole, leaving ids and lists of records out", () => {
    assert.deepEqual(
      activityChangesOf({
        before: null,
        after: {
          vendorId: "v1",
          plate: "WXY 1234",
          isActive: true,
          cells: [{ a: 1 }],
        },
      }),
      [
        { label: "Plate", before: null, after: "WXY 1234" },
        { label: "Is Active", before: null, after: "Yes" },
      ],
    );
  });

  it("counts stored images rather than show their addresses", () => {
    assert.deepEqual(
      activityChangesOf({
        before: { imageUrls: ["https://abc123.ufs.sh/f/a"] },
        after: {
          imageUrls: ["https://abc123.ufs.sh/f/a", "https://abc123.ufs.sh/f/b"],
        },
      }),
      [{ label: "Image Urls", before: "1 image", after: "2 images" }],
    );
  });
});
