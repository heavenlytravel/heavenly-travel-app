import { refuse, type Change } from "./change";
import { guardFor } from "./const-enum";
import { isValidEmail, normalizeEmail } from "./booking-contact";
import { CONTACT } from "./contact";
import { locationPagePath } from "./location-page-input";
import {
  PAGE_LIMITS,
  lineOf,
  pageImageOf,
  recordOf,
  samePageContent,
  type PageImage,
} from "./page-content";
import { isUploadUrl, uploadKeyOf } from "./images";
import { isValidPhone, normalizePhone } from "./phone";
import {
  SITE_PAGES_PATH,
  isWebsitePageKey,
  sitePagePath,
  type WebsitePageKey,
} from "./site-page-input";

/**
 * The footer every page of the customer site ends with, pure and
 * browser-safe: what it holds, the rules it is checked against, and where
 * its links go. SUPER writes it in the console as a site page is written,
 * a draft then a publish, and it is kept in a `SitePage` row of its own
 * (./site-footer). Until it is first published the site shows
 * `defaultFooterContent`. Contact us shows the company's details from it.
 * See docs/261026-site-footer.md.
 */

/** The `SitePage` row the footer is kept in. No site page takes the key. */
export const FOOTER_KEY = "footer";

export const FOOTER_LABEL = "Footer";

/** Where the footer is edited in the console, among the website's pages. */
export const FOOTER_EDITOR_PATH = `${SITE_PAGES_PATH}/${FOOTER_KEY}`;

/** What a link in the footer opens: one of the site's pages, a location's main page, or any address. */
export const FOOTER_LINK_KINDS = ["page", "location", "url"] as const;
export type FooterLinkKind = (typeof FOOTER_LINK_KINDS)[number];
export const isFooterLinkKind = guardFor(FOOTER_LINK_KINDS);

export const FOOTER_LINK_KIND_LABELS: Record<FooterLinkKind, string> = {
  page: "Site page",
  location: "Location",
  url: "Web address",
};

export type FooterLinkTarget =
  | { kind: "page"; page: WebsitePageKey }
  | { kind: "location"; slug: string }
  | { kind: "url"; url: string };

export type FooterLink = { label: string; target: FooterLinkTarget };

/** A column of links under its heading: "Destinations". */
export type FooterColumn = { heading: string; links: FooterLink[] };

export const SOCIAL_NETWORKS = [
  "facebook",
  "instagram",
  "x",
  "tiktok",
  "youtube",
  "linkedin",
] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export const isSocialNetwork = guardFor(SOCIAL_NETWORKS);

export const SOCIAL_NETWORK_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
};

export type FooterSocial = { network: SocialNetwork; url: string };

/**
 * A logo of the footer: one uploaded in the console, or one that ships
 * with the customer site under /brand, such as the payment marks the
 * default holds. A shipped one has no upload key, and Media never lists it.
 */
export type FooterImage = PageImage;

/** Where the customer site keeps the logos it ships: /brand/payments/visa.svg. */
const BUNDLED_IMAGE =
  /^\/brand\/[a-z0-9-]+(\/[a-z0-9-]+)*\.(svg|png|jpe?g|webp)$/;

/** Whether the address is a logo the customer site ships, under /brand. */
export function isBundledImageUrl(url: unknown): url is string {
  return typeof url === "string" && BUNDLED_IMAGE.test(url);
}

const isSize = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value > 0;

/** The logo, uploaded or shipped, or null for anything else. */
function footerImageOf(value: unknown): FooterImage | null {
  const uploaded = pageImageOf(value);
  if (uploaded) return uploaded;
  const { url, width, height, alt } = recordOf(value);
  if (!isBundledImageUrl(url) || !isSize(width) || !isSize(height)) {
    return null;
  }
  return { url, key: "", width, height, alt: lineOf(alt) };
}

/** A logo the customer site ships, by its file, name and size; a payment mark's is ten times its SVG's. */
const bundled = (
  url: string,
  alt: string,
  width = 38,
  height = 24,
): FooterImage => ({ url, key: "", width, height, alt });

/**
 * The payment marks the customer site ships, from HitPay's own set for
 * merchants, of the ways HitPay takes payment in Malaysia: the default
 * footer's, and those the editor offers to add back.
 */
export const BUNDLED_PAYMENT_LOGOS: readonly FooterImage[] = [
  bundled("/brand/payments/visa.svg", "Visa", 274, 92),
  bundled("/brand/payments/mastercard.svg", "Mastercard", 232, 152),
  bundled("/brand/payments/fpx.svg", "FPX online banking", 306, 110),
  bundled("/brand/payments/duitnow.svg", "DuitNow QR", 199, 182),
  bundled("/brand/payments/touch-n-go.svg", "Touch 'n Go eWallet", 184, 184),
  bundled("/brand/payments/grabpay.svg", "GrabPay", 320, 94),
  bundled("/brand/payments/shopeepay.svg", "ShopeePay", 392, 252),
  bundled("/brand/payments/boost.svg", "Boost", 312, 113),
];

/** A body the company is registered with: its mark, its name, and a line such as the member number. */
export type FooterBadge = {
  image: FooterImage | null;
  name: string;
  detail: string;
};

const crest = () => bundled("/brand/mof.jpg", "", 280, 230);

/**
 * The bodies the WordPress site says the company is registered with, their
 * marks shipped with the site: the default footer's, and those the editor
 * offers to fill in.
 */
export const BUNDLED_BADGES: readonly FooterBadge[] = [
  { image: crest(), name: "Ministry of Finance Malaysia", detail: "" },
  {
    image: crest(),
    name: "Ministry of Tourism, Arts & Culture Malaysia",
    detail: "",
  },
  {
    image: bundled("/brand/matta.jpg", "", 280, 230),
    name: "Malaysian Association of Tour and Travel Agents",
    detail: "",
  },
];

/** What the footer holds. The draft and the published copy both hold one. */
export type FooterContent = {
  /** The line under the logo. */
  tagline: string;
  /** "Destinations", "About Heavenly Travel". */
  columns: FooterColumn[];
  /** "Follow us on". */
  socialHeading: string;
  social: FooterSocial[];
  /** "Get in touch". */
  contactHeading: string;
  /** The number customers message, as shown: "+60 12-527 8808". */
  whatsapp: string;
  phone: string;
  email: string;
  /** The office, a line each. */
  address: string;
  /** "Registered with". */
  badgesHeading: string;
  badges: FooterBadge[];
  /** "Payment partners". */
  paymentHeading: string;
  /** The logos of the ways to pay, each named in its alt text. */
  paymentLogos: FooterImage[];
  /** The line under the logos: "Payments are processed securely by HitPay." Optional. */
  paymentNote: string;
  /** The copyright line's company: "Heavenly Travel Sdn Bhd". */
  legalName: string;
  /** The SSM number: "202301000086 (1494005-W)". Optional. */
  registration: string;
  /** The copyright line's first year; null for this year alone. */
  since: number | null;
  /** The links beside the copyright line: the terms, the privacy policy. */
  legalLinks: FooterLink[];
};

export const FOOTER_LIMITS = {
  /** Characters. */
  tagline: 240,
  heading: 40,
  linkLabel: 60,
  url: 500,
  phone: 30,
  email: 120,
  address: 300,
  badgeName: 60,
  badgeDetail: 80,
  imageAlt: PAGE_LIMITS.imageAlt,
  paymentNote: 160,
  legalName: 120,
  registration: 60,
  /** How many of each the footer holds. */
  columns: 3,
  links: 8,
  social: SOCIAL_NETWORKS.length,
  badges: 6,
  paymentLogos: 24,
  legalLinks: 6,
  /** The copyright line's first year, at the earliest. */
  firstYear: 1990,
} as const;

/** Lines, each trimmed, the blank ones left out. */
function linesOf(value: unknown) {
  return typeof value === "string"
    ? value
        .split(/\r?\n/)
        .map((line) => lineOf(line))
        .filter(Boolean)
        .join("\n")
    : "";
}

function listOf(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function targetOf(value: unknown): FooterLinkTarget {
  const raw = recordOf(value);
  if (raw.kind === "page" && isWebsitePageKey(raw.page)) {
    return { kind: "page", page: raw.page };
  }
  if (raw.kind === "location") {
    return { kind: "location", slug: lineOf(raw.slug) };
  }
  return { kind: "url", url: lineOf(raw.url) };
}

function linkOf(value: unknown): FooterLink {
  const raw = recordOf(value);
  return { label: lineOf(raw.label), target: targetOf(raw.target) };
}

function sinceOf(value: unknown) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= FOOTER_LIMITS.firstYear &&
    value <= 9999
    ? value
    : null;
}

/**
 * The footer a stored or submitted value holds, in its one shape: text
 * trimmed, anything unreadable left empty. It never fails, so a damaged
 * draft reads as an emptier footer; the limits and what is missing are
 * separate checks.
 */
export function footerContentOf(value: unknown): FooterContent {
  const raw = recordOf(value);
  return {
    tagline: lineOf(raw.tagline),
    columns: listOf(raw.columns).map((column) => {
      const { heading, links } = recordOf(column);
      return { heading: lineOf(heading), links: listOf(links).map(linkOf) };
    }),
    socialHeading: lineOf(raw.socialHeading),
    social: listOf(raw.social).flatMap((row) => {
      const { network, url } = recordOf(row);
      return isSocialNetwork(network) ? [{ network, url: lineOf(url) }] : [];
    }),
    contactHeading: lineOf(raw.contactHeading),
    whatsapp: lineOf(raw.whatsapp),
    phone: lineOf(raw.phone),
    email: lineOf(raw.email),
    address: linesOf(raw.address),
    badgesHeading: lineOf(raw.badgesHeading),
    badges: listOf(raw.badges).map((row) => {
      const { image, name, detail } = recordOf(row);
      return {
        image: footerImageOf(image),
        name: lineOf(name),
        detail: lineOf(detail),
      };
    }),
    paymentHeading: lineOf(raw.paymentHeading),
    paymentLogos: listOf(raw.paymentLogos).flatMap((row) => {
      const image = footerImageOf(row);
      return image ? [image] : [];
    }),
    paymentNote: lineOf(raw.paymentNote),
    legalName: lineOf(raw.legalName),
    registration: lineOf(raw.registration),
    since: sinceOf(raw.since),
    legalLinks: listOf(raw.legalLinks).map(linkOf),
  };
}

/** Whether two footers are the same, field for field. Both are `footerContentOf` values. */
export function sameFooterContent(a: FooterContent, b: FooterContent) {
  return samePageContent(a, b);
}

const pageLink = (page: WebsitePageKey, label: string): FooterLink => ({
  label,
  target: { kind: "page", page },
});

/**
 * The footer the site shows until one is published, and the draft its
 * editor opens with: today's company details and links, taken from the
 * WordPress site's footer on 2026-10-25 (to be confirmed, OP0-16), with the
 * home page's top choices as the destinations, the bodies the WordPress
 * site says the company is registered with, and the ways to pay through
 * HitPay, their marks shipped with the site.
 */
export function defaultFooterContent(
  destinations: readonly { slug: string; name: string }[],
): FooterContent {
  return {
    tagline:
      "Cars with drivers, coaches and whole trips across Malaysia, planned by a team based in Langkawi.",
    columns: [
      {
        heading: "Destinations",
        links: destinations.map(({ slug, name }) => ({
          label: name,
          target: { kind: "location", slug },
        })),
      },
      {
        heading: "About Heavenly Travel",
        links: [
          pageLink("about-us", "About us"),
          pageLink("contact-us", "Contact us"),
        ],
      },
    ],
    socialHeading: "Follow us on",
    social: [
      {
        network: "facebook",
        url: "https://www.facebook.com/profile.php?id=61573692009972",
      },
      {
        network: "instagram",
        url: "https://www.instagram.com/heavenlytravellangkawi/",
      },
      { network: "x", url: "https://twitter.com/HEHMalaysia" },
    ],
    contactHeading: "Get in touch",
    whatsapp: CONTACT.whatsappNumber,
    phone: "012-527 8808",
    email: "sales@heavenlytravel.my",
    address: [
      "No 10-3, Langkawi City",
      "Jalan Mahawangsa 1, Kuah",
      "07000 Langkawi, Kedah",
    ].join("\n"),
    badgesHeading: "Registered with",
    badges: [...BUNDLED_BADGES],
    paymentHeading: "Payment partners",
    paymentLogos: [...BUNDLED_PAYMENT_LOGOS],
    paymentNote: "Payments are processed securely by HitPay.",
    legalName: "Heavenly Travel Sdn Bhd",
    registration: "202301000086 (1494005-W)",
    since: 2024,
    legalLinks: [
      pageLink("terms", "Terms"),
      pageLink("privacy-policy", "Privacy"),
      pageLink("refund-policy", "Cancellation and refunds"),
    ],
  };
}

/** The office's lines, as the footer and Contact us print them. */
export function addressLinesOf(content: FooterContent) {
  return content.address === "" ? [] : content.address.split("\n");
}

/** The digits of a Malaysian number with its country code: "012-527 8808" and "+60 12-527 8808" are both 60125278808. */
function internationalDigitsOf(number: string) {
  const normal = normalizePhone(number);
  const digits = normal.replace(/\D/g, "");
  if (normal.startsWith("+")) return digits;
  return digits.startsWith("0") ? `60${digits.slice(1)}` : digits;
}

/** The link that dials the number; null when it is not one. */
export function phoneHrefOf(number: string) {
  return isValidPhone(normalizePhone(number))
    ? `tel:+${internationalDigitsOf(number)}`
    : null;
}

/** The link that opens a chat with the number on WhatsApp; null when it is not one. */
export function whatsappHrefOf(number: string) {
  return isValidPhone(normalizePhone(number))
    ? `https://wa.me/${internationalDigitsOf(number)}`
    : null;
}

/** Whether the text is an address a browser opens: http or https. */
function isWebUrl(text: string) {
  if (!URL.canParse(text)) return false;
  const { protocol } = new URL(text);
  return protocol === "https:" || protocol === "http:";
}

/**
 * Whether a footer link's address is one it may hold: a web address, a
 * path on the site ("/booking"), or an email or phone link.
 */
export function isFooterUrl(text: string) {
  // A path on the site; never "//host" or "/\host", which browsers open as another site.
  if (/^\/(?![/\\])[^\s\\]*$/.test(text)) return true;
  if (/^(mailto|tel):\S+$/.test(text)) return true;
  return isWebUrl(text);
}

/** Where a link goes on the site, or the address it holds. */
export function footerLinkHref(target: FooterLinkTarget) {
  switch (target.kind) {
    case "page":
      return sitePagePath(target.page);
    case "location":
      return locationPagePath(target.slug);
    case "url":
      return target.url;
  }
}

/** Whether a link leaves the site, and so opens in a new tab. */
export function isExternalFooterLink(target: FooterLinkTarget) {
  return target.kind === "url" && isWebUrl(target.url);
}

/** Every link in the footer: its columns' and the copyright line's. */
export function footerLinksOf(content: FooterContent): FooterLink[] {
  return [
    ...content.columns.flatMap((column) => column.links),
    ...content.legalLinks,
  ];
}

/**
 * The footer as the public is shown it: each link to a site page that is
 * not published or a location that is not public left out, so none leads
 * to a 404, then each column with nothing left in it.
 */
export function visibleFooterOf(
  content: FooterContent,
  shown: {
    pages: ReadonlySet<WebsitePageKey>;
    locations: ReadonlySet<string>;
  },
): FooterContent {
  const isShown = ({ target }: FooterLink) =>
    target.kind === "page"
      ? shown.pages.has(target.page)
      : target.kind === "location"
        ? shown.locations.has(target.slug)
        : true;
  return {
    ...content,
    columns: content.columns
      .map((column) => ({ ...column, links: column.links.filter(isShown) }))
      .filter((column) => column.links.length > 0),
    legalLinks: content.legalLinks.filter(isShown),
  };
}

/** The length and count limits, which a draft is checked against every time it is saved. */
export function checkFooterLimits(content: FooterContent): Change {
  const L = FOOTER_LIMITS;
  const over = (text: string, limit: number) => text.length > limit;
  const links = footerLinksOf(content);
  if (content.columns.length > L.columns) {
    return refuse(`The footer holds at most ${L.columns} columns of links.`);
  }
  if (content.columns.some((column) => column.links.length > L.links)) {
    return refuse(`A column holds at most ${L.links} links.`);
  }
  if (content.legalLinks.length > L.legalLinks) {
    return refuse(`The copyright line holds at most ${L.legalLinks} links.`);
  }
  if (content.social.length > L.social) {
    return refuse(`The footer holds at most ${L.social} social links.`);
  }
  if (content.badges.length > L.badges) {
    return refuse(`The footer holds at most ${L.badges} registrations.`);
  }
  if (content.paymentLogos.length > L.paymentLogos) {
    return refuse(`The footer holds at most ${L.paymentLogos} payment logos.`);
  }
  const headings = [
    ...content.columns.map((column) => column.heading),
    content.socialHeading,
    content.contactHeading,
    content.badgesHeading,
    content.paymentHeading,
  ];
  if (headings.some((heading) => over(heading, L.heading))) {
    return refuse(`A heading is at most ${L.heading} characters.`);
  }
  if (links.some((link) => over(link.label, L.linkLabel))) {
    return refuse(`A link's text is at most ${L.linkLabel} characters.`);
  }
  const urls = [
    ...links.flatMap(({ target }) =>
      target.kind === "url" ? [target.url] : [],
    ),
    ...content.social.map((row) => row.url),
  ];
  if (urls.some((url) => over(url, L.url))) {
    return refuse(`An address is at most ${L.url} characters.`);
  }
  const images = [
    ...content.paymentLogos,
    ...content.badges.flatMap((badge) => (badge.image ? [badge.image] : [])),
  ];
  if (images.some((image) => over(image.alt, L.imageAlt))) {
    return refuse(`A logo's name is at most ${L.imageAlt} characters.`);
  }
  const fields: [string, string, number][] = [
    ["The tagline", content.tagline, L.tagline],
    ["The WhatsApp number", content.whatsapp, L.phone],
    ["The phone number", content.phone, L.phone],
    ["The email", content.email, L.email],
    ["The address", content.address, L.address],
    ["The line under the payment logos", content.paymentNote, L.paymentNote],
    ["The company's name", content.legalName, L.legalName],
    ["The registration", content.registration, L.registration],
    ...content.badges.flatMap((badge): [string, string, number][] => [
      ["A registration's name", badge.name, L.badgeName],
      ["A registration's line", badge.detail, L.badgeDetail],
    ]),
  ];
  const long = fields.find(([, text, limit]) => over(text, limit));
  return long
    ? refuse(`${long[0]} is at most ${long[2]} characters.`)
    : { ok: true };
}

/**
 * What the footer still needs before it is published, a sentence each, in
 * the order the editor shows its parts; empty when it is ready. A part
 * left empty is left out of the footer, so only what is started must be
 * finished.
 */
export function footerProblems(content: FooterContent): string[] {
  const problems: string[] = [];
  const checkLinks = (links: readonly FooterLink[], where: string) => {
    if (links.some((link) => link.label === "")) {
      problems.push(`A link in ${where} has no text.`);
    }
    for (const { target } of links) {
      if (target.kind === "location" && target.slug === "") {
        problems.push(`A link in ${where} names no location.`);
      }
      if (target.kind === "url" && !isFooterUrl(target.url)) {
        problems.push(
          target.url === ""
            ? `A link in ${where} has no address.`
            : `"${target.url}" in ${where} is not a web address.`,
        );
      }
    }
  };

  content.columns.forEach((column, index) => {
    const where = column.heading
      ? `"${column.heading}"`
      : `column ${index + 1}`;
    if (column.heading === "") {
      problems.push(`Column ${index + 1} has no heading.`);
    }
    if (column.links.length === 0) problems.push(`${where} has no links.`);
    checkLinks(column.links, where);
  });
  if (content.social.length > 0 && content.socialHeading === "") {
    problems.push("The social links have no heading.");
  }
  for (const { network, url } of content.social) {
    if (!isWebUrl(url)) {
      problems.push(
        `The ${SOCIAL_NETWORK_LABELS[network]} link is not a web address.`,
      );
    }
  }
  if (content.whatsapp && !whatsappHrefOf(content.whatsapp)) {
    problems.push("The WhatsApp number is not a phone number.");
  }
  if (content.phone && !phoneHrefOf(content.phone)) {
    problems.push("The phone number is not a phone number.");
  }
  if (content.email && !isValidEmail(normalizeEmail(content.email))) {
    problems.push("The email is not an email address.");
  }
  const hasContact =
    content.whatsapp || content.phone || content.email || content.address;
  if (hasContact && content.contactHeading === "") {
    problems.push("The contact details have no heading.");
  }
  if (content.badges.length > 0 && content.badgesHeading === "") {
    problems.push("The registrations have no heading.");
  }
  content.badges.forEach((badge, index) => {
    const where = badge.name ? `"${badge.name}"` : `Registration ${index + 1}`;
    if (badge.name === "")
      problems.push(`Registration ${index + 1} has no name.`);
    if (!badge.image) problems.push(`${where} has no logo.`);
  });
  if (content.paymentLogos.length > 0 && content.paymentHeading === "") {
    problems.push("The payment logos have no heading.");
  }
  if (content.paymentLogos.some((logo) => logo.alt === "")) {
    problems.push("A payment logo has no name.");
  }
  if (content.legalName === "") {
    problems.push("The copyright line has no company name.");
  }
  checkLinks(content.legalLinks, "the copyright line");
  return problems;
}

/** Whether the footer can be published: within the limits with nothing missing. */
export function checkFooterComplete(content: FooterContent): Change {
  const limits = checkFooterLimits(content);
  if (!limits.ok) return limits;
  const [first, ...more] = footerProblems(content);
  if (!first) return { ok: true };
  return refuse(
    more.length > 0
      ? `${first} And ${more.length} more to fix before publishing.`
      : first,
  );
}

/** The parts of the footer, in the editor's order, by the name the editor gives them. */
const FOOTER_PARTS: [(content: FooterContent) => unknown, string][] = [
  [(c) => c.tagline, "Tagline"],
  [(c) => c.columns, "Link columns"],
  [(c) => [c.socialHeading, c.social], "Social links"],
  [
    (c) => [c.contactHeading, c.whatsapp, c.phone, c.email, c.address],
    "Contact details",
  ],
  [(c) => [c.badgesHeading, c.badges], "Registrations"],
  [(c) => [c.paymentHeading, c.paymentLogos, c.paymentNote], "Payment logos"],
  [
    (c) => [c.legalName, c.registration, c.since, c.legalLinks],
    "Copyright line",
  ],
];

/** The parts in which two footers differ, by name: what a publish would change. */
export function changedFooterParts(a: FooterContent, b: FooterContent) {
  return FOOTER_PARTS.filter(
    ([part]) => JSON.stringify(part(a)) !== JSON.stringify(part(b)),
  ).map(([, label]) => label);
}

/**
 * The files of the images in the footer: the registrations' marks and the
 * payment logos. What the Media screen counts as used, and what a save
 * checks was not deleted meanwhile.
 */
export function footerImageUrls(content: FooterContent): string[] {
  return [
    ...content.badges.flatMap((badge) =>
      badge.image ? [badge.image.url] : [],
    ),
    ...content.paymentLogos.map((logo) => logo.url),
  ].filter(isUploadUrl);
}

/** The UploadThing keys of the images in the footer. */
export function footerImageKeys(content: FooterContent): string[] {
  return [
    ...new Set(
      footerImageUrls(content).flatMap((url) => {
        const key = uploadKeyOf(url);
        return key ? [key] : [];
      }),
    ),
  ];
}

/** The copyright line: "© 2024–2026 Heavenly Travel Sdn Bhd". */
export function copyrightOf(content: FooterContent, year: number) {
  const years =
    content.since !== null && content.since < year
      ? `${content.since}–${year}`
      : String(year);
  return `© ${years} ${content.legalName}`;
}
