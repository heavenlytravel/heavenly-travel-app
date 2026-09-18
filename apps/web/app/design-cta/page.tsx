/**
 * Heavenly Travel — search box designs
 * Route: /design-cta
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * The booking search box is the main call to action on every landing design.
 * This page puts the three in use next to three more ideas, each on a backdrop
 * like the hero it is meant for, so the box can be chosen apart from the page.
 */

import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { Chips } from "../_components/Chips";
import { BookingCard } from "../_components/search/BookingCard";
import { HeadcountSearch } from "../_components/search/HeadcountSearch";
import { RidePanel } from "../_components/search/RidePanel";
import { StepSearch } from "../_components/search/StepSearch";
import { TabbedSearch } from "../_components/search/TabbedSearch";
import { TicketSearch } from "../_components/search/TicketSearch";
import { fontVars } from "../_lib/fonts";

export const metadata: Metadata = {
  title: "Search box designs | Heavenly Travel",
  description:
    "Six designs for the Heavenly Travel booking search box: the three used on the landing designs and three more ideas.",
};

type Box = {
  id: string;
  name: string;
  /** The landing design that uses it; ideas are not on a page yet. */
  usedOn?: { href: string; label: string };
  summary: string;
  traits: string[];
  Component: ComponentType;
  backdrop: string | undefined;
  /** Width of the box on the stage. */
  width: string;
};

const BOXES: Box[] = [
  {
    id: "tabbed",
    name: "Product tabs and a field row",
    usedOn: { href: "/landing/agoda", label: "Agoda-inspired page" },
    summary:
      "The two products sit on top as tabs and every field is in one row with the button at the end. It reads at a glance and suits a wide hero.",
    traits: ["Two product tabs", "All fields visible", "Widest footprint"],
    Component: TabbedSearch,
    backdrop: styles.teal,
    width: "max-w-5xl",
  },
  {
    id: "card",
    name: "One way or by the hour",
    usedOn: { href: "/landing/blacklane", label: "Blacklane-inspired page" },
    summary:
      "A quiet square card with underlined fields. The tabs change the trip itself: a destination for a one-way ride, a duration when the driver stays with you.",
    traits: ["Trip type tabs", "Pick-up time", "Sits on a photo"],
    Component: BookingCard,
    backdrop: styles.photo,
    width: "max-w-[26rem]",
  },
  {
    id: "panel",
    name: "Friendly side panel",
    usedOn: { href: "/landing/grab-limo", label: "Grab Limo-inspired page" },
    summary:
      "A rounded panel beside the headline. Service chips, soft fields and a passenger stepper make it feel like an app screen.",
    traits: ["Service chips", "Passenger stepper", "App-like"],
    Component: RidePanel,
    backdrop: styles.mint,
    width: "max-w-[26rem]",
  },
  {
    id: "headcount",
    name: "Start from the headcount",
    summary:
      "The group size comes first and picks the product and the vehicle as it changes, with a starting price. Guests never need to know the fleet.",
    traits: ["Slider and stepper", "Live vehicle match", "Shows a price"],
    Component: HeadcountSearch,
    backdrop: styles.mint,
    width: "max-w-2xl",
  },
  {
    id: "steps",
    name: "One question at a time",
    summary:
      "A small dark card that asks one thing, keeps the answers as chips you can go back to, and ends on the send button. The smallest of the six, good on phones.",
    traits: ["Five short steps", "Answer chips", "Smallest footprint"],
    Component: StepSearch,
    backdrop: styles.paper,
    width: "max-w-[28rem]",
  },
  {
    id: "ticket",
    name: "The trip as a ticket",
    summary:
      "The route is the headline, set large like a boarding pass, with a button to swap it for the return leg. The tear-off stub holds the date, the group and the button.",
    traits: ["Route as headline", "Swap button", "Tear-off stub"],
    Component: TicketSearch,
    backdrop: styles.deep,
    width: "max-w-4xl",
  },
];

export default function DesignCta() {
  return (
    <div
      className={`${fontVars} min-h-screen bg-white font-sans text-neutral-900`}
    >
      <main className="mx-auto max-w-6xl px-5 pt-16 pb-24 sm:px-8">
        <div className="flex gap-4 text-sm text-neutral-500">
          <Link href="/" className="underline-offset-4 hover:underline">
            Home
          </Link>
          <Link href="/landing" className="underline-offset-4 hover:underline">
            Landing designs
          </Link>
        </div>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
          Search box designs
        </h1>
        <p className="mt-3 max-w-2xl text-neutral-600">
          The booking search box is the main call to action. The first three are
          in use on the landing designs. The last three are ideas for the box
          only. All six work: fill one in and the button opens WhatsApp with the
          trip written out.
        </p>

        <nav aria-label="Search boxes" className="mt-6">
          <ol className="flex flex-wrap gap-2 text-sm">
            {BOXES.map((b, i) => (
              <li key={b.id}>
                <a
                  href={`#${b.id}`}
                  className="inline-block rounded-full border border-neutral-200 px-3 py-1.5 hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-offset-2"
                >
                  {i + 1}. {b.name}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <ol className="mt-12 space-y-16">
          {BOXES.map((b, i) => (
            <li key={b.id} id={b.id} className="scroll-mt-8">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  <span className="mr-2 text-neutral-400">{i + 1}.</span>
                  {b.name}
                </h2>
                {b.usedOn ? (
                  <Link
                    href={b.usedOn.href}
                    className="text-sm font-medium underline-offset-4 hover:underline"
                  >
                    In use on the {b.usedOn.label}
                  </Link>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                    New idea
                  </span>
                )}
              </div>
              <p className="mt-2 mb-3 max-w-3xl text-neutral-700">
                {b.summary}
              </p>
              <Chips items={b.traits} />
              <div
                className={`${b.backdrop ?? ""} mt-5 rounded-2xl px-4 py-10 font-(family-name:--font-body) sm:px-8 sm:py-14`}
              >
                <div className={`mx-auto ${b.width}`}>
                  <b.Component />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </main>
    </div>
  );
}
