/**
 * The four reimagined sites, all built by Claude Fable 5.1 (claude-fable-5-1).
 * Each takes the structure of a reference site and applies it to Heavenly
 * Travel's offer, using the Overpass display type, the green-teal palette
 * with amber accents, and the photography from heavenlytravel.my.
 */

export type Reimagined = {
  slug: string;
  /** Two-letter label for the bottom switcher. */
  short: string;
  href: string;
  name: string;
  source: string;
  sourceHref: string;
  label: string;
  concept: string;
  borrowed: string[];
};

export const REIMAGINED: Reimagined[] = [
  {
    slug: "heavenly",
    short: "HT",
    href: "/landing/fable/reimagined/heavenly",
    name: "heavenlytravel.my",
    source: "Current WordPress site",
    sourceHref: "https://heavenlytravel.my/",
    label: "Agency page, rebuilt",
    concept:
      "The current site's order of sections kept intact (hero, services, featured packages, clients, badges, testimonials) but given a booking control, real hierarchy and the brand photography at full size.",
    borrowed: [
      "Section order of the live site",
      "Registration badges as trust proof",
      "'Your Travel Engineer' tagline",
    ],
  },
  {
    slug: "airbnb",
    short: "Ab",
    href: "/landing/fable/reimagined/airbnb",
    name: "Airbnb",
    source: "airbnb.com",
    sourceHref: "https://www.airbnb.com/",
    label: "Marketplace of vehicles",
    concept:
      "A white marketplace page: a pill search bar, a row of category chips, and a grid of vehicle cards with photo, rating, and price per day, with a driver profile where Airbnb would show a host.",
    borrowed: [
      "Pill search with segmented fields",
      "Category chip rail",
      "Card grid with rating and nightly price",
    ],
  },
  {
    slug: "agoda",
    short: "Ag",
    href: "/landing/fable/reimagined/agoda",
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
    slug: "booking",
    short: "Bk",
    href: "/landing/fable/reimagined/booking",
    name: "Booking.com",
    source: "booking.com",
    sourceHref: "https://www.booking.com/",
    label: "Search, filter, results",
    concept:
      "A deep-teal header band with an amber-outlined search bar, a loyalty strip, 'browse by vehicle type' tiles and a results list with a filter rail and boxed review scores.",
    borrowed: [
      "Outlined horizontal search bar",
      "Boxed review score with verdict word",
      "Filter rail beside results",
    ],
  },
];
