/**
 * Heavenly Travel — search box designs
 * Route: /design-cta
 * The booking search box is the main call to action on every landing design.
 * This page puts the three in use next to three that build on the first and
 * add attractions and hotels as products, each on a backdrop
 * like the hero it is meant for, so the box can be chosen apart from the page.
 */

import type { ComponentType } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";
import { Chips } from "../_components/Chips";
import { BookingCard } from "../_components/search/BookingCard";
import { BundleSearch } from "../_components/search/BundleSearch";
import { GuidedSearch } from "../_components/search/GuidedSearch";
import { RailSearch } from "../_components/search/RailSearch";
import { RidePanel } from "../_components/search/RidePanel";
import { ServiceTabsSearch } from "../_components/search/ServiceTabsSearch";
import { TabbedSearch } from "../_components/search/TabbedSearch";
import { fontVars } from "../_lib/fonts";

export const metadata: Metadata = {
  title: "Search box designs | Heavenly Travel",
  description:
    "Designs for the Heavenly Travel booking search box: the ones used on the landing designs and three that build on the first, with attractions and hotels added.",
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
    usedOn: { href: "/landing/1", label: "landing design 1" },
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
    usedOn: { href: "/landing/2", label: "landing design 2" },
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
    usedOn: { href: "/landing/3", label: "landing design 3" },
    summary:
      "A rounded panel beside the headline. Service chips, soft fields and a passenger stepper make it feel like an app screen.",
    traits: ["Service chips", "Passenger stepper", "App-like"],
    Component: RidePanel,
    backdrop: styles.mint,
    width: "max-w-[26rem]",
  },
  {
    id: "guided",
    name: "The bar with a guide",
    summary:
      "Design 1 as one joined bar, with a tray under it that follows the field you are on: popular places, quick dates, common times, a stepper for people. Tapping an answer moves to the next field, so a request can be made without typing.",
    traits: ["Four products", "One-tap answers", "Moves you to the next field"],
    Component: GuidedSearch,
    backdrop: styles.teal,
    width: "max-w-5xl",
  },
  {
    id: "rail",
    name: "Product rail on glass",
    summary:
      "Design 1 for a photo hero. The products move to a rail on the left so the bar stays one row, the fields ease in when the product changes, and a line underneath reads the request back in plain words, with the nights counted for a hotel.",
    traits: ["Four products", "Request read back", "Sits on a photo"],
    Component: RailSearch,
    backdrop: styles.photo,
    width: "max-w-5xl",
  },
  {
    id: "bundle",
    name: "Combine products in one request",
    summary:
      "Design 1 for a travel agent. The products are switches, not tabs, so a guest can ask for a car, a hotel and tickets together. Where, when and who are asked once, and each product switched on adds only its own fields, marked with its icon.",
    traits: ["Four products", "Mix and match", "One request, one reply"],
    Component: BundleSearch,
    backdrop: styles.mint,
    width: "max-w-5xl",
  },
  {
    id: "services",
    name: "Six services as tall tabs",
    usedOn: { href: "/", label: "home page" },
    summary:
      "The booking box on the home page. Six services sit on top as tall icon tabs, the fields join into one row that changes with the service, and the button is deep green. It adds car rental and custom packages to the product list.",
    traits: ["Six services", "Joined field row", "Deep green button"],
    Component: ServiceTabsSearch,
    backdrop: styles.mint,
    width: "max-w-6xl",
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
          in use on the landing designs. The next three build on the first one:
          the same horizontal bar, with attractions and hotels added, and fields
          that change with the product. The last is the one on the home page.
          All of them work: fill one in and the button opens WhatsApp with the
          request written out.
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
