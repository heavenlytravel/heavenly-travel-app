import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  imageSizeOf,
  markdownImagesOf,
  markdownText,
  markdownWordCount,
  parseMarkdownImport,
  replaceMarkdownImage,
  withImageSize,
} from "./markdown";

const UPLOAD = "https://abc123.ufs.sh/f/eagle-square.jpg";

describe("markdownImagesOf", () => {
  it("finds every image in order, with its alt and address", () => {
    const body = [
      "Intro with ![Eagle Square](https://example.com/a.jpg) inline.",
      "",
      `![The jetty at dusk](${UPLOAD}#1200x800 "Kuah")`,
      "",
      "![](<https://example.com/with space.png>)",
    ].join("\n");
    assert.deepEqual(markdownImagesOf(body), [
      { alt: "Eagle Square", url: "https://example.com/a.jpg", index: 0 },
      { alt: "The jetty at dusk", url: `${UPLOAD}#1200x800`, index: 1 },
      { alt: "", url: "https://example.com/with space.png", index: 2 },
    ]);
  });

  it("reads escaped brackets in the alt text", () => {
    assert.deepEqual(markdownImagesOf("![A \\[map\\]](x.png)"), [
      { alt: "A [map]", url: "x.png", index: 0 },
    ]);
  });

  it("skips an image written as code", () => {
    const body = [
      "`![not](inline.png)`",
      "```",
      "![not](fenced.png)",
      "```",
      "![yes](real.png)",
    ].join("\n");
    assert.deepEqual(markdownImagesOf(body), [
      { alt: "yes", url: "real.png", index: 0 },
    ]);
  });

  it("finds none in plain text or a link", () => {
    assert.deepEqual(markdownImagesOf("A [link](https://x.my) only."), []);
  });
});

describe("withImageSize and imageSizeOf", () => {
  it("puts the size in the fragment and reads it back", () => {
    const sized = withImageSize(UPLOAD, 1200, 800);
    assert.equal(sized, `${UPLOAD}#1200x800`);
    assert.deepEqual(imageSizeOf(sized), { width: 1200, height: 800 });
  });

  it("replaces a fragment the address had", () => {
    assert.equal(
      withImageSize(`${UPLOAD}#640x480`, 1600, 900),
      `${UPLOAD}#1600x900`,
    );
  });

  it("reads no size from an address without one, or a zero", () => {
    assert.equal(imageSizeOf(UPLOAD), null);
    assert.equal(imageSizeOf(`${UPLOAD}#top`), null);
    assert.equal(imageSizeOf(`${UPLOAD}#0x800`), null);
  });
});

describe("replaceMarkdownImage", () => {
  const body = "One ![a](https://example.com/a.jpg) and ![b](b.png 'B').";

  it("changes the address of the image at the index, keeping its title", () => {
    assert.equal(
      replaceMarkdownImage(body, 1, { url: `${UPLOAD}#10x20` }),
      `One ![a](https://example.com/a.jpg) and ![b](${UPLOAD}#10x20 'B').`,
    );
  });

  it("changes the alt text, escaping its brackets", () => {
    assert.equal(
      replaceMarkdownImage(body, 0, { alt: "The [old]\n town" }),
      "One ![The \\[old\\] town](https://example.com/a.jpg) and ![b](b.png 'B').",
    );
  });

  it("wraps an address with a space in angle brackets", () => {
    assert.equal(
      replaceMarkdownImage("![a](a.png)", 0, { url: "my file.png" }),
      "![a](<my file.png>)",
    );
  });

  it("keeps a space typed at the end of the alt text", () => {
    assert.equal(
      replaceMarkdownImage("![a](a.png)", 0, { alt: "Eagle " }),
      "![Eagle ](a.png)",
    );
  });

  it("leaves the body as it is for an index with no image", () => {
    assert.equal(replaceMarkdownImage(body, 5, { alt: "x" }), body);
  });
});

describe("markdownText and markdownWordCount", () => {
  const body = [
    "## Getting *there*",
    "",
    "Take the [ferry](https://ferry.my) from **Kuala Perlis**.",
    "",
    "![A ferry](ferry.jpg)",
    "",
    "- One",
    "1. Two",
    "> A quote",
    "",
    "---",
    "",
    "| Fare | Time |",
    "| --- | --- |",
    "| RM 18 | 1 hour |",
  ].join("\n");

  it("keeps the words a reader reads, without the markup", () => {
    assert.equal(
      markdownText(body),
      [
        "Getting there",
        "Take the ferry from Kuala Perlis.",
        "One",
        "Two",
        "A quote",
        "Fare Time",
        "RM 18 1 hour",
      ].join("\n"),
    );
  });

  it("counts those words", () => {
    assert.equal(markdownWordCount(body), 18);
    assert.equal(markdownWordCount(""), 0);
  });
});

describe("parseMarkdownImport", () => {
  it("reads the front matter into the fields and keeps the body", () => {
    const file = [
      "---",
      'title: "A day in Kuah"',
      "meta_description: Where to eat and shop in Kuah town.",
      "excerpt: 'Markets, food and the jetty.'",
      "author: Someone",
      "---",
      "",
      "Kuah is the island's town.",
    ].join("\n");
    assert.deepEqual(parseMarkdownImport(file), {
      title: "A day in Kuah",
      description: "Where to eat and shop in Kuah town.",
      summary: "Markets, food and the jetty.",
      body: "Kuah is the island's town.",
    });
  });

  it("takes a first # heading as the title when there is none", () => {
    const file = "\n# A day in *Kuah*\n\nKuah is the island's town.\n";
    assert.deepEqual(parseMarkdownImport(file), {
      title: "A day in Kuah",
      description: "",
      summary: "",
      body: "Kuah is the island's town.",
    });
  });

  it("drops a first heading that repeats the title", () => {
    const file = "---\ntitle: A day in Kuah\n---\n# A day in Kuah\n\nText.";
    assert.equal(parseMarkdownImport(file).body, "Text.");
  });

  it("keeps a first heading that differs from the title", () => {
    const file = "---\ntitle: A day in Kuah\n---\n# Morning\n\nText.";
    assert.equal(parseMarkdownImport(file).body, "# Morning\n\nText.");
  });

  it("reads a setext heading as the title", () => {
    assert.deepEqual(parseMarkdownImport("Kuah town\n=========\n\nText."), {
      title: "Kuah town",
      description: "",
      summary: "",
      body: "Text.",
    });
  });

  it("drops a byte order mark and Windows line ends", () => {
    const file = `${String.fromCharCode(0xfeff)}# Title\r\n\r\nOne\r\nTwo\r\n`;
    assert.deepEqual(parseMarkdownImport(file), {
      title: "Title",
      description: "",
      summary: "",
      body: "One\nTwo",
    });
  });

  it("leaves a second-level first heading in the body", () => {
    const file = "## Not a title\n\nText.";
    assert.deepEqual(parseMarkdownImport(file), {
      title: "",
      description: "",
      summary: "",
      body: "## Not a title\n\nText.",
    });
  });
});
