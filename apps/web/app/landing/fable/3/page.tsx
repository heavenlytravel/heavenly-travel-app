/**
 * Heavenly Travel — landing page variation
 * Route: /landing/fable/3
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Direction: A road-trip itinerary page — an animated route map of Peninsular Malaysia, a leg-by-leg route board, and road-marking yellow on deep navy, set in Barlow's road-sign type.
 * Tokens used: 86,671 (72 tool calls)
 * Time taken: 9m 41s
 * Generated: 2026-09-15
 */

import type { Metadata } from "next";
import { Barlow, Barlow_Condensed } from "next/font/google";
import styles from "./page.module.css";
import { RouteMap } from "./_components/RouteMap";
import { QuoteForm } from "./_components/QuoteForm";

const display = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-display",
});

const body = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Heavenly Travel — Coach charter and cars with driver across Malaysia",
  description:
    "Langkawi-based coach charter and chauffeured car hire, now driving tour groups, families, schools and companies across the whole of Malaysia. Get a quote on WhatsApp.",
};

const PHONE = "+60 X-XXX XXXX";

const legs = [
  { stop: "Langkawi", note: "Kuah jetty, Pantai Cenang, the airport", time: "Start" },
  { stop: "Penang", note: "George Town and Batu Ferringhi", time: "ferry, then 1 h 20" },
  { stop: "Cameron Highlands", note: "Tea estates, strawberry farms, Brinchang", time: "3 h 30" },
  { stop: "Kuala Lumpur", note: "KLCC, Bukit Bintang, KLIA transfers", time: "3 h" },
  { stop: "Melaka", note: "Jonker Street and the Dutch Square", time: "2 h" },
  { stop: "Johor Bahru", note: "Legoland and the Singapore causeway", time: "2 h 30" },
];

const eastLegs = [
  { stop: "Kuantan", note: "Teluk Cempedak, from Kuala Lumpur", time: "3 h" },
  { stop: "Kuala Terengganu", note: "Crystal Mosque, Redang and Perhentian jetties", time: "2 h 30" },
  { stop: "Kota Bharu", note: "Kelantan markets and the Thai border", time: "2 h" },
];

const steps = [
  {
    title: "Tell us the trip",
    text: "Where you're starting, where you're going, the date and how many people. WhatsApp or the form below, whichever is easier.",
  },
  {
    title: "Get a quote and a vehicle suggestion",
    text: "We reply with a price for the whole trip and the vehicle we'd recommend for your group and your luggage.",
  },
  {
    title: "Confirm the booking",
    text: "Say yes, and the date is yours. Changes to the pick-up time or route can be agreed over the same chat.",
  },
  {
    title: "Your driver is waiting",
    text: "You get the driver's name and number the day before. On the day, the vehicle is at the jetty, the airport or the hotel before you are.",
  },
];

const audiences = [
  {
    who: "Tourists and families",
    what: "Airport and jetty pick-ups, island day tours, a car and driver for the week, or the long drive down to Penang and Kuala Lumpur without renting a car.",
  },
  {
    who: "Tour groups and agents",
    what: "Coaches for inbound groups, multi-day itineraries with the same driver throughout, and a partner in Langkawi who answers the phone.",
  },
  {
    who: "Companies and event organisers",
    what: "Staff outings, conference shuttles between hotel and venue, team retreats to the highlands and transfers for visiting clients.",
  },
  {
    who: "Schools and universities",
    what: "Field trips, sports fixtures and study tours with experienced drivers and vehicles suited to the group size.",
  },
];

const reasons = [
  {
    title: "Ten years of pick-ups in Langkawi",
    text: "We started on the island in 2016 and still run it every day. We know which ferry to meet and how long the airport queue really takes.",
  },
  {
    title: "Licensed, insured and looked after",
    text: "Commercially licensed vehicles and drivers, serviced on schedule. Ask us for the paperwork and we'll send it over.",
  },
  {
    title: "One conversation from quote to drop-off",
    text: "The person who quotes your trip is the person you message on the day. No call centre, no ticket numbers.",
  },
  {
    title: "Growing across Malaysia, on purpose",
    text: "Penang, the Cameron Highlands, Kuala Lumpur, Melaka, Johor and the East Coast are now regular routes. New services are on the way as we go.",
  },
];

const navLinks = [
  { href: "#services", label: "Services" },
  { href: "#routes", label: "Routes" },
  { href: "#how", label: "How it works" },
  { href: "#why", label: "Why us" },
];

const focusRing =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f5b800]";

export default function Page() {
  return (
    <div
      className={`${display.variable} ${body.variable} ${styles.page} min-h-screen antialiased font-(family-name:--font-body)`}
    >
      <a
        href="#quote"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[#0c2340] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to the quote form
      </a>

      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <a href="#top" className={`flex items-center gap-2.5 rounded-sm ${focusRing}`}>
          <Mark />
          <span className="font-(family-name:--font-display) text-2xl font-bold leading-none tracking-tight">
            Heavenly Travel
          </span>
        </a>
        <nav aria-label="Page sections" className="hidden items-center gap-7 md:flex">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`rounded-sm text-[15px] font-medium text-[#0c2340] hover:text-[#1e6b4a] ${focusRing}`}
            >
              {l.label}
            </a>
          ))}
        </nav>
        <a
          href="#quote"
          className={`inline-flex items-center rounded-md bg-[#0c2340] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#153560] ${focusRing}`}
        >
          Get a quote
        </a>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16 lg:pb-24 lg:pt-12">
          <div>
            <h1 className="font-(family-name:--font-display) text-[clamp(2.75rem,8vw,5.5rem)] font-bold leading-[0.95] tracking-tight text-[#0c2340]">
              Ten years on Langkawi&rsquo;s roads. Now the whole of Malaysia.
            </h1>
            <div className={`${styles.roadRule} mt-6 w-40`} aria-hidden="true" />
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[#3d4a58] sm:text-xl">
              Coach charter and cars with driver for tour groups, families, schools and companies.
              From the Kuah jetty to the tea estates, the capital and the East Coast, with a driver
              who knows the way.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <a
                href="#quote"
                className={`inline-flex items-center justify-center rounded-md bg-[#f5b800] px-6 py-3.5 text-base font-semibold text-[#0c2340] hover:bg-[#ffc933] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0c2340]`}
              >
                Get a quote on WhatsApp
              </a>
              <a
                href="#routes"
                className={`inline-flex items-center justify-center rounded-md border-2 border-[#0c2340] px-6 py-3 text-base font-semibold text-[#0c2340] hover:bg-white ${focusRing}`}
              >
                See the routes we drive
              </a>
            </div>
            <p className="mt-6 text-sm text-[#5b6673]">
              Based in Langkawi, Kedah. On the road since 2016. Malay and English spoken.
            </p>
          </div>
          <div className="flex justify-center lg:justify-end">
            <RouteMap />
          </div>
        </section>

        {/* Route board */}
        <section id="routes" className="scroll-mt-6 bg-[#0c2340] text-white">
          <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 lg:py-20">
            <div className="max-w-2xl">
              <h2 className="font-(family-name:--font-display) text-4xl font-bold leading-none tracking-tight sm:text-5xl">
                The road from Langkawi, leg by leg
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#b9c8d6]">
                Typical driving times between stops on a normal day. Tell us where you want to
                stop along the way and we&rsquo;ll build the itinerary around it.
              </p>
            </div>

            <h3 className="mt-12 text-sm font-semibold text-[#f5b800]">West coast and south</h3>
            <ol
              className={`${styles.board} mt-3 -mx-5 flex snap-x gap-0 overflow-x-auto px-5 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-6 lg:overflow-visible`}
            >
              {legs.map((leg, i) => (
                <li
                  key={leg.stop}
                  className="relative min-w-[210px] shrink-0 snap-start border-t-2 border-[#26466c] pr-5 pt-4 lg:min-w-0"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -top-[7px] left-0 h-3 w-3 rounded-full ${
                      i === 0 ? "bg-[#f5b800]" : "border-2 border-[#f5b800] bg-[#0c2340]"
                    }`}
                  />
                  <p className="text-sm tabular-nums text-[#f5b800]">{leg.time}</p>
                  <p className="mt-1 font-(family-name:--font-display) text-2xl font-semibold leading-tight">
                    {leg.stop}
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-[#b9c8d6]">{leg.note}</p>
                </li>
              ))}
            </ol>

            <h3 className="mt-12 text-sm font-semibold text-[#f5b800]">East coast, branching from Kuala Lumpur</h3>
            <ol
              className={`${styles.board} mt-3 -mx-5 flex snap-x gap-0 overflow-x-auto px-5 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-6 lg:overflow-visible`}
            >
              {eastLegs.map((leg) => (
                <li
                  key={leg.stop}
                  className="relative min-w-[210px] shrink-0 snap-start border-t-2 border-[#26466c] pr-5 pt-4 lg:min-w-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-[7px] left-0 h-3 w-3 rounded-full border-2 border-[#f5b800] bg-[#0c2340]"
                  />
                  <p className="text-sm tabular-nums text-[#f5b800]">{leg.time}</p>
                  <p className="mt-1 font-(family-name:--font-display) text-2xl font-semibold leading-tight">
                    {leg.stop}
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-[#b9c8d6]">{leg.note}</p>
                </li>
              ))}
              <li className="hidden lg:col-span-3 lg:flex lg:items-end lg:pb-1">
                <p className="max-w-sm text-sm leading-snug text-[#b9c8d6]">
                  Not on the map? Sabah, Sarawak and cross-border trips into Singapore and southern
                  Thailand are quoted case by case. Just ask.
                </p>
              </li>
            </ol>
            <p className="mt-6 max-w-sm text-sm leading-snug text-[#b9c8d6] lg:hidden">
              Not on the map? Sabah, Sarawak and cross-border trips into Singapore and southern
              Thailand are quoted case by case. Just ask.
            </p>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-6 mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="max-w-2xl">
            <h2 className="font-(family-name:--font-display) text-4xl font-bold leading-none tracking-tight sm:text-5xl">
              Two ways to travel, one team behind both
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-[#3d4a58]">
              Whether it&rsquo;s forty people and a coach or two people and a car, the same people
              plan the trip and the same standard applies to the vehicle and the driver.
            </p>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-5">
            {/* Coach charter */}
            <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-[#d5dee6] lg:col-span-3">
              <div className="aspect-[16/9] w-full bg-[#e4ede6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=1400&q=75&auto=format&fit=crop"
                  alt="A gold-coloured tour coach parked at the kerb under trees"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={1400}
                  height={788}
                />
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="font-(family-name:--font-display) text-3xl font-bold leading-none tracking-tight">
                  Coach charter
                </h3>
                <p className="mt-3 text-base leading-relaxed text-[#3d4a58]">
                  Air-conditioned coaches for tour groups, school trips, corporate outings, weddings
                  and events. Airport and jetty transfers for arriving groups, and multi-day
                  itineraries across the peninsula with the same driver throughout.
                </p>
                <ul className="mt-5 grid gap-2.5 text-[15px] text-[#0c2340] sm:grid-cols-2">
                  {[
                    "Minivans, mini coaches and full-size coaches",
                    "One-way, return and multi-day charters",
                    "Licensed drivers who know the routes",
                    "Luggage space planned for your group",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Tick />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>

            {/* Car with driver */}
            <article className="overflow-hidden rounded-2xl bg-[#1e6b4a] text-white lg:col-span-2">
              <div className="aspect-[16/9] w-full bg-[#175539] lg:aspect-[4/3]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1563720223185-11003d516935?w=1000&q=75&auto=format&fit=crop"
                  alt="A black SUV parked in front of a garage, seen from the front"
                  className="h-full w-full object-cover"
                  loading="lazy"
                  width={1000}
                  height={750}
                />
              </div>
              <div className="p-6 sm:p-8">
                <h3 className="font-(family-name:--font-display) text-3xl font-bold leading-none tracking-tight">
                  Car with driver
                </h3>
                <p className="mt-3 text-base leading-relaxed text-[#d7eadf]">
                  A private car and a driver who knows the island and the mainland. Airport
                  pick-ups, day tours at your own pace, business travel between cities and
                  long-distance transfers when you&rsquo;d rather not drive.
                </p>
                <ul className="mt-5 grid gap-2.5 text-[15px]">
                  {[
                    "Sedans and SUVs for up to four passengers",
                    "Hourly, daily and multi-day hire",
                    "Child seats on request",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Tick />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          </div>

          <p className="mt-8 max-w-2xl text-base leading-relaxed text-[#3d4a58]">
            More is coming as we grow. If you need something we don&rsquo;t list yet, ask anyway;
            we&rsquo;ll either arrange it or point you to someone who can.
          </p>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-6 border-y border-[#d5dee6] bg-white">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <h2 className="font-(family-name:--font-display) text-4xl font-bold leading-none tracking-tight sm:text-5xl">
              How a trip comes together
            </h2>
            <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, i) => (
                <li key={step.title} className="relative">
                  <span className="font-(family-name:--font-display) text-5xl font-bold leading-none text-[#f5b800]">
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold leading-snug text-[#0c2340]">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#3d4a58]">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Who we drive */}
        <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
            <div>
              <h2 className="font-(family-name:--font-display) text-4xl font-bold leading-none tracking-tight sm:text-5xl">
                Who rides with us
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#3d4a58]">
                Most of our week is a mix of these. Tell us which one you are and we&rsquo;ll know
                what to ask next.
              </p>
              <div className="mt-8 overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1000&q=75&auto=format&fit=crop"
                  alt="The Petronas Twin Towers and the Kuala Lumpur skyline at dusk"
                  className="aspect-[4/3] w-full object-cover"
                  loading="lazy"
                  width={1000}
                  height={750}
                />
              </div>
            </div>
            <dl className="grid gap-y-8 self-start sm:grid-cols-2 sm:gap-x-8">
              {audiences.map((a) => (
                <div key={a.who} className="border-t-2 border-[#0c2340] pt-4">
                  <dt className="text-xl font-semibold leading-snug text-[#0c2340]">{a.who}</dt>
                  <dd className="mt-2 text-[15px] leading-relaxed text-[#3d4a58]">{a.what}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Why us */}
        <section id="why" className="scroll-mt-6 bg-[#e4ede6]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <h2 className="max-w-2xl font-(family-name:--font-display) text-4xl font-bold leading-none tracking-tight sm:text-5xl">
              Why people book with a Langkawi company for the whole country
            </h2>
            <ul className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {reasons.map((r) => (
                <li key={r.title} className="flex gap-4">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-[#f5b800] ring-2 ring-[#0c2340]"
                  />
                  <div>
                    <h3 className="text-xl font-semibold leading-snug text-[#0c2340]">{r.title}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-[#3d4a58]">{r.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Quote */}
        <section id="quote" className="scroll-mt-6 bg-[#0c2340] text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-24">
            <div>
              <h2 className="font-(family-name:--font-display) text-4xl font-bold leading-none tracking-tight sm:text-5xl">
                Ask for a quote
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[#b9c8d6]">
                Fill in what you know and send it to us on WhatsApp. If you&rsquo;d rather just
                talk, message or call us directly.
              </p>
              <dl className="mt-8 grid gap-5 text-base">
                <div>
                  <dt className="text-sm text-[#b9c8d6]">WhatsApp and phone</dt>
                  <dd className="mt-0.5 text-xl font-semibold tabular-nums">{PHONE}</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#b9c8d6]">Email</dt>
                  <dd className="mt-0.5 text-xl font-semibold">hello@heavenlytravel.example</dd>
                </div>
                <div>
                  <dt className="text-sm text-[#b9c8d6]">Office</dt>
                  <dd className="mt-0.5">Kuah, Langkawi, Kedah, Malaysia</dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl bg-[#153560] p-6 sm:p-8">
              <QuoteForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#081a30] text-[#b9c8d6]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-2.5">
            <Mark light />
            <span className="font-(family-name:--font-display) text-xl font-bold leading-none text-white">
              Heavenly Travel
            </span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className={`rounded-sm hover:text-white ${focusRing}`}>
                {l.label}
              </a>
            ))}
            <a href="#quote" className={`rounded-sm hover:text-white ${focusRing}`}>
              Get a quote
            </a>
          </nav>
          <p>Langkawi, Kedah, Malaysia. Coach charter and car with driver since 2016.</p>
        </div>
      </footer>
    </div>
  );
}

function Mark({ light = false }: { light?: boolean }) {
  const ink = light ? "#ffffff" : "#0c2340";
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <circle cx="17" cy="17" r="16" fill={ink} />
      <path
        d="M9 24c3-6 5-8 8-10 3-2 5-3 8-5"
        fill="none"
        stroke="#f5b800"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 3.5"
      />
      <circle cx="9" cy="24" r="3" fill="#f5b800" />
      <circle cx="25" cy="9" r="2.5" fill="#ffffff" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <circle cx="10" cy="10" r="9" fill="#f5b800" />
      <path
        d="M6 10.5l2.6 2.5L14 7.5"
        fill="none"
        stroke="#0c2340"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
