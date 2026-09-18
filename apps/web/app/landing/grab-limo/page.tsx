/**
 * Heavenly Travel — landing design
 * Route: /landing/grab-limo
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Reference: https://limo.grab.com/sg/en
 * Direction: a bright, friendly pre-booking page. A split hero on mint with
 * the booking panel beside the headline, rides grouped by occasion, a ride
 * size picker with one fixed price, three plain reasons, numbered steps and
 * an FAQ. White and mint with teal structure, amber for the one main action,
 * heavy Overpass headlines and generously rounded cards.
 * Inspired by the reference, not a copy of it.
 * Generated: 2026-09-18
 */

import type { Metadata } from "next";
import styles from "./page.module.css";
import { fontVars } from "../../_lib/fonts";
import {
  BADGES,
  PHONE,
  REVIEWS,
  STEPS,
  WHATSAPP_HREF,
} from "../../_lib/content";
import { WhatsAppIcon } from "../../_components/WhatsAppIcon";
import { Photo, Stars, Wordmark } from "../../_components/Brand";
import { FleetPicker } from "./_components/FleetPicker";
import { RidePanel } from "../../_components/search/RidePanel";

export const metadata: Metadata = {
  title: "Heavenly Travel | Pre-book a car with driver or a coach",
  description:
    "Book a car with driver, a van or a coach ahead of time, anywhere in Malaysia. Fixed fares, flight tracking and professional drivers, confirmed on WhatsApp.",
};

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#157a74]";
const h2 =
  "font-(family-name:--font-display) text-3xl font-black tracking-tight sm:text-4xl";

const NAV = [
  { href: "#occasions", label: "Occasions" },
  { href: "#rides", label: "Rides" },
  { href: "#how", label: "How it works" },
  { href: "#faq", label: "FAQ" },
];

const PROMISES = [
  "Fixed fare, agreed before you travel",
  "Flights tracked, 60 minutes of free waiting",
  "The same professional driver all trip",
];

const OCCASIONS = [
  {
    title: "Airport runs",
    text: "Met at arrivals with a name board, at any hour.",
    image: "/brand/chauffeur.jpg",
    alt: "The leather cabin of a chauffeur-driven MPV",
  },
  {
    title: "Family days out",
    text: "Child seats fitted, room for the pram and the bags.",
    image: "/brand/mpv.jpg",
    alt: "A line of MPVs parked by the sea under palm trees",
  },
  {
    title: "Business travel",
    text: "Back-to-back meetings with a driver waiting outside.",
    image: "/brand/mice.jpg",
    alt: "The Langkawi International Convention Centre",
  },
  {
    title: "Weddings and events",
    text: "Guests moved on time, from one car to a row of coaches.",
    image: "/brand/coach.jpg",
    alt: "A fleet of green and white executive coaches",
  },
  {
    title: "Sightseeing",
    text: "Cable car, mangroves, tea estates. Stop wherever you like.",
    image: "/brand/cable-car.jpg",
    alt: "The Langkawi cable car in mist",
  },
  {
    title: "School and group trips",
    text: "26 to 44 seats, with the licence paperwork sent ahead.",
    image: "/brand/attractions.jpg",
    alt: "The Langkawi Sky Bridge above the rainforest",
  },
];

const REASONS = [
  {
    title: "One fare, no meter",
    text: "Tolls, fuel, parking and the driver's meals are in the price you agree to. It does not change at drop-off.",
  },
  {
    title: "Late flight? Still there",
    text: "We track your flight and move the pick-up with it. The first 60 minutes of waiting are free.",
  },
  {
    title: "Drivers we know by name",
    text: "Employed, licensed and insured, and most have driven these roads for more than ten years.",
  },
];

const FAQS = [
  {
    q: "How far ahead should I book?",
    a: "A day ahead is enough for cars and vans. For coaches and peak weekends, a week ahead keeps the choice of vehicle open. Same-day requests are welcome and we will say straight away if we can do it.",
  },
  {
    q: "What does the fare include?",
    a: "Tolls, fuel, parking and the driver's meals. For multi-day trips the driver's accommodation is included too. Entrance tickets and your own meals are not.",
  },
  {
    q: "Can I change or cancel a booking?",
    a: "Changes are free until the day before. Message the same WhatsApp thread with the new time or the extra stop and we will confirm it.",
  },
  {
    q: "Do you have child seats?",
    a: "Yes, for infants and toddlers, at no charge. Tell us the ages when you book so the right seat is fitted before pick-up.",
  },
  {
    q: "How do I pay?",
    a: "By bank transfer or card once the booking is confirmed. Companies and schools can be invoiced.",
  },
];

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen font-(family-name:--font-body) antialiased`}
    >
      <a
        href="#book"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-[#0c3b3a] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to booking
      </a>

      <header className="sticky top-0 z-40 border-b border-[#0c3b3a]/5 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <a href="#top" className={`rounded-lg ${focus}`}>
            <Wordmark />
          </a>
          <nav aria-label="Primary" className="hidden gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`rounded-full px-4 py-2 text-sm font-semibold text-[#3f5653] hover:bg-[#e3f3ee] hover:text-[#0c3b3a] ${focus}`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href="#book"
            className={`rounded-full bg-[#0c3b3a] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#157a74] ${focus}`}
          >
            Book a ride
          </a>
        </div>
      </header>

      {/* Split hero */}
      <section id="top" className={styles.hero}>
        <div className="mx-auto grid max-w-6xl gap-10 px-5 pt-12 pb-16 sm:px-8 lg:grid-cols-[1fr_26rem] lg:gap-14 lg:pt-20 lg:pb-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-sm font-semibold text-[#0c3b3a] ring-1 ring-[#0c3b3a]/10">
              <Stars value={4.9} />
              4.9 from 1,027 trips
            </p>
            <h1 className="mt-5 font-(family-name:--font-display) text-4xl leading-[1.05] font-black tracking-tight text-[#0c3b3a] sm:text-6xl">
              Your ride, sorted before the day begins.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-[#3f5653]">
              Pre-book a car with driver, a van or a coach anywhere in Malaysia.
              Tell us the trip and get one fixed fare on WhatsApp.
            </p>
            <ul className="mt-6 space-y-2.5">
              {PROMISES.map((p) => (
                <li key={p} className="flex items-center gap-3 font-medium">
                  <span
                    aria-hidden
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#157a74] text-xs font-bold text-white"
                  >
                    ✓
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <div className="relative mt-10 hidden lg:block">
              <Photo
                src="/brand/mpv.jpg"
                alt="A line of MPVs parked by the sea under palm trees"
                className="aspect-[16/9] w-full rounded-3xl object-cover"
                loading="eager"
              />
              <p className="absolute -right-4 -bottom-5 rounded-2xl bg-white px-5 py-3.5 text-sm shadow-[0_16px_40px_-20px_rgba(12,59,58,0.5)] ring-1 ring-[#0c3b3a]/5">
                <span className="block font-semibold text-[#0c3b3a]">
                  Driver assigned the day before
                </span>
                <span className="text-[#5a6b68]">
                  Name, number and plate on WhatsApp
                </span>
              </p>
            </div>
          </div>
          <div className="lg:pt-2">
            <RidePanel />
          </div>
        </div>
      </section>

      <main>
        {/* Occasions */}
        <section
          id="occasions"
          aria-labelledby="occasions-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-20 sm:px-8"
        >
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="occasions-h" className={h2}>
              A ride for every plan
            </h2>
            <p className="mt-3 text-[#3f5653]">
              From one guest at the airport to a whole school on the road.
            </p>
          </div>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {OCCASIONS.map((o) => (
              <li key={o.title}>
                <a
                  href="#book"
                  className={`group flex h-full items-center gap-4 rounded-3xl bg-white p-3 ring-1 ring-[#0c3b3a]/8 hover:ring-2 hover:ring-[#157a74] ${focus}`}
                >
                  <Photo
                    src={o.image}
                    alt={o.alt}
                    className="h-24 w-24 shrink-0 rounded-2xl object-cover"
                  />
                  <span className="pr-2">
                    <span className="block font-(family-name:--font-display) text-lg font-bold">
                      {o.title}
                    </span>
                    <span className="mt-0.5 block text-sm text-[#3f5653]">
                      {o.text}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Rides */}
        <section
          id="rides"
          aria-labelledby="rides-h"
          className="mt-20 scroll-mt-16 bg-[#eef7f3] py-20"
        >
          <div className="mx-auto max-w-5xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 id="rides-h" className={h2}>
                Pick the size. The fare is fixed.
              </h2>
              <p className="mt-3 text-[#3f5653]">
                Prices are per day and indicative. Your quote confirms the final
                price.
              </p>
            </div>
            <div className="mt-10">
              <FleetPicker />
            </div>
          </div>
        </section>

        {/* Reasons */}
        <section
          aria-labelledby="why-h"
          className="mx-auto max-w-6xl px-5 pt-20 sm:px-8"
        >
          <h2 id="why-h" className={`${h2} text-center`}>
            Why people book ahead with us
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-3">
            {REASONS.map((r, i) => (
              <li key={r.title} className="rounded-3xl bg-[#eef7f3] p-7">
                <span
                  aria-hidden
                  className="grid h-11 w-11 place-items-center rounded-2xl bg-[#157a74] font-(family-name:--font-display) text-lg font-black text-white"
                >
                  {i + 1}
                </span>
                <h3 className="mt-5 font-(family-name:--font-display) text-xl font-bold">
                  {r.title}
                </h3>
                <p className="mt-2 leading-relaxed text-[#3f5653]">{r.text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* How it works */}
        <section
          id="how"
          aria-labelledby="how-h"
          className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-20 sm:px-8"
        >
          <h2 id="how-h" className={`${h2} text-center`}>
            Booked in four steps
          </h2>
          <ol className={`${styles.steps} mt-12 grid gap-8 md:grid-cols-4`}>
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative md:text-center">
                <span
                  aria-hidden
                  className="relative z-10 grid h-12 w-12 place-items-center rounded-full bg-[#0c3b3a] font-(family-name:--font-display) text-lg font-black text-white md:mx-auto"
                >
                  {i + 1}
                </span>
                <h3 className="mt-4 font-(family-name:--font-display) text-lg font-bold">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#3f5653]">
                  {s.text}
                </p>
              </li>
            ))}
          </ol>
        </section>

        {/* Reviews */}
        <section
          aria-labelledby="reviews-h"
          className="mx-auto max-w-6xl px-5 pt-20 sm:px-8"
        >
          <h2 id="reviews-h" className={`${h2} text-center`}>
            Riders say it best
          </h2>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {REVIEWS.map((r) => (
              <li
                key={r.name}
                className="rounded-3xl bg-white p-7 ring-1 ring-[#0c3b3a]/8"
              >
                <Stars value={r.score / 2} className="h-4 w-4" />
                <p className="mt-3 text-[17px] leading-relaxed">“{r.text}”</p>
                <p className="mt-4 text-sm text-[#5a6b68]">
                  <span className="font-semibold text-[#10201f]">{r.name}</span>
                  , {r.from} · {r.trip}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-h"
          className="mx-auto max-w-3xl scroll-mt-20 px-5 pt-20 sm:px-8"
        >
          <h2 id="faq-h" className={`${h2} text-center`}>
            Questions, answered
          </h2>
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className={`${styles.faq} group rounded-2xl bg-white ring-1 ring-[#0c3b3a]/8 open:ring-[#157a74]`}
              >
                <summary
                  className={`flex cursor-pointer items-center justify-between gap-4 rounded-2xl px-6 py-4.5 font-semibold ${focus}`}
                >
                  {f.q}
                  <span
                    aria-hidden
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#e3f3ee] text-lg leading-none text-[#157a74] transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  >
                    +
                  </span>
                </summary>
                <p className="px-6 pb-5 leading-relaxed text-[#3f5653]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing banner */}
        <section
          aria-labelledby="cta-h"
          className="mx-auto max-w-6xl px-5 py-20 sm:px-8"
        >
          <div className="flex flex-wrap items-center justify-between gap-8 rounded-[2rem] bg-[#0c3b3a] px-7 py-12 text-white sm:px-12">
            <div className="max-w-xl">
              <h2
                id="cta-h"
                className="font-(family-name:--font-display) text-3xl font-black tracking-tight"
              >
                Moving a team, a school or a wedding?
              </h2>
              <p className="mt-2 text-white/80">
                Tell us the dates and the headcount. We plan the vehicles and
                send one price for all of it.
              </p>
            </div>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-full bg-[#e4a93c] px-7 py-4 font-bold text-[#10201f] hover:bg-[#f0b94d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <WhatsAppIcon className="h-5 w-5" />
              Chat with our team
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#0c3b3a]/8 bg-white text-[#3f5653]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          <div>
            <Wordmark />
            <p className="mt-3 text-sm">
              Langkawi, Kedah, since 2016. {PHONE}.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#10201f]">Rides</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li>Airport transfers</li>
              <li>Cars with driver</li>
              <li>Coach charter</li>
              <li>Day tours</li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#10201f]">Registered</h2>
            <ul className="mt-3 flex gap-3">
              {BADGES.map((b) => (
                <li key={b.label}>
                  <Photo
                    src={b.image}
                    alt={b.alt}
                    className="h-12 rounded-lg p-1 ring-1 ring-[#0c3b3a]/10"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <h2 className="text-sm font-bold text-[#10201f]">
              About this page
            </h2>
            <p className="mt-3">
              Inspired by limo.grab.com, built by Claude Fable 5.1.
            </p>
          </div>
        </div>
        <div className="px-5 pb-28 text-center text-xs text-[#7a8c89]">
          Indicative prices. Your quote confirms the final price.
        </div>
      </footer>
    </div>
  );
}
