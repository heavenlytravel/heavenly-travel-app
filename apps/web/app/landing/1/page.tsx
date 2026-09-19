/**
 * Heavenly Travel — landing design
 * Route: /landing/1
 * Direction: a dense page. A search box on a teal hero with the two
 * main products as tabs, the reasons to book, the fleet under those two
 * products with review-score chips, and a destinations grid with vehicle
 * counts. Teal for structure, amber for actions.
 */

import type { Metadata } from "next";
import styles from "./page.module.css";
import { fontVars } from "../../_lib/fonts";
import {
  BADGES,
  DESTINATIONS,
  FLEET_GROUPS,
  PHONE,
  REVIEWS,
  WHATSAPP_HREF,
  ringgit,
} from "../../_lib/content";
import { WhatsAppIcon } from "../../_components/WhatsAppIcon";
import { PersonIcon, Wordmark, Photo } from "../../_components/Brand";
import { TabbedSearch } from "../../_components/search/TabbedSearch";

export const metadata: Metadata = {
  title: "Heavenly Travel | Cars with driver and coach charter",
  description:
    "Compare cars with driver, MPVs, vans and coaches across Malaysia with review scores. Quotes on WhatsApp in minutes.",
};

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";

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
        href="#fleet"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[#0c3b3a] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to the fleet
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
            {["Cars with driver", "Coaches", "Transfers", "Tours", "Fleet"].map(
              (l, i) => (
                <a
                  key={l}
                  href={i === 4 ? "#fleet" : "#top"}
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
        {/* Why book with us */}
        <section aria-labelledby="whyh" className="pt-10">
          <h2
            id="whyh"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Why book with Heavenly Travel
          </h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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

        {/* Fleet, under the two products */}
        <section id="fleet" aria-labelledby="fleeth" className="pt-14">
          <h2
            id="fleeth"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Our fleet
          </h2>
          <p className="text-sm text-[#3f5653]">
            Prices per day, indicative. Your quote confirms the final price.
          </p>
          {FLEET_GROUPS.map((g) => (
            <div key={g.kind} className="mt-6">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-(family-name:--font-display) text-lg font-bold text-[#0c3b3a]">
                  {g.title}
                </h3>
                <p className="text-sm text-[#3f5653]">{g.text}</p>
              </div>
              <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.vehicles.map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-black/5"
                  >
                    <Photo
                      src={v.image}
                      alt={v.alt}
                      className="aspect-[16/9] w-full object-cover"
                      loading="lazy"
                    />
                    <div className="flex flex-1 flex-col p-4">
                      <h4 className="leading-snug font-semibold">{v.name}</h4>
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
                      <p className="mt-2 text-xs text-[#3f5653]">
                        {v.perks.join(" · ")}
                      </p>
                      <div className="mt-auto flex items-end justify-between pt-4">
                        <div>
                          <p className="text-xs text-[#7a8c89]">From</p>
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
                          aria-label={`Book the ${v.name}`}
                          className={`rounded-md bg-[#e4a93c] px-3 py-2 text-sm font-bold text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
                        >
                          Book
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
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
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-3">
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
        </div>
        <div className="px-5 pb-28 text-center text-xs text-[#9ab5b0]">
          Indicative prices. Your quote confirms the final price.
        </div>
      </footer>
    </div>
  );
}
