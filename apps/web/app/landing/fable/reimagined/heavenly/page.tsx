/**
 * Heavenly Travel — reimagined site
 * Route: /landing/fable/reimagined/heavenly
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Reference: https://heavenlytravel.my/ (WordPress, Astra and Elementor)
 * Direction: Keep the live site's section order (hero, services, featured
 * packages, clients, badges, testimonials) and the 'Your Travel Engineer'
 * tagline, but add a booking control to the hero, shorten the copy, and let
 * the brand photography do the work at full size.
 * Generated: 2026-09-17
 */

import type { Metadata } from "next";
import styles from "./page.module.css";
import { fontVars } from "../_lib/fonts";
import {
  BADGES,
  PHONE,
  REVIEWS,
  SERVICES,
  WHATSAPP_HREF,
  ringgit,
} from "../../../../_lib/content";
import { WhatsAppIcon } from "../../../../_components/WhatsAppIcon";
import { Stars, Wordmark, Photo } from "../_components/Brand";
import { QuoteStrip } from "./_components/QuoteStrip";

export const metadata: Metadata = {
  title:
    "Heavenly Travel | Your Travel Engineer in Langkawi and across Malaysia",
  description:
    "Licensed travel agency in Langkawi. Coach charter, cars with driver, airport transfers, day tours and MICE transport across Malaysia. Get a quote on WhatsApp.",
};

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";

const nav = [
  { href: "#services", label: "Services" },
  { href: "#packages", label: "Packages" },
  { href: "#clients", label: "Clients" },
  { href: "#reviews", label: "Reviews" },
];

const packages = [
  {
    title: "Langkawi 3 days, car with driver",
    image: "/brand/hero-langkawi.jpg",
    alt: "Eagle Square in Langkawi from the air",
    price: 1250,
    unit: "per vehicle, 3 days",
    includes: [
      "Airport or jetty pick-up and return",
      "MPV and driver, 8 hours a day",
      "Cable car and mangrove cruise tickets",
    ],
  },
  {
    title: "Cameron Highlands day trip, coach",
    image: "/brand/cable-car.jpg",
    alt: "The Langkawi cable car in mist",
    price: 1650,
    unit: "per 44-seat coach",
    includes: [
      "Kuala Lumpur pick-up at 7 am",
      "Tea estate and strawberry farm stops",
      "Return the same night",
    ],
  },
  {
    title: "KLIA to city, private transfer",
    image: "/brand/chauffeur.jpg",
    alt: "The cabin of a chauffeur-driven MPV",
    price: 180,
    unit: "per sedan, one way",
    includes: [
      "Name board at arrivals",
      "Flight tracked, 60 min free waiting",
      "Child seat on request",
    ],
  },
];

const clientSectors = [
  "Tour operators",
  "Universities",
  "International schools",
  "Resorts",
  "Government agencies",
  "Oil and gas",
  "Banks",
  "Event agencies",
  "Cruise lines",
  "Wedding planners",
  "Sports federations",
  "Airlines",
];

const stats = [
  { n: "2016", label: "On the road since" },
  { n: "13", label: "States we drive in" },
  { n: "44", label: "Seats in our largest coach" },
  { n: "24 h", label: "Airport pick-ups" },
];

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen font-(family-name:--font-body) antialiased`}
    >
      <a
        href="#quote"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-[#0c3b3a] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to the quote form
      </a>

      {/* Top bar, like the live site's contact strip */}
      <div className="bg-[#0c3b3a] text-[13px] text-[#cfe0dc]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 sm:px-8">
          <p>Licensed travel agency, Langkawi. MATTA member.</p>
          <a
            href={`tel:${PHONE.replace(/\s/g, "")}`}
            className={`rounded-sm font-medium text-white ${focus}`}
          >
            {PHONE}
          </a>
        </div>
      </div>

      <header className="sticky top-0 z-40 border-b border-[#e3ecea] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#top" className={`rounded-sm ${focus}`}>
            <Wordmark />
          </a>
          <nav aria-label="Sections" className="hidden gap-7 md:flex">
            {nav.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`rounded-sm text-[15px] font-medium hover:text-[#157a74] ${focus}`}
              >
                {l.label}
              </a>
            ))}
          </nav>
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-full bg-[#157a74] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0c3b3a] ${focus}`}
          >
            <WhatsAppIcon />
            WhatsApp us
          </a>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className={`${styles.hero} text-white`}>
        <div className="mx-auto max-w-6xl px-5 pt-24 pb-10 sm:px-8 sm:pt-32">
          <p
            className={`${styles.eyebrow} text-sm font-semibold tracking-wide uppercase`}
          >
            Your Travel Engineer
          </p>
          <h1 className="mt-4 max-w-3xl font-(family-name:--font-display) text-4xl leading-[1.02] font-black tracking-tight sm:text-6xl">
            Coach charter and cars with driver, anywhere in Malaysia.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/85">
            Based in Langkawi since 2016. Airport transfers, day tours, coaches
            for groups and a driver who knows the road. Tell us the trip and
            we&apos;ll price it in one message.
          </p>
          <div id="quote" className="mt-10">
            <QuoteStrip />
          </div>
          <p className="mt-3 text-xs text-white/70">
            Indicative prices on this page. Your quote confirms the final price.
          </p>
        </div>
      </section>

      {/* Stats */}
      <section aria-label="At a glance" className="bg-[#e8f2ef]">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-5 py-8 sm:px-8 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label}>
              <dt className="order-2 text-sm text-[#3f5653]">{s.label}</dt>
              <dd className="font-(family-name:--font-display) text-3xl font-black text-[#0c3b3a]">
                {s.n}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <p className={`${styles.eyebrow} text-sm font-semibold text-[#157a74]`}>
          Our services
        </p>
        <h2 className="mt-3 max-w-2xl font-(family-name:--font-display) text-3xl font-black tracking-tight sm:text-4xl">
          Six things we do every week.
        </h2>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <li
              key={s.id}
              className={`${styles.service} overflow-hidden rounded-2xl border border-[#e3ecea] bg-white`}
            >
              <div className="aspect-[4/3] overflow-hidden">
                <Photo
                  src={s.image}
                  alt={s.alt}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-5">
                <h3 className="font-(family-name:--font-display) text-xl font-bold">
                  {s.title}
                </h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#3f5653]">
                  {s.text}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Featured packages */}
      <section id="packages" className="bg-[#f2e8d5]">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p
            className={`${styles.eyebrow} text-sm font-semibold text-[#157a74]`}
          >
            Featured packages
          </p>
          <h2 className="mt-3 max-w-2xl font-(family-name:--font-display) text-3xl font-black tracking-tight sm:text-4xl">
            Priced and ready to book.
          </h2>
          <ul className="mt-10 grid gap-6 lg:grid-cols-3">
            {packages.map((p) => (
              <li
                key={p.title}
                className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_-28px_rgba(12,59,58,0.5)]"
              >
                <Photo
                  src={p.image}
                  alt={p.alt}
                  className="aspect-[16/10] w-full object-cover"
                  loading="lazy"
                />
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-(family-name:--font-display) text-xl font-bold">
                    {p.title}
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-[15px] text-[#3f5653]">
                    {p.includes.map((i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="text-[#157a74]">
                          ✓
                        </span>
                        {i}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex items-end justify-between pt-5">
                    <div>
                      <p className="text-xs text-[#7a8c89]">From</p>
                      <p className="font-(family-name:--font-display) text-2xl font-black text-[#0c3b3a]">
                        {ringgit(p.price)}
                      </p>
                      <p className="text-xs text-[#7a8c89]">{p.unit}</p>
                    </div>
                    <a
                      href={WHATSAPP_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`rounded-full bg-[#0c3b3a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#157a74] ${focus}`}
                    >
                      Book this
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Clients and badges */}
      <section id="clients" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p
              className={`${styles.eyebrow} text-sm font-semibold text-[#157a74]`}
            >
              Who we drive for
            </p>
            <h2 className="mt-3 font-(family-name:--font-display) text-3xl font-black tracking-tight">
              Schools, agencies, companies and families.
            </h2>
            <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {clientSectors.map((c) => (
                <li
                  key={c}
                  className="flex h-16 items-center justify-center rounded-xl border border-dashed border-[#cfe0dc] bg-[#f7faf9] px-3 text-center text-sm font-medium text-[#3f5653]"
                >
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-[#7a8c89]">
              Client logo wall goes here, as on the current site.
            </p>
          </div>
          <div className="rounded-2xl bg-[#e8f2ef] p-6 sm:p-8">
            <h3 className="font-(family-name:--font-display) text-xl font-bold">
              Registered and licensed
            </h3>
            <p className="mt-2 text-[15px] text-[#3f5653]">
              Ask for the paperwork and we&apos;ll send it before you book.
            </p>
            <ul className="mt-6 flex flex-wrap items-center gap-6">
              {BADGES.map((b) => (
                <li key={b.label} className="flex items-center gap-3">
                  <Photo
                    src={b.image}
                    alt={b.alt}
                    className="h-14 w-auto rounded-md bg-white p-1 ring-1 ring-black/5"
                    loading="lazy"
                  />
                  <span className="text-sm font-semibold">{b.label}</span>
                </li>
              ))}
              <li className="flex items-center gap-3">
                <span className="flex h-14 items-center rounded-md bg-white px-3 font-(family-name:--font-display) text-sm font-black text-[#0c3b3a] ring-1 ring-black/5">
                  MOTAC
                </span>
                <span className="text-sm font-semibold">Tourism licence</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="bg-[#0c3b3a] text-white">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <p
            className={`${styles.eyebrow} text-sm font-semibold text-[#e4a93c]`}
          >
            What our customers say
          </p>
          <h2 className="mt-3 font-(family-name:--font-display) text-3xl font-black tracking-tight">
            Rated 4.9 across recent trips.
          </h2>
          <ul className="mt-10 grid gap-6 md:grid-cols-2">
            {REVIEWS.map((r) => (
              <li
                key={r.name}
                className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10"
              >
                <Stars value={5} />
                <p className="mt-4 text-lg leading-relaxed">“{r.text}”</p>
                <p className="mt-4 text-sm text-white/70">
                  <span className="font-semibold text-white">{r.name}</span>,{" "}
                  {r.from}. {r.trip}.
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA and footer */}
      <footer className="mx-auto max-w-6xl px-5 py-16 pb-32 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-[#e3ecea] p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-(family-name:--font-display) text-2xl font-black">
              Planning a trip? Tell us about it.
            </h2>
            <p className="mt-1 text-[#3f5653]">
              Quotes come back the same day, usually within the hour.
            </p>
          </div>
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 rounded-full bg-[#e4a93c] px-6 py-3 font-(family-name:--font-display) font-bold text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
          >
            <WhatsAppIcon />
            Message on WhatsApp
          </a>
        </div>
        <div className="mt-10 flex flex-col justify-between gap-4 text-sm text-[#7a8c89] sm:flex-row">
          <Wordmark />
          <p>
            Heavenly Travel, Langkawi, Kedah, Malaysia. {PHONE}. Reimagined from
            heavenlytravel.my by Claude Fable 5.1.
          </p>
        </div>
      </footer>
    </div>
  );
}
