/**
 * Heavenly Travel — reimagined site
 * Route: /landing/fable/reimagined/airbnb
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Reference: https://www.airbnb.com/
 * Direction: Airbnb's marketplace grammar applied to vehicles. A compact pill
 * search that expands into segmented fields, a rail of category chips, a
 * grid of cards with a photo, rating and per-day price, and a driver profile
 * where Airbnb would show a host. White page, teal and amber accents.
 * Generated: 2026-09-17
 */

import type { Metadata } from "next";
import styles from "./page.module.css";
import { fontVars } from "../_lib/fonts";
import {
  DESTINATIONS,
  FLEET,
  PHONE,
  REVIEWS,
  STEPS,
  WHATSAPP_HREF,
  ringgit,
} from "../_lib/content";
import { BagIcon, PersonIcon, Wordmark, Photo } from "../_components/Brand";
import { PillSearch } from "./_components/PillSearch";
import { SaveButton } from "./_components/SaveButton";

export const metadata: Metadata = {
  title: "Heavenly Travel | Cars with driver and coaches across Malaysia",
  description:
    "Browse cars with driver, MPVs, vans and coaches with real prices per day and reviews. Book with one message on WhatsApp.",
};

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0c3b3a]";

const categories = [
  { label: "Airport transfers", icon: "✈" },
  { label: "Cars with driver", icon: "🚗" },
  { label: "Coaches", icon: "🚌" },
  { label: "Island tours", icon: "🏝" },
  { label: "Highlands", icon: "⛰" },
  { label: "Heritage", icon: "🏛" },
  { label: "Events", icon: "🎤" },
  { label: "Schools", icon: "🎒" },
  { label: "Weddings", icon: "💐" },
  { label: "Golf", icon: "⛳" },
];

const drivers = [
  {
    name: "Encik Rosli",
    since: 2016,
    trips: 2400,
    languages: "Malay, English",
    line: "Langkawi born. Knows which jetty queue moves and which beach is empty at four.",
  },
  {
    name: "Mr Tan",
    since: 2018,
    trips: 1800,
    languages: "Mandarin, Hokkien, English, Malay",
    line: "KLIA and city specialist. Has never missed a red-eye pick-up.",
  },
];

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen font-(family-name:--font-body) antialiased`}
    >
      <a
        href="#fleet"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[#0c3b3a] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to vehicles
      </a>

      {/* Header with centred pill */}
      <header className="sticky top-0 z-40 border-b border-[#e9eeed] bg-white">
        <div className="mx-auto grid max-w-7xl grid-cols-[auto_1fr_auto] items-center gap-4 px-5 py-4 sm:px-8">
          <a href="#top" className={`rounded-sm ${focus}`}>
            <Wordmark />
          </a>
          <div className="hidden md:block">
            <PillSearch />
          </div>
          <div className="flex items-center gap-2">
            <a
              href="#drivers"
              className={`hidden rounded-full px-3 py-2 text-sm font-semibold hover:bg-[#f1f5f4] sm:inline-block ${focus}`}
            >
              Drive with us
            </a>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-full border border-[#dde5e3] py-1.5 pr-1.5 pl-3 text-sm font-semibold hover:shadow-[0_2px_8px_rgba(0,0,0,0.12)] ${focus}`}
            >
              Enquire
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#0c3b3a] text-white">
                <PersonIcon className="h-3.5 w-3.5" />
              </span>
            </a>
          </div>
        </div>
        <div className="px-5 pb-4 md:hidden">
          <PillSearch />
        </div>

        {/* Category chip rail */}
        <div
          className={`${styles.rail} mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 pb-3 sm:px-8`}
          role="list"
          aria-label="Categories"
        >
          {categories.map((c, i) => (
            <button
              key={c.label}
              type="button"
              role="listitem"
              aria-pressed={i === 1}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium whitespace-nowrap ${
                i === 1
                  ? "border-[#0c3b3a] bg-[#0c3b3a] text-white"
                  : "border-[#dde5e3] text-[#3f5653] hover:border-[#0c3b3a]"
              } ${focus}`}
            >
              <span aria-hidden>{c.icon}</span>
              {c.label}
            </button>
          ))}
        </div>
      </header>

      <main id="top" className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Intro line, quiet like Airbnb's */}
        <div className="flex flex-wrap items-end justify-between gap-4 pt-10">
          <div>
            <h1 className="font-(family-name:--font-display) text-3xl font-black tracking-tight sm:text-4xl">
              Cars with driver and coaches, across Malaysia
            </h1>
            <p className="mt-2 text-[#5b6c69]">
              Real prices per day, real drivers, one message to book.
            </p>
          </div>
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-full border border-[#dde5e3] px-4 py-2 text-sm font-semibold hover:border-[#0c3b3a] ${focus}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden
            >
              <path d="M4 6h16M7 12h10M10 18h4" strokeLinecap="round" />
            </svg>
            Filters
          </button>
        </div>

        {/* Card grid */}
        <section id="fleet" aria-label="Vehicles" className="mt-8">
          <ul className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {FLEET.map((v, i) => (
              <li key={v.id} className={`${styles.card} relative`}>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group block rounded-2xl ${focus}`}
                >
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-[#e8f2ef]">
                    <Photo
                      src={v.image}
                      alt={v.alt}
                      className="h-full w-full object-cover"
                      loading={i < 4 ? "eager" : "lazy"}
                    />
                    {v.rating >= 4.9 && (
                      <span className="absolute top-3 left-3 rounded-full bg-white px-2.5 py-1 text-xs font-semibold shadow">
                        Guest favourite
                      </span>
                    )}
                    <span
                      className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1"
                      aria-hidden
                    >
                      {[0, 1, 2, 3, 4].map((d) => (
                        <span
                          key={d}
                          className={`h-1.5 w-1.5 rounded-full ${d === 0 ? "bg-white" : "bg-white/50"}`}
                        />
                      ))}
                    </span>
                  </div>
                  <div className="mt-3 flex items-start justify-between gap-3">
                    <h2 className="font-semibold leading-snug">{v.name}</h2>
                    <span className="flex shrink-0 items-center gap-1 text-sm">
                      <svg viewBox="0 0 20 20" className="h-3 w-3" aria-hidden>
                        <path
                          d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"
                          fill="currentColor"
                        />
                      </svg>
                      {v.rating.toFixed(1)}
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-3 text-sm text-[#5b6c69]">
                    <span className="inline-flex items-center gap-1">
                      <PersonIcon /> {v.seats}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <BagIcon /> {v.luggage}
                    </span>
                  </p>
                  <p className="mt-0.5 text-sm text-[#5b6c69]">
                    {v.perks.join(" · ")}
                  </p>
                  <p className="mt-1.5 text-[15px]">
                    <span className="font-semibold">
                      {ringgit(v.fromPerDay)}
                    </span>{" "}
                    <span className="text-[#5b6c69]">per day</span>
                  </p>
                </a>
                <SaveButton name={v.name} />
              </li>
            ))}
          </ul>
        </section>

        {/* Destinations rail */}
        <section aria-labelledby="dest" className="mt-20">
          <div className="flex items-end justify-between">
            <h2
              id="dest"
              className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
            >
              Inspiration for your next trip
            </h2>
            <a
              href={WHATSAPP_HREF}
              className={`text-sm font-semibold underline underline-offset-4 ${focus}`}
            >
              Ask about a route
            </a>
          </div>
          <ul
            className={`${styles.rail} -mx-5 mt-6 flex gap-4 overflow-x-auto px-5 sm:-mx-8 sm:px-8`}
          >
            {DESTINATIONS.map((d) => (
              <li key={d.name} className={`${styles.card} w-64 shrink-0`}>
                <div className="aspect-[4/5] overflow-hidden rounded-2xl">
                  <Photo
                    src={d.image}
                    alt={d.alt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h3 className="mt-3 font-semibold">{d.name}</h3>
                <p className="text-sm text-[#5b6c69]">{d.drive}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Drivers, where Airbnb shows hosts */}
        <section
          id="drivers"
          aria-labelledby="drv"
          className="mt-20 rounded-3xl bg-[#e8f2ef] p-6 sm:p-10"
        >
          <h2
            id="drv"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Meet your drivers
          </h2>
          <p className="mt-2 max-w-xl text-[#3f5653]">
            Every booking comes with a named driver the day before. These are
            two of the people you might meet.
          </p>
          <ul className="mt-8 grid gap-6 md:grid-cols-2">
            {drivers.map((d) => (
              <li
                key={d.name}
                className="flex gap-5 rounded-2xl bg-white p-5 shadow-[0_8px_24px_-16px_rgba(12,59,58,0.5)]"
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-[#0c3b3a] font-(family-name:--font-display) text-2xl font-black text-[#e4a93c]">
                  {d.name.split(" ").at(-1)?.[0]}
                </div>
                <div>
                  <h3 className="font-semibold">{d.name}</h3>
                  <p className="text-sm text-[#5b6c69]">
                    Driving since {d.since} · {d.trips.toLocaleString("en-MY")}+
                    trips · {d.languages}
                  </p>
                  <p className="mt-2 text-[15px]">{d.line}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Reviews */}
        <section aria-labelledby="rev" className="mt-20">
          <h2
            id="rev"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            What guests say
          </h2>
          <ul className="mt-6 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {REVIEWS.map((r) => (
              <li key={r.name}>
                <p className="text-sm font-semibold">
                  {r.name}{" "}
                  <span className="font-normal text-[#5b6c69]">· {r.from}</span>
                </p>
                <p className="text-xs text-[#5b6c69]">{r.trip}</p>
                <p className="mt-2 text-[15px] leading-relaxed">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section aria-labelledby="how" className="mt-20">
          <h2
            id="how"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            How booking works
          </h2>
          <ol className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="border-t-2 border-[#0c3b3a] pt-4">
                <p className="font-(family-name:--font-display) text-sm font-bold text-[#157a74]">
                  0{i + 1}
                </p>
                <h3 className="mt-1 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-[#5b6c69]">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="mt-20 border-t border-[#e9eeed] bg-[#f7faf9]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:grid-cols-3 sm:px-8">
          <div>
            <h2 className="text-sm font-semibold">Support</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#3f5653]">
              <li>WhatsApp {PHONE}</li>
              <li>Cancellation options</li>
              <li>Child seats and accessibility</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Driving with us</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#3f5653]">
              <li>List your coach</li>
              <li>Driver standards</li>
              <li>Partner agencies</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Heavenly Travel</h2>
            <ul className="mt-3 space-y-2 text-sm text-[#3f5653]">
              <li>Langkawi, Kedah, since 2016</li>
              <li>MATTA member, MOF registered</li>
              <li>Reimagined from airbnb.com by Claude Fable 5.1</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-[#e9eeed] px-5 py-5 pb-28 text-center text-xs text-[#5b6c69]">
          Indicative prices. Your quote confirms the final price.
        </div>
      </footer>
    </div>
  );
}
