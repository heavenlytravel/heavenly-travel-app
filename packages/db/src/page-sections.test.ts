import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pageChecks,
  pageContentOf,
  pageImageUrls,
  checkPageLimits,
} from "./page-content";
import {
  SECTION_LIMITS,
  builtInSections,
  copySectionItems,
  emptySection,
  missingInSections,
  pageSectionsOf,
  sectionLimitError,
  sectionOfType,
  type ClientLogo,
  type PageSection,
} from "./page-sections";

const upload = (name: string) => ({
  url: `https://abc123.ufs.sh/f/${name}`,
  key: name,
  width: 400,
  height: 200,
  alt: "",
});

const logo = (name: string, image = upload(`${name}.png`)): ClientLogo => ({
  image,
  name,
  link: "",
});

describe("pageSectionsOf", () => {
  it("reads a page stored before sections as its built-in ones", () => {
    const home = pageSectionsOf("home", undefined);
    assert.deepEqual(home, builtInSections("home"));
    assert.deepEqual(
      home.filter((s) => s.on).map((s) => s.type),
      ["why-us", "services", "destinations"],
    );
    assert.deepEqual(
      pageSectionsOf("hub", null)
        .filter((s) => s.on)
        .map((s) => s.type),
      ["locations"],
    );
  });

  it("gives the built-in services the two hubs, as the home page showed", () => {
    const services = sectionOfType(builtInSections("home"), "services");
    assert.deepEqual(
      services?.cards.map((c) => c.link),
      [
        { kind: "page", page: "car-with-driver" },
        { kind: "page", page: "coach-charter" },
      ],
    );
  });

  it("keeps the stored order, each type once, and adds the missing ones off", () => {
    const sections = pageSectionsOf("hub", [
      { type: "news", on: true, title: "News", count: 2 },
      { type: "steps", on: true, title: "Steps", steps: [{ title: "Pick" }] },
      { type: "news", on: false, title: "Again" },
      { type: "services", on: true, title: "Not on a hub" },
      { type: "nonsense" },
    ]);
    assert.deepEqual(
      sections.map((s) => s.type),
      [
        "news",
        "steps",
        "why-us",
        "vehicles",
        "locations",
        "trusted-by",
        "testimonials",
      ],
    );
    assert.equal(sections[0]?.title, "News");
    assert.ok(sections.slice(2).every((s) => !s.on));
  });

  it("holds none on a kind without sections", () => {
    assert.deepEqual(pageSectionsOf("landing", [{ type: "news" }]), []);
    assert.deepEqual(pageContentOf("service", {}).sections, []);
  });

  it("reads damaged items as empty ones", () => {
    const [section] = pageSectionsOf("home", [
      {
        type: "services",
        on: true,
        title: " Our  Services ",
        cards: [{ title: 5, link: { kind: "url", url: "https://x.my" } }],
      },
      { type: "news", count: 99 },
    ]);
    assert.equal(section?.title, "Our Services");
    assert.equal(section?.type, "services");
    if (section?.type !== "services") return;
    assert.deepEqual(section.cards[0], {
      image: null,
      title: "",
      text: "",
      button: "",
      link: { kind: "post", slug: "" },
    });
    const news = sectionOfType(
      pageSectionsOf("home", [{ type: "news", count: 99 }]),
      "news",
    );
    assert.equal(news?.count, SECTION_LIMITS.maxNews);
  });
});

describe("missingInSections", () => {
  it("asks nothing of a section off or empty", () => {
    assert.deepEqual(missingInSections("home", builtInSections("home")), []);
    const off: PageSection = {
      ...emptySection("testimonials", "home"),
      quotes: [{ quote: "", name: "", detail: "", image: null }],
    };
    assert.deepEqual(missingInSections("home", [off]), []);
  });

  it("names what each item of a section on still needs", () => {
    const sections: PageSection[] = [
      {
        ...emptySection("trusted-by", "hub"),
        on: true,
        title: "",
        logos: [{ image: null, name: "", link: "x.my" }],
      },
      {
        ...emptySection("services", "home"),
        on: true,
        cards: [
          {
            image: upload("a.jpg"),
            title: "Airport Transfer",
            text: "",
            button: "",
            link: { kind: "location", slug: "" },
          },
        ],
      },
    ];
    assert.deepEqual(missingInSections("home", sections), [
      "Trusted By: a title",
      "Trusted By, logo 1: the image",
      "Trusted By, logo 1: the client's name",
      "Trusted By, logo 1: a web address starting with https://",
      "Our Services, card 1: where it leads",
      "Our Services, card 1: the alt text",
    ]);
  });

  it("asks a hub's Why Us for a title, not the home page's strip", () => {
    const points = ["Local", "Fair", "Kind"].map((title) => ({
      icon: "check" as const,
      title,
      text: "",
    }));
    const whyUs = (kind: "home" | "hub"): PageSection => ({
      ...emptySection("why-us", kind),
      on: true,
      title: "",
      points,
    });
    assert.deepEqual(missingInSections("home", [whyUs("home")]), []);
    assert.deepEqual(missingInSections("hub", [whyUs("hub")]), [
      "Why Us: a title",
    ]);
  });

  it("asks for at least 3 points or steps once there is one", () => {
    const sections: PageSection[] = [
      {
        ...emptySection("why-us", "home"),
        on: true,
        points: [{ icon: "check", title: "Local", text: "" }],
      },
      {
        ...emptySection("steps", "hub"),
        on: true,
        steps: [
          { title: "Ask", text: "" },
          { title: "Ride", text: "" },
        ],
      },
    ];
    assert.deepEqual(missingInSections("hub", sections), [
      "Why Us: a title",
      "Why Us: at least 3 points (1 so far)",
      "How It Works: at least 3 steps (2 so far)",
    ]);
  });

  it("blocks a publish through the page's checks", () => {
    const content = pageContentOf("hub", {
      sections: [{ type: "steps", on: true, title: "", steps: [{}] }],
    });
    const check = pageChecks("hub", content).find((c) => c.key === "sections");
    assert.deepEqual(check?.missing, [
      "How It Works: a title",
      "How It Works: at least 3 steps (1 so far)",
      "How It Works, step 1: the title",
    ]);
    assert.equal(
      pageChecks("service", pageContentOf("service", {})).some(
        (c) => c.key === "sections",
      ),
      false,
    );
  });
});

describe("sectionLimitError", () => {
  it("refuses a list over its limit, on or off", () => {
    const logos = Array.from({ length: SECTION_LIMITS.logos + 1 }, (_, i) =>
      logo(`client-${i}`),
    );
    const error = sectionLimitError([
      { ...emptySection("trusted-by", "home"), logos },
    ]);
    assert.equal(error, "Trusted By: logos: at most 16, not 17.");
    const content = pageContentOf("home", {
      sections: [{ type: "trusted-by", logos }],
    });
    assert.equal(checkPageLimits(content).ok, false);
  });

  it("refuses an over-long title", () => {
    assert.match(
      sectionLimitError([
        { ...emptySection("news", "home"), title: "x".repeat(81) },
      ]) ?? "",
      /Latest News: the title is at most 80 characters/,
    );
  });
});

describe("pageImageUrls", () => {
  it("counts every section's images, on or off, as used", () => {
    const content = pageContentOf("home", {
      sections: [
        { type: "trusted-by", on: false, logos: [logo("acme")] },
        {
          type: "testimonials",
          on: true,
          quotes: [{ quote: "Good", name: "Siti", image: upload("siti.jpg") }],
        },
      ],
    });
    assert.deepEqual(pageImageUrls(content), [
      "https://abc123.ufs.sh/f/acme.png",
      "https://abc123.ufs.sh/f/siti.jpg",
    ]);
  });
});

describe("copySectionItems", () => {
  it("adds the logos it lacks, by image, after its own", () => {
    const into = {
      ...emptySection("trusted-by", "hub"),
      logos: [logo("acme")],
    };
    const from = {
      ...emptySection("trusted-by", "home"),
      logos: [logo("acme"), logo("globex")],
    };
    const { section, added, skipped } = copySectionItems(into, from);
    assert.deepEqual(
      section.logos.map((l) => l.name),
      ["acme", "globex"],
    );
    assert.equal(added, 1);
    assert.equal(skipped, 1);
  });

  it("stops at the section's limit", () => {
    const into = {
      ...emptySection("testimonials", "hub"),
      quotes: [],
    };
    const from = {
      ...emptySection("testimonials", "home"),
      quotes: Array.from({ length: SECTION_LIMITS.quotes + 2 }, (_, i) => ({
        quote: `Good ${i}`,
        name: "Siti",
        detail: "",
        image: null,
      })),
    };
    const { section, added, skipped } = copySectionItems(into, from);
    assert.equal(section.quotes.length, SECTION_LIMITS.quotes);
    assert.equal(added, SECTION_LIMITS.quotes);
    assert.equal(skipped, 2);
  });

  it("copies nothing between sections of two types", () => {
    const into = { ...emptySection("trusted-by", "hub"), logos: [] };
    const from = {
      ...emptySection("testimonials", "home"),
      quotes: [{ quote: "Good", name: "Siti", detail: "", image: null }],
    };
    assert.equal(copySectionItems(into, from).added, 0);
  });
});
