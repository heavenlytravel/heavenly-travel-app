/**
 * The landing designs under /landing, all built by Claude Fable 5.1
 * (claude-fable-5-1). Each is inspired by the structure of a reference site
 * and applies it to Heavenly Travel's offer, using the Overpass display type,
 * the green-teal palette with amber accents, and the photography from
 * heavenlytravel.my. Inspired by the reference, never a copy of it.
 */

export type Landing = {
  slug: string;
  href: string;
  name: string;
  source: string;
  sourceHref: string;
  label: string;
  concept: string;
  borrowed: string[];
};

export const LANDINGS: Landing[] = [
  {
    slug: "agoda",
    href: "/landing/agoda",
    name: "Agoda",
    source: "agoda.com",
    sourceHref: "https://www.agoda.com/",
    label: "Deals and destinations",
    concept:
      "A dense, deal-led page: tabbed search on a teal hero, a promotions strip, discount-badged fleet deals with review scores, and a destinations grid with vehicle counts.",
    borrowed: [
      "Tabbed search box",
      "Discount badges and strike-through prices",
      "Review score chips and destination counts",
    ],
  },
  {
    slug: "blacklane",
    href: "/landing/blacklane",
    name: "Blacklane",
    source: "blacklane.com",
    sourceHref: "https://www.blacklane.com/",
    label: "Quiet chauffeur service",
    concept:
      "A calm, premium page: a full-height photo hero with a one-way or by-the-hour booking card, services as tall photo panels, vehicle classes with seats and bags, and the chauffeur standard spelled out in a dark band.",
    borrowed: [
      "One-way and by-the-hour booking card",
      "Vehicle classes instead of a vehicle list",
      "Dark, photo-led sections with lots of air",
    ],
  },
];
