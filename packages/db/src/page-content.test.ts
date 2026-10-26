import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PAGE_KINDS,
  PAGE_LIMITS,
  changedPageParts,
  checkPageComplete,
  checkPageLimits,
  emptyPageContent,
  isPageInList,
  isPagePublished,
  missingFields,
  pageChecks,
  pageContentOf,
  pageImageKeys,
  pageStatusOf,
  paragraphsOf,
  publicCopyOf,
  samePageContent,
  wordCount,
  type PageContent,
  type PageImage,
  type PageKind,
} from "./page-content";

const errorOf = (result: { ok: true } | { ok: false; error: string }) =>
  result.ok ? "" : result.error;

const image = (alt = "A beach at sunset", key = "key-1"): PageImage => ({
  url: `https://abc123.ufs.sh/f/${key}`,
  key,
  width: 1600,
  height: 900,
  alt,
});

const words = (count: number) =>
  Array.from({ length: count }, () => "word").join(" ");

/** A page of the kind with every field it holds filled and every minimum met. */
function complete(kind: PageKind): PageContent {
  return pageContentOf(kind, {
    metaTitle: "Langkawi by car with driver",
    metaDescription: "Private transfers around Langkawi with a driver.",
    tagline: "Island escape",
    heroHeadline: "Langkawi, door to door",
    heroSubheadline: "A driver who knows the island.",
    heroImage: image(),
    intro: words(PAGE_LIMITS.introWords),
    body: `## A day out\n\n${words(PAGE_LIMITS.bodyWords)}`,
    faqs: [1, 2, 3].map((n) => ({ question: `Q${n}?`, answer: `A${n}.` })),
    addressId: "a1",
  });
}

describe("paragraphsOf and wordCount", () => {
  it("reads each line as a paragraph and drops the empty ones", () => {
    assert.deepEqual(paragraphsOf(" One  two.\r\n\r\n\nThree.\n  \nFour. "), [
      "One two.",
      "Three.",
      "Four.",
    ]);
    assert.deepEqual(paragraphsOf("  \n "), []);
  });

  it("counts words across paragraphs", () => {
    assert.equal(wordCount("One two.\n\nThree."), 3);
    assert.equal(wordCount("  "), 0);
  });
});

describe("pageContentOf", () => {
  it("reads anything that is not content as an empty page", () => {
    const empty = {
      metaTitle: "",
      metaDescription: "",
      shareImage: null,
      tagline: "",
      heroHeadline: "",
      heroSubheadline: "",
      heroImage: null,
      intro: "",
      body: "",
      faqs: [],
      addressId: null,
      indexable: true,
    };
    for (const value of [undefined, null, "text", 7, [], {}]) {
      assert.deepEqual(pageContentOf("landing", value), empty);
    }
    assert.deepEqual(emptyPageContent("article"), empty);
  });

  it("trims the text and keeps paragraphs a blank line apart", () => {
    const content = pageContentOf("landing", {
      metaTitle: "  Langkawi \n transfers ",
      intro: "First.\nSecond.\n\n\nThird.",
      faqs: [{ question: " How far? ", answer: "Near.\nVery near." }, "junk"],
    });
    assert.equal(content.metaTitle, "Langkawi transfers");
    assert.equal(content.intro, "First.\n\nSecond.\n\nThird.");
    assert.deepEqual(content.faqs, [
      { question: "How far?", answer: "Near.\n\nVery near." },
      { question: "", answer: "" },
    ]);
  });

  it("keeps a body's spaces, with one kind of line end and its ends trimmed", () => {
    const body = pageContentOf("article", {
      body: "\r\n\r\n## Title\r\n\r\n- one\r\n  - two  \r\n\r\n",
    }).body;
    assert.equal(body, "## Title\n\n- one\n  - two");
  });

  it("keeps an image only when it is an uploaded one with a size", () => {
    const read = (heroImage: unknown) =>
      pageContentOf("landing", { heroImage }).heroImage;
    assert.deepEqual(
      read({ ...image(), alt: "  A beach  " }),
      image("A beach"),
    );
    assert.deepEqual(read({ ...image(), alt: undefined }), image(""));
    assert.equal(read({ ...image(), url: "https://example.com/a.jpg" }), null);
    assert.equal(read({ ...image(), key: "" }), null);
    assert.equal(read({ ...image(), width: 0 }), null);
    assert.equal(read({ ...image(), height: 1.5 }), null);
    assert.equal(read("https://abc123.ufs.sh/f/key-1"), null);
  });

  it("lets search engines list a page until it is turned off", () => {
    assert.equal(pageContentOf("place", {}).indexable, true);
    assert.equal(pageContentOf("place", { indexable: "no" }).indexable, true);
    assert.equal(
      pageContentOf("document", { indexable: false }).indexable,
      false,
    );
  });

  it("keeps the fields a kind holds and empties the others", () => {
    const raw = {
      tagline: "Island escape",
      intro: "About it.",
      body: "## Text",
      addressId: "a1",
      highlights: [{ name: "Eagle Square" }],
    };
    const read = (kind: PageKind) => {
      const { tagline, intro, body, addressId } = pageContentOf(kind, raw);
      return { tagline, intro, body, addressId };
    };
    assert.deepEqual(read("landing"), {
      tagline: "Island escape",
      intro: "About it.",
      body: "",
      addressId: null,
    });
    assert.deepEqual(read("place"), {
      tagline: "",
      intro: "About it.",
      body: "",
      addressId: "a1",
    });
    assert.deepEqual(read("article"), {
      tagline: "",
      intro: "",
      body: "## Text",
      addressId: null,
    });
    assert.deepEqual(read("home").tagline, "Island escape");
    assert.equal("highlights" in pageContentOf("landing", raw), false);
  });

  it("reads its own output back unchanged", () => {
    for (const kind of PAGE_KINDS) {
      const content = complete(kind);
      assert.deepEqual(pageContentOf(kind, content), content);
      assert.equal(
        samePageContent(
          content,
          pageContentOf(kind, JSON.parse(JSON.stringify(content))),
        ),
        true,
      );
    }
  });
});

describe("checkPageLimits", () => {
  it("accepts an empty draft and a complete page", () => {
    assert.equal(checkPageLimits(pageContentOf("landing", {})).ok, true);
    for (const kind of PAGE_KINDS) {
      assert.equal(checkPageLimits(complete(kind)).ok, true, kind);
    }
  });

  it("holds every text to its length", () => {
    const base = complete("landing");
    const cases: [Partial<PageContent>, RegExp][] = [
      [{ metaTitle: "a".repeat(61) }, /meta title is at most 60/],
      [{ metaDescription: "a".repeat(161) }, /meta description is at most 160/],
      [{ heroHeadline: "a".repeat(81) }, /headline is at most 80/],
      [
        { heroSubheadline: "a".repeat(161) },
        /under the headline is at most 160/,
      ],
      [{ intro: "a".repeat(5001) }, /intro is at most 5000/],
      [{ body: "a".repeat(50001) }, /text is at most 50,000/],
      [{ heroImage: image("a".repeat(161)) }, /alt text is at most 160/],
      [
        { body: `![${"a".repeat(161)}](https://abc123.ufs.sh/f/k)` },
        /alt text is at most 160/,
      ],
      [
        { faqs: [{ question: "a".repeat(161), answer: "A." }] },
        /question of FAQ 1 is at most 160/,
      ],
      [
        { faqs: [{ question: "Q?", answer: "a".repeat(1001) }] },
        /answer of FAQ 1 is at most 1000/,
      ],
    ];
    for (const [patch, error] of cases) {
      assert.match(errorOf(checkPageLimits({ ...base, ...patch })), error);
    }
    assert.equal(
      checkPageLimits({ ...base, metaTitle: "a".repeat(60) }).ok,
      true,
    );
  });

  it("caps the FAQs", () => {
    const faq = { question: "Q?", answer: "A." };
    assert.match(
      errorOf(
        checkPageLimits({
          ...complete("landing"),
          faqs: Array.from({ length: 13 }, () => faq),
        }),
      ),
      /at most 12 FAQs/,
    );
  });
});

describe("missingFields", () => {
  it("finds nothing missing on a complete page of any kind", () => {
    for (const kind of PAGE_KINDS) {
      assert.deepEqual(missingFields(kind, complete(kind)), [], kind);
    }
  });

  it("lists everything an empty main page needs, in the order of the form", () => {
    assert.deepEqual(missingFields("landing", pageContentOf("landing", {})), [
      "Meta title",
      "Meta description",
      "Headline",
      "Subheadline",
      "Hero image",
      "Intro: at least 100 words (0 so far)",
      "FAQs: at least 3 (0 so far)",
    ]);
  });

  it("names the hero's lines as the kind calls them", () => {
    assert.deepEqual(missingFields("place", emptyPageContent("place")), [
      "Meta title",
      "Meta description",
      "Name",
      "Short description",
      "Hero image",
      "Intro: at least 100 words (0 so far)",
    ]);
    assert.deepEqual(missingFields("document", emptyPageContent("document")), [
      "Meta title",
      "Meta description",
      "Title",
      "Summary",
      "Text: at least 100 words (0 so far)",
    ]);
  });

  it("asks a listing and the home page for no intro and no FAQs", () => {
    for (const kind of ["listing", "home"] as const) {
      const missing = missingFields(kind, emptyPageContent(kind));
      assert.equal(
        missing.some((field) => /^(Intro|FAQs)/.test(field)),
        false,
        kind,
      );
    }
  });

  it("still asks an optional FAQ for its question and answer", () => {
    assert.deepEqual(
      missingFields("place", {
        ...complete("place"),
        faqs: [{ question: "Q?", answer: "" }],
      }),
      ["FAQ 1: the answer"],
    );
  });

  it("names what a row still needs", () => {
    const base = complete("landing");
    const content: PageContent = {
      ...base,
      heroImage: image(""),
      intro: words(62),
      faqs: [base.faqs[0]!, { question: "Q?", answer: "" }],
    };
    assert.deepEqual(missingFields("landing", content), [
      "Hero image: the alt text",
      "Intro: at least 100 words (62 so far)",
      "FAQs: at least 3 (2 so far)",
      "FAQ 2: the answer",
    ]);
  });

  it("asks an optional hero image, once set, for its alt text", () => {
    const base = complete("document");
    assert.deepEqual(
      missingFields("document", { ...base, heroImage: null }),
      [],
    );
    assert.deepEqual(
      missingFields("document", { ...base, heroImage: image("") }),
      ["Hero image: the alt text"],
    );
  });

  it("asks every image in a text to be uploaded here, with its alt text", () => {
    const base = complete("article");
    const body = `${base.body}\n\n![A pier](https://example.com/pier.jpg)\n\n![](https://abc123.ufs.sh/f/key-2#1200x800)`;
    assert.deepEqual(missingFields("article", { ...base, body }), [
      "Image 1 in the text: upload it here",
      "Image 2 in the text: the alt text",
    ]);
  });
});

describe("pageChecks", () => {
  it("groups what is missing by the part of the page, with its tab", () => {
    const keys = (kind: PageKind) =>
      pageChecks(kind, emptyPageContent(kind)).map((check) => [
        check.key,
        check.tab,
        check.missing.length,
      ]);
    assert.deepEqual(keys("landing"), [
      ["search", "search", 2],
      ["hero", "content", 3],
      ["intro", "content", 1],
      ["faqs", "content", 1],
    ]);
    assert.deepEqual(keys("article"), [
      ["search", "search", 2],
      ["hero", "content", 3],
      ["body", "content", 1],
      ["faqs", "content", 0],
    ]);
  });

  it("asks a share image, which is optional, for its alt text", () => {
    const base = complete("landing");
    assert.deepEqual(
      missingFields("landing", { ...base, shareImage: image("") }),
      ["Share image: the alt text"],
    );
  });
});

describe("changedPageParts", () => {
  it("names the parts two contents differ in, in the order of the editor", () => {
    const base = complete("place");
    assert.deepEqual(changedPageParts(base, base), []);
    assert.deepEqual(
      changedPageParts(base, {
        ...base,
        intro: "Changed.",
        metaTitle: "Another title",
        shareImage: image("Share"),
        addressId: null,
      }),
      ["Meta title", "Share image", "Intro", "Saved address"],
    );
  });
});

describe("checkPageComplete", () => {
  it("passes a complete page", () => {
    assert.equal(checkPageComplete("landing", complete("landing")).ok, true);
  });

  it("names the first thing missing and counts the rest", () => {
    const base = complete("landing");
    assert.equal(
      errorOf(checkPageComplete("landing", { ...base, metaTitle: "" })),
      "The page is not complete. Still missing: Meta title.",
    );
    assert.equal(
      errorOf(
        checkPageComplete("landing", {
          ...base,
          metaTitle: "",
          heroImage: null,
          faqs: [],
        }),
      ),
      "The page is not complete. Still missing: Meta title, and 2 more.",
    );
  });

  it("applies the limits first", () => {
    assert.match(
      errorOf(
        checkPageComplete("landing", {
          ...complete("landing"),
          metaTitle: "a".repeat(61),
        }),
      ),
      /at most 60/,
    );
  });
});

describe("pageImageKeys", () => {
  it("finds the share image, the hero and the uploaded images of the text, once each", () => {
    const content = {
      ...complete("article"),
      shareImage: image("Share", "key-0"),
      body: "![A](https://abc123.ufs.sh/f/key-2#1200x800) ![B](https://example.com/b.jpg) ![C](https://abc123.ufs.sh/f/key-1)",
    };
    assert.deepEqual(pageImageKeys(content), ["key-0", "key-1", "key-2"]);
  });
});

describe("pageStatusOf", () => {
  it("tells a page never published from one with newer changes", () => {
    const published = complete("landing");
    assert.equal(pageStatusOf(published, null), "unpublished");
    assert.equal(pageStatusOf(published, published), "published");
    assert.equal(
      pageStatusOf({ ...published, heroHeadline: "New" }, published),
      "changed",
    );
  });
});

describe("publicCopyOf", () => {
  it("is the copy last published while the page is published, and nothing once it is unpublished", () => {
    const published = complete("service");
    assert.deepEqual(
      publicCopyOf("service", { isOn: true, published }),
      published,
    );
    assert.equal(publicCopyOf("service", { isOn: false, published }), null);
    assert.equal(
      publicCopyOf("service", { isOn: false, published: null }),
      null,
    );
  });

  it("makes an unpublished page read as not published, whatever it once showed", () => {
    const published = complete("landing");
    const row = { isOn: false, published };
    const status = pageStatusOf(published, publicCopyOf("landing", row));
    assert.equal(status, "unpublished");
    assert.equal(isPagePublished(status), false);
    assert.equal(isPagePublished("published"), true);
    assert.equal(isPagePublished("changed"), true);
  });
});

describe("isPageInList", () => {
  const page = {
    name: "Eagle Square",
    status: "published" as const,
    paused: false,
  };
  const path = "/langkawi/popular-places/eagle-square";

  it("narrows by standing, a paused class's page apart", () => {
    assert.equal(isPageInList(page, path, {}), true);
    assert.equal(isPageInList(page, path, { status: "published" }), true);
    assert.equal(isPageInList(page, path, { status: "unpublished" }), false);
    assert.equal(isPageInList(page, path, { status: "paused" }), false);
    assert.equal(
      isPageInList({ ...page, paused: true }, path, { status: "paused" }),
      true,
    );
  });

  it("finds a page by its name or its address, whatever the case", () => {
    assert.equal(isPageInList(page, path, { q: "eagle" }), true);
    assert.equal(isPageInList(page, path, { q: "POPULAR-places" }), true);
    assert.equal(isPageInList(page, path, { q: "cenang" }), false);
  });
});
