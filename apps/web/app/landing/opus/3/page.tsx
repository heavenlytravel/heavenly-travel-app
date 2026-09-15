/**
 * Heavenly Travel — landing page variation
 * Route: /landing/opus/3
 * Model: Claude Opus 5 (claude-opus-5)
 * Direction: Malaysian expressway signage — a green direction sign hero with a sign-panel ride search, and a drawn road of destinations north to south with an E8 East Coast branch, pick-ups anywhere
 * Tokens used: 54,940 (20 tool calls)
 * Time taken: 6m 09s
 * Revision 1: 72,091 tokens (18 tool calls), 2m 29s
 * Revision 1 notes: New hero title/copy, green sign-panel booking search bar under hero, removed Langkawi-as-origin framing from sign, route, trust copy and metadata
 * Generated: 2026-09-15
 */
import type { Metadata } from "next";
import { Overpass } from "next/font/google";
import type { CSSProperties, ReactNode } from "react";
import styles from "./landing.module.css";
import { QuoteBuilder, WhatsAppGlyph } from "./_components/QuoteBuilder";
import { SearchBar } from "./_components/SearchBar";

const overpass = Overpass({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Heavenly Travel | Coach charter and car with driver across Malaysia",
  description:
    "Coach charter and private car with driver for groups, families and events, wherever you are in Malaysia and wherever you want to go. Ten years on the road, based in Langkawi.",
};

type Dir = "up" | "upRight" | "right";

const signRows: { code: string; place: string; dir: Dir; blue?: boolean }[] = [
  { code: "E36", place: "Penang", dir: "up" },
  { code: "59", place: "Cameron Highlands", dir: "upRight", blue: true },
  { code: "E1", place: "Kuala Lumpur", dir: "up" },
  { code: "E2", place: "Melaka", dir: "up" },
  { code: "E8", place: "Kuantan", dir: "right" },
];

type Stop = {
  place: string;
  road: string;
  roadName: string;
  lead: string;
  detail: string;
};

const mainStops: Stop[] = [
  {
    place: "Langkawi",
    road: "Ferry",
    roadName: "Kuala Perlis and Kuala Kedah jetties",
    lead: "Island escapes.",
    detail:
      "Airport and jetty transfers, island tours, hotel pick-ups and wedding guests moved on time.",
  },
  {
    place: "Penang",
    road: "E36",
    roadName: "Penang Bridge",
    lead: "Heritage streets and hawker stalls.",
    detail:
      "George Town walking days, food trips and Batu Ferringhi resorts, with a driver who waits while you explore.",
  },
  {
    place: "Cameron Highlands",
    road: "59",
    roadName: "Tapah to Tanah Rata",
    lead: "Cool air and tea estates.",
    detail:
      "Winding hill roads are best left to someone who drives them often. Tea farms, strawberry farms and the mossy forest.",
  },
  {
    place: "Kuala Lumpur",
    road: "E1",
    roadName: "North–South Expressway",
    lead: "Conferences, KLIA and city days.",
    detail:
      "Airport runs, corporate event shuttles, school trips to the museums and a day out at Batu Caves.",
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

const southStops: Stop[] = [
  {
    place: "Melaka",
    road: "E2",
    roadName: "North–South Expressway",
    lead: "The old port town.",
    detail:
      "Jonker Street, the Stadthuys and river cruises. A favourite for school groups and family weekends.",
  },
  {
    place: "Johor Bahru",
    road: "E2",
    roadName: "Southern end",
    lead: "The far end of the peninsula.",
    detail:
      "Theme park days for families, and the Desaru coast for company retreats.",
  },
];

export default function Page() {
  return (
    <div className={`${overpass.className} ${styles.root}`}>
      <a
        href="#main"
        className="sr-only z-50 rounded-full bg-[#FFC72C] px-4 py-2 font-bold text-[#263033] focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      <Header />

      <main id="main">
        <Hero />
        <RouteSection />
        <Services />
        <WhyUs />
        <Steps />
        <QuoteSection />
      </main>

      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <a href="#main" className="flex items-center gap-2.5 font-extrabold">
        <Logo />
        <span className="text-lg leading-none tracking-tight sm:text-xl">
          Heavenly Travel
        </span>
      </a>
      <nav aria-label="Main" className="flex items-center gap-1 sm:gap-6">
        <ul className="hidden items-center gap-6 text-[15px] font-semibold md:flex">
          <li>
            <a className="hover:underline" href="#route">
              Where we go
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#services">
              Vehicles
            </a>
          </li>
          <li>
            <a className="hover:underline" href="#how">
              How booking works
            </a>
          </li>
        </ul>
        <a
          href="#quote"
          className={`${styles.cta} rounded-full bg-[#00573F] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#00442f] sm:px-5`}
        >
          Get a quote
        </a>
      </nav>
    </header>
  );
}

function Logo() {
  return (
    <svg
      aria-hidden="true"
      width="34"
      height="34"
      viewBox="0 0 34 34"
      fill="none"
    >
      <rect width="34" height="34" rx="8" fill="#00573F" />
      <rect
        x="3"
        y="3"
        width="28"
        height="28"
        rx="5.5"
        stroke="#fff"
        strokeWidth="2"
      />
      <path
        d="M17 25V11m0 0-5.5 5.5M17 11l5.5 5.5"
        stroke="#FFC72C"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Arrow({ dir }: { dir: Dir }) {
  const rotate = dir === "up" ? 0 : dir === "upRight" ? 45 : 90;
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 32 32"
      className="h-7 w-7 shrink-0 sm:h-9 sm:w-9"
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      <path
        d="M16 28V6m0 0L6 16m10-10 10 10"
        stroke="#fff"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function Hero() {
  return (
    <section aria-labelledby="hero-title" className="overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 pt-8 pb-10 sm:px-8 md:pt-12 lg:grid-cols-[1.05fr_1fr] lg:gap-14">
        <div>
          <h1
            id="hero-title"
            className="text-[2.75rem] leading-[1.02] font-black tracking-[-0.02em] text-balance sm:text-6xl lg:text-[4.6rem]"
          >
            A better way to get away.
          </h1>
          <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[#263033]/85 sm:text-xl">
            Island escapes, seamless transport and trips made around you. Let
            our local team take care of the details.
          </p>
          <p className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[17px] font-bold">
            <a
              href="#quote"
              className="inline-flex items-center gap-2 text-[#00573F] underline decoration-2 underline-offset-4 hover:decoration-[#FFC72C]"
            >
              <WhatsAppGlyph />
              Ask for a quote on WhatsApp
            </a>
            <a
              href="#route"
              className="underline decoration-2 underline-offset-4 hover:decoration-[#FFC72C]"
            >
              See where we go
            </a>
          </p>
        </div>

        <figure className="relative">
          <div className={`${styles.sign} mx-auto max-w-[31rem] rotate-[-1.2deg]`}>
            <div className={`${styles.signInner} px-4 pt-5 pb-3 sm:px-6`}>
              <p className="text-[15px] font-semibold text-white/85">
                Wherever you are, we&apos;re going your way.
              </p>
              <ul className="mt-3 divide-y-2 divide-white/25">
                {signRows.map((row, i) => (
                  <li
                    key={row.place}
                    className={`${styles.row} flex items-center gap-3 py-3 sm:gap-4`}
                    style={{ animationDelay: `${150 + i * 110}ms` } as CSSProperties}
                  >
                    <span
                      className={`${styles.shield} ${row.blue ? styles.shieldBlue : ""} text-sm sm:text-base`}
                    >
                      {row.code}
                    </span>
                    <span className="min-w-0 flex-1 text-[1.35rem] leading-tight font-extrabold sm:text-[1.9rem]">
                      {row.place}
                    </span>
                    <Arrow dir={row.dir} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <figcaption className="sr-only">
            A road sign listing Penang, Cameron Highlands, Kuala Lumpur, Melaka
            and Kuantan.
          </figcaption>
          {/* sign posts */}
          <div
            aria-hidden="true"
            className="mx-auto flex max-w-[31rem] justify-around px-16"
          >
            <span className="h-14 w-3 rounded-b bg-[#8a9894]" />
            <span className="h-14 w-3 rounded-b bg-[#8a9894]" />
          </div>
        </figure>
      </div>
      <div className="mx-auto max-w-6xl px-3 pb-14 sm:px-8 lg:pb-20">
        <SearchBar />
      </div>
      <div aria-hidden="true" className={`${styles.roadH} h-14`} />
    </section>
  );
}

function RouteSection() {
  return (
    <section
      id="route"
      aria-labelledby="route-title"
      className="scroll-mt-4 bg-white pt-16 pb-6 sm:pt-24"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="max-w-2xl">
          <h2
            id="route-title"
            className="text-4xl leading-[1.05] font-black tracking-[-0.015em] sm:text-5xl"
          >
            One company for the whole trip.
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-[#263033]/85">
            Follow the road down the peninsula to see where people travel with
            us. Get picked up at any stop and dropped at any other, or somewhere
            that isn&apos;t on this map at all.
          </p>
        </div>

        <ol className="mt-14" aria-label="Destinations from north to south">
          {mainStops.map((stop, i) => (
            <RouteStop key={stop.place} stop={stop} first={i === 0} />
          ))}

          <li>
            <EastCoastBranch />
          </li>

          {southStops.map((stop, i) => (
            <RouteStop
              key={stop.place}
              stop={stop}
              last={i === southStops.length - 1}
            />
          ))}
        </ol>

        <p className="mx-auto mt-4 max-w-xl pb-10 text-center text-[17px] leading-relaxed text-[#263033]/85 md:text-lg">
          Heading somewhere not on the map? Tell us the route. We&apos;re adding
          new destinations as we grow.
        </p>
      </div>
    </section>
  );
}

function RoadCell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={`${styles.roadV} flex justify-center ${className}`}
    >
      {children}
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
        <h3 className="text-[2.6rem] leading-none font-black tracking-[-0.015em]">
          {stop.place}
        </h3>
        <p className="mt-3 inline-flex items-center gap-2 text-[15px] font-semibold text-[#263033]/80">
          <span className={`${styles.shield} text-sm`}>{stop.road}</span>
          {stop.roadName}
        </p>
      </div>
      <RoadCell className={`md:row-auto ${roadClass}`}>
        <span className={`${styles.stop} mt-6`} />
      </RoadCell>
      <div className="pt-5 pb-12 md:pb-14">
        <div className="md:hidden">
          <h3 className="text-[2rem] leading-none font-black tracking-[-0.015em]">
            {stop.place}
          </h3>
          <p className="mt-2.5 mb-3 inline-flex items-center gap-2 text-[15px] font-semibold text-[#263033]/80">
            <span className={`${styles.shield} text-sm`}>{stop.road}</span>
            {stop.roadName}
          </p>
        </div>
        <p className="text-xl font-bold md:pt-2">{stop.lead}</p>
        <p className="mt-2 max-w-[30rem] text-[17px] leading-relaxed text-[#263033]/85">
          {stop.detail}
        </p>
      </div>
    </li>
  );
}

function EastCoastBranch() {
  return (
    <div className="grid grid-cols-[44px_1fr] gap-x-4 md:grid-cols-[1fr_76px_1.15fr] md:gap-x-8">
      <div className="hidden md:block" />
      <RoadCell>
        <span />
      </RoadCell>
      <div className="pb-12 md:pb-14">
        <section
          aria-labelledby="east-title"
          className={`${styles.onDark} overflow-hidden rounded-2xl bg-[#0B5E8E] text-white`}
        >
          <div className="px-5 pt-5 sm:px-6">
            <p className="inline-flex items-center gap-2 text-[15px] font-semibold text-white/90">
              <span className={`${styles.shield} text-sm`}>E8</span>
              Turn off at Kuala Lumpur
            </p>
            <h3
              id="east-title"
              className="mt-2 text-3xl leading-none font-black tracking-[-0.015em]"
            >
              The East Coast
            </h3>
            <p className="mt-2 max-w-[28rem] text-[17px] leading-relaxed text-white/90">
              Across the Titiwangsa range to the South China Sea: quieter
              beaches, island jetties and Malay heritage.
            </p>
          </div>
          <div
            aria-hidden="true"
            className={`${styles.branchRoadH} mt-5 h-5 border-y-2 border-[#084a70]`}
          />
          <ul className="grid gap-4 px-5 py-5 sm:grid-cols-3 sm:px-6">
            {eastStops.map((s) => (
              <li key={s.place} className="flex gap-3 sm:block">
                <span
                  aria-hidden="true"
                  className={`${styles.stop} ${styles.stopBlue} mt-1 shrink-0 sm:mt-0 sm:mb-2 sm:block`}
                />
                <span>
                  <span className="block text-lg leading-tight font-extrabold">
                    {s.place}
                  </span>
                  <span className="mt-1 block text-[15px] leading-snug text-white/90">
                    {s.note}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Services() {
  return (
    <section
      id="services"
      aria-labelledby="services-title"
      className="scroll-mt-4 bg-[#E3ECE6] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2
          id="services-title"
          className="max-w-2xl text-4xl leading-[1.05] font-black tracking-[-0.015em] sm:text-5xl"
        >
          Pick the vehicle that fits your group.
        </h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <article className={`${styles.onDark} rounded-3xl bg-[#00573F] p-7 text-white sm:p-10`}>
            <CoachIcon />
            <h3 className="mt-6 text-3xl font-black tracking-[-0.01em] sm:text-4xl">
              Coach charter
            </h3>
            <p className="mt-3 max-w-[32rem] text-lg leading-relaxed text-white/90">
              A bus and driver for everyone travelling together, with luggage
              space and one pick-up plan. Tell us your headcount and we match
              the coach size.
            </p>
            <ul className="mt-7 grid gap-x-8 gap-y-3 text-[17px] font-semibold sm:grid-cols-2">
              {[
                "Tour groups and multi-day itineraries",
                "Company trips, conferences and events",
                "School outings and sports teams",
                "Airport and jetty transfers for groups",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Tick />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="#quote"
              className={`${styles.cta} mt-9 inline-flex rounded-full bg-[#FFC72C] px-6 py-3.5 font-extrabold text-[#263033] hover:bg-[#ffd452]`}
            >
              Quote a coach
            </a>
          </article>

          <article className="rounded-3xl bg-white p-7 sm:p-10">
            <CarIcon />
            <h3 className="mt-6 text-3xl font-black tracking-[-0.01em] sm:text-4xl">
              Car with driver
            </h3>
            <p className="mt-3 text-lg leading-relaxed text-[#263033]/85">
              A private car and a driver on your schedule. Stop where you like,
              for as long as you like.
            </p>
            <ul className="mt-7 grid gap-3 text-[17px] font-semibold">
              {[
                "Families and couples on holiday",
                "Business travel between meetings",
                "Full-day and half-day sightseeing",
                "Airport and jetty pick-ups",
              ].map((t) => (
                <li key={t} className="flex gap-3">
                  <Tick dark />
                  {t}
                </li>
              ))}
            </ul>
            <a
              href="#quote"
              className={`${styles.cta} mt-9 inline-flex rounded-full bg-[#00573F] px-6 py-3.5 font-extrabold text-white hover:bg-[#00442f]`}
            >
              Quote a car
            </a>
          </article>
        </div>

        <div className="mt-6 flex flex-col gap-2 rounded-3xl border-[3px] border-dashed border-[#263033]/35 px-7 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-xl font-extrabold">More ways to travel are on the way.</p>
          <p className="text-[17px] text-[#263033]/85">
            Planning something bigger? Ask us, we may already be able to help.
          </p>
        </div>
      </div>
    </section>
  );
}

function Tick({ dark }: { dark?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="mt-0.5 h-5 w-5 shrink-0"
      fill="none"
    >
      <path
        d="M4 10.5 8 14.5 16 5.5"
        stroke={dark ? "#00573F" : "#FFC72C"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CoachIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 56" className="h-14 w-auto" fill="none">
      <rect x="3" y="4" width="112" height="38" rx="9" fill="#fff" />
      <rect x="10" y="11" width="16" height="13" rx="2.5" fill="#00573F" />
      <rect x="31" y="11" width="16" height="13" rx="2.5" fill="#00573F" />
      <rect x="52" y="11" width="16" height="13" rx="2.5" fill="#00573F" />
      <rect x="73" y="11" width="16" height="13" rx="2.5" fill="#00573F" />
      <path d="M95 11h11a4 4 0 0 1 4 4v19H95z" fill="#00573F" />
      <rect x="3" y="30" width="112" height="4" fill="#FFC72C" />
      <circle cx="26" cy="44" r="8" fill="#263033" stroke="#fff" strokeWidth="3" />
      <circle cx="90" cy="44" r="8" fill="#263033" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

function CarIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 96 56" className="h-14 w-auto" fill="none">
      <path
        d="M8 36c0-5 3-8 8-9l10-12c2-2 4-3 7-3h26c3 0 5 1 7 3l11 12c6 1 11 4 11 9v6H8z"
        fill="#00573F"
      />
      <path d="M30 17h13v10H22zM48 17h11c1 0 2 0 3 1l8 9H48z" fill="#E3ECE6" />
      <rect x="8" y="34" width="80" height="3" fill="#FFC72C" />
      <circle cx="26" cy="44" r="8" fill="#263033" stroke="#fff" strokeWidth="3" />
      <circle cx="72" cy="44" r="8" fill="#263033" stroke="#fff" strokeWidth="3" />
    </svg>
  );
}

function WhyUs() {
  const points = [
    {
      title: "Drivers who know the way",
      body: "Our local team plans around the real road: early flights, ferry timetables, hill roads and city traffic.",
    },
    {
      title: "A clear quote first",
      body: "Your quote lists the vehicle, route, timing and price, so you can agree to it before anything is booked.",
    },
    {
      title: "A person on WhatsApp",
      body: "Message the same team before the trip, on the day, and if plans change halfway.",
    },
  ];
  return (
    <section
      aria-labelledby="why-title"
      className={`${styles.onDark} bg-[#263033] py-20 text-white sm:py-28`}
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-5 sm:px-8 lg:grid-cols-[auto_1fr] lg:gap-20">
        <div className="flex items-start gap-6 lg:flex-col">
          <KmPost />
          <h2
            id="why-title"
            className="max-w-[18rem] text-4xl leading-[1.05] font-black tracking-[-0.015em] sm:text-5xl lg:max-w-[20rem]"
          >
            Ten years on the road, and still driving.
          </h2>
        </div>
        <ul className="grid content-center gap-10 md:grid-cols-3 md:gap-8">
          {points.map((p) => (
            <li key={p.title} className="border-t-4 border-[#FFC72C] pt-5">
              <h3 className="text-xl font-extrabold">{p.title}</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-white/85">
                {p.body}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function KmPost() {
  return (
    <div
      role="img"
      aria-label="A roadside kilometre post marked 10 years"
      className="w-24 shrink-0 overflow-hidden rounded-t-[2.2rem] rounded-b-md bg-white text-center text-[#263033] sm:w-28"
    >
      <div className="bg-[#FFC72C] pt-5 pb-2 text-sm font-extrabold">HT</div>
      <div className="pt-3 text-5xl leading-none font-black">10</div>
      <div className="pt-1 pb-4 text-sm font-bold">years</div>
    </div>
  );
}

function Steps() {
  const steps = [
    {
      title: "Send us your route",
      body: "Pick-up, drop-off, date and how many people. Rough plans are fine.",
    },
    {
      title: "Get your quote",
      body: "We suggest the right vehicle and send a price for the whole trip.",
    },
    {
      title: "Confirm and travel",
      body: "Once you confirm, we send your driver's pick-up time and meet you there.",
    },
  ];
  return (
    <section
      id="how"
      aria-labelledby="how-title"
      className="scroll-mt-4 bg-white py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2
          id="how-title"
          className="max-w-2xl text-4xl leading-[1.05] font-black tracking-[-0.015em] sm:text-5xl"
        >
          Booking takes three messages.
        </h2>
        <div className="relative mt-12">
          <div
            aria-hidden="true"
            className={`${styles.roadH} absolute top-[22px] right-[16%] left-[4%] hidden h-3 rounded-full md:block`}
            style={{ backgroundSize: "100% 2px" }}
          />
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-5 md:block">
              <span className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-4 border-white bg-[#00573F] text-2xl font-black text-white outline-2 outline-[#00573F]">
                {i + 1}
              </span>
              <div className="md:mt-5">
                <h3 className="text-2xl font-extrabold">{s.title}</h3>
                <p className="mt-2 max-w-[22rem] text-[17px] leading-relaxed text-[#263033]/85">
                  {s.body}
                </p>
              </div>
            </li>
          ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function QuoteSection() {
  return (
    <section
      id="quote"
      aria-labelledby="quote-title"
      className="scroll-mt-4 bg-[#E3ECE6] py-20 sm:py-28"
    >
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <h2
          id="quote-title"
          className="max-w-2xl text-4xl leading-[1.05] font-black tracking-[-0.015em] sm:text-5xl"
        >
          Where are you headed?
        </h2>
        <p className="mt-4 mb-10 max-w-xl text-lg leading-relaxed text-[#263033]/85">
          Fill in what you know and send it to us on WhatsApp. We&apos;ll reply
          with a quote.
        </p>
        <QuoteBuilder />
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className={`${styles.onDark} bg-[#00573F] text-white`}>
      <div aria-hidden="true" className={`${styles.roadH} h-10`} />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="text-2xl font-black">Heavenly Travel</p>
          <p className="mt-3 max-w-sm text-[17px] leading-relaxed text-white/85">
            Coach charter and car with driver. Based in Langkawi, serving all of
            Malaysia.
          </p>
        </div>
        <div>
          <h2 className="text-base font-extrabold">Contact</h2>
          <ul className="mt-3 space-y-2 text-[17px] text-white/90">
            <li>WhatsApp: +60 X-XXX XXXX</li>
            <li>Langkawi, Kedah, Malaysia</li>
          </ul>
        </div>
        <div>
          <h2 className="text-base font-extrabold">On this page</h2>
          <ul className="mt-3 space-y-2 text-[17px]">
            <li>
              <a className="hover:underline" href="#route">
                Where we go
              </a>
            </li>
            <li>
              <a className="hover:underline" href="#services">
                Vehicles
              </a>
            </li>
            <li>
              <a className="hover:underline" href="#quote">
                Get a quote
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto max-w-6xl border-t border-white/20 px-5 pt-6 pb-24 text-sm text-white/75 sm:px-8">
        © Heavenly Travel. Prices and availability are confirmed in your quote.
      </p>
    </footer>
  );
}
