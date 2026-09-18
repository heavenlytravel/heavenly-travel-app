/**
 * The landing designs under /landing. The first three were built by Claude
 * Fable 5.1 (claude-fable-5-1), each inspired by the structure of a reference
 * site, never a copy of it, in Overpass with the green-teal and amber palette
 * and the photography from heavenlytravel.my. The last is a concept designed
 * by GPT Astra and converted to this codebase with its own look kept.
 */

export type Landing = {
  slug: string;
  href: string;
  name: string;
  source: string;
  /** The reference site, when there is one to visit. */
  sourceHref?: string;
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
    label: "Fleet and destinations",
    concept:
      "A dense page: a search box on a teal hero with the two main products as tabs, the reasons to book, the fleet with review scores, and a destinations grid with vehicle counts.",
    borrowed: [
      "Tabbed search box",
      "Dense cards with a price and a book button",
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
      "A calm, premium page: a full-height photo hero with a one-way or by-the-hour booking card, services as tall photo panels, the fleet under the two main products, and the chauffeur standard spelled out in a dark band.",
    borrowed: [
      "One-way and by-the-hour booking card",
      "A hero photo that always fills the screen",
      "Dark, photo-led sections with lots of air",
    ],
  },
  {
    slug: "grab-limo",
    href: "/landing/grab-limo",
    name: "Grab Limo",
    source: "limo.grab.com/sg/en",
    sourceHref: "https://limo.grab.com/sg/en",
    label: "Friendly pre-booked rides",
    concept:
      "A bright, approachable page: a split hero with the booking panel beside the headline, occasion tiles for who the ride is for, a fixed-price fleet picker, numbered how-it-works steps and an FAQ.",
    borrowed: [
      "Booking panel beside the headline",
      "Rides grouped by occasion",
      "Numbered steps and an FAQ accordion",
    ],
  },
  {
    slug: "astra",
    href: "/landing/astra",
    name: "GPT Astra",
    source: "Designed by GPT Astra as one HTML file, converted here",
    label: "Travel made simple",
    concept:
      "A pale photo hero with a handwritten accent, a booking card of six services pulled up over it, and four destinations that each open a page of their own with the place already filled in. Serif headlines, deep green and a gold accent.",
    borrowed: [
      "Six services as tall icon tabs",
      "A page for every destination",
      "DM Serif Display with a script accent",
    ],
  },
];
