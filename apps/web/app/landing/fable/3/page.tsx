/**
 * Heavenly Travel — landing page variation
 * Route: /landing/fable/3
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Direction: A hybrid of the two earlier Fable pages. From fable/1: the sea-deep teal and gold palette, the white search card overlapping the hero edge, the sand and foam section surfaces, the island-host voice and the whole-Malaysia network map. From fable/2: the huge display headline over a dashed road rule, the two-layer road stroke on the map, the board of journeys driven every week, 16px cards and 6px buttons, and the quote form that composes a WhatsApp message. Set in Overpass over the real brand photography.
 * Tokens used: 126,134 (25 tool calls)
 * Time taken: 8m 07s
 * Generated: 2026-09-17
 */

import type { Metadata } from "next";
import { Overpass, Figtree } from "next/font/google";
import styles from "./landing.module.css";
import { RouteMap } from "./_components/RouteMap";
import { SearchBar } from "./_components/SearchBar";
import { QuoteForm } from "./_components/QuoteForm";

const display = Overpass({
  subsets: ["latin"],
  weight: ["700", "900"],
  display: "swap",
});
const body = Figtree({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title:
    "Heavenly Travel | Coach charter and chauffeured cars anywhere in Malaysia",
  description:
    "Island escapes, seamless transport and trips made around you. Coach charter for groups and private cars with a driver, anywhere in Malaysia. Request a quote on WhatsApp.",
};

const WHATSAPP =
  "https://wa.me/60XXXXXXXXX?text=Hi%20Heavenly%20Travel%2C%20I%27d%20like%20a%20quote.";
const PHONE = "+60 X-XXX XXXX";

const JOURNEYS: { from: string; to: string; note: string; time: string }[] = [
  {
    from: "KLIA",
    to: "Kuala Lumpur city",
    note: "Arrivals met at the gate, any hour",
    time: "1 h",
  },
  {
    from: "Kuala Lumpur",
    to: "Cameron Highlands",
    note: "Tea estates, strawberry farms, Brinchang",
    time: "3 h 30",
  },
  {
    from: "Penang",
    to: "Ipoh",
    note: "George Town to the old town and cave temples",
    time: "2 h",
  },
  {
    from: "Kuala Lumpur",
    to: "Melaka",
    note: "Jonker Street and the Dutch Square",
    time: "2 h",
  },
  {
    from: "Johor Bahru",
    to: "Kuala Lumpur",
    note: "Legoland, the causeway, the capital",
    time: "3 h 30",
  },
  {
    from: "Kuala Lumpur",
    to: "Kuantan",
    note: "Teluk Cempedak and the East Coast road",
    time: "3 h",
  },
  {
    from: "Kuala Terengganu",
    to: "Kota Bharu",
    note: "Redang and Perhentian jetties to Kelantan",
    time: "2 h",
  },
  {
    from: "Langkawi airport",
    to: "Pantai Cenang",
    note: "Island transfers and day tours",
    time: "20 min",
  },
];

const FLEET: { seats: string; name: string; text: string }[] = [
  {
    seats: "6",
    name: "Car or MPV with driver",
    text: "Sedans and luxury MPVs for couples, families and executives. Leather seats, cold air, a boot that takes the luggage.",
  },
  {
    seats: "14",
    name: "Van",
    text: "The right size for a big family or a small team. Same driver for the whole booking.",
  },
  {
    seats: "30",
    name: "Mid coach",
    text: "School groups, church outings and conference shuttles without paying for empty seats.",
  },
  {
    seats: "44",
    name: "Full-size coach",
    text: "Our own green-and-yellow coaches for tour groups, weddings and multi-day charters.",
  },
];

const STEPS: { title: string; text: string }[] = [
  {
    title: "Tell us the trip",
    text: "Dates, group size, pick-up points and anything that matters: a wedding start time, a ferry to catch, a wheelchair on board.",
  },
  {
    title: "Get one clear price",
    text: "A written quote, usually within a working day. Tolls, fuel, parking and the driver's meals are included, so the number does not move.",
  },
  {
    title: "Travel with someone who knows the way",
    text: "Your driver's name and number arrive before the trip. On the day, one person at our office is watching your journey.",
  },
];

const INCLUDED = [
  "Driver's name and number the day before",
  "Tolls, fuel and parking in the quoted price",
  "Vehicles washed and checked before each charter",
  "Bottled water on board",
  "Passenger insurance on all vehicles",
  "An office contact reachable while you travel",
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Where do you operate?",
    a: "Anywhere in Malaysia. Pick-up can be your hotel, home, office, airport or jetty in any state. Our own coaches and drivers cover Peninsular Malaysia, and we arrange trips in Sabah and Sarawak through partners we have vetted in person. Our office happens to be in Langkawi.",
  },
  {
    q: "Can I book a car with a driver for several days?",
    a: "Yes. Multi-day hire is common for families touring the north or executives visiting several sites. The same driver stays with you for the whole booking.",
  },
  {
    q: "How far in advance should I book?",
    a: "A week is comfortable for most trips. School holidays, Hari Raya, Chinese New Year and big event weekends fill up early, so ask sooner for those dates.",
  },
  {
    q: "What happens if my flight or ferry is delayed?",
    a: "We track arrivals for airport and jetty pick-ups. Your driver waits, and we do not charge for delays that are not yours.",
  },
  {
    q: "How do I pay?",
    a: "Bank transfer, DuitNow or card. Groups usually pay a deposit to confirm and the balance before the trip. We invoice companies and schools.",
  },
];

const NAV = [
  { href: "#journeys", label: "Where we drive" },
  { href: "#services", label: "Services" },
  { href: "#how", label: "How booking works" },
  { href: "#faq", label: "Questions" },
];

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={className}
      fill="currentColor"
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21c5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm0 18.15c-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24 4.54 0 8.24 3.7 8.24 8.24 0 4.55-3.7 8.24-8.24 8.24zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.12-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}

function Tick() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="mt-0.5 h-5 w-5 shrink-0"
    >
      <circle cx="10" cy="10" r="9" fill="#e4a93c" />
      <path
        d="M6 10.5l2.6 2.5L14 7.5"
        fill="none"
        stroke="#0c3b3a"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[15px] font-semibold transition-colors";
const h2Class = `${display.className} text-[2.1rem] font-black leading-[1.02] tracking-tight sm:text-[2.75rem]`;

export default function Page() {
  return (
    <div className={`${styles.page} ${body.className}`}>
      <a
        href="#quote"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--gold)] focus:px-4 focus:py-2 focus:text-[var(--ink)]"
      >
        Skip to quote form
      </a>

      {/* Header: light, so the real wordmark sits on white */}
      <header className="border-b border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#top" className="flex items-center rounded-sm no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-blue.svg"
              alt="Heavenly Travel"
              width={120}
              height={28}
              className="h-7 w-auto"
            />
          </a>
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-7 text-sm font-medium text-[var(--ink-soft)] md:flex"
          >
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-sm no-underline hover:text-[var(--sea)]"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <a
            href={WHATSAPP}
            className={`${btnBase} bg-[var(--gold)] px-4 py-2 text-[var(--sea-deep)] no-underline hover:bg-[var(--gold-bright)]`}
          >
            <WhatsAppIcon className="h-4.5 w-4.5" />
            WhatsApp us
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero: Langkawi aerial under a sea-deep scrim */}
        <section
          className={`${styles.onDark} relative isolate overflow-hidden bg-[var(--sea-deep)] text-white`}
          aria-labelledby="hero-heading"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/hero-langkawi.jpg"
            alt=""
            width={1440}
            height={810}
            fetchPriority="high"
            className="absolute inset-0 -z-20 h-full w-full object-cover object-[70%_50%]"
          />
          <div
            aria-hidden="true"
            className={`${styles.heroScrim} absolute inset-0 -z-10`}
          />
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-12 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:items-center lg:gap-14 lg:pb-28 lg:pt-20">
            <div className="max-w-2xl">
              <h1
                id="hero-heading"
                className={`${display.className} text-[clamp(2.9rem,8.5vw,5.75rem)] font-black leading-[0.96] tracking-[-0.02em]`}
              >
                A better way to get away.
              </h1>
              <div
                className={`${styles.roadRule} mt-6 w-44`}
                aria-hidden="true"
              />
              <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-white/85 sm:text-xl">
                Island escapes, seamless transport and trips made around you.
                Let our local team take care of the details.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={WHATSAPP}
                  className={`${btnBase} bg-[var(--gold)] text-[var(--sea-deep)] no-underline hover:bg-[var(--gold-bright)]`}
                >
                  <WhatsAppIcon className="h-4.5 w-4.5" />
                  Get a quote on WhatsApp
                </a>
                <a
                  href="#journeys"
                  className={`${btnBase} border border-white/40 text-white no-underline hover:border-white/75 hover:bg-white/5`}
                >
                  See where we drive
                </a>
              </div>
              <p className="mt-6 text-sm text-white/70">
                Coach charter and cars with driver, anywhere in Malaysia. Bahasa
                Melayu, English and Mandarin spoken.
              </p>
            </div>

            <figure className="rounded-2xl border border-white/15 bg-[rgba(12,59,58,0.7)] p-4 backdrop-blur-sm sm:p-6">
              <RouteMap />
              <figcaption className="mt-2 text-xs text-white/60">
                Cities we pick up from and drive to every week. Start and finish
                anywhere with a road to it.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* Search: sits across the hero's bottom edge */}
        <div className="relative z-10 mx-auto -mt-14 max-w-6xl px-5 sm:px-8 lg:-mt-16">
          <SearchBar />
        </div>

        {/* Story on sand */}
        <section
          className="-mt-14 bg-[var(--sand)] pt-14 lg:-mt-16 lg:pt-16"
          aria-labelledby="story-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:py-24">
            <div className="lg:col-span-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/cable-car.jpg"
                alt="Langkawi cable car gondolas rising through mist above the rainforest to the SkyBridge station"
                width={1621}
                height={1080}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-2xl object-cover sm:aspect-[3/2] lg:aspect-[4/5]"
              />
            </div>
            <div className="lg:col-span-7 lg:pl-4">
              <h2 id="story-heading" className={h2Class}>
                Local knowledge, wherever you land.
              </h2>
              <div className="mt-6 max-w-[62ch] space-y-5 text-[17px] leading-relaxed text-[var(--ink-soft)]">
                <p>
                  A good driver is not just a driver. Ours know which stretch of
                  the coast road has the sunset on the right side, where the
                  clean rest stops are on the East Coast Expressway, and that a
                  ferry timetable on a public holiday is a suggestion. For ten
                  years that kind of detail has been our whole job.
                </p>
                <p>
                  Wherever your trip starts, the habits are the same: the driver
                  is briefed on your itinerary the night before, the vehicle is
                  washed inside and out, and one person at our office answers
                  the phone while you are on the road.
                </p>
                <p>
                  We are a family-run company with our office in Langkawi and
                  our coaches, cars and drivers working across all of Malaysia.
                </p>
              </div>
              <dl className="mt-8 grid gap-6 border-t border-[rgba(20,37,35,0.14)] pt-6 sm:grid-cols-[1fr_1fr_auto]">
                <div>
                  <dt className="text-sm text-[var(--ink-soft)]">Based in</dt>
                  <dd className="mt-1 font-semibold">Kuah, Langkawi</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--ink-soft)]">
                    Operating since
                  </dt>
                  <dd className="mt-1 font-semibold">2016</dd>
                </div>
                <div>
                  <dt className="text-sm text-[var(--ink-soft)]">
                    Registered with
                  </dt>
                  <dd className="mt-2 flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/matta.jpg"
                      alt="MATTA, Malaysian Association of Tour and Travel Agents, member"
                      width={280}
                      height={230}
                      loading="lazy"
                      className="h-14 w-auto rounded-md bg-white"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/brand/mof.jpg"
                      alt="Registered with the Ministry of Finance Malaysia"
                      width={280}
                      height={230}
                      loading="lazy"
                      className="h-14 w-auto rounded-md bg-white"
                    />
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        {/* Journeys board on foam */}
        <section
          id="journeys"
          className="scroll-mt-20 bg-[var(--foam)]"
          aria-labelledby="journeys-heading"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <h2 id="journeys-heading" className={h2Class}>
                Journeys we drive every week
              </h2>
              <div
                className={`${styles.roadRule} mt-5 w-28`}
                aria-hidden="true"
              />
              <p className="mt-5 text-lg leading-relaxed text-[var(--ink-soft)]">
                A few of the trips people book most, with typical driving times
                on a normal day. Start anywhere, end anywhere; tell us the stops
                in between and we&rsquo;ll build the itinerary around them.
              </p>
            </div>

            <ul
              className={`${styles.board} mt-12 -mx-5 flex snap-x gap-0 overflow-x-auto px-5 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:gap-y-12 lg:overflow-visible`}
            >
              {JOURNEYS.map((j) => (
                <li
                  key={`${j.from}-${j.to}`}
                  className="relative min-w-[230px] shrink-0 snap-start border-t-2 border-[var(--sea-soft)] pr-5 pt-4 lg:min-w-0"
                >
                  <span
                    aria-hidden="true"
                    className="absolute -top-[7px] left-0 h-3 w-3 rounded-full border-2 border-[var(--sea-deep)] bg-[var(--gold)]"
                  />
                  <p className="text-sm font-semibold tabular-nums text-[var(--sea)]">
                    {j.time}
                  </p>
                  <p
                    className={`${display.className} mt-1 text-[1.35rem] font-bold leading-tight tracking-tight text-[var(--sea-deep)]`}
                  >
                    {j.from}
                    <span
                      className="mx-1.5 text-[var(--gold-deep)]"
                      aria-hidden="true"
                    >
                      &rarr;
                    </span>
                    <span className="sr-only">to </span>
                    {j.to}
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-[var(--ink-soft)]">
                    {j.note}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-10 max-w-md text-sm leading-snug text-[var(--ink-soft)]">
              Not on the board? Sabah, Sarawak and cross-border trips into
              Singapore and southern Thailand are quoted case by case. Just ask.
            </p>
          </div>
        </section>

        {/* Services */}
        <section
          id="services"
          className="scroll-mt-20 bg-white"
          aria-labelledby="services-heading"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <h2 id="services-heading" className={h2Class}>
                Two ways to travel, one team behind both
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--ink-soft)]">
                Whether it is forty people and a wedding or one person and a
                meeting, the vehicle is clean, the driver is early, and the
                price you were quoted is the price you pay.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-5">
              {/* Coach charter: the larger panel, it is the larger business */}
              <article className="overflow-hidden rounded-2xl bg-[var(--foam)] lg:col-span-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/coach.jpg"
                  alt="Five Heavenly Travel coaches in green and yellow livery lined up under a blue sky"
                  width={1620}
                  height={1080}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="p-6 sm:p-8">
                  <h3
                    className={`${display.className} text-2xl font-black tracking-tight`}
                  >
                    Coach charter
                  </h3>
                  <p className="mt-3 max-w-[58ch] leading-relaxed text-[var(--ink-soft)]">
                    Air-conditioned coaches from 12 to 44 seats for tours,
                    school trips, corporate outings, weddings, events and
                    airport or jetty transfers. Multi-day charters come with a
                    second driver where the law and common sense require one.
                  </p>
                  <ul className="mt-5 grid gap-2.5 text-[15px] sm:grid-cols-2">
                    {[
                      "Tour groups and island day trips",
                      "Corporate and conference shuttles",
                      "School and university excursions",
                      "Wedding and event guest transport",
                      "Airport, KLIA and jetty transfers",
                      "Cross-state and multi-day charters",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Tick />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#quote"
                    className="mt-6 inline-block font-semibold text-[var(--sea)] underline hover:text-[var(--sea-deep)]"
                  >
                    Quote a coach
                  </a>
                </div>
              </article>

              <article className="overflow-hidden rounded-2xl bg-[var(--sea-deep)] text-white lg:col-span-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/chauffeur.jpg"
                  alt="The leather front seats of a chauffeured MPV, parked facing the sea and islands"
                  width={748}
                  height={499}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover lg:aspect-[4/3]"
                />
                <div className={`${styles.onDark} p-6 sm:p-8`}>
                  <h3
                    className={`${display.className} text-2xl font-black tracking-tight`}
                  >
                    Car with driver
                  </h3>
                  <p className="mt-3 leading-relaxed text-white/80">
                    A private car and a chauffeur who knows the roads, by the
                    hour, the day or the week. For families, couples, executives
                    and anyone who would rather look out of the window than at a
                    map.
                  </p>
                  <ul className="mt-5 grid gap-2.5 text-[15px]">
                    {[
                      "Sedans and MPVs, up to 6 passengers",
                      "Airport meet and greet with a name board",
                      "Full-day touring at your own pace",
                      "Multi-day hire with the same driver",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <Tick />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#quote"
                    className="mt-6 inline-block font-semibold text-[var(--gold)] underline hover:text-[var(--gold-bright)]"
                  >
                    Quote a car
                  </a>
                </div>
              </article>
            </div>

            {/* Fleet plates */}
            <h3
              className={`${display.className} mt-16 text-2xl font-black tracking-tight`}
            >
              Pick the size, not the biggest one
            </h3>
            <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FLEET.map((v) => (
                <li
                  key={v.name}
                  className="rounded-2xl border border-[var(--line)] p-5"
                >
                  <p className="flex items-baseline gap-1.5">
                    <span
                      className={`${display.className} text-5xl font-black leading-none tracking-tight text-[var(--sea)]`}
                    >
                      {v.seats}
                    </span>
                    <span className="text-sm font-semibold text-[var(--ink-soft)]">
                      seats
                    </span>
                  </p>
                  <p className="mt-3 text-lg font-semibold">{v.name}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--ink-soft)]">
                    {v.text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* How booking works */}
        <section
          id="how"
          className="scroll-mt-20 border-t border-[var(--line)] bg-white"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <h2 id="how-heading" className={h2Class}>
              How a booking works
            </h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="relative border-t-2 border-[var(--sea)] pt-5"
                >
                  <span
                    className={`${display.className} text-4xl font-black leading-none text-[var(--gold-deep)]`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 max-w-[40ch] leading-relaxed text-[var(--ink-soft)]">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-14 grid gap-8 rounded-2xl bg-[var(--sand)] p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/mice.jpg"
                  alt="The Langkawi International Convention Centre lit up at dusk, with its eagle sculpture at the entrance"
                  width={748}
                  height={504}
                  loading="lazy"
                  className="aspect-[3/2] w-full rounded-xl object-cover"
                />
              </div>
              <div className="lg:col-span-8">
                <h3
                  className={`${display.className} text-2xl font-black tracking-tight`}
                >
                  What every trip includes
                </h3>
                <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {INCLUDED.map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <Tick />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section
          id="faq"
          className="scroll-mt-20 bg-white"
          aria-labelledby="faq-heading"
        >
          <div className="mx-auto max-w-6xl px-5 pb-16 sm:px-8 lg:pb-24">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-4">
                <h2 id="faq-heading" className={h2Class}>
                  Questions people ask before booking
                </h2>
                <p className="mt-4 max-w-[40ch] leading-relaxed text-[var(--ink-soft)]">
                  Not answered here? Send it on WhatsApp and a person, not a
                  bot, will reply.
                </p>
              </div>
              <div className="border-t border-[var(--line)] lg:col-span-8">
                {FAQ.map((f) => (
                  <details
                    key={f.q}
                    className={`${styles.faq} group border-b border-[var(--line)]`}
                  >
                    <summary className="flex items-center justify-between gap-6 py-4 text-left text-lg font-semibold">
                      {f.q}
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="chev h-5 w-5 shrink-0 text-[var(--sea)]"
                        fill="currentColor"
                      >
                        <path d="M5.3 7.3 10 12l4.7-4.7 1.4 1.4L10 14.8 3.9 8.7z" />
                      </svg>
                    </summary>
                    <p className="max-w-[64ch] pb-5 leading-relaxed text-[var(--ink-soft)]">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Quote */}
        <section
          id="quote"
          className={`${styles.onDark} scroll-mt-20 bg-[var(--sea-deep)] text-white`}
          aria-labelledby="quote-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:gap-14 lg:py-24">
            <div className="lg:col-span-5">
              <h2 id="quote-heading" className={h2Class}>
                Tell us where you are going
              </h2>
              <div
                className={`${styles.roadRule} mt-5 w-28`}
                aria-hidden="true"
              />
              <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-white/85">
                Fill in what you know and send it to us on WhatsApp. A written
                quote follows, usually within one working day. No deposit is
                taken until you say yes.
              </p>
              <dl className="mt-8 grid gap-5 text-white/85">
                <div>
                  <dt className="text-sm text-white/60">WhatsApp or call</dt>
                  <dd className="mt-0.5">
                    <a
                      href={WHATSAPP}
                      className="text-xl font-semibold tabular-nums text-white no-underline hover:underline"
                    >
                      {PHONE}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-white/60">Email</dt>
                  <dd className="mt-0.5">
                    <a
                      href="mailto:hello@heavenlytravel.example"
                      className="text-white no-underline hover:underline"
                    >
                      hello@heavenlytravel.example
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-white/60">Office</dt>
                  <dd className="mt-0.5">
                    Kuah, Langkawi, Kedah. Open Monday to Saturday, 9am to 6pm.
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-2xl bg-[var(--sea-mid)] p-6 sm:p-8 lg:col-span-7">
              <QuoteForm />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div className="max-w-[44ch]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo-blue.svg"
              alt="Heavenly Travel"
              width={120}
              height={28}
              className="h-6 w-auto"
            />
            <p className="mt-3 leading-relaxed">
              Coach charter and chauffeured cars. Based in Langkawi since 2016,
              serving all of Malaysia.
            </p>
            <p className="mt-2">
              Licensed travel operator, MOTAC licence no. KPL XXXX. MATTA
              member. Registered with the Ministry of Finance.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            {NAV.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="no-underline hover:underline"
              >
                {l.label}
              </a>
            ))}
            <a href="#quote" className="no-underline hover:underline">
              Request a quote
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
