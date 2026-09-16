/**
 * Heavenly Travel — landing page variation
 * Route: /landing/opus/2
 * Model: Claude Opus 5 (claude-opus-5)
 * Direction: Coach-livery operator — bottle green and brass pinstripe, wide livery lettering, a livery-styled trip search bar and a "your pickup is confirmed" trip sheet showing the operation behind every booking, wherever in Malaysia it starts.
 * Tokens used: 57,099 (31 tool calls)
 * Time taken: 5m 39s
 * Revision 1: 84,971 tokens (22 tool calls), 2m 42s
 * Revision 1 notes: Repositioned as Malaysia-wide (Langkawi as base only), client hero title/description, added livery-styled trip search bar under the hero, reworked coverage section and FAQ.
 * Generated: 2026-09-15
 */

import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import styles from "./landing.module.css";
import { QuoteForm } from "./_components/QuoteForm";
import { TripSearch } from "./_components/TripSearch";

const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Heavenly Travel — Coach charter and cars with driver across Malaysia",
  description:
    "Coach charter and cars with driver wherever you are in Malaysia. Experienced drivers, well-kept vehicles and a local team that takes care of the details. Request a quote.",
};

const WHATSAPP_HREF = "https://wa.me/60XXXXXXXXX";

const IMG = {
  coach:
    "https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=1600&q=80&auto=format&fit=crop",
  cabin:
    "https://images.unsplash.com/photo-1494515843206-f3117d3f51b7?w=1400&q=80&auto=format&fit=crop",
  driver:
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1400&q=80&auto=format&fit=crop",
  kl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1400&q=80&auto=format&fit=crop",
};

const standards = [
  {
    title: "Drivers briefed before the day",
    body: "Experienced, licensed drivers who know your itinerary, pickup points and timings before they set off.",
  },
  {
    title: "Vehicles kept in service condition",
    body: "Air-conditioned, cleaned before each trip and maintained on schedule, so the vehicle that arrives is the one you were promised.",
  },
  {
    title: "One coordinator, start to finish",
    body: "The person who writes your quote stays with your booking and is reachable while you travel.",
  },
  {
    title: "Quotes that spell it out",
    body: "A written quote listing the vehicle, schedule and what's included, so nothing changes on the day.",
  },
];

const steps = [
  {
    title: "Tell us the trip",
    body: "Dates, pickup points, destinations and group size — by the form below or on WhatsApp.",
  },
  {
    title: "Receive a written quote",
    body: "We match the vehicle to your headcount and luggage, and list exactly what's included.",
  },
  {
    title: "Confirm your booking",
    body: "We reserve the vehicle and assign your driver and coordinator.",
  },
  {
    title: "Get driver details",
    body: "Before pickup you receive the driver's name, mobile number and vehicle registration.",
  },
  {
    title: "Travel",
    body: "Your driver arrives ahead of time. Your coordinator stays on call until the last drop-off.",
  },
];

const pickups = [
  {
    name: "Airports and ferry terminals",
    note: "Planned around your flight or sailing",
  },
  { name: "Hotels and resorts", note: "Collected from the lobby" },
  { name: "Offices and event venues", note: "Shuttles to your schedule" },
  { name: "Schools and campuses", note: "Excursions and group trips" },
  { name: "Your front door", note: "Door to door for families" },
];

const faqs = [
  {
    q: "Can you meet early flights and late ferries?",
    a: "Yes. Share your flight number or ferry schedule when you request a quote and we plan the pickup around it, including early-morning and late-night arrivals.",
  },
  {
    q: "How far ahead should we book?",
    a: "For school holidays, public holidays and large events, book as early as you can so the right vehicle is reserved. We always check short-notice requests — message us and we'll tell you honestly what's available.",
  },
  {
    q: "Where can you pick us up?",
    a: "Wherever you are in Malaysia — an airport, hotel, office, school or your home — and take you wherever you're going. Tell us both ends of the trip and we'll quote the route.",
  },
  {
    q: "What is included in the price?",
    a: "Every quote is written and itemised: the vehicle, the driver, the schedule and any extras such as tolls or waiting time. If something isn't listed, it isn't assumed.",
  },
  {
    q: "Can we change the itinerary after booking?",
    a: "Tell your coordinator as soon as plans change. We'll confirm whether the new timing or route works and update your quote in writing before the day.",
  },
];

function Photo({
  src,
  alt,
  className,
  eager,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`h-full w-full object-cover ${className ?? ""}`}
    />
  );
}

const btnPrimary =
  "inline-flex items-center justify-center rounded-[3px] bg-[#c49a3c] px-6 py-3.5 font-semibold text-[#0a2a22] transition-colors hover:bg-[#d4ab50]";
const btnSolid =
  "inline-flex items-center justify-center rounded-[3px] bg-[#0e3a2f] px-6 py-3.5 font-semibold text-white transition-colors hover:bg-[#15503f]";
const btnGhostDark =
  "inline-flex items-center justify-center rounded-[3px] border border-white/45 px-6 py-3.5 font-semibold text-white transition-colors hover:bg-white/10";

export default function Page() {
  return (
    <div className={`${archivo.variable} ${styles.page}`}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-[#0a2a22]"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="bg-[#0e3a2f] text-white">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <a href="#" className="flex items-baseline gap-2">
            <span className={`${styles.wide} text-lg font-bold sm:text-xl`}>
              Heavenly Travel
            </span>
          </a>
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex gap-7 text-[0.95rem] text-white/85">
              <li>
                <a href="#services" className="hover:text-white">
                  Services
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-white">
                  How booking works
                </a>
              </li>
              <li>
                <a href="#coverage" className="hover:text-white">
                  Where we operate
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-white">
                  Questions
                </a>
              </li>
            </ul>
          </nav>
          <a
            href="#quote"
            className="rounded-[3px] border border-[#c49a3c] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c49a3c] hover:text-[#0a2a22]"
          >
            Request a quote
          </a>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section
          aria-labelledby="hero-title"
          className="bg-[#0e3a2f] text-white"
        >
          <div className="mx-auto grid max-w-[1200px] lg:grid-cols-[1.05fr_1fr]">
            <div className="px-5 pb-14 pt-12 sm:px-8 sm:pt-20 lg:pb-24">
              <p className="text-[0.95rem] text-[#e2c47f]">
                Coach charter and cars with driver, wherever you are in Malaysia
              </p>
              <h1
                id="hero-title"
                className={`${styles.wide} mt-5 text-[2.35rem] font-bold leading-[1.04] sm:text-[3.4rem] lg:text-[4.1rem]`}
              >
                A better way to get away.
              </h1>
              <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-white/80">
                Island escapes, seamless transport and trips made around you.
                Let our local team take care of the details.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#quote" className={btnPrimary}>
                  Request a quote
                </a>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={btnGhostDark}
                >
                  Message us on WhatsApp
                </a>
              </div>
            </div>

            <div className="relative min-h-[420px] lg:min-h-0">
              <Photo
                src={IMG.coach}
                eager
                alt="Close view of a polished champagne-gold coach parked at the kerb"
                className="absolute inset-0"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gradient-to-t from-[#0e3a2f]/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-[#0e3a2f]/60"
              />
              {/* Trip sheet: what every client receives before pickup */}
              <figure className="absolute bottom-5 left-5 right-5 max-w-[360px] rounded-md bg-white p-5 text-[#0a2a22] shadow-[0_18px_40px_-12px_rgba(6,30,23,0.55)] sm:bottom-8 sm:left-auto sm:right-8 lg:bottom-20">
                <figcaption className="flex items-center justify-between gap-3 border-b border-[#0e3a2f]/15 pb-3">
                  <span className={`${styles.semi} font-semibold`}>
                    Your pickup is confirmed
                  </span>
                  <span className="rounded-full bg-[#0e3a2f] px-2.5 py-0.5 text-xs font-medium text-white">
                    Sent before pickup
                  </span>
                </figcaption>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-[0.92rem]">
                  <dt className="text-[#4f5b56]">Pickup</dt>
                  <dd>07:30, hotel lobby</dd>
                  <dt className="text-[#4f5b56]">Vehicle</dt>
                  <dd>Coach, registration included</dd>
                  <dt className="text-[#4f5b56]">Driver</dt>
                  <dd>Name and mobile number</dd>
                  <dt className="text-[#4f5b56]">Coordinator</dt>
                  <dd>On call until drop-off</dd>
                </dl>
              </figure>
            </div>
          </div>
          <div className="mx-auto max-w-[1200px] px-5 pb-12 pt-10 sm:px-8 lg:relative lg:z-10 lg:-mt-12 lg:pt-0">
            <h2 id="search-title" className="sr-only">
              Search for a vehicle
            </h2>
            <TripSearch />
          </div>
        </section>

        <div className={styles.stripe} aria-hidden="true" />

        {/* Standards */}
        <section
          aria-labelledby="standards-title"
          className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24"
        >
          <div className="max-w-[40rem]">
            <h2
              id="standards-title"
              className={`${styles.wide} text-[1.85rem] font-bold leading-tight sm:text-[2.6rem]`}
            >
              The standard on every trip
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#4f5b56]">
              Ten years of running group and private transport taught us that
              one car to the airport and a convoy of coaches for a conference
              deserve the same care.
            </p>
          </div>
          <ul className="mt-12 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {standards.map((s) => (
              <li
                key={s.title}
                className="border-t-[3px] border-[#c49a3c] pt-5"
              >
                <h3
                  className={`${styles.semi} text-lg font-semibold leading-snug`}
                >
                  {s.title}
                </h3>
                <p className="mt-2.5 leading-relaxed text-[#4f5b56]">
                  {s.body}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* Services */}
        <section
          id="services"
          aria-labelledby="services-title"
          className="bg-white"
        >
          <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24">
            <h2
              id="services-title"
              className={`${styles.wide} max-w-[40rem] text-[1.85rem] font-bold leading-tight sm:text-[2.6rem]`}
            >
              Two ways to travel with us
            </h2>

            <article className="mt-14 grid items-stretch gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md lg:aspect-auto">
                <Photo
                  src={IMG.cabin}
                  alt="Passengers seated in a coach with blue high-back seats"
                  className="absolute inset-0"
                />
              </div>
              <div className="lg:py-6">
                <h3
                  className={`${styles.wide} text-2xl font-bold sm:text-[2rem]`}
                >
                  Coach charter
                </h3>
                <p className="mt-4 text-lg leading-relaxed text-[#4f5b56]">
                  For sightseeing tours, company trips, school outings, weddings
                  and event shuttles. Give us your headcount and luggage and
                  we&apos;ll size the coach to fit — no half-empty buses, no
                  squeezing in.
                </p>
                <h4 className="mt-8 font-semibold">Booked for</h4>
                <ul className="mt-3 divide-y divide-[#0e3a2f]/12 border-y border-[#0e3a2f]/12">
                  {[
                    "City, highland and island sightseeing tours",
                    "Corporate retreats, conferences and incentive trips",
                    "School and university excursions",
                    "Group transfers from airports and ferry jetties",
                  ].map((item) => (
                    <li key={item} className="py-3">
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#quote" className={`${btnSolid} mt-8`}>
                  Quote a coach charter
                </a>
              </div>
            </article>

            <article className="mt-20 grid items-stretch gap-8 lg:grid-cols-[1fr_1.15fr] lg:gap-14">
              <div className="relative aspect-[4/3] overflow-hidden rounded-md lg:order-2 lg:aspect-auto">
                <Photo
                  src={IMG.driver}
                  alt="A driver's hands on the steering wheel of a car at dusk"
                  className="absolute inset-0"
                />
              </div>
              <div className="lg:order-1 lg:py-6">
                <h3
                  className={`${styles.wide} text-2xl font-bold sm:text-[2rem]`}
                >
                  Car with driver
                </h3>
                <p className="mt-4 text-lg leading-relaxed text-[#4f5b56]">
                  A private car and a professional driver — for a single
                  transfer, a few hours or the whole day. For families, VIP
                  guests and business travellers who would rather arrive than
                  navigate.
                </p>
                <h4 className="mt-8 font-semibold">Booked for</h4>
                <ul className="mt-3 divide-y divide-[#0e3a2f]/12 border-y border-[#0e3a2f]/12">
                  {[
                    "Airport and ferry terminal pickups",
                    "Full-day sightseeing at your own pace",
                    "Business meetings and hotel transfers",
                    "Guests of events, weddings and delegations",
                  ].map((item) => (
                    <li key={item} className="py-3">
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#quote" className={`${btnSolid} mt-8`}>
                  Quote a car with driver
                </a>
              </div>
            </article>

            <p className="mt-16 max-w-[44rem] border-l-[3px] border-[#c49a3c] pl-5 text-[#4f5b56]">
              More travel services are on the way as we grow. If your plans need
              something beyond a coach or a car, ask us — we&apos;ll tell you
              straight whether we can help.
            </p>
          </div>
        </section>

        {/* How booking works */}
        <section
          id="how-it-works"
          aria-labelledby="how-title"
          className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-24"
        >
          <div className="max-w-[40rem]">
            <h2
              id="how-title"
              className={`${styles.wide} text-[1.85rem] font-bold leading-tight sm:text-[2.6rem]`}
            >
              How a booking runs
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#4f5b56]">
              Five steps from first message to final drop-off. You always know
              who is driving and who to call.
            </p>
          </div>
          <ol
            className={`${styles.route} mt-14 grid gap-9 min-[900px]:grid-cols-5 min-[900px]:gap-6`}
          >
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="relative grid grid-cols-[40px_1fr] gap-x-5 min-[900px]:block"
              >
                <span
                  className={`${styles.semi} relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-[#c49a3c] bg-[#0e3a2f] text-[0.95rem] font-bold text-white`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <div className="min-[900px]:mt-5">
                  <h3
                    className={`${styles.semi} text-lg font-semibold leading-snug`}
                  >
                    <span className="sr-only">Step {i + 1}: </span>
                    {step.title}
                  </h3>
                  <p className="mt-2 leading-relaxed text-[#4f5b56]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Coverage */}
        <section
          id="coverage"
          aria-labelledby="coverage-title"
          className="bg-[#0e3a2f] text-white"
        >
          <div className="mx-auto grid max-w-[1200px] lg:grid-cols-2">
            <div className="relative min-h-[300px] sm:min-h-[380px]">
              <Photo
                src={IMG.kl}
                alt="Kuala Lumpur skyline with the Petronas Twin Towers at dusk"
                className="absolute inset-0"
              />
            </div>
            <div className="px-5 py-16 sm:px-8 sm:py-20 lg:px-14">
              <h2
                id="coverage-title"
                className={`${styles.wide} text-[1.85rem] font-bold leading-tight sm:text-[2.4rem]`}
              >
                Wherever you are. Wherever you&apos;re going.
              </h2>
              <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-white/80">
                Tell us where to collect you and where the day ends — in any
                state, city or island in Malaysia. We plan the route, the
                vehicle and the timings around your trip.
              </p>
              <h3 className="mt-9 text-[0.95rem] text-[#e2c47f]">
                Where we collect you
              </h3>
              <ul className="mt-3 border-t border-white/20">
                {pickups.map((r) => (
                  <li
                    key={r.name}
                    className="flex flex-col gap-0.5 border-b border-white/20 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                  >
                    <span className={`${styles.semi} font-semibold`}>
                      {r.name}
                    </span>
                    <span className="text-[0.95rem] text-white/70 sm:text-right">
                      {r.note}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className="mx-auto grid max-w-[1200px] gap-10 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.6fr] lg:gap-16"
        >
          <div>
            <h2
              id="faq-title"
              className={`${styles.wide} text-[1.85rem] font-bold leading-tight sm:text-[2.6rem]`}
            >
              Before you book
            </h2>
            <p className="mt-4 max-w-[26rem] text-lg leading-relaxed text-[#4f5b56]">
              The questions organisers ask us most. Anything else, ask on
              WhatsApp.
            </p>
          </div>
          <div className="border-t border-[#0e3a2f]/20">
            {faqs.map((f) => (
              <details
                key={f.q}
                className={`${styles.faq} border-b border-[#0e3a2f]/20`}
              >
                <summary className="flex items-start justify-between gap-6 py-5 text-lg font-semibold">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className={`${styles.mark} mt-0.5 text-2xl leading-none text-[#7d5a14]`}
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-[40rem] pb-6 leading-relaxed text-[#4f5b56]">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        <div className={styles.stripe} aria-hidden="true" />

        {/* Quote */}
        <section
          id="quote"
          aria-labelledby="quote-title"
          className="bg-[#0e3a2f] text-white"
        >
          <div className="mx-auto grid max-w-[1200px] gap-12 px-5 py-20 sm:px-8 sm:py-24 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <h2
                id="quote-title"
                className={`${styles.wide} text-[1.85rem] font-bold leading-tight sm:text-[2.6rem]`}
              >
                Request a quote
              </h2>
              <p className="mt-5 max-w-[30rem] text-lg leading-relaxed text-white/80">
                Share the basics and we&apos;ll come back with a written quote.
                Prefer to talk it through? Our coordinators are on WhatsApp.
              </p>
              <dl className="mt-10 space-y-5">
                <div>
                  <dt className="text-sm text-white/60">WhatsApp and phone</dt>
                  <dd className={`${styles.semi} mt-1 text-xl font-semibold`}>
                    <a
                      href={WHATSAPP_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline decoration-[#c49a3c] decoration-2 underline-offset-4 hover:text-[#e2c47f]"
                    >
                      +60 X-XXX XXXX
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-white/60">Office</dt>
                  <dd className="mt-1">
                    Based in Langkawi, serving all of Malaysia
                  </dd>
                </div>
              </dl>
            </div>
            <QuoteForm />
          </div>
        </section>
      </main>

      <footer className="bg-[#0a2a22] text-white/70">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-5 pb-24 pt-8 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>
            <span className={`${styles.wide} font-bold text-white`}>
              Heavenly Travel
            </span>
            <span className="ml-3">
              Based in Langkawi, serving all of Malaysia
            </span>
          </p>
          <p>&copy; 2026 Heavenly Travel</p>
        </div>
      </footer>
    </div>
  );
}
