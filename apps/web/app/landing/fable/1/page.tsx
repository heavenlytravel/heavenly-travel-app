/**
 * Heavenly Travel — landing page variation
 * Route: /landing/fable/1
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Direction: Island-host warmth on an Andaman teal and sunset-gold palette; a Malaysia coverage map linking cities as a network is the hero, with a booking search bar beneath it, two unequal service panels, regional coverage, a three-step booking flow and a WhatsApp-first quote form.
 * Tokens used: 77,806 (71 tool calls)
 * Time taken: 10m 08s
 * Revision 1: 101,153 tokens (29 tool calls), 3m 40s
 * Revision 1 notes: Replaced Langkawi-origin framing with nationwide "wherever you are" positioning (map now a city network, hero copy set to client text, story and FAQ reworded) and added an Agoda-style search bar under the hero.
 * Generated: 2026-09-15
 */

import type { Metadata } from "next";
import { Young_Serif, Figtree } from "next/font/google";
import styles from "./landing.module.css";
import { RouteMap } from "./_components/RouteMap";
import { SearchBar } from "./_components/SearchBar";

const display = Young_Serif({
  subsets: ["latin"],
  weight: "400",
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

const REGIONS: { name: string; places: string; note: string }[] = [
  {
    name: "Penang and the north",
    places: "Penang, Langkawi, Kuala Perlis, Alor Setar, Ipoh",
    note: "Island and mainland runs, with jetty and airport pick-ups timed to the ferry and flight boards.",
  },
  {
    name: "Klang Valley",
    places: "Kuala Lumpur, Putrajaya, Shah Alam, Petaling Jaya, KLIA",
    note: "Corporate shuttles, conference runs and airport transfers with a coordinator on WhatsApp.",
  },
  {
    name: "The south",
    places: "Melaka, Seremban, Johor Bahru, Desaru",
    note: "Heritage day trips and cross-state school and church group charters.",
  },
  {
    name: "East coast",
    places: "Kuantan, Kuala Terengganu, Kota Bharu, Cherating",
    note: "Longer road days. We plan rest stops and driver changes into the itinerary.",
  },
  {
    name: "Sabah and Sarawak",
    places: "Kota Kinabalu, Sandakan, Kuching, Miri",
    note: "Arranged with vetted local partners we have worked with, so the standard travels with you.",
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

const FAQ: { q: string; a: string }[] = [
  {
    q: "Where do you operate?",
    a: "Anywhere in Malaysia. Pick-up can be your hotel, home, office, airport or jetty in any state. Our own coaches and drivers cover Peninsular Malaysia, and we arrange trips in Sabah and Sarawak through partners we have vetted in person. Our office happens to be in Langkawi.",
  },
  {
    q: "What sizes of coach do you have?",
    a: "From 12-seat vans through 30-seat mid-coaches to 44-seat full coaches, all air-conditioned. Tell us your headcount and luggage and we will suggest the right one rather than the biggest one.",
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
    q: "How do I pay?",
    a: "Bank transfer, DuitNow or card. Groups usually pay a deposit to confirm and the balance before the trip. We invoice companies and schools.",
  },
  {
    q: "What happens if my flight or ferry is delayed?",
    a: "We track arrivals for airport and jetty pick-ups. Your driver waits, and we do not charge for delays that are not yours.",
  },
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

const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-[15px] font-semibold transition-colors";

export default function Page() {
  return (
    <div className={`${styles.page} ${body.className}`}>
      <a
        href="#quote"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-[var(--gold)] focus:px-4 focus:py-2 focus:text-[var(--ink)]"
      >
        Skip to quote form
      </a>

      {/* Header */}
      <header className={`${styles.onDark} bg-[var(--sea-deep)] text-white`}>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <a href="#top" className="flex items-center gap-2.5 no-underline">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 place-items-center rounded-full bg-[var(--gold)] text-[var(--sea-deep)]"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4.5 w-4.5"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M12 3c-1.2 2.4-1.6 4.7-1.4 7.1-2-1.4-4.3-2.2-6.8-2.3 1.5 2.1 3.3 3.8 5.5 4.9-2.3.9-4.2 2.4-5.7 4.4 2.5-.3 4.8-1.2 6.8-2.7-.2 2.4.2 4.7 1.4 7.1 1.2-2.4 1.6-4.7 1.4-7.1 2 1.5 4.3 2.4 6.8 2.7-1.5-2-3.4-3.5-5.7-4.4 2.2-1.1 4-2.8 5.5-4.9-2.5.1-4.8.9-6.8 2.3.2-2.4-.2-4.7-1.4-7.1z" />
              </svg>
            </span>
            <span
              className={`${display.className} text-lg leading-none tracking-tight`}
            >
              Heavenly Travel
            </span>
          </a>
          <nav
            aria-label="Page sections"
            className="hidden items-center gap-7 text-sm text-white/85 md:flex"
          >
            <a href="#services" className="no-underline hover:text-white">
              Services
            </a>
            <a href="#coverage" className="no-underline hover:text-white">
              Where we go
            </a>
            <a href="#how" className="no-underline hover:text-white">
              How booking works
            </a>
            <a href="#faq" className="no-underline hover:text-white">
              Questions
            </a>
          </nav>
          <a
            href={WHATSAPP}
            className={`${btnBase} bg-[var(--gold)] px-4 py-2 text-[var(--sea-deep)] no-underline hover:bg-[#f0bb55]`}
          >
            <WhatsAppIcon className="h-4.5 w-4.5" />
            WhatsApp us
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section
          className={`${styles.onDark} bg-[var(--sea-deep)] text-white`}
          aria-labelledby="hero-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 pb-24 pt-10 sm:px-8 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center lg:gap-14 lg:pb-28">
            <div className="max-w-xl">
              <h1
                id="hero-heading"
                className={`${display.className} text-[2.6rem] leading-[1.04] tracking-tight sm:text-6xl lg:text-[4rem]`}
              >
                A better way to get away.
              </h1>
              <p className="mt-6 max-w-[48ch] text-lg leading-relaxed text-white/85 sm:text-xl">
                Island escapes, seamless transport and trips made around you.
                Let our local team take care of the details.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#quote"
                  className={`${btnBase} bg-[var(--gold)] text-[var(--sea-deep)] no-underline hover:bg-[#f0bb55]`}
                >
                  Request a quote
                </a>
                <a
                  href={WHATSAPP}
                  className={`${btnBase} border border-white/35 text-white no-underline hover:border-white/70 hover:bg-white/5`}
                >
                  <WhatsAppIcon className="h-4.5 w-4.5" />
                  Chat on WhatsApp
                </a>
              </div>
              <p className="mt-6 text-sm text-white/65">
                Replies in working hours, Malaysia time. Bahasa Melayu, English
                and Mandarin spoken.
              </p>
            </div>

            <figure className="rounded-xl border border-white/12 bg-white/[0.04] p-4 sm:p-6">
              <RouteMap />
              <figcaption className="mt-2 text-xs text-white/55">
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

        {/* Story */}
        <section
          className="-mt-14 bg-[var(--sand)] pt-14 lg:-mt-16 lg:pt-16"
          aria-labelledby="heritage-heading"
        >
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-12 lg:gap-12 lg:py-24">
            <div className="lg:col-span-5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="https://images.unsplash.com/photo-1468413253725-0d5181091126?w=1200&q=75&auto=format&fit=crop"
                alt="A palm-lined beach with clear green water"
                width={1200}
                height={800}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-lg object-cover sm:aspect-[3/2] lg:aspect-[4/5]"
              />
            </div>
            <div className="lg:col-span-7 lg:pl-4">
              <h2
                id="heritage-heading"
                className={`${display.className} text-3xl leading-tight tracking-tight sm:text-4xl`}
              >
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
              <dl className="mt-8 grid gap-5 border-t border-[rgba(20,37,35,0.14)] pt-6 sm:grid-cols-3">
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
                    Licensed by
                  </dt>
                  <dd className="mt-1 font-semibold">
                    MOTAC, licence no. KPL XXXX
                  </dd>
                </div>
              </dl>
            </div>
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
              <h2
                id="services-heading"
                className={`${display.className} text-3xl leading-tight tracking-tight sm:text-4xl`}
              >
                Two ways to travel with us today
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-[var(--ink-soft)]">
                Whether it is forty people and a wedding or one person and a
                meeting, the vehicle is clean, the driver is early, and the
                price you were quoted is the price you pay.
              </p>
            </div>

            <div className="mt-12 grid gap-6 lg:grid-cols-5">
              {/* Coach charter: the larger panel, it is the larger business */}
              <article className="overflow-hidden rounded-xl bg-[var(--foam)] lg:col-span-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1570125909232-eb263c188f7e?w=1200&q=75&auto=format&fit=crop"
                  alt="A modern tour coach parked at sunset"
                  width={1200}
                  height={800}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="p-6 sm:p-8">
                  <h3
                    className={`${display.className} text-2xl tracking-tight`}
                  >
                    Coach charter
                  </h3>
                  <p className="mt-3 max-w-[58ch] leading-relaxed text-[var(--ink-soft)]">
                    Air-conditioned coaches from 12 to 44 seats for tours,
                    school trips, corporate outings, weddings, events and
                    airport or jetty transfers. Multi-day charters come with a
                    second driver where the law and common sense require one.
                  </p>
                  <ul className="mt-5 grid gap-2 text-[15px] sm:grid-cols-2">
                    {[
                      "Tour groups and island day trips",
                      "Corporate and conference shuttles",
                      "School and university excursions",
                      "Wedding and event guest transport",
                      "Airport, KLIA and jetty transfers",
                      "Cross-state and multi-day charters",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sea)]"
                        />
                        {item}
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

              <article className="overflow-hidden rounded-xl bg-[var(--foam)] lg:col-span-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=900&q=75&auto=format&fit=crop"
                  alt="A dark sedan driving on an open road"
                  width={900}
                  height={600}
                  loading="lazy"
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="p-6 sm:p-8">
                  <h3
                    className={`${display.className} text-2xl tracking-tight`}
                  >
                    Car with driver
                  </h3>
                  <p className="mt-3 leading-relaxed text-[var(--ink-soft)]">
                    A private car and a chauffeur who knows the roads, by the
                    hour, the day or the week. For families, couples, executives
                    and anyone who would rather look out of the window than at a
                    map.
                  </p>
                  <ul className="mt-5 grid gap-2 text-[15px]">
                    {[
                      "Sedans and MPVs, up to 6 passengers",
                      "Airport meet and greet with a name board",
                      "Full-day touring at your own pace",
                      "Multi-day hire with the same driver",
                    ].map((item) => (
                      <li key={item} className="flex gap-2.5">
                        <span
                          aria-hidden="true"
                          className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sea)]"
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                  <a
                    href="#quote"
                    className="mt-6 inline-block font-semibold text-[var(--sea)] underline hover:text-[var(--sea-deep)]"
                  >
                    Quote a car
                  </a>
                </div>
              </article>
            </div>

            <div className="mt-8 flex flex-col gap-3 rounded-xl border border-[var(--line)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <div className="max-w-[60ch]">
                <h3 className="text-lg font-semibold">Coming next</h3>
                <p className="mt-1 leading-relaxed text-[var(--ink-soft)]">
                  Island-hopping boats, guided day tours and packaged multi-day
                  itineraries across Malaysia are on the way. If you need one of
                  these now, ask; we can usually arrange it.
                </p>
              </div>
              <a
                href={WHATSAPP}
                className="shrink-0 font-semibold text-[var(--sea)] underline hover:text-[var(--sea-deep)]"
              >
                Ask about a custom trip
              </a>
            </div>
          </div>
        </section>

        {/* Coverage */}
        <section
          id="coverage"
          className="scroll-mt-20 bg-[var(--foam)]"
          aria-labelledby="coverage-heading"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="lg:col-span-5">
                <h2
                  id="coverage-heading"
                  className={`${display.className} text-3xl leading-tight tracking-tight sm:text-4xl`}
                >
                  Where we go
                </h2>
                <p className="mt-4 max-w-[48ch] text-lg leading-relaxed text-[var(--ink-soft)]">
                  Wherever you are and wherever you are heading, as long as
                  there is a road. These are the regions we cover week in, week
                  out.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=75&auto=format&fit=crop"
                  alt="The Kuala Lumpur skyline with the Petronas Twin Towers at dusk"
                  width={1200}
                  height={800}
                  loading="lazy"
                  className="mt-8 aspect-[3/2] w-full rounded-lg object-cover"
                />
              </div>
              <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)] lg:col-span-7">
                {REGIONS.map((r) => (
                  <li
                    key={r.name}
                    className="grid gap-1 py-5 sm:grid-cols-[11rem_1fr] sm:gap-6"
                  >
                    <h3 className="font-semibold">{r.name}</h3>
                    <div>
                      <p className="text-[var(--ink)]">{r.places}</p>
                      <p className="mt-1 text-[15px] leading-relaxed text-[var(--ink-soft)]">
                        {r.note}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* How booking works */}
        <section
          id="how"
          className="scroll-mt-20 bg-white"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <h2
              id="how-heading"
              className={`${display.className} text-3xl leading-tight tracking-tight sm:text-4xl`}
            >
              How a booking works
            </h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
              {STEPS.map((s, i) => (
                <li
                  key={s.title}
                  className="relative border-t-2 border-[var(--sea)] pt-5"
                >
                  <span
                    className={`${display.className} text-3xl text-[var(--sea)]`}
                  >
                    {i + 1}
                  </span>
                  <h3 className="mt-2 text-xl font-semibold">{s.title}</h3>
                  <p className="mt-2 max-w-[40ch] leading-relaxed text-[var(--ink-soft)]">
                    {s.text}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-14 grid gap-8 rounded-xl bg-[var(--sand)] p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=900&q=75&auto=format&fit=crop"
                  alt="Close-up of the front of a clean coach parked kerbside"
                  width={900}
                  height={600}
                  loading="lazy"
                  className="aspect-[3/2] w-full rounded-lg object-cover"
                />
              </div>
              <div className="lg:col-span-8">
                <h3 className={`${display.className} text-2xl tracking-tight`}>
                  What every trip includes
                </h3>
                <ul className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {[
                    "Driver's name and number the day before",
                    "Tolls, fuel and parking in the quoted price",
                    "Vehicles washed and checked before each charter",
                    "Bottled water on board",
                    "Passenger insurance on all vehicles",
                    "An office contact reachable while you travel",
                  ].map((item) => (
                    <li key={item} className="flex gap-2.5">
                      <svg
                        viewBox="0 0 20 20"
                        aria-hidden="true"
                        className="mt-1 h-4 w-4 shrink-0 text-[var(--sea)]"
                        fill="currentColor"
                      >
                        <path d="M7.6 14.4 3.7 10.5l1.4-1.4 2.5 2.5 6.3-6.3 1.4 1.4z" />
                      </svg>
                      {item}
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
                <h2
                  id="faq-heading"
                  className={`${display.className} text-3xl leading-tight tracking-tight sm:text-4xl`}
                >
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
              <h2
                id="quote-heading"
                className={`${display.className} text-3xl leading-tight tracking-tight sm:text-4xl`}
              >
                Tell us where you are going
              </h2>
              <p className="mt-4 max-w-[46ch] text-lg leading-relaxed text-white/85">
                A written quote, usually within one working day. No deposit is
                taken until you say yes.
              </p>
              <div className="mt-8 space-y-4 text-white/85">
                <p>
                  <span className="block text-sm text-white/60">
                    WhatsApp or call
                  </span>
                  <a
                    href={WHATSAPP}
                    className="text-lg font-semibold text-white no-underline hover:underline"
                  >
                    +60 X-XXX XXXX
                  </a>
                </p>
                <p>
                  <span className="block text-sm text-white/60">Email</span>
                  <a
                    href="mailto:hello@heavenlytravel.example"
                    className="text-white no-underline hover:underline"
                  >
                    hello@heavenlytravel.example
                  </a>
                </p>
                <p>
                  <span className="block text-sm text-white/60">Office</span>
                  Kuah, Langkawi, Kedah. Open Monday to Saturday, 9am to 6pm.
                </p>
              </div>
            </div>

            <form
              className="lg:col-span-7"
              action="#quote"
              method="get"
              aria-label="Quote request"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="q-name"
                    className="mb-1.5 block text-sm text-white/80"
                  >
                    Your name
                  </label>
                  <input
                    id="q-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    required
                    className={styles.field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="q-phone"
                    className="mb-1.5 block text-sm text-white/80"
                  >
                    WhatsApp number
                  </label>
                  <input
                    id="q-phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+60"
                    required
                    className={styles.field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="q-service"
                    className="mb-1.5 block text-sm text-white/80"
                  >
                    What do you need
                  </label>
                  <select
                    id="q-service"
                    name="service"
                    className={styles.field}
                    defaultValue="coach"
                  >
                    <option value="coach">Coach charter</option>
                    <option value="car">Car with driver</option>
                    <option value="transfer">Airport or jetty transfer</option>
                    <option value="other">Something else</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="q-people"
                    className="mb-1.5 block text-sm text-white/80"
                  >
                    Number of passengers
                  </label>
                  <input
                    id="q-people"
                    name="passengers"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className={styles.field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="q-from"
                    className="mb-1.5 block text-sm text-white/80"
                  >
                    Pick-up
                  </label>
                  <input
                    id="q-from"
                    name="from"
                    type="text"
                    placeholder="Hotel, airport or jetty"
                    className={styles.field}
                  />
                </div>
                <div>
                  <label
                    htmlFor="q-date"
                    className="mb-1.5 block text-sm text-white/80"
                  >
                    Date of travel
                  </label>
                  <input
                    id="q-date"
                    name="date"
                    type="date"
                    className={styles.field}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label
                    htmlFor="q-notes"
                    className="mb-1.5 block text-sm text-white/80"
                  >
                    Trip details
                  </label>
                  <textarea
                    id="q-notes"
                    name="notes"
                    rows={4}
                    placeholder="Destination, return date, luggage, anything the driver should know"
                    className={styles.field}
                  />
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="submit"
                  className={`${btnBase} bg-[var(--gold)] text-[var(--sea-deep)] hover:bg-[#f0bb55]`}
                >
                  Send quote request
                </button>
                <p className="text-sm text-white/65">
                  We reply on WhatsApp or by email, whichever you gave us.
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--line)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-[var(--ink-soft)] sm:flex-row sm:items-start sm:justify-between sm:px-8">
          <div className="max-w-[44ch]">
            <p className={`${display.className} text-lg text-[var(--ink)]`}>
              Heavenly Travel
            </p>
            <p className="mt-2 leading-relaxed">
              Coach charter and chauffeured cars. Based in Langkawi since 2016,
              serving all of Malaysia.
            </p>
            <p className="mt-2">
              Licensed travel operator, MOTAC licence no. KPL XXXX.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#services" className="no-underline hover:underline">
              Services
            </a>
            <a href="#coverage" className="no-underline hover:underline">
              Where we go
            </a>
            <a href="#faq" className="no-underline hover:underline">
              Questions
            </a>
            <a href="#quote" className="no-underline hover:underline">
              Request a quote
            </a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
