/**
 * Heavenly Travel — landing page variation
 * Route: /landing/opus/1
 * Model: Claude Opus 5 (claude-opus-5)
 * Direction: Malaysian road-sign vernacular meets island hospitality: a signage-plate hero and booking search over a kite photo, and a regional direction-sign board showing pick-ups and drop-offs anywhere in Malaysia.
 * Tokens used: 62,854 (31 tool calls)
 * Time taken: 7m 18s
 * Revision 1: 97,821 tokens (40 tool calls), 4m 28s
 * Revision 1 notes: Removed Langkawi-as-origin framing (route line became a regional destination sign board), set the required hero copy, added a sign-plate booking search bar under the hero.
 * Generated: 2026-09-15
 */

import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Literata, Overpass } from "next/font/google";
import styles from "./landing.module.css";
import { BookingSearch } from "./_components/BookingSearch";

const overpass = Overpass({
  subsets: ["latin"],
  weight: ["400", "600", "800", "900"],
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
    "Coach charter and private cars with drivers for travellers, families, groups and companies, wherever you are in Malaysia. Based in Langkawi for ten years. Request a quote.",
};

/* Design tokens (kept as literals so Tailwind can see them)
   Andaman deep  #0D3B40   Limestone  #EEF0EA   Sea glass #D5E3DC
   Mangrove      #2E5E4E   Kite       #9C4A22   Sunset    #F2B33D
   Ink           #14272A */

const sign = "font-[family-name:var(--font-overpass)]";
const wrap = "mx-auto w-full max-w-[1240px] px-5 sm:px-8";

const HERO_IMG =
  "https://images.unsplash.com/photo-1575397721733-c58fa48e80ff?auto=format&fit=crop&w=2000&q=75";
const HIGHLANDS_IMG =
  "https://images.unsplash.com/photo-1588387695597-87bfcf4cd1bf?auto=format&fit=crop&w=1200&q=75";

type Region = { name: string; places: string[] };

// A direction sign with no "you are here": every place is a possible pick-up or drop-off.
const regions: Region[] = [
  { name: "North", places: ["Langkawi", "Penang", "Alor Setar", "Ipoh"] },
  { name: "Central", places: ["Kuala Lumpur", "KLIA", "Genting Highlands", "Cameron Highlands"] },
  { name: "South", places: ["Melaka", "Johor Bahru", "Desaru"] },
  { name: "East Coast", places: ["Kuantan", "Kuala Terengganu", "Kota Bharu"] },
  { name: "Sabah and Sarawak", places: ["Kota Kinabalu", "Kuching", "Miri"] },
];

const lessons = [
  {
    title: "Ferries and flights run late. We plan for it.",
    body: "Arrival times are a guess. Our drivers follow your ferry or flight and wait for you, so the first face you see is someone holding your name.",
  },
  {
    title: "A price should be settled before the trip.",
    body: "You get a clear quote for the vehicle, the driver and the route before you book. No working it out at the end of the day.",
  },
  {
    title: "Knowing the road means knowing the stops.",
    body: "Where to have lunch, which viewpoint is worth the detour, when to leave to beat the traffic. That habit goes with every driver, on every road in the country.",
  },
];

const steps = [
  {
    title: "Send us your trip",
    body: "Message us on WhatsApp or use the form: dates, pickup and drop-off, and how many people.",
  },
  {
    title: "Get a clear quote",
    body: "We suggest the right coach or car for your group and send a price for the whole trip.",
  },
  {
    title: "Confirm your booking",
    body: "Before the day, you receive your driver's name, the vehicle details and the pickup point.",
  },
  {
    title: "Meet your driver",
    body: "At the airport, the ferry terminal, your hotel lobby or the office gate. Then sit back.",
  },
];

const faqs = [
  {
    q: "Where in Malaysia can you pick me up?",
    a: "Wherever you are. We take bookings across Malaysia, and every trip starts and ends where you need it to. Tell us your pick-up point and destination and we'll plan the rest.",
  },
  {
    q: "Can you pick us up from the airport or a ferry terminal?",
    a: "Yes. Airport, ferry terminal and hotel pickups are some of our most common trips, and your driver tracks your arrival time.",
  },
  {
    q: "How far ahead should I book a coach?",
    a: "As early as you can, especially for school holidays, festive seasons and large events. If your trip is soon, message us anyway and we'll check what's available.",
  },
  {
    q: "What do you need from me for a quote?",
    a: "Your dates, pickup and drop-off points, the number of passengers and roughly how much luggage you're bringing. Rough plans are fine; we'll help fill in the rest.",
  },
];

function KiteMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={className}>
      <rect width="40" height="40" rx="9" fill="#0D3B40" />
      <rect x="2.5" y="2.5" width="35" height="35" rx="7" fill="none" stroke="#fff" strokeWidth="1.5" />
      <path
        d="M7 19c4.5-1.2 8.5-.4 11.6 2.2L20 23l1.4-1.8C24.5 18.6 28.5 17.8 33 19c-4 .6-7.4 2.6-9.6 5.8L20 30l-3.4-5.2C14.4 21.6 11 19.6 7 19z"
        fill="#F2B33D"
      />
    </svg>
  );
}

function CoachArt() {
  return (
    <svg viewBox="0 0 320 120" aria-hidden="true" className="h-auto w-full max-w-[340px]">
      <rect x="8" y="22" width="296" height="74" rx="14" fill="#0D3B40" />
      <path d="M270 22h18a16 16 0 0 1 16 16v30h-34z" fill="#15525A" />
      <rect x="22" y="34" width="44" height="28" rx="4" fill="#D5E3DC" />
      <rect x="74" y="34" width="44" height="28" rx="4" fill="#D5E3DC" />
      <rect x="126" y="34" width="44" height="28" rx="4" fill="#D5E3DC" />
      <rect x="178" y="34" width="44" height="28" rx="4" fill="#D5E3DC" />
      <rect x="230" y="34" width="30" height="46" rx="4" fill="#D5E3DC" />
      <rect x="276" y="34" width="22" height="28" rx="4" fill="#D5E3DC" />
      <rect x="8" y="72" width="296" height="6" fill="#F2B33D" />
      <circle cx="66" cy="98" r="15" fill="#14272A" />
      <circle cx="66" cy="98" r="6" fill="#EEF0EA" />
      <circle cx="248" cy="98" r="15" fill="#14272A" />
      <circle cx="248" cy="98" r="6" fill="#EEF0EA" />
      <line x1="0" y1="114" x2="320" y2="114" stroke="#2E5E4E" strokeWidth="2" strokeDasharray="14 10" />
    </svg>
  );
}

function CarArt() {
  return (
    <svg viewBox="0 0 220 100" aria-hidden="true" className="h-auto w-full max-w-[220px]">
      <path
        d="M16 66c0-8 5-13 13-14l26-4 26-22c4-3 8-4 13-4h44c6 0 11 2 15 6l20 20 22 4c7 1 11 7 11 13v9c0 4-3 7-7 7H23c-4 0-7-3-7-7z"
        fill="#9C4A22"
      />
      <path d="M68 48l23-19c3-2 5-3 9-3h19v22z" fill="#EEF0EA" />
      <path d="M126 26h17c4 0 8 2 10 4l17 18h-44z" fill="#EEF0EA" />
      <circle cx="58" cy="80" r="13" fill="#14272A" />
      <circle cx="58" cy="80" r="5" fill="#EEF0EA" />
      <circle cx="170" cy="80" r="13" fill="#14272A" />
      <circle cx="170" cy="80" r="5" fill="#EEF0EA" />
      <line x1="0" y1="96" x2="220" y2="96" stroke="#2E5E4E" strokeWidth="2" strokeDasharray="14 10" />
    </svg>
  );
}

const btnPrimary = `${sign} inline-flex min-h-12 items-center justify-center rounded-full bg-[#F2B33D] px-6 text-[1.0625rem] font-extrabold text-[#0D3B40] transition-colors hover:bg-[#F7C766]`;

const fieldLabel = `${sign} mb-1.5 block text-sm font-semibold text-white`;
const fieldInput =
  "block w-full rounded-lg border-2 border-white/25 bg-[#0A3035] px-3.5 py-3 text-base text-white placeholder:text-white/55 focus:border-[#F2B33D] focus:outline-none";

export default function HeavenlyTravelLanding() {
  return (
    <div
      className={`${overpass.variable} ${literata.variable} ${styles.root} min-h-screen bg-[#EEF0EA] font-[family-name:var(--font-literata)] text-[#14272A] antialiased`}
    >
      <a
        href="#main"
        className={`${sign} sr-only rounded-md bg-[#0D3B40] px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50`}
      >
        Skip to content
      </a>

      {/* ---------- Header ---------- */}
      <header className={`${wrap} flex items-center justify-between gap-4 py-5`}>
        <a href="#" className={`${sign} flex items-center gap-3 text-[#0D3B40]`}>
          <KiteMark className="size-10 shrink-0" />
          <span className="leading-tight">
            <span className="block text-lg font-black tracking-tight">Heavenly Travel</span>
            <span className="hidden text-[0.8125rem] font-semibold text-[#2E5E4E] sm:block">
              Coaches and cars with drivers, across Malaysia
            </span>
          </span>
        </a>
        <nav aria-label="Main" className={`${sign} hidden items-center gap-7 text-[0.9375rem] font-semibold md:flex`}>
          <a href="#services" className="text-[#14272A] hover:text-[#9C4A22]">
            Services
          </a>
          <a href="#island" className="text-[#14272A] hover:text-[#9C4A22]">
            Our story
          </a>
          <a href="#booking" className="text-[#14272A] hover:text-[#9C4A22]">
            How booking works
          </a>
          <a href="#faq" className="text-[#14272A] hover:text-[#9C4A22]">
            Questions
          </a>
        </nav>
        <a
          href="#quote"
          className={`${sign} inline-flex min-h-11 shrink-0 items-center rounded-full bg-[#0D3B40] px-5 text-[0.9375rem] font-bold text-white hover:bg-[#15525A]`}
        >
          Get a quote
        </a>
      </header>

      <main id="main">
        {/* ---------- Hero ---------- */}
        <section aria-labelledby="hero-title" className={`${wrap} pb-6`}>
          <div className="relative">
            <figure className="relative m-0 overflow-hidden rounded-[28px] bg-[#2E5E4E]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HERO_IMG}
                alt="A brahminy kite gliding low over green water, with forested hills and an old wooden jetty behind"
                className="h-[340px] w-full object-cover object-[60%_center] sm:h-[460px] lg:h-[700px]"
                fetchPriority="high"
              />
              <figcaption
                className={`${sign} absolute right-6 top-6 hidden rounded-full bg-[#0D3B40]/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-sm sm:block`}
              >
                A brahminy kite over Langkawi waters
              </figcaption>
            </figure>

            <div
              className={`${styles.dark} relative z-10 -mt-20 rounded-[22px] bg-[#0D3B40] p-2 sm:mx-6 lg:absolute lg:bottom-28 lg:left-14 lg:mx-0 lg:mt-0 lg:max-w-[600px]`}
            >
              <div className={`${styles.plate} rounded-[16px] px-6 py-8 sm:px-10 sm:py-10`}>
                <h1
                  id="hero-title"
                  className={`${sign} text-[2.75rem] font-black leading-[1.02] tracking-[-0.02em] text-white sm:text-[3.75rem] lg:text-[4.5rem]`}
                >
                  A better way to get away.
                </h1>
                <p className="mt-5 max-w-[30rem] text-[1.125rem] leading-[1.7] text-white/85">
                  Island escapes, seamless transport and trips made around you. Let our local team take care of the
                  details.
                </p>
                <p className="mt-6">
                  <a
                    href="#quote"
                    className={`${sign} text-base font-semibold text-white underline decoration-[#F2B33D] decoration-2 underline-offset-[6px] hover:text-[#F2B33D]`}
                  >
                    Prefer to talk it through? Message our team
                  </a>
                </p>
              </div>
            </div>
          </div>

          <div className="relative z-20 mt-4 sm:mx-6 lg:-mt-16 lg:mx-8">
            <BookingSearch />
          </div>
        </section>

        {/* ---------- Direction board (the memorable thing) ---------- */}
        <section
          aria-labelledby="route-title"
          className={`${styles.dark} mt-10 bg-[#0D3B40] text-white lg:mt-16`}
        >
          <div className={`${wrap} py-14 lg:py-20`}>
            <div className="grid gap-6 lg:grid-cols-12 lg:items-end">
              <h2
                id="route-title"
                className={`${sign} text-[2rem] font-black leading-[1.08] tracking-[-0.015em] sm:text-[2.5rem] lg:col-span-7`}
              >
                Wherever you are. Wherever you&apos;re going.
              </h2>
              <p className="max-w-[36rem] text-[1.0625rem] leading-[1.7] text-white/80 lg:col-span-5">
                Your trip starts where you are: a city airport, a ferry terminal, a hotel lobby or your front door.
                Our coaches and drivers cover the whole of Malaysia.
              </p>
            </div>

            <div className={`${styles.board} mt-12 lg:mt-16`}>
              {regions.map((region, r) => (
                  <section key={region.name} aria-labelledby={`region-${r}`} className={styles.region}>
                    <h3 id={`region-${r}`} className={`${sign} text-sm font-bold text-[#F2B33D]`}>
                      {region.name}
                    </h3>
                    <ul
                      className={styles.places}
                      style={{ "--r": r } as CSSProperties}
                    >
                      {region.places.map((place, p) => (
                        <li
                          key={place}
                          className={`${styles.place} ${sign} text-[1.0625rem] font-extrabold leading-tight`}
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
              <a href="#quote" className="font-semibold text-[#F2B33D] underline underline-offset-4">
                Ask us about your route
              </a>
            </p>
          </div>
        </section>

        {/* ---------- Services ---------- */}
        <section id="services" aria-labelledby="services-title" className={`${wrap} scroll-mt-6 py-20 lg:py-28`}>
          <div className="max-w-[44rem]">
            <h2
              id="services-title"
              className={`${sign} text-[2rem] font-black leading-[1.08] tracking-[-0.015em] text-[#0D3B40] sm:text-[2.75rem]`}
            >
              Two ways to travel with us, for now
            </h2>
            <p className="mt-4 text-lg leading-[1.7] text-[#2B3F42]">
              Whether it&apos;s forty colleagues heading to a team retreat or a family of four landing late at
              night, there&apos;s a driver who has done the route before.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-12">
            <article className="rounded-[28px] bg-[#D5E3DC] p-7 sm:p-10 lg:col-span-7">
              <CoachArt />
              <h3 className={`${sign} mt-8 text-[1.75rem] font-black text-[#0D3B40]`}>Coach charter</h3>
              <p className="mt-3 max-w-[36rem] text-[1.0625rem] leading-[1.75]">
                A bus and an experienced driver for your whole group, on your schedule. Tell us how many people
                are travelling and we&apos;ll match the coach to the headcount and the luggage.
              </p>
              <h4 className={`${sign} mt-7 text-base font-bold text-[#0D3B40]`}>Groups we often carry</h4>
              <ul className={`${sign} mt-3 grid gap-x-8 gap-y-2.5 text-[0.9375rem] sm:grid-cols-2`}>
                {[
                  "City, island and interstate tours",
                  "Corporate trips and retreats",
                  "School trips and sports teams",
                  "Weddings, conferences and events",
                  "Airport and ferry terminal transfers",
                  "Tour operators and travel agents",
                ].map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-[0.55em] size-2 shrink-0 rounded-full bg-[#9C4A22]" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </article>

            <article className="flex flex-col rounded-[28px] border-2 border-[#0D3B40]/15 bg-white/60 p-7 sm:p-10 lg:col-span-5">
              <CarArt />
              <h3 className={`${sign} mt-8 text-[1.75rem] font-black text-[#0D3B40]`}>Car with driver</h3>
              <p className="mt-3 text-[1.0625rem] leading-[1.75]">
                A private car and a driver for as long as you need. An airport pickup, a full day of
                sightseeing, or a long drive between states while you look out of the window.
              </p>
              <h4 className={`${sign} mt-7 text-base font-bold text-[#0D3B40]`}>Good for</h4>
              <ul className={`${sign} mt-3 grid gap-2.5 text-[0.9375rem]`}>
                {["Families and couples on holiday", "Business travellers and VIP guests", "Day trips and sightseeing"].map(
                  (item) => (
                    <li key={item} className="flex gap-3">
                      <span className="mt-[0.55em] size-2 shrink-0 rounded-full bg-[#9C4A22]" aria-hidden="true" />
                      {item}
                    </li>
                  ),
                )}
              </ul>
            </article>
          </div>

          <p className="mt-8 max-w-[46rem] border-l-4 border-[#F2B33D] pl-5 text-[1.0625rem] leading-[1.7] text-[#2B3F42]">
            <span className="font-medium text-[#14272A]">More is on the way.</span> As we grow across Malaysia
            we&apos;re adding new ways to travel with us. If there&apos;s something you need that isn&apos;t here
            yet,{" "}
            <a href="#quote" className="font-medium text-[#9C4A22] underline underline-offset-4">
              tell us
            </a>
            .
          </p>
        </section>

        {/* ---------- Island story ---------- */}
        <section id="island" aria-labelledby="island-title" className="scroll-mt-6 bg-white/55 py-20 lg:py-28">
          <div className={`${wrap} grid gap-12 lg:grid-cols-12 lg:gap-16`}>
            <div className="lg:col-span-6">
              <h2
                id="island-title"
                className={`${sign} text-[2rem] font-black leading-[1.08] tracking-[-0.015em] text-[#0D3B40] sm:text-[2.75rem]`}
              >
                What ten years of looking after travellers taught us
              </h2>
              <p className="mt-4 text-lg leading-[1.7] text-[#2B3F42]">
                We&apos;re based in Langkawi and serve all of Malaysia. A decade of island hospitality has left us
                with a set of habits, and every one of our drivers keeps them.
              </p>

              <div className="mt-10 grid gap-9">
                {lessons.map((lesson) => (
                  <div key={lesson.title} className="border-l-2 border-[#9C4A22] pl-6">
                    <h3 className={`${sign} text-xl font-extrabold leading-snug text-[#14272A]`}>{lesson.title}</h3>
                    <p className="mt-2 max-w-[34rem] text-[1.0625rem] leading-[1.75] text-[#2B3F42]">{lesson.body}</p>
                  </div>
                ))}
              </div>
            </div>

            <figure className="m-0 lg:col-span-6 lg:pt-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={HIGHLANDS_IMG}
                alt="Rolling tea plantations in the Cameron Highlands, with a narrow road winding between the hills"
                className="aspect-[4/5] w-full rounded-[28px] object-cover sm:aspect-[4/3] lg:aspect-[4/5]"
                loading="lazy"
              />
              <figcaption className="mt-4 text-[0.9375rem] italic leading-relaxed text-[#2E5E4E]">
                Cameron Highlands, Pahang. Winding roads, driven with the same care as the short ones.
              </figcaption>
            </figure>
          </div>
        </section>

        {/* ---------- How booking works ---------- */}
        <section id="booking" aria-labelledby="booking-title" className={`${wrap} scroll-mt-6 py-20 lg:py-28`}>
          <h2
            id="booking-title"
            className={`${sign} max-w-[40rem] text-[2rem] font-black leading-[1.08] tracking-[-0.015em] text-[#0D3B40] sm:text-[2.75rem]`}
          >
            How booking works
          </h2>
          <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {steps.map((step, i) => (
              <li key={step.title} className="relative">
                <span
                  className={`${sign} flex size-12 items-center justify-center rounded-xl bg-[#0D3B40] text-xl font-black text-[#F2B33D] shadow-[inset_0_0_0_2px_#0D3B40,inset_0_0_0_4px_#fff]`}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <h3 className={`${sign} mt-5 text-xl font-extrabold text-[#14272A]`}>
                  <span className="sr-only">Step {i + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-[1.0625rem] leading-[1.7] text-[#2B3F42]">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Quote ---------- */}
        <section
          id="quote"
          aria-labelledby="quote-title"
          className={`${styles.dark} scroll-mt-6 bg-[#0D3B40] text-white`}
        >
          <div className={`${wrap} grid gap-12 py-20 lg:grid-cols-12 lg:gap-16 lg:py-28`}>
            <div className="lg:col-span-5">
              <h2
                id="quote-title"
                className={`${sign} text-[2rem] font-black leading-[1.08] tracking-[-0.015em] sm:text-[2.75rem]`}
              >
                Tell us where you&apos;re headed
              </h2>
              <p className="mt-4 max-w-[30rem] text-lg leading-[1.7] text-white/80">
                Send the basics and we&apos;ll come back with a vehicle suggestion and a price for the whole trip.
              </p>

              <div className="mt-10 rounded-[20px] bg-[#0A3035] p-6 sm:p-8">
                <h3 className={`${sign} text-xl font-extrabold`}>Prefer to chat?</h3>
                <p className="mt-2 leading-[1.7] text-white/80">
                  Message us on WhatsApp with your dates and pickup point. Most people plan their whole trip with us
                  this way.
                </p>
                <a href="#" className={`${btnPrimary} mt-5`}>
                  WhatsApp +60 X-XXX XXXX
                </a>
              </div>
            </div>

            <form
              action="#quote"
              className={`${styles.plate} rounded-[22px] p-6 sm:p-10 lg:col-span-7`}
              aria-labelledby="quote-title"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="q-name" className={fieldLabel}>
                    Your name
                  </label>
                  <input id="q-name" name="name" type="text" autoComplete="name" required className={fieldInput} />
                </div>
                <div>
                  <label htmlFor="q-phone" className={fieldLabel}>
                    WhatsApp or phone number
                  </label>
                  <input
                    id="q-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder="+60"
                    className={fieldInput}
                  />
                </div>
                <div>
                  <label htmlFor="q-from" className={fieldLabel}>
                    Pickup point
                  </label>
                  <input
                    id="q-from"
                    name="from"
                    type="text"
                    placeholder="e.g. KLIA Terminal 1"
                    className={fieldInput}
                  />
                </div>
                <div>
                  <label htmlFor="q-to" className={fieldLabel}>
                    Drop-off point
                  </label>
                  <input id="q-to" name="to" type="text" placeholder="e.g. a hotel in Penang" className={fieldInput} />
                </div>
                <div>
                  <label htmlFor="q-date" className={fieldLabel}>
                    Travel date
                  </label>
                  <input id="q-date" name="date" type="date" className={`${fieldInput} [color-scheme:dark]`} />
                </div>
                <div>
                  <label htmlFor="q-pax" className={fieldLabel}>
                    Number of passengers
                  </label>
                  <input id="q-pax" name="passengers" type="number" min={1} inputMode="numeric" className={fieldInput} />
                </div>
                <fieldset className="sm:col-span-2">
                  <legend className={fieldLabel}>What do you need?</legend>
                  <div className="mt-1 flex flex-wrap gap-3">
                    {["Coach charter", "Car with driver", "Not sure yet"].map((option, i) => (
                      <label
                        key={option}
                        className={`${sign} flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border-2 border-white/25 px-4 text-[0.9375rem] font-semibold has-[:checked]:border-[#F2B33D] has-[:checked]:bg-[#F2B33D]/10`}
                      >
                        <input
                          type="radio"
                          name="service"
                          value={option}
                          defaultChecked={i === 0}
                          className="size-4 accent-[#F2B33D]"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div className="sm:col-span-2">
                  <label htmlFor="q-notes" className={fieldLabel}>
                    Anything else we should know
                  </label>
                  <textarea
                    id="q-notes"
                    name="notes"
                    rows={3}
                    placeholder="Luggage, return trip, stops along the way"
                    className={fieldInput}
                  />
                </div>
              </div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <button type="submit" className={btnPrimary}>
                  Request a quote
                </button>
                <p className={`${sign} text-sm text-white/70`}>We reply with a price, not a sales call.</p>
              </div>
            </form>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section id="faq" aria-labelledby="faq-title" className={`${wrap} ${styles.faq} scroll-mt-6 py-20 lg:py-28`}>
          <div className="grid gap-10 lg:grid-cols-12">
            <h2
              id="faq-title"
              className={`${sign} text-[2rem] font-black leading-[1.08] tracking-[-0.015em] text-[#0D3B40] sm:text-[2.75rem] lg:col-span-4`}
            >
              Questions people ask before booking
            </h2>
            <div className="divide-y-2 divide-[#0D3B40]/10 border-y-2 border-[#0D3B40]/10 lg:col-span-8">
              {faqs.map((item) => (
                <details key={item.q} className="group">
                  <summary
                    className={`${sign} flex cursor-pointer items-center justify-between gap-6 py-5 text-lg font-extrabold text-[#14272A] hover:text-[#9C4A22]`}
                  >
                    {item.q}
                    <span
                      className={`${styles.marker} flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0D3B40] text-xl leading-none text-white`}
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="max-w-[40rem] pb-6 text-[1.0625rem] leading-[1.75] text-[#2B3F42]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Footer ---------- */}
      <footer className={`${styles.dark} bg-[#14272A] text-white`}>
        <div className={`${wrap} grid gap-10 py-14 md:grid-cols-12`}>
          <div className="md:col-span-5">
            <div className={`${sign} flex items-center gap-3`}>
              <KiteMark className="size-10" />
              <span className="text-lg font-black">Heavenly Travel</span>
            </div>
            <p className="mt-4 max-w-[26rem] leading-[1.7] text-white/75">
              Coach charter and cars with drivers, wherever you are in Malaysia. Based in Langkawi, Kedah, for
              ten years.
            </p>
          </div>
          <nav aria-label="Footer" className={`${sign} md:col-span-3`}>
            <h2 className="text-sm font-bold text-white/60">On this page</h2>
            <ul className="mt-3 grid gap-2 text-[0.9375rem] font-semibold">
              <li>
                <a href="#services" className="hover:text-[#F2B33D]">Services</a>
              </li>
              <li>
                <a href="#island" className="hover:text-[#F2B33D]">Our story</a>
              </li>
              <li>
                <a href="#booking" className="hover:text-[#F2B33D]">How booking works</a>
              </li>
              <li>
                <a href="#quote" className="hover:text-[#F2B33D]">Get a quote</a>
              </li>
            </ul>
          </nav>
          <div className={`${sign} md:col-span-4`}>
            <h2 className="text-sm font-bold text-white/60">Contact</h2>
            <address className="mt-3 grid gap-2 text-[0.9375rem] not-italic">
              <span>WhatsApp: +60 X-XXX XXXX</span>
              <span>Email: hello@example.com</span>
              <span>Langkawi, Kedah, Malaysia</span>
            </address>
          </div>
        </div>
        <div className={`${wrap} ${sign} border-t border-white/10 pb-24 pt-6 text-sm text-white/55`}>
          <p>&copy; 2026 Heavenly Travel. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
