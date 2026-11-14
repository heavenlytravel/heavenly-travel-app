import type { HubPage } from "@repo/db";

/** What a hub shows before Marketing writes it: its words, and a photo of the brand's. */
export const HUB_DEFAULTS: Record<
  HubPage,
  { headline: string; subheadline: string; description: string; image: string }
> = {
  "car-with-driver": {
    headline: "Car with Driver",
    subheadline:
      "A private car and a local driver for airport transfers, day trips and hourly hire.",
    description:
      "Book a car with a driver across Malaysia: airport transfers, day trips and hourly hire with local drivers.",
    image: "/brand/chauffeur.jpg",
  },
  "coach-charter": {
    headline: "Coach Charter",
    subheadline:
      "Minibuses and coaches with a driver, for groups, events and tours.",
    description:
      "Charter a minibus or coach with a driver across Malaysia, for groups, events and tours.",
    image: "/brand/coach.jpg",
  },
};
