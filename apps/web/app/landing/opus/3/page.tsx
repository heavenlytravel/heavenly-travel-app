/**
 * Heavenly Travel — landing page variation
 * Route: /landing/opus/3
 * Model: Claude Opus 5 (claude-opus-5)
 * Direction: A hybrid of opus/1 and opus/2 — the Andaman-teal sign plate hero and search plate sit over real Langkawi photography, then the expressway road runs down the page with amber route shields, the animated direction board and a drawn coach and car on dashed lines.
 * Tokens used: 106,007 (18 tool calls)
 * Time taken: 6m 42s
 * Generated: 2026-09-17
 */

import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import { Literata, Overpass } from "next/font/google";
import styles from "./landing.module.css";
import { SearchPlate } from "./_components/SearchPlate";
import { QuotePlate, WhatsAppGlyph } from "./_components/QuotePlate";

const overpass = Overpass({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-overpass",
  display: "swap",
});

const literata = Literata({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-literata",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Heavenly Travel | Coach charter and car with driver across Malaysia",
  description:
    "Coach charter and private cars with drivers for travellers, families, groups and companies, wherever you are in Malaysia. Based in Langkawi for ten years. Ask for a quote on WhatsApp.",
};

/* Design tokens (kept as literals so Tailwind can see them)
   Andaman deep #0D3B40   Expressway green #00573F   Sunset amber #F2B33D
   Asphalt      #263033   Limestone        #EEF0EA   Ink              #14272A */

const sign = "font-[family-name:var(--font-overpass)]";
const wrap = "mx-auto w-full max-w-[1240px] px-5 sm:px-8";

const HERO_IMG = "/brand/hero-langkawi.jpg";

type Dir = "up" | "upRight" | "right";

type Stop = {
  place: string;
  code: string;
  road: string;
  lead: string;
  detail: string;
  dir: Dir;
  photo?: { src: string; alt: string; width: number; height: number };
};

/* The road down the page: every stop is a pick-up as well as a drop-off. */
const stops: Stop[] = [
  {
    place: "Langkawi",
    code: "Ferry",
    road: "Kuala Perlis and Kuala Kedah jetties",
    lead: "Where we started, ten years ago.",
    detail:
      "Airport and jetty transfers, island tours, cable car mornings and wedding guests moved on time.",
    dir: "up",
    photo: {
      src: "/brand/cable-car.jpg",
      alt: "The Langkawi cable car climbing above rainforest towards Gunung Machinchang",
      width: 1621,
      height: 1080,
    },
  },
  {
    place: "Penang",
    code: "E36",
    road: "Penang Bridge",
    lead: "Heritage streets and hawker stalls.",
    detail:
      "George Town walking days, food trips and Batu Ferringhi resorts, with a driver who waits while you explore.",
    dir: "up",
  },
  {
    place: "Cameron Highlands",
    code: "59",
    road: "Tapah to Tanah Rata",
    lead: "Cool air and tea estates.",
    detail:
      "Winding hill roads are best left to someone who drives them often. Tea farms, strawberry farms and the mossy forest.",
    dir: "upRight",
  },
  {
    place: "Kuala Lumpur",
    code: "E1",
    road: "North–South Expressway",
    lead: "Conferences, KLIA and city days.",
    detail:
      "Airport runs, corporate shuttles, school trips to the museums and a day out at Batu Caves.",
    dir: "up",
    photo: {
      src: "/brand/mice.jpg",
      alt: "A corporate group arriving at a conference venue",
      width: 748,
      height: 504,
    },
  },
  {
    place: "Melaka and Johor",
    code: "E2",
    road: "Southern end of the expressway",
    lead: "Down to the end of the peninsula.",
    detail:
      "Jonker Street and river cruises, theme park days for families, and the Desaru coast for company retreats.",
    dir: "up",
  },
];

const eastStops = [
  { place: "Kuantan", note: "Cherating beaches and Sungai Pandan falls" },
  {
    place: "Kuala Terengganu",
    note: "Jetty runs for Redang and the Perhentians",
  },
  { place: "Kota Bharu", note: "Kelantan markets, crafts and culture" },
];

type Region = { name: string; code: string; places: string[] };

/* A direction board with no "you are here": every place is a pick-up or a drop-off. */
const regions: Region[] = [
  {
    name: "North",
    code: "E36",
    places: ["Langkawi", "Penang", "Alor Setar", "Ipoh"],
  },
  {
    name: "Central",
    code: "E1",
    places: ["Kuala Lumpur", "KLIA", "Genting Highlands", "Cameron Highlands"],
  },
  { name: "South", code: "E2", places: ["Melaka", "Johor Bahru", "Desaru"] },
  {
    name: "East Coast",
    code: "E8",
    places: ["Kuantan", "Kuala Terengganu", "Kota Bharu"],
  },
  {
    name: "Sabah and Sarawak",
    code: "Air",
    places: ["Kota Kinabalu", "Kuching", "Miri"],
  },
];

const points = [
  {
    title: "Ferries and flights run late. We plan for it.",
    body: "Your driver follows your ferry or flight and waits for you, so the first face you see is someone holding your name.",
  },
  {
    title: "A price is settled before the trip.",
    body: "Your quote lists the vehicle, the route, the timing and the price, so you agree to it before anything is booked.",
  },
  {
    title: "A person on WhatsApp.",
    body: "Message the same team before the trip, on the day, and if plans change halfway through it.",
  },
];

const steps = [
  {
    title: "Send us your route",
    body: "Pick-up, drop-off, date and how many people. Rough plans are fine.",
  },
  {
    title: "Get a clear quote",
    body: "We suggest the right coach or car and send a price for the whole trip.",
  },
  {
    title: "Confirm and travel",
    body: "You get your driver's name, the vehicle details and the pick-up point before the day.",
  },
];

const faqs = [
  {
    q: "Where in Malaysia can you pick me up?",
    a: "Wherever you are. We take bookings across Malaysia, and every trip starts and ends where you need it to. Tell us your pick-up point and destination and we'll plan the rest.",
  },
  {
    q: "Can you pick us up from the airport or a ferry terminal?",
    a: "Yes. Airport, jetty and hotel pick-ups are some of our most common trips, and your driver tracks your arrival time.",
  },
  {
    q: "How far ahead should I book a coach?",
    a: "As early as you can, especially for school holidays, festive seasons and large events. If your trip is soon, message us anyway and we'll check what's available.",
  },
  {
    q: "What do you need from me for a quote?",
    a: "Your dates, pick-up and drop-off points, the number of passengers and roughly how much luggage you're bringing. We'll help fill in the rest.",
  },
];

function Wordmark({ className = "" }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/logo-blue.svg"
      alt="Heavenly Travel"
      width={120}
      height={28}
      className={className}
    />
  );
}

function Arrow({ dir }: { dir: Dir }) {
  const rotate = dir === "up" ? 0 : dir === "upRight" ? 45 : 90;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="size-7 shrink-0 sm:size-8"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path
        d="M16 28V6m0 0L6 16m10-10 10 10"
        stroke="#F2B33D"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function Shield({
  children,
  outline,
  className = "",
}: {
  children: ReactNode;
  outline?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`${styles.shield} ${outline ? styles.shieldOutline : ""} ${sign} text-sm ${className}`}
    >
      {children}
    </span>
  );
}

/* Drawn vehicles on dashed road lines, carried over from opus/1. */
function CoachArt() {
  return (
    <svg
      viewBox="0 0 320 120"
      aria-hidden="true"
      className="h-auto w-full max-w-[300px]"
    >
      <rect x="8" y="22" width="296" height="74" rx="14" fill="#0D3B40" />
      <path d="M270 22h18a16 16 0 0 1 16 16v30h-34z" fill="#15525A" />
      <rect x="22" y="34" width="44" height="28" rx="4" fill="#EEF0EA" />
      <rect x="74" y="34" width="44" height="28" rx="4" fill="#EEF0EA" />
      <rect x="126" y="34" width="44" height="28" rx="4" fill="#EEF0EA" />
      <rect x="178" y="34" width="44" height="28" rx="4" fill="#EEF0EA" />
      <rect x="230" y="34" width="30" height="46" rx="4" fill="#EEF0EA" />
      <rect x="276" y="34" width="22" height="28" rx="4" fill="#EEF0EA" />
      <rect x="8" y="72" width="296" height="6" fill="#F2B33D" />
      <circle cx="66" cy="98" r="15" fill="#263033" />
      <circle cx="66" cy="98" r="6" fill="#EEF0EA" />
      <circle cx="248" cy="98" r="15" fill="#263033" />
      <circle cx="248" cy="98" r="6" fill="#EEF0EA" />
      <line
        x1="0"
        y1="114"
        x2="320"
        y2="114"
        stroke="#00573F"
        strokeWidth="2"
        strokeDasharray="14 10"
      />
    </svg>
  );
}

function CarArt() {
  return (
    <svg
      viewBox="0 0 220 100"
      aria-hidden="true"
      className="h-auto w-full max-w-[200px]"
    >
      <path
        d="M16 66c0-8 5-13 13-14l26-4 26-22c4-3 8-4 13-4h44c6 0 11 2 15 6l20 20 22 4c7 1 11 7 11 13v9c0 4-3 7-7 7H23c-4 0-7-3-7-7z"
        fill="#00573F"
      />
      <path d="M68 48l23-19c3-2 5-3 9-3h19v22z" fill="#EEF0EA" />
      <path d="M126 26h17c4 0 8 2 10 4l17 18h-44z" fill="#EEF0EA" />
      <circle cx="58" cy="80" r="13" fill="#263033" />
      <circle cx="58" cy="80" r="5" fill="#EEF0EA" />
      <circle cx="170" cy="80" r="13" fill="#263033" />
      <circle cx="170" cy="80" r="5" fill="#EEF0EA" />
      <line
        x1="0"
        y1="96"
        x2="220"
        y2="96"
        stroke="#00573F"
        strokeWidth="2"
        strokeDasharray="14 10"
      />
    </svg>
  );
}

const btnAmber = `${sign} ${styles.cta} inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#F2B33D] px-6 text-[1.0625rem] font-extrabold text-[#0D3B40] hover:bg-[#F7C766]`;

export default function HeavenlyTravelLanding() {
  return (
    <div
      className={`${overpass.variable} ${literata.variable} ${styles.root} font-[family-name:var(--font-literata)] text-[#14272A] antialiased`}
    >
      <a
        href="#main"
        className={`${sign} sr-only rounded-full bg-[#0D3B40] px-4 py-2 font-bold text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50`}
      >
        Skip to content
      </a>

      {/* ---------- Header ---------- */}
      <header
        className={`${wrap} flex items-center justify-between gap-4 py-5`}
      >
        <a href="#main" className="flex items-center gap-3">
          <Wordmark className="h-7 w-auto" />
          <span
            className={`${sign} hidden text-[0.8125rem] font-semibold text-[#00573F] sm:block`}
          >
            Coaches and cars with drivers, across Malaysia
          </span>
        </a>
        <nav
          aria-label="Main"
          className={`${sign} flex items-center gap-1 sm:gap-6`}
        >
          <ul className="hidden items-center gap-6 text-[0.9375rem] font-semibold md:flex">
            <li>
              <a className="hover:text-[#00573F] hover:underline" href="#route">
                Where we go
              </a>
            </li>
            <li>
              <a
                className="hover:text-[#00573F] hover:underline"
                href="#services"
              >
                Vehicles
              </a>
            </li>
            <li>
              <a className="hover:text-[#00573F] hover:underline" href="#how">
                How booking works
              </a>
            </li>
          </ul>
          <a
            href="#quote"
            className={`${styles.cta} rounded-full bg-[#0D3B40] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#15525A]`}
          >
            Get a quote
          </a>
        </nav>
      </header>

      <main id="main">
        {/* ---------- Hero: opus/1 sign plate over a real photo ---------- */}
        <section aria-labelledby="hero-title" className={`${wrap} pb-6`}>
          <div className="relative">
            <figure className="relative m-0 overflow-hidden rounded-[28px] bg-[#00573F]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_IMG}
                alt="Dataran Lang in Langkawi seen from the air, the eagle statue above the jetty and the teal Andaman Sea beyond"
                width={1440}
                height={810}
                className="h-[340px] w-full object-cover object-[58%_center] sm:h-[460px] lg:h-[660px]"
                fetchPriority="high"
              />
              <figcaption
                className={`${sign} absolute top-6 right-6 hidden rounded-full bg-[#0D3B40]/85 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:block`}
              >
                Dataran Lang, Langkawi
              </figcaption>
            </figure>

            <div
              className={`${styles.plate} ${styles.dark} ${styles.plateShadow} relative z-10 -mt-20 sm:mx-6 lg:absolute lg:bottom-24 lg:left-12 lg:mx-0 lg:mt-0 lg:max-w-[620px]`}
            >
              <div
                className={`${styles.plateInner} px-6 py-8 sm:px-10 sm:py-10`}
              >
                <p
                  className={`${sign} flex flex-wrap items-center gap-2.5 text-[0.8125rem] font-bold tracking-wide text-white/85 uppercase`}
                >
                  <Shield outline>E1</Shield>
                  Coach charter and car with driver
                </p>
                <h1
                  id="hero-title"
                  className={`${sign} mt-5 text-[2.75rem] leading-[1.02] font-black tracking-[-0.02em] text-white sm:text-[3.6rem] lg:text-[4.3rem]`}
                >
                  A better way to get away.
                </h1>
                <p className="mt-5 max-w-[30rem] text-[1.125rem] leading-[1.7] text-white/85">
                  Island escapes, seamless transport and trips made around you.
                  Let our local team take care of the details.
                </p>
                <p className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
                  <a href="#quote" className={btnAmber}>
                    <WhatsAppGlyph />
                    Ask for a quote
                  </a>
                  <a
                    href="#route"
                    className={`${sign} text-base font-semibold text-white underline decoration-[#F2B33D] decoration-2 underline-offset-[6px] hover:text-[#F2B33D]`}
                  >
                    See where we go
                  </a>
                </p>
              </div>
            </div>
          </div>

          {/* opus/1's second plate, opus/2's sign-panel fields */}
          <div className="relative z-20 mt-4 sm:mx-6 lg:mx-8 lg:-mt-14">
            <SearchPlate />
          </div>
        </section>

        <div aria-hidden="true" className={`${styles.roadH} mt-10 h-12`} />

        {/* ---------- The road: opus/2's drawn route, with photos ---------- */}
        <section
          id="route"
          aria-labelledby="route-title"
          className="scroll-mt-4 bg-white pt-16 pb-6 sm:pt-24"
        >
          <div className={wrap}>
            <div className="max-w-2xl">
              <h2
                id="route-title"
                className={`${sign} text-[2rem] leading-[1.05] font-black tracking-[-0.015em] text-[#0D3B40] sm:text-[2.75rem]`}
              >
                One company for the whole trip.
              </h2>
              <p className="mt-4 text-lg leading-[1.7] text-[#2B3F42]">
                Follow the road down the peninsula to see where people travel
                with us. Get picked up at any stop and dropped at any other, or
                somewhere that isn&apos;t on this map at all.
              </p>
            </div>

            <ol className="mt-14" aria-label="Destinations from north to south">
              {stops.map((stop, i) => (
                <RouteStop
                  key={stop.place}
                  stop={stop}
                  first={i === 0}
                  last={i === stops.length - 1}
                />
              ))}
            </ol>

            <EastCoastBranch />

            <p className="mx-auto mt-10 max-w-xl pb-12 text-center text-[1.0625rem] leading-[1.7] text-[#2B3F42]">
              Heading somewhere not on the map? Tell us the route. We&apos;re
              adding new destinations as we grow.
            </p>
          </div>
        </section>

        {/* ---------- Direction board: opus/1's animated board ---------- */}
        <section
          aria-labelledby="board-title"
          className={`${styles.dark} bg-[#0D3B40] text-white`}
        >
          <div className={`${wrap} py-16 lg:py-24`}>
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <h2
                id="board-title"
                className={`${sign} text-[2rem] leading-[1.08] font-black tracking-[-0.015em] sm:text-[2.5rem] lg:col-span-7`}
              >
                Wherever you are. Wherever you&apos;re going.
              </h2>
              <p className="max-w-[36rem] text-[1.0625rem] leading-[1.7] text-white/80 lg:col-span-5">
                Your trip starts where you are: a city airport, a ferry
                terminal, a hotel lobby or your front door. Our coaches and
                drivers cover the whole of Malaysia.
              </p>
            </div>

            <div className={`${styles.board} mt-12 lg:mt-16`}>
              {regions.map((region, r) => (
                <section
                  key={region.name}
                  aria-labelledby={`region-${r}`}
                  className={styles.region}
                >
                  <h3
                    id={`region-${r}`}
                    className={`${sign} flex items-center gap-2.5 text-sm font-bold text-white`}
                  >
                    <Shield>{region.code}</Shield>
                    {region.name}
                  </h3>
                  <ul
                    className={styles.places}
                    style={{ "--r": r } as CSSProperties}
                  >
                    {region.places.map((place, p) => (
                      <li
                        key={place}
                        className={`${styles.place} ${sign} text-[1.0625rem] leading-tight font-extrabold`}
                        style={{ "--i": r + p } as CSSProperties}
                      >
                        <span className={styles.dot} aria-hidden="true" />
                        {place}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <p
              className={`${sign} mt-10 border-t border-white/20 pt-6 text-sm text-white/75`}
            >
              Heading somewhere not listed?{" "}
              <a
                href="#quote"
                className="font-semibold text-[#F2B33D] underline underline-offset-4"
              >
                Ask us about your route
              </a>
            </p>
          </div>
        </section>

        {/* ---------- Services ---------- */}
        <section
          id="services"
          aria-labelledby="services-title"
          className={`${wrap} scroll-mt-4 py-20 lg:py-28`}
        >
          <div className="max-w-[44rem]">
            <h2
              id="services-title"
              className={`${sign} text-[2rem] leading-[1.08] font-black tracking-[-0.015em] text-[#0D3B40] sm:text-[2.75rem]`}
            >
              Pick the vehicle that fits your group.
            </h2>
            <p className="mt-4 text-lg leading-[1.7] text-[#2B3F42]">
              Whether it&apos;s forty colleagues heading to a retreat or a
              family of four landing late at night, there&apos;s a driver who
              has done the route before.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-end justify-between gap-6 opacity-90">
            <CoachArt />
            <CarArt />
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-12">
            <article
              className={`${styles.dark} overflow-hidden rounded-[28px] bg-[#00573F] text-white lg:col-span-7`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/coach.jpg"
                alt="Five Heavenly Travel coaches in green and yellow livery lined up under a blue sky"
                width={1620}
                height={1080}
                className="h-56 w-full object-cover sm:h-72"
                loading="lazy"
              />
              <div className="p-7 sm:p-10">
                <h3 className={`${sign} text-[1.75rem] font-black sm:text-4xl`}>
                  Coach charter
                </h3>
                <p className="mt-3 max-w-[34rem] text-[1.0625rem] leading-[1.75] text-white/90">
                  A bus and an experienced driver for everyone travelling
                  together, with luggage space and one pick-up plan. Tell us the
                  headcount and we match the coach size.
                </p>
                <ul
                  className={`${sign} mt-7 grid gap-x-8 gap-y-2.5 text-[0.9375rem] font-semibold sm:grid-cols-2`}
                >
                  {[
                    "City, island and interstate tours",
                    "Corporate trips, conferences and events",
                    "School outings and sports teams",
                    "Airport and jetty transfers for groups",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <Tick />
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#quote" className={`${btnAmber} mt-8`}>
                  Quote a coach
                </a>
              </div>
            </article>

            <article className="flex flex-col overflow-hidden rounded-[28px] border-2 border-[#0D3B40]/15 bg-white lg:col-span-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/brand/chauffeur.jpg"
                alt="The interior of a private MPV with the sea visible through the window"
                width={748}
                height={499}
                className="h-56 w-full object-cover sm:h-72"
                loading="lazy"
              />
              <div className="p-7 sm:p-10">
                <h3
                  className={`${sign} text-[1.75rem] font-black text-[#0D3B40] sm:text-4xl`}
                >
                  Car with driver
                </h3>
                <p className="mt-3 text-[1.0625rem] leading-[1.75] text-[#2B3F42]">
                  A private car and a driver on your schedule. Stop where you
                  like, for as long as you like.
                </p>
                <ul
                  className={`${sign} mt-7 grid gap-2.5 text-[0.9375rem] font-semibold`}
                >
                  {[
                    "Families and couples on holiday",
                    "Business travel between meetings",
                    "Full-day and half-day sightseeing",
                    "Airport and jetty pick-ups",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <Tick dark />
                      {item}
                    </li>
                  ))}
                </ul>
                <a
                  href="#quote"
                  className={`${sign} ${styles.cta} mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#0D3B40] px-6 text-[1.0625rem] font-extrabold text-white hover:bg-[#15525A]`}
                >
                  Quote a car
                </a>
              </div>
            </article>
          </div>

          <div className="mt-6 flex flex-col gap-2 rounded-[28px] border-[3px] border-dashed border-[#0D3B40]/30 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
            <p className={`${sign} text-xl font-extrabold text-[#0D3B40]`}>
              More ways to travel are on the way.
            </p>
            <p className="text-[1.0625rem] text-[#2B3F42]">
              Planning something bigger? Ask us, we may already be able to help.
            </p>
          </div>
        </section>

        {/* ---------- Why us ---------- */}
        <section
          aria-labelledby="why-title"
          className={`${styles.dark} bg-[#263033] py-20 text-white sm:py-28`}
        >
          <div
            className={`${wrap} grid gap-12 lg:grid-cols-[auto_1fr] lg:gap-16`}
          >
            <div className="flex items-start gap-6 lg:flex-col">
              <KmPost />
              <div>
                <h2
                  id="why-title"
                  className={`${sign} max-w-[20rem] text-[2rem] leading-[1.05] font-black tracking-[-0.015em] sm:text-[2.5rem]`}
                >
                  Ten years on the road, and still driving.
                </h2>
                <div className="mt-6 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/matta.jpg"
                    alt="MATTA member badge"
                    width={280}
                    height={230}
                    className="h-14 w-auto rounded-lg bg-white p-1"
                    loading="lazy"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="/brand/mof.jpg"
                    alt="Ministry of Finance registered badge"
                    width={280}
                    height={230}
                    className="h-14 w-auto rounded-lg bg-white p-1"
                    loading="lazy"
                  />
                  <p className={`${sign} text-sm leading-snug text-white/75`}>
                    MATTA member and Ministry of Finance registered
                  </p>
                </div>
              </div>
            </div>
            <ul className="grid content-center gap-10 md:grid-cols-3 md:gap-8">
              {points.map((p) => (
                <li key={p.title} className="border-t-4 border-[#F2B33D] pt-5">
                  <h3 className={`${sign} text-xl font-extrabold`}>
                    {p.title}
                  </h3>
                  <p className="mt-2 text-[1.0625rem] leading-[1.7] text-white/85">
                    {p.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- How booking works ---------- */}
        <section
          id="how"
          aria-labelledby="how-title"
          className="scroll-mt-4 bg-white py-20 sm:py-28"
        >
          <div className={wrap}>
            <h2
              id="how-title"
              className={`${sign} max-w-2xl text-[2rem] leading-[1.05] font-black tracking-[-0.015em] text-[#0D3B40] sm:text-[2.75rem]`}
            >
              Booking takes three messages.
            </h2>
            <div className="relative mt-12">
              <div
                aria-hidden="true"
                className={`${styles.roadH} absolute top-[26px] right-[16%] left-[4%] hidden h-3 rounded-full md:block`}
                style={{ backgroundSize: "100% 2px" }}
              />
              <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
                {steps.map((s, i) => (
                  <li key={s.title} className="relative flex gap-5 md:block">
                    <span
                      className={`${sign} relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#0D3B40] text-2xl font-black text-[#F2B33D] shadow-[inset_0_0_0_3px_#0D3B40,inset_0_0_0_5px_#fff]`}
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <div className="md:mt-5">
                      <h3 className={`${sign} text-2xl font-extrabold`}>
                        <span className="sr-only">Step {i + 1}: </span>
                        {s.title}
                      </h3>
                      <p className="mt-2 max-w-[22rem] text-[1.0625rem] leading-[1.7] text-[#2B3F42]">
                        {s.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ---------- Quote ---------- */}
        <section
          id="quote"
          aria-labelledby="quote-title"
          className={`${styles.dark} scroll-mt-4 bg-[#0D3B40] py-20 text-white sm:py-28`}
        >
          <div className={wrap}>
            <h2
              id="quote-title"
              className={`${sign} max-w-2xl text-[2rem] leading-[1.05] font-black tracking-[-0.015em] sm:text-[2.75rem]`}
            >
              Where are you headed?
            </h2>
            <p className="mt-4 mb-10 max-w-xl text-lg leading-[1.7] text-white/80">
              Fill in what you know and send it to us on WhatsApp. We&apos;ll
              reply with a vehicle suggestion and a price for the whole trip,
              not a sales call.
            </p>
            <QuotePlate />
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section
          id="faq"
          aria-labelledby="faq-title"
          className={`${wrap} ${styles.faq} scroll-mt-4 py-20 lg:py-28`}
        >
          <div className="grid gap-10 lg:grid-cols-12">
            <h2
              id="faq-title"
              className={`${sign} text-[2rem] leading-[1.08] font-black tracking-[-0.015em] text-[#0D3B40] sm:text-[2.5rem] lg:col-span-4`}
            >
              Questions people ask before booking
            </h2>
            <div className="divide-y-2 divide-[#0D3B40]/10 border-y-2 border-[#0D3B40]/10 lg:col-span-8">
              {faqs.map((item) => (
                <details key={item.q} className="group">
                  <summary
                    className={`${sign} flex cursor-pointer items-center justify-between gap-6 py-5 text-lg font-extrabold text-[#14272A] hover:text-[#00573F]`}
                  >
                    {item.q}
                    <span
                      className={`${styles.marker} flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0D3B40] text-xl leading-none text-white`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[40rem] pb-6 text-[1.0625rem] leading-[1.75] text-[#2B3F42]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className={`${styles.dark} bg-[#00573F] text-white`}>
        <div aria-hidden="true" className={`${styles.roadH} h-10`} />
        <div
          className={`${wrap} grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr]`}
        >
          <div>
            <span className="inline-flex rounded-full bg-white px-4 py-2.5">
              <Wordmark className="h-7 w-auto" />
            </span>
            <p className="mt-4 max-w-sm text-[1.0625rem] leading-[1.7] text-white/85">
              Coach charter and cars with drivers, wherever you are in Malaysia.
              Based in Langkawi, Kedah, for ten years.
            </p>
          </div>
          <div className={sign}>
            <h2 className="text-base font-extrabold">Contact</h2>
            <address className="mt-3 grid gap-2 text-[1.0625rem] not-italic text-white/90">
              <span>WhatsApp: +60 X-XXX XXXX</span>
              <span>Email: hello@example.com</span>
              <span>Langkawi, Kedah, Malaysia</span>
            </address>
          </div>
          <nav aria-label="Footer" className={sign}>
            <h2 className="text-base font-extrabold">On this page</h2>
            <ul className="mt-3 grid gap-2 text-[1.0625rem] font-semibold">
              <li>
                <a className="hover:text-[#F2B33D]" href="#route">
                  Where we go
                </a>
              </li>
              <li>
                <a className="hover:text-[#F2B33D]" href="#services">
                  Vehicles
                </a>
              </li>
              <li>
                <a className="hover:text-[#F2B33D]" href="#how">
                  How booking works
                </a>
              </li>
              <li>
                <a className="hover:text-[#F2B33D]" href="#quote">
                  Get a quote
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <p
          className={`${wrap} ${sign} border-t border-white/20 pt-6 pb-24 text-sm text-white/75`}
        >
          &copy; 2026 Heavenly Travel. Prices and availability are confirmed in
          your quote.
        </p>
      </footer>
    </div>
  );
}

function Tick({ dark }: { dark?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 size-5 shrink-0"
      fill="none"
    >
      <path
        d="M4 10.5 8 14.5 16 5.5"
        stroke={dark ? "#00573F" : "#F2B33D"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function KmPost() {
  return (
    <div
      role="img"
      aria-label="A roadside kilometre post marked 10 years"
      className={`${sign} w-24 shrink-0 overflow-hidden rounded-t-[2.2rem] rounded-b-md bg-white text-center text-[#0D3B40] sm:w-28`}
    >
      <div className="bg-[#F2B33D] pt-5 pb-2 text-sm font-extrabold">HT</div>
      <div className="pt-3 text-5xl leading-none font-black">10</div>
      <div className="pt-1 pb-4 text-sm font-bold">years</div>
    </div>
  );
}

function RouteStop({
  stop,
  first,
  last,
}: {
  stop: Stop;
  first?: boolean;
  last?: boolean;
}) {
  const roadClass = `${first ? styles.roadStart : ""} ${last ? styles.roadEnd : ""}`;
  return (
    <li className="grid grid-cols-[44px_1fr] gap-x-4 md:grid-cols-[1fr_76px_1.15fr] md:gap-x-8">
      <div className="hidden pt-5 pb-14 text-right md:block">
        <h3
          className={`${sign} text-[2.4rem] leading-none font-black tracking-[-0.015em] text-[#0D3B40]`}
        >
          {stop.place}
        </h3>
        <p
          className={`${sign} mt-3 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#2B3F42]`}
        >
          <Shield>{stop.code}</Shield>
          {stop.road}
        </p>
      </div>
      <div
        aria-hidden="true"
        className={`${styles.roadV} ${roadClass} flex justify-center`}
      >
        <span className={`${styles.stop} mt-6`} />
      </div>
      <div className="pt-5 pb-12 md:pb-14">
        <div className="md:hidden">
          <h3
            className={`${sign} text-[2rem] leading-none font-black tracking-[-0.015em] text-[#0D3B40]`}
          >
            {stop.place}
          </h3>
          <p
            className={`${sign} mt-2.5 mb-3 inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-[#2B3F42]`}
          >
            <Shield>{stop.code}</Shield>
            {stop.road}
          </p>
        </div>
        <p
          className={`${sign} flex items-center gap-3 text-xl font-bold md:pt-2`}
        >
          <Arrow dir={stop.dir} />
          {stop.lead}
        </p>
        <p className="mt-2 max-w-[30rem] text-[1.0625rem] leading-[1.7] text-[#2B3F42]">
          {stop.detail}
        </p>
        {stop.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stop.photo.src}
            alt={stop.photo.alt}
            width={stop.photo.width}
            height={stop.photo.height}
            className="mt-5 aspect-[16/10] w-full max-w-[30rem] rounded-[22px] object-cover"
            loading="lazy"
          />
        ) : null}
      </div>
    </li>
  );
}

function EastCoastBranch() {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-x-4 md:grid-cols-[1fr_76px_1.15fr] md:gap-x-8">
      <div className="hidden md:block" />
      <div aria-hidden="true" />
      <section
        aria-labelledby="east-title"
        className={`${styles.dark} ${styles.plate} ${styles.plateGreen}`}
      >
        <div className={`${styles.plateInner} px-5 py-5 sm:px-6`}>
          <p
            className={`${sign} inline-flex items-center gap-2 text-[0.9375rem] font-semibold text-white/90`}
          >
            <Shield>E8</Shield>
            Turn off at Kuala Lumpur
          </p>
          <h3
            id="east-title"
            className={`${sign} mt-2 text-3xl leading-none font-black tracking-[-0.015em] text-white`}
          >
            The East Coast
          </h3>
          <p className="mt-2 max-w-[28rem] text-[1.0625rem] leading-[1.7] text-white/90">
            Across the Titiwangsa range to the South China Sea: quieter beaches,
            island jetties and Malay heritage.
          </p>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {eastStops.map((s) => (
              <li key={s.place} className="flex gap-3 sm:block">
                <span
                  aria-hidden="true"
                  className="mt-2 size-3 shrink-0 rounded-full bg-[#F2B33D] sm:mt-0 sm:mb-2 sm:block"
                />
                <span>
                  <span
                    className={`${sign} block text-lg leading-tight font-extrabold text-white`}
                  >
                    {s.place}
                  </span>
                  <span className="mt-1 block text-[0.9375rem] leading-snug text-white/90">
                    {s.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
