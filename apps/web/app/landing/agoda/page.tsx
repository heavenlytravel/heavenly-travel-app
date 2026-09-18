/**
 * Heavenly Travel — landing design
 * Route: /landing/agoda
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Reference: https://www.agoda.com/
 * Direction: Agoda's dense, deal-led page. A tabbed search box on a teal hero,
 * a promotions strip, a rail of fleet deals with discount badges,
 * strike-through prices and review-score chips, a destinations grid with
 * vehicle counts, and a reasons row. Teal for structure, amber for offers.
 * Generated: 2026-09-17
 */

import type { Metadata } from "next";
import styles from "./page.module.css";
import { fontVars } from "../_lib/fonts";
import {
  BADGES,
  DESTINATIONS,
  FLEET,
  PHONE,
  REVIEWS,
  WHATSAPP_HREF,
  ringgit,
} from "../../_lib/content";
import { WhatsAppIcon } from "../../_components/WhatsAppIcon";
import { PersonIcon, Wordmark, Photo } from "../_components/Brand";
import { TabbedSearch } from "./_components/TabbedSearch";

export const metadata: Metadata = {
  title: "Heavenly Travel | Deals on cars with driver and coach charter",
  description:
    "Compare cars with driver, MPVs, vans and coaches across Malaysia with review scores and today's deals. Quotes on WhatsApp in minutes.",
};

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";

const promos = [
  {
    tag: "Early bird",
    title: "Book 14 days ahead, save 10%",
    text: "On any car with driver or coach, any route.",
  },
  {
    tag: "Round trip",
    title: "Return leg at 15% off",
    text: "Same vehicle, same driver, both ways.",
  },
  {
    tag: "Groups",
    title: "Second coach from RM 1,150",
    text: "For schools and companies moving more than 44 people.",
  },
];

const discounts: Record<string, number> = {
  sedan: 12,
  mpv: 18,
  van: 10,
  minibus: 15,
  coach: 20,
};

const vehicleCounts: Record<string, number> = {
  Langkawi: 14,
  "Kuala Lumpur": 22,
  Penang: 9,
  "Cameron Highlands": 6,
  Melaka: 7,
  "Johor Bahru": 8,
};

const reasons = [
  {
    title: "Best price for the whole trip",
    text: "One number covers tolls, fuel, parking and the driver's meals. No surprises at drop-off.",
  },
  {
    title: "Free changes until the day before",
    text: "Move the pick-up time or add a stop over the same WhatsApp thread.",
  },
  {
    title: "Verified reviews",
    text: "Scores come from customers who finished a trip with us, nothing else.",
  },
  {
    title: "Licensed and insured",
    text: "Commercial permits and passenger insurance on every vehicle. Paperwork on request.",
  },
];

function verdict(score: number) {
  if (score >= 9.5) return "Exceptional";
  if (score >= 9) return "Excellent";
  return "Very good";
}

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen font-(family-name:--font-body) antialiased`}
    >
      <a
        href="#deals"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[#0c3b3a] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to deals
      </a>

      <header className="bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <a href="#top" className={`rounded-sm ${focus}`}>
            <Wordmark />
          </a>
          <nav
            aria-label="Primary"
            className="hidden items-center gap-1 md:flex"
          >
            {["Cars with driver", "Coaches", "Transfers", "Tours", "Deals"].map(
              (l, i) => (
                <a
                  key={l}
                  href={i === 4 ? "#deals" : "#top"}
                  className={`rounded-full px-3 py-2 text-sm font-medium hover:bg-[#f1f5f4] ${focus}`}
                >
                  {l}
                </a>
              ),
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-[#3f5653] sm:inline">
              MYR · English
            </span>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-md border border-[#157a74] px-3 py-2 font-semibold text-[#157a74] hover:bg-[#e8f2ef] ${focus}`}
            >
              <WhatsAppIcon className="h-4 w-4" />
              Help
            </a>
          </div>
        </div>
      </header>

      {/* Hero with tabbed search */}
      <section id="top" className={`${styles.hero} text-white`}>
        <div className="mx-auto max-w-7xl px-5 pt-12 pb-14 sm:px-8 sm:pt-16">
          <h1 className="font-(family-name:--font-display) text-3xl font-black tracking-tight sm:text-5xl">
            See Malaysia with a driver who knows it.
          </h1>
          <p className="mt-2 text-white/85">
            Cars, MPVs, vans and coaches. Compare, pick, and book with one
            message.
          </p>
          <div className="mt-8">
            <TabbedSearch />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Promotions strip */}
        <section aria-labelledby="promo" className="-mt-0 pt-10">
          <h2
            id="promo"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Promotions
          </h2>
          <ul className="mt-4 grid gap-4 md:grid-cols-3">
            {promos.map((p) => (
              <li
                key={p.title}
                className="flex items-start gap-4 rounded-xl bg-white p-5 ring-1 ring-black/5"
              >
                <span className="rounded-md bg-[#e4a93c] px-2 py-1 font-(family-name:--font-display) text-xs font-black uppercase tracking-wide text-[#10201f]">
                  {p.tag}
                </span>
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-0.5 text-sm text-[#3f5653]">{p.text}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Deals rail */}
        <section id="deals" aria-labelledby="dealh" className="pt-14">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="dealh"
                className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
              >
                Today&apos;s deals on the fleet
              </h2>
              <p className="text-sm text-[#3f5653]">
                Prices per day, indicative. Your quote confirms the final price.
              </p>
            </div>
            <a
              href={WHATSAPP_HREF}
              className={`text-sm font-semibold text-[#157a74] underline-offset-4 hover:underline ${focus}`}
            >
              See all vehicles
            </a>
          </div>
          <ul
            className={`${styles.rail} -mx-5 mt-5 flex gap-4 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8`}
          >
            {FLEET.map((v) => {
              const off = discounts[v.id] ?? 0;
              const was = Math.round(v.fromPerDay / (1 - off / 100) / 10) * 10;
              return (
                <li
                  key={v.id}
                  className="flex w-72 shrink-0 flex-col overflow-hidden rounded-xl bg-white ring-1 ring-black/5"
                >
                  <div className="relative">
                    <Photo
                      src={v.image}
                      alt={v.alt}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                    <span className="absolute top-3 left-0 rounded-r-md bg-[#b23a3a] px-2.5 py-1 text-xs font-bold text-white">
                      {off}% off today
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-semibold leading-snug">{v.name}</h3>
                    <p className="mt-1 flex items-center gap-1 text-xs text-[#3f5653]">
                      <PersonIcon className="h-3.5 w-3.5" /> {v.seats} seats ·{" "}
                      {v.luggage}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-md bg-[#0c3b3a] px-1.5 py-0.5 font-(family-name:--font-display) text-sm font-bold text-white">
                        {(v.rating * 2).toFixed(1)}
                      </span>
                      <span className="text-sm font-semibold">
                        {verdict(v.rating * 2)}
                      </span>
                      <span className="text-xs text-[#3f5653]">
                        {v.reviews} reviews
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#b23a3a]">
                      {v.id === "mpv"
                        ? "Only 2 left on Saturday"
                        : "In demand this week"}
                    </p>
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div>
                        <p
                          className={`${styles.strike} text-sm text-[#7a8c89]`}
                        >
                          {ringgit(was)}
                        </p>
                        <p className="font-(family-name:--font-display) text-2xl font-black text-[#0c3b3a]">
                          {ringgit(v.fromPerDay)}
                        </p>
                        <p className="text-xs text-[#7a8c89]">
                          per day, all-in
                        </p>
                      </div>
                      <a
                        href={WHATSAPP_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`rounded-md bg-[#e4a93c] px-3 py-2 text-sm font-bold text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
                      >
                        Book
                      </a>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Destinations grid with counts */}
        <section aria-labelledby="desth" className="pt-14">
          <h2
            id="desth"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Top destinations in Malaysia
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3">
            {DESTINATIONS.map((d) => (
              <li key={d.name}>
                <a
                  href={WHATSAPP_HREF}
                  className={`group relative block h-full min-h-52 overflow-hidden rounded-xl ${focus}`}
                >
                  <Photo
                    src={d.image}
                    alt={d.alt}
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
                    loading="lazy"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#0c3b3a]/90 via-[#0c3b3a]/20 to-transparent" />
                  <span className="absolute right-4 bottom-4 left-4 text-white">
                    <span className="block font-(family-name:--font-display) text-xl font-black">
                      {d.name}
                    </span>
                    <span className="block text-sm text-white/85">
                      {vehicleCounts[d.name]} vehicles · {d.drive}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Reasons */}
        <section aria-labelledby="whyh" className="pt-14">
          <h2
            id="whyh"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Why book with Heavenly Travel
          </h2>
          <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reasons.map((r) => (
              <li
                key={r.title}
                className="rounded-xl bg-white p-5 ring-1 ring-black/5"
              >
                <span
                  aria-hidden
                  className="grid h-9 w-9 place-items-center rounded-full bg-[#e8f2ef] text-[#157a74]"
                >
                  ✓
                </span>
                <h3 className="mt-3 font-semibold">{r.title}</h3>
                <p className="mt-1 text-sm text-[#3f5653]">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Reviews */}
        <section aria-labelledby="revh" className="pt-14 pb-16">
          <div className="flex items-baseline gap-3">
            <h2
              id="revh"
              className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
            >
              Recent reviews
            </h2>
            <span className="rounded-md bg-[#0c3b3a] px-2 py-0.5 font-(family-name:--font-display) font-bold text-white">
              9.8
            </span>
            <span className="text-sm text-[#3f5653]">
              Exceptional · 1,027 reviews
            </span>
          </div>
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {REVIEWS.map((r) => (
              <li
                key={r.name}
                className="rounded-xl bg-white p-5 ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm">
                    <span className="font-semibold">{r.name}</span>{" "}
                    <span className="text-[#3f5653]">from {r.from}</span>
                  </p>
                  <span className="rounded-md bg-[#e8f2ef] px-2 py-0.5 font-(family-name:--font-display) text-sm font-bold text-[#0c3b3a]">
                    {r.score.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs text-[#7a8c89]">{r.trip}</p>
                <p className="mt-2 text-[15px] leading-relaxed">“{r.text}”</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="bg-[#0c3b3a] text-[#cfe0dc]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          <div>
            <Wordmark tone="light" className="text-white" />
            <p className="mt-3 text-sm">
              Langkawi, Kedah, since 2016. {PHONE}.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Services</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Cars with driver</li>
              <li>Coach charter</li>
              <li>Airport transfers</li>
              <li>Day tours and tickets</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Registered</h2>
            <ul className="mt-3 flex gap-3">
              {BADGES.map((b) => (
                <li key={b.label}>
                  <Photo
                    src={b.image}
                    alt={b.alt}
                    className="h-12 rounded-md bg-white p-1"
                    loading="lazy"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <h2 className="text-sm font-semibold text-white">
              About this page
            </h2>
            <p className="mt-3">
              Inspired by agoda.com, built by Claude Fable 5.1.
            </p>
          </div>
        </div>
        <div className="px-5 pb-28 text-center text-xs text-[#9ab5b0]">
          Indicative prices. Your quote confirms the final price.
        </div>
      </footer>
    </div>
  );
}
