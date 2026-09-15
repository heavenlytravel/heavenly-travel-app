/**
 * Heavenly Travel — landing page variation
 * Route: /landing/fable/2
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Direction: The operator's trip sheet — deep Andaman teal, amber marker-light accent, a confirmed trip sheet in the hero, a booking search bar in the same tokens, and an editorial two-column layout that reads like a well-run fleet office serving all of Malaysia.
 * Tokens used: 71,656 (48 tool calls)
 * Time taken: 7m 00s
 * Revision 1: 87,938 tokens (23 tool calls), 2m 35s
 * Revision 1 notes: Repositioned copy Malaysia-wide (Langkawi only as base in coverage/footer), set the required hero title and description, added an accessible client-side booking search bar under the hero, and moved the trip sheet inside the hero so nothing overlaps the new bar.
 * Generated: 2026-09-15
 */

import type { Metadata } from "next";
import { Newsreader, Plus_Jakarta_Sans } from "next/font/google";
import styles from "./page.module.css";
import { SearchBar } from "./_components/search-bar";

const display = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const body = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Heavenly Travel — Coach charter and chauffeured cars across Malaysia",
  description:
    "Coach charter and cars with drivers, wherever you are in Malaysia. Airport transfers, corporate and school charters, private drivers and island escapes, arranged by a local team with ten years' experience.",
};

const IMG = {
  coach:
    "https://images.unsplash.com/photo-1557223562-6c77ef16210f?w=1400&q=80&auto=format&fit=crop",
  driver:
    "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1200&q=80&auto=format&fit=crop",
  kl: "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=1200&q=80&auto=format&fit=crop",
  resort:
    "https://images.unsplash.com/photo-1596436889106-be35e843f974?w=1200&q=80&auto=format&fit=crop",
  beach:
    "https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=1200&q=80&auto=format&fit=crop",
};

const fleet = [
  {
    name: "44-seat executive coach",
    seats: "44 passengers",
    luggage: "Full under-floor luggage bay",
    bestFor: "Tour groups, corporate events, school trips",
  },
  {
    name: "30-seat coach",
    seats: "30 passengers",
    luggage: "Under-floor luggage bay",
    bestFor: "Mid-size groups, day tours, conferences",
  },
  {
    name: "14-seat van",
    seats: "14 passengers",
    luggage: "Rear luggage space",
    bestFor: "Extended families, small teams, city and island tours",
  },
  {
    name: "Executive MPV with driver",
    seats: "Up to 6 passengers",
    luggage: "4 large suitcases",
    bestFor: "Airport and jetty pickups, VIP guests",
  },
  {
    name: "Sedan with driver",
    seats: "Up to 3 passengers",
    luggage: "2 large suitcases",
    bestFor: "Business travel, day hire, evening dinners",
  },
];

const steps = [
  {
    title: "Tell us the trip",
    text: "Dates, pick-up points, how many people and what the day looks like. WhatsApp, the form below or a phone call all work.",
  },
  {
    title: "We confirm the vehicle and driver",
    text: "You get a written quote with tolls, parking and driver allowance listed, and a named vehicle for your group size.",
  },
  {
    title: "Your trip sheet is sent",
    text: "One page with every pick-up, time and contact number. The driver is briefed on it the evening before.",
  },
  {
    title: "The driver arrives early",
    text: "Vehicle checked and cooled, luggage loaded, and one person to call if the plan changes on the day.",
  },
];

const coverage = [
  { place: "Kuala Lumpur and Selangor", note: "KLIA, city hotels, corporate itineraries and events." },
  { place: "Penang", note: "Airport, George Town, conference and hotel transfers." },
  { place: "Langkawi, Kedah and Perlis", note: "Airport, jetties, resorts and island tours." },
  { place: "Melaka and Johor", note: "Heritage tours and cross-border group pick-ups." },
  { place: "Pahang and the east coast", note: "Highlands, Kuantan, Cherating and island jetties." },
  { place: "Sabah and Sarawak", note: "Kota Kinabalu and Kuching transfers on request." },
];

export default function Page() {
  return (
    <div className={`${styles.page} ${display.variable} ${body.variable} text-[17px] leading-relaxed`}>
      <a
        href="#quote"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded focus:bg-(--lantern) focus:px-4 focus:py-2 focus:text-(--ink)"
      >
        Skip to quote form
      </a>

      <header className="sticky top-0 z-40 border-b border-(--line) bg-(--mist)/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
          <a href="#top" className="flex items-baseline gap-2">
            <span className={`${styles.display} text-2xl text-(--ink)`}>Heavenly Travel</span>
            <span className="hidden text-sm text-(--muted) sm:inline">Across Malaysia, since 2016</span>
          </a>
          <nav aria-label="Page sections" className="hidden items-center gap-7 text-[15px] font-medium md:flex">
            <a href="#services" className="text-(--text) hover:text-(--sea)">
              Services
            </a>
            <a href="#fleet" className="text-(--text) hover:text-(--sea)">
              Fleet
            </a>
            <a href="#coverage" className="text-(--text) hover:text-(--sea)">
              Coverage
            </a>
            <a href="#how" className="text-(--text) hover:text-(--sea)">
              How it works
            </a>
          </nav>
          <a
            href="#quote"
            className="rounded-full bg-(--ink) px-4 py-2 text-[15px] font-semibold text-white hover:bg-(--sea)"
          >
            Request a quote
          </a>
        </div>
      </header>

      <main id="top">
        {/* Hero */}
        <section className="bg-(--ink) text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 pt-16 pb-14 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:pt-24 lg:pb-24">
            <div className="max-w-xl">
              <h1 className={`${styles.display} text-[2.6rem] sm:text-6xl lg:text-[4.25rem]`}>
                A better way to get away.
              </h1>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-(--on-ink-muted)">
                Island escapes, seamless transport and trips made around you. Let our local team
                take care of the details.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="#quote"
                  className="rounded-full bg-(--lantern) px-6 py-3 font-semibold text-(--ink) hover:bg-(--lantern-deep)"
                >
                  Request a quote
                </a>
                <a
                  href="#"
                  className="inline-flex items-center gap-2 rounded-full border border-white/40 px-6 py-3 font-semibold text-white hover:border-white hover:bg-white/10"
                >
                  <WhatsAppIcon />
                  Chat on WhatsApp
                </a>
              </div>
              <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-2 text-sm text-(--on-ink-muted)">
                <li>Licensed and insured</li>
                <li>Driver assigned before you travel</li>
                <li>Written quotes, no surprises</li>
              </ul>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={IMG.coach}
                  alt="Front of a champagne-coloured coach parked at a kerb, ready for boarding"
                  className="aspect-[4/3] w-full object-cover"
                  width={1400}
                  height={1050}
                  fetchPriority="high"
                />
              </div>

              <div
                className={`${styles.sheet} -mt-16 ml-4 max-w-sm rounded-xl bg-(--mist) p-5 text-(--text) shadow-[0_24px_60px_-20px_rgba(0,0,0,0.55)] sm:ml-10 lg:absolute lg:right-[-1.5rem] lg:bottom-6 lg:mt-0 lg:ml-0`}
                aria-label="Sample trip sheet"
              >
                <div className="flex items-center justify-between border-b border-(--line) pb-3">
                  <span className={`${styles.display} text-xl text-(--ink)`}>Sample trip sheet</span>
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-(--sea)">
                    <span className="h-2 w-2 rounded-full bg-(--lantern)" aria-hidden="true" />
                    Confirmed
                  </span>
                </div>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[15px]">
                  <dt className="text-(--muted)">Group</dt>
                  <dd>Corporate offsite, 38 people</dd>
                  <dt className="text-(--muted)">Pick up</dt>
                  <dd>KLIA Terminal 1, 09:40</dd>
                  <dt className="text-(--muted)">Drop off</dt>
                  <dd>Port Dickson resort, then Melaka old town</dd>
                  <dt className="text-(--muted)">Vehicle</dt>
                  <dd>44-seat executive coach</dd>
                  <dt className="text-(--muted)">Driver</dt>
                  <dd>Assigned, briefed the evening before</dd>
                  <dt className="text-(--muted)">Your contact</dt>
                  <dd>One coordinator for the whole trip</dd>
                </dl>
              </div>
            </div>
          </div>
        </section>

        {/* Booking search: sits across the hero's bottom edge */}
        <section aria-labelledby="search-heading" className="relative z-10 -mt-1 bg-linear-to-b from-(--ink) from-50% to-transparent to-50%">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 id="search-heading" className="sr-only">
              Search for a coach or car with driver
            </h2>
            <SearchBar />
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-20 border-b border-(--line)">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-16 lg:py-24">
            <div>
              <h2 className={`${styles.display} text-4xl text-(--ink)`}>What we run</h2>
              <p className="mt-4 text-(--muted)">
                Two services carry most of our work today, anywhere in Malaysia. More are being
                added as we grow, so ask if your trip does not fit neatly here.
              </p>
            </div>

            <div className="grid gap-5">
              <article className="grid overflow-hidden rounded-2xl bg-white md:grid-cols-[1.1fr_1fr]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={IMG.coach}
                  alt="Coach parked and ready for a group departure"
                  className="h-56 w-full object-cover md:h-full"
                  width={1400}
                  height={1050}
                  loading="lazy"
                />
                <div className="p-7 sm:p-9">
                  <h3 className={`${styles.display} text-3xl text-(--ink)`}>Coach charter</h3>
                  <p className="mt-3 text-(--muted)">
                    Air-conditioned coaches from 14 to 44 seats for tours, company events, school
                    outings, weddings and airport or jetty transfers. Multi-day and island itineraries
                    welcome.
                  </p>
                  <ul className="mt-5 grid gap-2 text-[15px]">
                    <li className="flex gap-3">
                      <Tick />
                      Driver who knows the route and the venues
                    </li>
                    <li className="flex gap-3">
                      <Tick />
                      Luggage handled, boarding kept orderly
                    </li>
                    <li className="flex gap-3">
                      <Tick />
                      Coordinator on WhatsApp for the whole day
                    </li>
                  </ul>
                  <a href="#quote" className="mt-6 inline-block font-semibold text-(--sea) underline underline-offset-4 hover:text-(--ink)">
                    Get a coach quote
                  </a>
                </div>
              </article>

              <div className="grid gap-5 md:grid-cols-[1.4fr_1fr]">
                <article className="grid overflow-hidden rounded-2xl bg-white sm:grid-cols-[1fr_1.2fr]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={IMG.driver}
                    alt="Chauffeur's hands on the steering wheel at dusk"
                    className="h-48 w-full object-cover sm:h-full"
                    width={1200}
                    height={800}
                    loading="lazy"
                  />
                  <div className="p-7">
                    <h3 className={`${styles.display} text-3xl text-(--ink)`}>Car with driver</h3>
                    <p className="mt-3 text-(--muted)">
                      A sedan or executive MPV with a professional driver for airport runs, business
                      days, family holidays and evenings out. Hire by the transfer, the day or the
                      week.
                    </p>
                    <a href="#quote" className="mt-6 inline-block font-semibold text-(--sea) underline underline-offset-4 hover:text-(--ink)">
                      Book a driver
                    </a>
                  </div>
                </article>

                <article className="rounded-2xl bg-(--sand) p-7">
                  <h3 className={`${styles.display} text-2xl text-(--ink)`}>Coming next</h3>
                  <p className="mt-3 text-[15px] text-(--muted)">
                    We are building the same standard into new products as we digitalise.
                  </p>
                  <ul className="mt-4 grid gap-2 text-[15px]">
                    <li>Packaged island and city escapes</li>
                    <li>Multi-city corporate itineraries</li>
                    <li>Online booking with live availability</li>
                  </ul>
                </article>
              </div>
            </div>
          </div>
        </section>

        {/* Who relies on us */}
        <section className="border-b border-(--line)">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-16 lg:py-24">
            <div>
              <h2 className={`${styles.display} text-4xl text-(--ink)`}>Who relies on us</h2>
              <p className="mt-4 text-(--muted)">
                Different groups need different things from a vehicle and a driver. These are the
                three we serve most.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Audience
                img={IMG.kl}
                alt="Kuala Lumpur skyline at dusk"
                title="Corporate and events"
                text="Conference shuttles, offsites, incentive trips and VIP guests. Invoicing for companies, one coordinator, drivers in uniform."
              />
              <Audience
                img={IMG.beach}
                alt="Aerial view of a palm-lined beach and turquoise sea"
                title="Tour groups and schools"
                text="Full-day and multi-day itineraries, with headcount checks at every stop and a driver who keeps the schedule honest."
              />
              <Audience
                img={IMG.resort}
                alt="Resort pool lined with palms and sun loungers at dusk"
                title="Families and couples"
                text="Airport and jetty pickups, child seats on request, and a driver who waits while you eat, shop or swim."
              />
            </div>
          </div>
        </section>

        {/* How a booking runs */}
        <section id="how" className="scroll-mt-20 border-b border-(--line)">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 lg:py-24">
            <div className="max-w-2xl">
              <h2 className={`${styles.display} text-4xl text-(--ink)`}>How a booking runs</h2>
              <p className="mt-4 text-(--muted)">
                Four stops between your first message and the driver at your door.
              </p>
            </div>
            <ol className={`${styles.route} mt-12 grid gap-10 md:grid-cols-4 md:gap-8`}>
              {steps.map((step, i) => (
                <li key={step.title} className={`${styles.stop} pl-10 md:pt-9 md:pl-0`}>
                  <span className="text-sm font-semibold text-(--sea)">Stop {i + 1}</span>
                  <h3 className={`${styles.display} mt-1 text-2xl text-(--ink)`}>{step.title}</h3>
                  <p className="mt-2 text-[15px] text-(--muted)">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Fleet */}
        <section id="fleet" className="scroll-mt-20 border-b border-(--line) bg-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,17rem)_1fr] lg:gap-16 lg:py-24">
            <div>
              <h2 className={`${styles.display} text-4xl text-(--ink)`}>The fleet</h2>
              <p className="mt-4 text-(--muted)">
                Every vehicle is cleaned and checked before it leaves the yard. Tell us your group
                size and luggage and we will match you to the right one.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] border-collapse text-left text-[15px]">
                <thead>
                  <tr className="border-b-2 border-(--ink) text-sm text-(--muted)">
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Vehicle
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Seats
                    </th>
                    <th scope="col" className="py-3 pr-4 font-medium">
                      Luggage
                    </th>
                    <th scope="col" className="py-3 font-medium">
                      Best for
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.map((v) => (
                    <tr key={v.name} className={styles.fleetRow}>
                      <th scope="row" className={`${styles.display} py-4 pr-4 align-top text-xl font-medium text-(--ink)`}>
                        {v.name}
                      </th>
                      <td className="py-4 pr-4 align-top">{v.seats}</td>
                      <td className="py-4 pr-4 align-top text-(--muted)">{v.luggage}</td>
                      <td className="py-4 align-top text-(--muted)">{v.bestFor}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Standards + coverage */}
        <section id="coverage" className="scroll-mt-20 border-b border-(--line)">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-16 sm:px-8 lg:grid-cols-2 lg:gap-16 lg:py-24">
            <div>
              <h2 className={`${styles.display} text-4xl text-(--ink)`}>What dependable means here</h2>
              <ul className="mt-8 grid gap-5">
                <Standard
                  title="The driver is briefed the evening before"
                  text="Route, timings, contact names and anything unusual about the group, so the morning has no questions."
                />
                <Standard
                  title="We arrive early, not on time"
                  text="Fifteen minutes before pick-up is our normal. Coaches are cooled and luggage bays open before the group appears."
                />
                <Standard
                  title="One person to call"
                  text="A single coordinator handles your booking from quote to drop-off, and answers on WhatsApp during the trip."
                />
                <Standard
                  title="Quotes you can put in a budget"
                  text="Tolls, parking, driver allowance and overnight costs are listed up front, not added afterwards."
                />
              </ul>
            </div>
            <div>
              <h2 className={`${styles.display} text-4xl text-(--ink)`}>Wherever you are in Malaysia</h2>
              <p className="mt-4 text-(--muted)">
                Pick-ups start where you are: a hotel, an airport, a jetty or the office. Our team
                is based in Langkawi and runs the same drivers, vehicles and trip sheets across the
                country.
              </p>
              <dl className="mt-8 grid gap-4 sm:grid-cols-2">
                {coverage.map((c) => (
                  <div key={c.place} className="border-l-2 border-(--lantern) pl-4">
                    <dt className="font-semibold text-(--ink)">{c.place}</dt>
                    <dd className="mt-1 text-[15px] text-(--muted)">{c.note}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>

        {/* Quote */}
        <section id="quote" className="scroll-mt-20 bg-(--ink) text-white">
          <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,20rem)_1fr] lg:gap-16 lg:py-24">
            <div>
              <h2 className={`${styles.display} text-4xl`}>Request a quote</h2>
              <p className="mt-4 text-(--on-ink-muted)">
                Tell us the basics and a coordinator will reply with a written quote, usually the
                same working day. Prefer to talk? WhatsApp is the fastest way to reach us.
              </p>
              <a
                href="#"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/40 px-5 py-3 font-semibold text-white hover:border-white hover:bg-white/10"
              >
                <WhatsAppIcon />
                WhatsApp +60 X-XXX XXXX
              </a>
              <p className="mt-8 text-sm text-(--on-ink-muted)">
                Office hours 8am to 8pm, seven days. Trips in progress are answered around the
                clock.
              </p>
            </div>

            <form action="#" method="post" className="grid gap-5 rounded-2xl bg-(--mist) p-6 text-(--text) sm:grid-cols-2 sm:p-8">
              <Field label="Your name" id="name" autoComplete="name" />
              <Field label="WhatsApp or phone" id="phone" type="tel" autoComplete="tel" placeholder="+60" />
              <div className="grid gap-1.5">
                <label htmlFor="service" className="text-sm font-semibold">
                  Service
                </label>
                <select id="service" name="service" className={inputClass} defaultValue="">
                  <option value="" disabled>
                    Choose one
                  </option>
                  <option>Coach charter</option>
                  <option>Car with driver</option>
                  <option>Airport or jetty transfer</option>
                  <option>Something else</option>
                </select>
              </div>
              <Field label="Number of passengers" id="pax" type="number" inputMode="numeric" min={1} />
              <Field label="Travel date" id="date" type="date" />
              <Field label="Pick-up location" id="pickup" placeholder="e.g. KLIA Terminal 1, or your hotel" />
              <div className="grid gap-1.5 sm:col-span-2">
                <label htmlFor="notes" className="text-sm font-semibold">
                  Anything else we should know
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  className={inputClass}
                  placeholder="Itinerary, luggage, child seats, invoicing to a company"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  className="w-full rounded-full bg-(--lantern) px-6 py-3.5 font-semibold text-(--ink) hover:bg-(--lantern-deep) sm:w-auto"
                >
                  Send quote request
                </button>
                <p className="mt-3 text-sm text-(--muted)">
                  No payment is taken at this stage. You will receive a quote to confirm.
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>

      <footer className="bg-(--ink-deep) text-(--on-ink-muted)">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 text-sm sm:px-8 md:grid-cols-3">
          <div>
            <span className={`${styles.display} text-2xl text-white`}>Heavenly Travel</span>
            <p className="mt-2 max-w-xs">
              Coach charter and chauffeured cars. Based in Langkawi, serving all of Malaysia since
              2016.
            </p>
          </div>
          <address className="not-italic">
            <p>Kuah, Langkawi, Kedah, Malaysia</p>
            <p className="mt-1">
              <a href="#" className="hover:text-white">
                +60 X-XXX XXXX
              </a>
            </p>
            <p className="mt-1">
              <a href="#" className="hover:text-white">
                hello@heavenlytravel.example
              </a>
            </p>
          </address>
          <div className="md:text-right">
            <p>Licensed tour and transport operator.</p>
            <p className="mt-1">Company registration and licence numbers on request.</p>
            <p className="mt-4">2026 Heavenly Travel Sdn. Bhd.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-(--line) bg-white px-3.5 py-2.5 text-[15px] text-(--text) placeholder:text-(--muted)/70";

function Field({
  label,
  id,
  type = "text",
  ...rest
}: { label: string; id: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input id={id} name={id} type={type} className={inputClass} {...rest} />
    </div>
  );
}

function Audience({ img, alt, title, text }: { img: string; alt: string; title: string; text: string }) {
  return (
    <article>
      <div className="overflow-hidden rounded-2xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img} alt={alt} className="aspect-[4/3] w-full object-cover" width={1200} height={900} loading="lazy" />
      </div>
      <h3 className={`${styles.display} mt-5 text-2xl text-(--ink)`}>{title}</h3>
      <p className="mt-2 text-[15px] text-(--muted)">{text}</p>
    </article>
  );
}

function Standard({ title, text }: { title: string; text: string }) {
  return (
    <li className="flex gap-4">
      <Tick className="mt-1.5" />
      <div>
        <h3 className="font-semibold text-(--ink)">{title}</h3>
        <p className="mt-1 text-[15px] text-(--muted)">{text}</p>
      </div>
    </li>
  );
}

function Tick({ className = "mt-[0.35rem]" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`h-4 w-4 shrink-0 self-start text-(--sea) ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 8.5l3.5 3.5 7.5-8" />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5.1-1.3A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 1 1-4.2 15.3l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 0 1 12 3.8zm-3.2 4.4c-.2 0-.5 0-.7.3-.3.3-1 1-1 2.3s1 2.7 1.1 2.9c.2.2 2 3.1 4.9 4.2 2.4.9 2.9.8 3.4.7.5 0 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.3-.1-.1-.3-.2-.6-.4l-2-1c-.3-.1-.5-.1-.7.1l-.9 1.1c-.2.2-.3.2-.6.1-.3-.2-1.2-.5-2.3-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.4.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6z" />
    </svg>
  );
}
