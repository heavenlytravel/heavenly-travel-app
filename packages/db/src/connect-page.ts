import type { PageContent } from "./page-content";

/**
 * The words Connect's landing page was built with, a site page of the
 * kind "connect" (./site-page-input): what a visitor signed out reads at
 * connect's `/` until Marketing publishes their own, and what the editor
 * opens with before the page is first saved. Every part is Marketing's to
 * change in the editor; the four steps of a job and the "Open now" board
 * are drawn by Connect from the product and the locations, not written.
 * The text, a Markdown of `##` parts, lays out as a card for each part.
 * See docs/261030-sign-in-connect-onboarding-and-media.md, "Connect".
 * Browser-safe.
 */
export const CONNECT_PAGE_COPY: PageContent = {
  metaTitle: "Connect: trips for transport vendors | Heavenly Travel",
  metaDescription:
    "Register your car-with-driver or coach company on Heavenly Travel Connect. See the pay on every offer, name your driver, and run each trip from a phone.",
  shareImage: null,
  tagline: "For car-with-driver and coach companies",
  heroHeadline: "Your fleet. Our travellers.",
  heroSubheadline:
    "We sell car-with-driver and coach charter trips. Connect hands them to vendors we trust: the pay is on the offer, and the trip runs from your driver's phone.",
  heroImage: null,
  intro: [
    "Heavenly Travel sells car-with-driver and coach charter trips to travellers and companies across Malaysia. We don't own the vehicles that carry them: our vendors do. Connect is where those trips reach you.",
    "Every offer shows the trip, the vehicle class and what we pay, before you say yes. Accept it, name the driver and the vehicle, and the trip runs from the driver's phone, step by step, with Operation seeing each step as it happens.",
    "A company with a fleet registers once with its SSM number, adds its office staff to answer offers, and gives each driver a sign-in of their own. One person with one good car registers with their IC, and is the vendor and its driver in one account.",
  ].join("\n\n"),
  body: [
    "## Have these at hand",
    "",
    "About five minutes, on a phone or a computer.",
    "",
    "- Your SSM number, or your IC if you register as one person",
    "- A WhatsApp number we can reach you on",
    "- The places you serve and the services you run",
    "- Later, once you're in: each vehicle's plate, road tax and insurance dates, and each driver's email",
    "",
    "## From us",
    "",
    "- The pay on every offer, before you say yes",
    "- Offers only for the classes and places you run",
    "- Operation on WhatsApp when a trip needs a person",
    "",
    "## From you",
    "",
    "- An answer before the offer's timer ends",
    "- Road tax, insurance and licence dates kept current",
    "- Every trip reported, step by step, by the driver",
  ].join("\n"),
  faqs: [
    {
      question: "I drive for a company already on Connect. Do I register?",
      answer:
        "No. Ask them to add your email as a driver, then sign in with it. Connect opens to your jobs.",
    },
    {
      question: "How long does the check take?",
      answer:
        "We check every registration by hand. Your status page shows where it stands, and we contact you on WhatsApp if we need anything else.",
    },
    {
      question: "Do I need a password?",
      answer:
        "Yes: you choose one when you register. You can also sign in with a code sent to your email whenever you like.",
    },
    {
      question: "Can I work in more than one location?",
      answer:
        "Yes. Tell us every place you serve when you register. Offers come only for the places and classes you run.",
    },
  ],
  addressId: null,
  indexable: true,
};
