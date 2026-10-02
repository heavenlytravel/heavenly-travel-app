import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TRIP_CATEGORIES } from "./booking-status";
import {
  IMAGE_MAX_BYTES,
  LOCATION_PAGES,
  PAGE_LIMITS,
  checkImageFile,
  checkPageComplete,
  checkPageLimits,
  isLocationPageKey,
  isUploadUrl,
  missingFields,
  pageContentOf,
  pageNameOf,
  pageStatusOf,
  paragraphsOf,
  samePageContent,
  wordCount,
  type PageContent,
  type PageImage,
} from "./location-page-input";

const errorOf = (result: { ok: true } | { ok: false; error: string }) =>
  result.ok ? "" : result.error;

const image = (alt = "A beach at sunset"): PageImage => ({
  url: "https://abc123.ufs.sh/f/key-1",
  key: "key-1",
  width: 1600,
  height: 900,
  alt,
});

const words = (count: number) =>
  Array.from({ length: count }, () => "word").join(" ");

/** A page with every field filled and every minimum met. */
function complete(page: "landing" | "car-with-driver"): PageContent {
  return pageContentOf(page, {
    metaTitle: "Langkawi by car with driver",
    metaDescription: "Private transfers around Langkawi with a driver.",
    heroHeadline: "Langkawi, door to door",
    heroSubheadline: "A driver who knows the island.",
    heroImage: image(),
    intro: words(PAGE_LIMITS.introWords),
    faqs: [1, 2, 3].map((n) => ({ question: `Q${n}?`, answer: `A${n}.` })),
    highlights: [1, 2, 3].map((n) => ({
      name: `Spot ${n}`,
      text: `About spot ${n}.`,
      image: image(`Spot ${n}`),
      addressId: null,
    })),
  });
}

describe("the pages of a location", () => {
  it("are the landing page and one per product", () => {
    assert.deepEqual(LOCATION_PAGES, ["landing", ...TRIP_CATEGORIES]);
    assert.equal(isLocationPageKey("landing"), true);
    assert.equal(isLocationPageKey("coach-charter"), true);
    assert.equal(isLocationPageKey("hotel"), false);
  });

  it("are named as a sentence names them", () => {
    assert.equal(pageNameOf("landing"), "the landing page");
    assert.equal(pageNameOf("coach-charter"), "the Coach charter page");
  });
});

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
      heroHeadline: "",
      heroSubheadline: "",
      heroImage: null,
      intro: "",
      faqs: [],
      highlights: [],
    };
    for (const value of [undefined, null, "text", 7, [], {}]) {
      assert.deepEqual(pageContentOf("landing", value), empty);
    }
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

  it("keeps highlights on the landing page only", () => {
    const raw = {
      highlights: [
        { name: " Eagle Square ", text: "A landmark.", addressId: "a1" },
        { name: "Local food", addressId: "" },
      ],
    };
    assert.deepEqual(pageContentOf("landing", raw).highlights, [
      {
        name: "Eagle Square",
        text: "A landmark.",
        image: null,
        addressId: "a1",
      },
      { name: "Local food", text: "", image: null, addressId: null },
    ]);
    assert.deepEqual(pageContentOf("coach-charter", raw).highlights, []);
  });

  it("reads its own output back unchanged", () => {
    const content = complete("landing");
    assert.deepEqual(pageContentOf("landing", content), content);
    assert.equal(
      samePageContent(
        content,
        pageContentOf("landing", JSON.parse(JSON.stringify(content))),
      ),
      true,
    );
  });
});

describe("checkPageLimits", () => {
  it("accepts an empty draft and a complete page", () => {
    assert.equal(checkPageLimits(pageContentOf("landing", {})).ok, true);
    assert.equal(checkPageLimits(complete("landing")).ok, true);
  });

  it("holds every text to its length", () => {
    const base = complete("landing");
    const cases: [Partial<PageContent>, RegExp][] = [
      [{ metaTitle: "a".repeat(61) }, /meta title is at most 60/],
      [{ metaDescription: "a".repeat(161) }, /meta description is at most 160/],
      [{ heroHeadline: "a".repeat(81) }, /hero headline is at most 80/],
      [{ heroSubheadline: "a".repeat(161) }, /hero subheadline is at most 160/],
      [{ intro: "a".repeat(5001) }, /intro is at most 5000/],
      [{ heroImage: image("a".repeat(161)) }, /alt text is at most 160/],
      [
        { faqs: [{ question: "a".repeat(161), answer: "A." }] },
        /question of FAQ 1 is at most 160/,
      ],
      [
        { faqs: [{ question: "Q?", answer: "a".repeat(1001) }] },
        /answer of FAQ 1 is at most 1000/,
      ],
      [
        {
          highlights: [
            { name: "a".repeat(61), text: "", image: null, addressId: null },
          ],
        },
        /name of highlight 1 is at most 60/,
      ],
      [
        {
          highlights: [
            { name: "", text: "a".repeat(301), image: null, addressId: null },
          ],
        },
        /text of highlight 1 is at most 300/,
      ],
      [
        {
          highlights: [
            {
              name: "",
              text: "",
              image: image("a".repeat(161)),
              addressId: null,
            },
          ],
        },
        /alt text is at most 160/,
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

  it("caps the FAQs and the highlights", () => {
    const base = complete("landing");
    const faq = { question: "Q?", answer: "A." };
    const highlight = base.highlights[0]!;
    assert.match(
      errorOf(
        checkPageLimits({
          ...base,
          faqs: Array.from({ length: 13 }, () => faq),
        }),
      ),
      /at most 12 FAQs/,
    );
    assert.match(
      errorOf(
        checkPageLimits({
          ...base,
          highlights: Array.from({ length: 9 }, () => highlight),
        }),
      ),
      /at most 8 highlights/,
    );
  });
});

describe("missingFields", () => {
  it("finds nothing missing on a complete page", () => {
    assert.deepEqual(missingFields("landing", complete("landing")), []);
    assert.deepEqual(
      missingFields("car-with-driver", complete("car-with-driver")),
      [],
    );
  });

  it("lists everything an empty page needs, in the order of the form", () => {
    assert.deepEqual(missingFields("landing", pageContentOf("landing", {})), [
      "Meta title",
      "Meta description",
      "Hero headline",
      "Hero subheadline",
      "Hero image",
      "Intro: at least 100 words (0 so far)",
      "FAQs: at least 3 (0 so far)",
      "Highlights: at least 3 (0 so far)",
    ]);
  });

  it("asks a product page for no highlights", () => {
    const missing = missingFields(
      "coach-charter",
      pageContentOf("coach-charter", {}),
    );
    assert.equal(
      missing.some((field) => field.startsWith("Highlight")),
      false,
    );
  });

  it("names what a row still needs", () => {
    const base = complete("landing");
    const content: PageContent = {
      ...base,
      heroImage: image(""),
      intro: words(62),
      faqs: [base.faqs[0]!, { question: "Q?", answer: "" }],
      highlights: [
        base.highlights[0]!,
        { name: "", text: "", image: null, addressId: null },
        { ...base.highlights[2]!, image: image("") },
      ],
    };
    assert.deepEqual(missingFields("landing", content), [
      "Hero image: the alt text",
      "Intro: at least 100 words (62 so far)",
      "FAQs: at least 3 (2 so far)",
      "FAQ 2: the answer",
      "Highlight 2: the name",
      "Highlight 2: the text",
      "Highlight 2: the image",
      "Highlight 3: the alt text of the image",
    ]);
  });

  it("does not ask a highlight for a saved address", () => {
    const content = complete("landing");
    assert.equal(
      content.highlights.every((highlight) => highlight.addressId === null),
      true,
    );
    assert.deepEqual(missingFields("landing", content), []);
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
