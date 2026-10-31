import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FOOTER_LIMITS,
  changedFooterParts,
  checkFooterComplete,
  checkFooterLimits,
  CONNECT_FOOTER_KEY,
  FOOTER_KEY,
  footerAppOf,
  footerEditorPath,
  copyrightOf,
  defaultFooterContent,
  footerContentOf,
  footerImageKeys,
  footerLinkHref,
  footerProblems,
  isExternalFooterLink,
  isFooterUrl,
  phoneHrefOf,
  sameFooterContent,
  visibleFooterOf,
  whatsappHrefOf,
  type FooterContent,
} from "./footer-content";

const DESTINATIONS = [
  { slug: "langkawi", name: "Langkawi" },
  { slug: "penang", name: "Penang" },
];

const logo = (key: string, alt: string) => ({
  url: `https://abc123.ufs.sh/f/${key}`,
  key,
  width: 200,
  height: 80,
  alt,
});

describe("defaultFooterContent", () => {
  it("is ready to publish, with the top choices as its destinations", () => {
    const content = defaultFooterContent(DESTINATIONS);
    assert.deepEqual(footerProblems(content), []);
    assert.deepEqual(checkFooterComplete(content), { ok: true });
    assert.deepEqual(
      content.columns[0]?.links.map((link) => link.target),
      [
        { kind: "location", slug: "langkawi" },
        { kind: "location", slug: "penang" },
      ],
    );
  });

  it("reads back as itself", () => {
    const content = defaultFooterContent(DESTINATIONS);
    assert.ok(sameFooterContent(footerContentOf(content), content));
  });
});

describe("footerContentOf", () => {
  it("reads anything as an empty footer", () => {
    for (const value of [null, undefined, 3, "text", []]) {
      const content = footerContentOf(value);
      assert.equal(content.tagline, "");
      assert.deepEqual(content.columns, []);
      assert.equal(content.since, null);
    }
  });

  it("trims text, drops blank address lines and unknown networks", () => {
    const content = footerContentOf({
      tagline: "  Cars   with drivers ",
      address: " No 10-3 \n\n  Kuah  \r\n",
      social: [
        { network: "facebook", url: " https://facebook.com/x " },
        { network: "myspace", url: "https://myspace.com/x" },
      ],
    });
    assert.equal(content.tagline, "Cars with drivers");
    assert.equal(content.address, "No 10-3\nKuah");
    assert.deepEqual(content.social, [
      { network: "facebook", url: "https://facebook.com/x" },
    ]);
  });

  it("reads a link to an unknown page as an empty address", () => {
    const content = footerContentOf({
      legalLinks: [{ label: "Old", target: { kind: "page", page: "faq" } }],
    });
    assert.deepEqual(content.legalLinks[0]?.target, { kind: "url", url: "" });
  });

  it("keeps only uploaded images, and a sensible first year", () => {
    const content = footerContentOf({
      paymentLogos: [logo("fpx", "FPX"), { url: "https://evil.example/x" }],
      since: 1200,
    });
    assert.equal(content.paymentLogos.length, 1);
    assert.equal(content.since, null);
  });
});

describe("shipped logos", () => {
  it("are read from /brand alone", () => {
    const shipped = (url: string) => ({ url, width: 38, height: 24, alt: "A" });
    const content = footerContentOf({
      paymentLogos: [
        shipped("/brand/payments/visa.svg"),
        shipped("/brand/../secret.svg"),
        shipped("/uploads/visa.svg"),
        shipped("https://evil.example/brand/visa.svg"),
      ],
    });
    assert.deepEqual(
      content.paymentLogos.map((logo) => logo.url),
      ["/brand/payments/visa.svg"],
    );
    assert.equal(content.paymentLogos[0]?.key, "");
  });

  it("start the default footer, and are no file of Media's", () => {
    const content = defaultFooterContent(DESTINATIONS);
    assert.equal(content.paymentLogos.length, 8);
    assert.equal(content.badges.length, 3);
    assert.deepEqual(footerImageKeys(content), []);
  });
});

describe("visibleFooterOf", () => {
  it("leaves out links the public cannot open, then empty columns", () => {
    const content = defaultFooterContent(DESTINATIONS);
    const shown = visibleFooterOf(content, {
      pages: new Set(["terms"]),
      locations: new Set(["langkawi"]),
    });
    assert.deepEqual(
      shown.columns.map((column) => column.links.map((link) => link.label)),
      [["Langkawi"]],
    );
    assert.deepEqual(
      shown.legalLinks.map((link) => link.label),
      ["Terms"],
    );
  });
});

describe("footerProblems", () => {
  it("asks only that what is started be finished", () => {
    const content: FooterContent = {
      ...footerContentOf(null),
      legalName: "Heavenly Travel Sdn Bhd",
    };
    assert.deepEqual(footerProblems(content), []);
  });

  it("names each part that is not finished", () => {
    const content: FooterContent = {
      ...footerContentOf(null),
      columns: [
        {
          heading: "",
          links: [{ label: "", target: { kind: "url", url: "nope" } }],
        },
      ],
      social: [{ network: "instagram", url: "instagram" }],
      phone: "123",
      email: "sales",
      badges: [
        { image: null, name: "MATTA", detail: "", link: "matta.org.my" },
      ],
      paymentLogos: [logo("visa", "")],
    };
    assert.deepEqual(footerProblems(content), [
      "Column 1 has no heading.",
      "A link in column 1 has no text.",
      '"nope" in column 1 is not a web address.',
      "The social links have no heading.",
      "The Instagram link is not a web address.",
      "The phone number is not a phone number.",
      "The email is not an email address.",
      "The contact details have no heading.",
      "The registrations have no heading.",
      '"MATTA" has no logo.',
      `"MATTA"'s certificate link is not a web address.`,
      "The payment logos have no heading.",
      "A payment logo has no name.",
      "The copyright line has no company name.",
    ]);
    const check = checkFooterComplete(content);
    assert.equal(check.ok, false);
    assert.match(
      check.ok ? "" : check.error,
      /^Column 1 has no heading\. And 13 more/,
    );
  });
});

describe("checkFooterLimits", () => {
  it("refuses more columns than the footer holds", () => {
    const column = { heading: "A", links: [] };
    const content: FooterContent = {
      ...footerContentOf(null),
      columns: Array.from({ length: FOOTER_LIMITS.columns + 1 }, () => column),
    };
    assert.equal(checkFooterLimits(content).ok, false);
  });

  it("refuses a tagline over its limit", () => {
    const content: FooterContent = {
      ...footerContentOf(null),
      tagline: "x".repeat(FOOTER_LIMITS.tagline + 1),
    };
    assert.deepEqual(checkFooterLimits(content), {
      ok: false,
      error: `The tagline is at most ${FOOTER_LIMITS.tagline} characters.`,
    });
  });
});

describe("links and numbers", () => {
  it("send each kind of link to its address", () => {
    assert.equal(
      footerLinkHref({ kind: "page", page: "about-us" }),
      "/about-us",
    );
    assert.equal(
      footerLinkHref({ kind: "location", slug: "langkawi" }),
      "/langkawi",
    );
    assert.equal(
      footerLinkHref({ kind: "url", url: "https://hitpayapp.com" }),
      "https://hitpayapp.com",
    );
    assert.ok(isExternalFooterLink({ kind: "url", url: "https://x.my" }));
    assert.ok(!isExternalFooterLink({ kind: "url", url: "/booking" }));
  });

  it("take web addresses, site paths, email and phone links", () => {
    assert.ok(isFooterUrl("https://hitpayapp.com"));
    assert.ok(isFooterUrl("/booking"));
    assert.ok(isFooterUrl("mailto:sales@heavenlytravel.my"));
    assert.ok(!isFooterUrl("//evil.example"));
    assert.ok(!isFooterUrl(String.raw`/\evil.example`));
    assert.ok(!isFooterUrl("/booking now"));
    assert.ok(!isFooterUrl("javascript:alert(1)"));
    assert.ok(!isFooterUrl("hitpayapp.com"));
  });

  it("dial and message Malaysian numbers with their country code", () => {
    assert.equal(phoneHrefOf("012-527 8808"), "tel:+60125278808");
    assert.equal(phoneHrefOf("+60 12-527 8808"), "tel:+60125278808");
    assert.equal(whatsappHrefOf("012-527 8808"), "https://wa.me/60125278808");
    assert.equal(phoneHrefOf("123"), null);
  });
});

describe("footer parts", () => {
  it("names what a publish changes", () => {
    const a = defaultFooterContent(DESTINATIONS);
    const b = { ...a, tagline: "New", paymentLogos: [logo("fpx", "FPX")] };
    assert.deepEqual(changedFooterParts(a, b), ["Tagline", "Payment logos"]);
  });

  it("finds the uploaded images, once each", () => {
    const content: FooterContent = {
      ...footerContentOf(null),
      badges: [
        { image: logo("matta", "MATTA"), name: "MATTA", detail: "", link: "" },
      ],
      paymentLogos: [logo("fpx", "FPX"), logo("fpx", "FPX")],
    };
    assert.deepEqual(footerImageKeys(content), ["matta", "fpx"]);
  });

  it("prints the copyright years", () => {
    const content = defaultFooterContent([]);
    assert.equal(
      copyrightOf(content, 2026),
      "© 2024–2026 Heavenly Travel Sdn Bhd",
    );
    assert.equal(
      copyrightOf({ ...content, since: null }, 2026),
      "© 2026 Heavenly Travel Sdn Bhd",
    );
  });
});

describe("Connect's footer", () => {
  it("keeps its own parts while it shows the website's", () => {
    const content = footerContentOf({
      ...defaultFooterContent(DESTINATIONS),
      tagline: "Ours",
      sameAsWebsite: true,
    });
    assert.equal(content.sameAsWebsite, true);
    assert.equal(content.tagline, "Ours");
    assert.equal(footerContentOf({}).sameAsWebsite, false);
  });

  it("publishes while it shows the website's, whatever its own parts lack", () => {
    const empty = footerContentOf({});
    assert.equal(checkFooterComplete(empty).ok, false);
    assert.equal(
      checkFooterComplete({ ...empty, sameAsWebsite: true }).ok,
      true,
    );
    assert.deepEqual(
      changedFooterParts(empty, { ...empty, sameAsWebsite: true }),
      ["Same as Website"],
    );
  });

  it("is edited among Connect's pages", () => {
    assert.equal(footerAppOf(CONNECT_FOOTER_KEY), "connect");
    assert.equal(footerAppOf(FOOTER_KEY), "website");
    assert.equal(footerEditorPath(FOOTER_KEY), "/~/pages/website/footer");
    assert.equal(
      footerEditorPath(CONNECT_FOOTER_KEY),
      "/~/pages/connect/footer",
    );
  });
});
