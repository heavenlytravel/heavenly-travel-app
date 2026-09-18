/**
 * The four locations of the GPT Astra concept. Each has a card on the home
 * page and a page of its own under /landing/astra/[slug].
 */

export type AstraDestination = {
  slug: string;
  name: string;
  /** Short line on the home card. */
  tag: string;
  /** No photo: the airport card is drawn instead, with its code set large. */
  airportCode?: string;
  image: string;
  cardAlt: string;
  /** object-position of the photo on the card and on the page hero. */
  cardPosition: string;
  heroPosition: string;
  intro: string;
  eyebrow: string;
  heading: string;
  overview: string;
};

export const ASTRA_HOME = "/landing/astra";

export const ASTRA_DESTINATIONS: AstraDestination[] = [
  {
    slug: "klia",
    name: "KLIA",
    tag: "Airport gateway",
    airportCode: "KUL",
    image: "/astra/kuala-lumpur.webp",
    cardAlt: "",
    cardPosition: "center",
    heroPosition: "70% center",
    intro:
      "Land with a plan. Arrange airport transfers, private drivers, group coaches and the rest of your journey from one place.",
    eyebrow: "Malaysia’s main gateway",
    heading: "Airport arrivals made effortless.",
    overview:
      "From a simple airport pickup to a multi-day private journey, Heavenly keeps your arrival connected to the next part of your trip.",
  },
  {
    slug: "langkawi",
    name: "Langkawi",
    tag: "Island escape",
    image: "/astra/langkawi-bay.webp",
    cardAlt: "Langkawi tropical coastline",
    cardPosition: "78% 52%",
    heroPosition: "72% center",
    intro:
      "Explore beaches, viewpoints and island experiences with local transport and stays arranged around your plans.",
    eyebrow: "Island escape",
    heading: "Island journeys, all in one place.",
    overview:
      "Book the car, driver, stay or attraction that fits your Langkawi trip. Our local team helps keep every handover simple.",
  },
  {
    slug: "kuala-lumpur",
    name: "Kuala Lumpur",
    tag: "Capital city",
    image: "/astra/kuala-lumpur.webp",
    cardAlt: "Kuala Lumpur skyline",
    cardPosition: "70% 50%",
    heroPosition: "70% center",
    intro:
      "Move between the airport, city, meetings and attractions with dependable transport and travel support.",
    eyebrow: "Malaysia’s capital",
    heading: "Move through the capital with confidence.",
    overview:
      "Whether you are travelling for business, touring the city or planning a group movement, start with the service you need.",
  },
  {
    slug: "pulau-pinang",
    name: "Pulau Pinang",
    tag: "Culture & coast",
    image: "/astra/george-town.webp",
    cardAlt: "George Town heritage street in Pulau Pinang",
    cardPosition: "68% 50%",
    heroPosition: "64% center",
    intro:
      "Discover heritage streets, celebrated food and the island’s coast with a journey planned around your pace.",
    eyebrow: "Culture & coast",
    heading: "Discover Penang at your pace.",
    overview:
      "Combine transport, accommodation and local experiences in one clear plan, with support when your itinerary changes.",
  },
];
