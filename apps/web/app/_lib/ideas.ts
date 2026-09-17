/**
 * The /ideas set, all built by Claude Fable 5.1 (claude-fable-5-1). Where the
 * landing variations restyle a familiar platform layout, each idea replaces
 * the layout itself: the booking control is the page. They share the offer in
 * content.ts and the fares in routes.ts, and deliberately avoid Overpass, the
 * teal-and-amber palette and the structures of Agoda, Airbnb and Booking.com.
 *
 * Design summaries for the comparison tables live in designs.ts, keyed by href.
 */

import type { Run } from "./variations";

export type Idea = {
  option: number;
  href: string;
  name: string;
  /** What the visitor does first; the layout follows from it. */
  control: string;
  concept: string;
  /** What a typical booking platform would have had in its place. */
  replaces: string[];
  runs: Run[];
};

export const IDEAS: Idea[] = [
  {
    option: 1,
    href: "/ideas/1",
    name: "Say the trip",
    control: "Fill the blanks in one sentence",
    concept:
      "The page is a letter. The booking form is a single huge sentence with the blanks as inline fields, Heavenly Travel's reply writes itself underneath with a vehicle, a drive time and a fare, and the rest of the offer continues as correspondence with margin notes.",
    replaces: [
      "Search card becomes a sentence",
      "Feature cards become margin notes",
      "Testimonials become replies",
    ],
    runs: [
      { label: "Initial", tokens: 113750, toolCalls: 31, durationMs: 504510 },
    ],
  },
  {
    option: 2,
    href: "/ideas/2",
    name: "Headcount",
    control: "Set how many of you are travelling",
    concept:
      "The page asks one question. A giant passenger number drives a top-down seat plan that fills seat by seat and changes vehicle from sedan to 44-seat coach, then to a convoy; the fleet is a ruler from 1 to 44 rather than a grid of cards.",
    replaces: [
      "Search card becomes a number",
      "Fleet grid becomes a seat ruler",
      "Vehicle photos become seat plans",
    ],
    runs: [
      { label: "Initial", tokens: 172611, toolCalls: 60, durationMs: 872825 },
    ],
  },
  {
    option: 3,
    href: "/ideas/3",
    name: "The mileage chart",
    control: "Pick the cell where two places meet",
    concept:
      "The page is a road-atlas spread. The triangular distance chart from the back of an atlas is the booking control, switching between drive time, kilometres and fare; the fleet is the map key, services are a gazetteer index and photos are numbered plates.",
    replaces: [
      "From and To fields become a chart",
      "Fleet cards become a map key",
      "Service tiles become an index",
    ],
    runs: [
      { label: "Initial", tokens: 135147, toolCalls: 42, durationMs: 589530 },
    ],
  },
  {
    option: 4,
    href: "/ideas/4",
    name: "The day, by the hour",
    control: "Choose the day you want driven",
    concept:
      "The page is a day. Scrolling runs the clock from 06:00 to 22:00 down an hour rail while the sky behind it turns from dawn to night; you pick a day template and the run sheet fills in, with the company's story told at the hour it matters.",
    replaces: [
      "Search card becomes a day picker",
      "Sections become hours",
      "Hero photo becomes the sky",
    ],
    runs: [
      {
        label: "Initial",
        tokens: null,
        toolCalls: null,
        durationMs: null,
        notes:
          "The agent hit a session rate limit just after finishing the page, so it never reported its usage.",
      },
    ],
  },
];
