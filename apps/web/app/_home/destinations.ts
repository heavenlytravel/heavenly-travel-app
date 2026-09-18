/**
 * The locations on the home page. Choosing one fills it into the booking card.
 * Photos are the brand's own, from /public/brand, and all of them were taken
 * in Langkawi, so `alt` says what is in the picture, not where the card points.
 */

export type HomeDestination = {
  name: string;
  /** Short line above the name. */
  tag: string;
  /** No photo: the airport card is drawn instead, with its code set large. */
  airportCode?: string;
  image?: string;
  alt?: string;
  /** object-position of the photo on the card. */
  position?: string;
};

export const HOME_DESTINATIONS: HomeDestination[] = [
  { name: "KLIA", tag: "Airport gateway", airportCode: "KUL" },
  {
    name: "Langkawi",
    tag: "Island escape",
    image: "/brand/cable-car.jpg",
    alt: "The Langkawi cable car in mist",
    position: "center",
  },
  {
    name: "Kuala Lumpur",
    tag: "Capital city",
    image: "/brand/chauffeur.jpg",
    alt: "The leather cabin of a chauffeur-driven MPV",
    position: "center",
  },
  {
    name: "Pulau Pinang",
    tag: "Culture & coast",
    image: "/brand/attractions.jpg",
    alt: "A sky bridge above the rainforest",
    position: "center",
  },
];
