/**
 * Heavenly Travel — reimagined site
 * Route: /landing/fable/reimagined/booking
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Reference: https://www.booking.com/
 * Direction: Booking.com's structure. A deep-teal header band with service
 * tabs and a horizontal search bar outlined in amber, a loyalty strip,
 * 'browse by vehicle type' tiles, trending destinations, and a results list
 * with a filter rail and boxed review scores with a verdict word.
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
  STEPS,
  WHATSAPP_HREF,
  ringgit,
} from "../_lib/content";
import {
  BagIcon,
  PersonIcon,
  Stars,
  Wordmark,
  Photo,
} from "../_components/Brand";
import { OutlinedSearch } from "./_components/OutlinedSearch";

export const metadata: Metadata = {
  title: "Heavenly Travel | Find a car with driver or coach in Malaysia",
  description:
    "Search cars with driver, MPVs, vans and coaches across Malaysia. Filter by seats and amenities, compare review scores, and book on WhatsApp.",
};

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";

const types = [
  { label: "Sedans", count: 6, image: "/brand/chauffeur.jpg" },
  { label: "MPVs", count: 9, image: "/brand/mpv.jpg" },
  { label: "Vans", count: 5, image: "/brand/attractions.jpg" },
  { label: "Coaches", count: 7, image: "/brand/coach.jpg" },
];

const filters = [
  {
    title: "Vehicle type",
    items: ["Sedan", "MPV", "Van", "Minibus", "Coach"],
  },
  {
    title: "Seats",
    items: ["Up to 3", "4 to 6", "7 to 12", "13 to 26", "27 to 44"],
  },
  {
    title: "Amenities",
    items: [
      "Child seat",
      "Wi-Fi",
      "Toilet on board",
      "Wheelchair access",
      "Luggage trailer",
    ],
  },
  {
    title: "Price per day",
    items: [
      "Under RM 300",
      "RM 300 to 600",
      "RM 600 to 1,000",
      "Over RM 1,000",
    ],
  },
];

function verdict(score: number) {
  if (score >= 9.5) return "Exceptional";
  if (score >= 9) return "Superb";
  return "Fabulous";
}

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen font-(family-name:--font-body) antialiased`}
    >
      <a
        href="#results"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-[#0c3b3a]"
      >
        Skip to results
      </a>

      {/* Header band */}
      <div id="top" className={`${styles.band} text-white`}>
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#top" className={`rounded-sm ${focus}`}>
            <Wordmark tone="light" />
          </a>
          <div className="flex items-center gap-1 text-sm">
            <span className="hidden rounded-md px-3 py-2 sm:inline">MYR</span>
            <a
              href={WHATSAPP_HREF}
              className={`rounded-md px-3 py-2 hover:bg-white/10 ${focus}`}
            >
              Help
            </a>
            <a
              href="#drivers"
              className={`hidden rounded-md px-3 py-2 hover:bg-white/10 md:inline ${focus}`}
            >
              List your vehicle
            </a>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-md border border-white/70 px-3 py-2 font-semibold hover:bg-white/10 ${focus}`}
            >
              Sign in
            </a>
          </div>
        </header>
        <div className="mx-auto max-w-7xl px-5 pt-4 pb-16 sm:px-8 sm:pt-6">
          <h1 className="font-(family-name:--font-display) text-4xl font-black tracking-tight sm:text-6xl">
            Find your next ride
          </h1>
          <p className="mt-2 text-lg text-white/85 sm:text-2xl">
            Cars with driver and coaches, anywhere in Malaysia.
          </p>
          <div className="mt-8">
            <OutlinedSearch />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-5 sm:px-8">
        {/* Loyalty strip */}
        <section aria-label="Regular customers" className="-mt-8">
          <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-[#dde5e3] bg-white p-5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.3)] sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#e4a93c] font-(family-name:--font-display) text-lg font-black text-[#10201f]">
                HT
              </span>
              <div>
                <h2 className="font-semibold">
                  Regulars save from the third trip
                </h2>
                <p className="text-sm text-[#3f5653]">
                  10% off every booking once you&apos;ve travelled with us
                  twice. Schools and agencies get it from day one.
                </p>
              </div>
            </div>
            <a
              href={WHATSAPP_HREF}
              className={`rounded-md bg-[#157a74] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c3b3a] ${focus}`}
            >
              Ask about rates
            </a>
          </div>
        </section>

        {/* Browse by type */}
        <section aria-labelledby="typeh" className="pt-14">
          <h2
            id="typeh"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Browse by vehicle type
          </h2>
          <ul className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {types.map((t) => (
              <li key={t.label}>
                <a href="#results" className={`block rounded-xl ${focus}`}>
                  <Photo
                    src={t.image}
                    alt=""
                    className="aspect-[4/3] w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                  <h3 className="mt-2 font-semibold">{t.label}</h3>
                  <p className="text-sm text-[#3f5653]">{t.count} available</p>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Trending destinations */}
        <section aria-labelledby="trendh" className="pt-14">
          <h2
            id="trendh"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Trending destinations
          </h2>
          <p className="text-sm text-[#3f5653]">
            Where our drivers were sent most last month.
          </p>
          <ul className="mt-5 grid gap-4 md:grid-cols-6">
            {DESTINATIONS.slice(0, 5).map((d, i) => (
              <li
                key={d.name}
                className={i < 2 ? "md:col-span-3" : "md:col-span-2"}
              >
                <a
                  href={WHATSAPP_HREF}
                  className={`relative block overflow-hidden rounded-xl ${focus}`}
                >
                  <Photo
                    src={d.image}
                    alt={d.alt}
                    className={`w-full object-cover ${i < 2 ? "aspect-[16/9]" : "aspect-[4/3]"}`}
                    loading="lazy"
                  />
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0c3b3a]/70 to-transparent"
                  />
                  <span className="absolute top-4 left-4 font-(family-name:--font-display) text-2xl font-black text-white">
                    {d.name}
                    <span className="ml-2 text-sm font-semibold text-white/85">
                      {d.state}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Results with filter rail */}
        <section id="results" aria-labelledby="resh" className="pt-14">
          <h2
            id="resh"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Malaysia: {FLEET.length} vehicles found
          </h2>
          <div className="mt-5 grid gap-6 lg:grid-cols-[260px_1fr]">
            <aside
              aria-label="Filters"
              className="h-fit rounded-xl border border-[#dde5e3]"
            >
              <h3 className="border-b border-[#dde5e3] px-4 py-3 font-semibold">
                Filter by:
              </h3>
              {filters.map((f) => (
                <fieldset
                  key={f.title}
                  className="border-b border-[#dde5e3] px-4 py-3 last:border-b-0"
                >
                  <legend className="pt-1 text-sm font-semibold">
                    {f.title}
                  </legend>
                  <ul className="mt-2 space-y-1.5">
                    {f.items.map((i) => (
                      <li key={i}>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-[#157a74]"
                          />
                          {i}
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              ))}
            </aside>

            <ol className="space-y-4">
              {FLEET.map((v) => {
                const score = v.rating * 2;
                return (
                  <li
                    key={v.id}
                    className="grid gap-4 rounded-xl border border-[#dde5e3] p-4 sm:grid-cols-[200px_1fr_auto]"
                  >
                    <Photo
                      src={v.image}
                      alt={v.alt}
                      className="aspect-[4/3] w-full rounded-lg object-cover sm:aspect-square"
                      loading="lazy"
                    />
                    <div>
                      <h3 className="font-(family-name:--font-display) text-xl font-bold text-[#157a74]">
                        {v.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-2 text-xs">
                        <Stars value={v.rating} className="h-3 w-3" />
                        <span className="text-[#3f5653]">
                          Langkawi and nationwide
                        </span>
                      </p>
                      <p className="mt-2 flex items-center gap-3 text-sm text-[#3f5653]">
                        <span className="inline-flex items-center gap-1">
                          <PersonIcon /> {v.seats} passengers
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <BagIcon /> {v.luggage}
                        </span>
                      </p>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {v.perks.map((p) => (
                          <li
                            key={p}
                            className="rounded-md bg-[#e8f2ef] px-2 py-0.5 text-xs font-medium text-[#0c3b3a]"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2 text-sm font-semibold text-[#1e6b4a]">
                        Free cancellation until the day before
                      </p>
                    </div>
                    <div className="flex flex-row items-end justify-between gap-3 sm:flex-col sm:items-end sm:text-right">
                      <div className="flex items-center gap-2 sm:flex-row-reverse">
                        <span className="rounded-md rounded-bl-none bg-[#0c3b3a] px-2 py-1 font-(family-name:--font-display) font-bold text-white">
                          {score.toFixed(1)}
                        </span>
                        <span className="text-sm">
                          <span className="block font-semibold">
                            {verdict(score)}
                          </span>
                          <span className="text-[#3f5653]">
                            {v.reviews} reviews
                          </span>
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-[#3f5653]">1 day, all-in</p>
                        <p className="font-(family-name:--font-display) text-2xl font-black">
                          {ringgit(v.fromPerDay)}
                        </p>
                        <a
                          href={WHATSAPP_HREF}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`mt-2 inline-block rounded-md bg-[#157a74] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0c3b3a] ${focus}`}
                        >
                          See availability
                        </a>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Reviews */}
        <section aria-labelledby="revh" className="pt-14">
          <h2
            id="revh"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            Guests who booked here said
          </h2>
          <ul className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {REVIEWS.map((r) => (
              <li
                key={r.name}
                className="rounded-xl border border-[#dde5e3] p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e4a93c] font-(family-name:--font-display) font-black text-[#10201f]">
                    {r.name[0]}
                  </span>
                  <div className="text-sm">
                    <p className="font-semibold">{r.name}</p>
                    <p className="text-[#3f5653]">{r.from}</p>
                  </div>
                  <span className="ml-auto rounded-md rounded-bl-none bg-[#0c3b3a] px-1.5 py-0.5 text-sm font-bold text-white">
                    {r.score.toFixed(1)}
                  </span>
                </div>
                <p className="mt-3 text-[15px] leading-relaxed">“{r.text}”</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Steps */}
        <section id="drivers" aria-labelledby="howh" className="pt-14 pb-16">
          <h2
            id="howh"
            className="font-(family-name:--font-display) text-2xl font-black tracking-tight"
          >
            How it works
          </h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-xl bg-[#e8f2ef] p-5">
                <p className="font-(family-name:--font-display) text-3xl font-black text-[#157a74]">
                  {i + 1}
                </p>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-[#3f5653]">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-[#dde5e3]">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 text-sm sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {[
            [
              "Support",
              ["WhatsApp " + PHONE, "Manage a booking", "Safety and licences"],
            ],
            [
              "Discover",
              [
                "Langkawi transfers",
                "KLIA transfers",
                "Cameron Highlands coaches",
                "School trips",
              ],
            ],
            [
              "Terms",
              ["Cancellation", "Child seats", "Waiting time", "Privacy"],
            ],
            [
              "About",
              [
                "Langkawi, Kedah, since 2016",
                "MATTA member, MOF registered",
                "Reimagined from booking.com by Claude Fable 5.1",
              ],
            ],
          ].map(([title, items]) => (
            <div key={title as string}>
              <h2 className="font-semibold">{title}</h2>
              <ul className="mt-3 space-y-2 text-[#3f5653]">
                {(items as string[]).map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="bg-[#0c3b3a] px-5 py-6 pb-28 text-center text-xs text-[#9ab5b0]">
          <div className="mx-auto mb-4 flex justify-center gap-3">
            {BADGES.map((b) => (
              <Photo
                key={b.label}
                src={b.image}
                alt={b.alt}
                className="h-10 rounded bg-white p-1"
                loading="lazy"
              />
            ))}
          </div>
          Indicative prices. Your quote confirms the final price.
        </div>
      </footer>
    </div>
  );
}
