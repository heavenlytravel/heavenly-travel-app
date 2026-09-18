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
];
