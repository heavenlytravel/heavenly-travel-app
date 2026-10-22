import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IMAGE_MAX_BYTES,
  checkImageFile,
  formatBytes,
  isUploadUrl,
  uploadKeyOf,
} from "./images";

const errorOf = (result: { ok: true } | { ok: false; error: string }) =>
  result.ok ? "" : result.error;

describe("checkImageFile", () => {
  it("takes a JPEG, a PNG or a WebP within 4 MB", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      assert.equal(checkImageFile({ type, size: IMAGE_MAX_BYTES }).ok, true);
    }
    assert.match(
      errorOf(checkImageFile({ type: "image/gif", size: 10 })),
      /JPEG, a PNG or a WebP/,
    );
    assert.match(
      errorOf(checkImageFile({ type: "image/png", size: IMAGE_MAX_BYTES + 1 })),
      /at most 4 MB/,
    );
  });
});

describe("isUploadUrl", () => {
  it("accepts a file on UploadThing only", () => {
    assert.equal(isUploadUrl("https://abc123.ufs.sh/f/key-1"), true);
    for (const value of [
      "http://abc123.ufs.sh/f/key-1",
      "https://ufs.sh.example.com/f/key-1",
      "https://abc123.ufs.sh/a/key-1",
      "https://example.com/beach.jpg",
      "/beach.jpg",
      "",
      null,
      7,
    ]) {
      assert.equal(isUploadUrl(value), false, String(value));
    }
  });
});

describe("uploadKeyOf", () => {
  it("reads the key after /f/ of a file on UploadThing", () => {
    assert.equal(uploadKeyOf("https://abc123.ufs.sh/f/key-1"), "key-1");
    assert.equal(
      uploadKeyOf("https://abc123.ufs.sh/f/a%20b_photo.jpg"),
      "a b_photo.jpg",
    );
    for (const value of [
      "https://abc123.ufs.sh/f/",
      "https://example.com/f/key-1",
      "",
    ]) {
      assert.equal(uploadKeyOf(value), null, value);
    }
  });
});

describe("formatBytes", () => {
  it("says a size as people read it", () => {
    assert.equal(formatBytes(0), "0 KB");
    assert.equal(formatBytes(300), "1 KB");
    assert.equal(formatBytes(555 * 1024), "555 KB");
    assert.equal(formatBytes(3.7 * 1024 * 1024), "3.7 MB");
    assert.equal(formatBytes(1.2 * 1024 * 1024 * 1024), "1.2 GB");
  });
});
