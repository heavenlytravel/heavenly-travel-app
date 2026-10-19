import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkPhotos, parsePhotos, photoAlt, samePhotos } from "./photos-input";

const PHOTO = "https://abc123.ufs.sh/f/key-1";

describe("parsePhotos", () => {
  it("reads the list in order, captions trimmed", () => {
    assert.deepEqual(
      parsePhotos(
        JSON.stringify([
          { url: PHOTO, caption: " Interior " },
          { url: PHOTO, caption: "" },
        ]),
      ),
      [
        { url: PHOTO, caption: "Interior" },
        { url: PHOTO, caption: "" },
      ],
    );
  });

  it("takes nothing as an empty list, and refuses what is not a list", () => {
    assert.deepEqual(parsePhotos(""), []);
    assert.equal(parsePhotos("{not json"), null);
    assert.equal(parsePhotos(JSON.stringify({ url: PHOTO })), null);
    assert.equal(parsePhotos(JSON.stringify([{ caption: "x" }])), null);
  });
});

describe("checkPhotos", () => {
  it("takes photos stored on UploadThing only", () => {
    assert.equal(checkPhotos([{ url: PHOTO, caption: "" }]).ok, true);
    assert.equal(
      checkPhotos([{ url: "https://example.com/a.jpg", caption: "" }]).ok,
      false,
    );
  });

  it("holds at most 12 photos, each caption short", () => {
    const thirteen = Array.from({ length: 13 }, () => ({
      url: PHOTO,
      caption: "",
    }));
    assert.match(
      (checkPhotos(thirteen) as { error: string }).error,
      /12 photos/,
    );
    assert.equal(
      checkPhotos([{ url: PHOTO, caption: "x".repeat(61) }]).ok,
      false,
    );
  });
});

describe("the words around a photo", () => {
  it("names a photo by its caption beside what it shows", () => {
    assert.equal(
      photoAlt("Toyota Alphard", { caption: "Interior" }),
      "Toyota Alphard, Interior",
    );
    assert.equal(photoAlt("Toyota Alphard", { caption: "" }), "Toyota Alphard");
  });

  it("knows two lists the same only in the same order", () => {
    const a = { url: PHOTO, caption: "" };
    const b = { url: `${PHOTO}2`, caption: "" };
    assert.equal(samePhotos([a, b], [a, b]), true);
    assert.equal(samePhotos([a, b], [b, a]), false);
    assert.equal(samePhotos([a], [{ ...a, caption: "Front" }]), false);
  });
});
