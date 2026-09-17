/**
 * Say the trip: /ideas/1
 * The landing page as a piece of correspondence. The customer's side is one
 * typeset sentence with the blanks as inline controls; Heavenly Travel's
 * reply writes itself underneath from the shared route data. Everything after
 * that is the rest of the letter: prose with marginalia, an enclosure list for
 * the fleet, customers' replies, and a sign-off instead of a footer.
 */

import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import {
  BADGES,
  DESTINATIONS,
  FLEET,
  PHONE,
  REVIEWS,
  SERVICES,
  STEPS,
  WHATSAPP_HREF,
  ringgit,
  type Service,
} from "../../_lib/content";
import {
  PLACES,
  distanceKm,
  driveMinutes,
  formatDrive,
} from "../../_lib/routes";
import { Sentence } from "./_components/Sentence";
import { fontVars } from "./_lib/fonts";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Say the trip | Heavenly Travel ideas",
  description:
    "Write one sentence about your trip and Heavenly Travel answers with a vehicle, a drive time and a price. Cars with driver and coach charter from Langkawi to all of Malaysia.",
};

const focus =
  "rounded-[2px] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-[#2440C8]";
const link = `text-[#2440C8] underline decoration-1 underline-offset-4 hover:decoration-2 ${focus}`;
const mono = "font-(family-name:--font-reply)";
const label = `${mono} text-xs font-medium tracking-[0.14em] uppercase`;
const prose =
  "text-[1.2rem] leading-[1.6] sm:text-[1.375rem] sm:leading-[1.58]";

const anchors = [
  { href: "#trip", label: "The trip" },
  { href: "#work", label: "What we do" },
  { href: "#enclosures", label: "Encl." },
  { href: "#replies", label: "Replies" },
  { href: "#next", label: "What happens next" },
];

/** Sidenote numbers follow the order the services are mentioned in the prose. */
const NOTE_ORDER = [
  "transfers",
  "car",
  "coach",
  "mice",
  "tours",
  "attractions",
];

function notesFor(ids: string[]): { n: number; service: Service }[] {
  return ids.flatMap((id) => {
    const service = SERVICES.find((s) => s.id === id);
    return service ? [{ n: NOTE_ORDER.indexOf(id) + 1, service }] : [];
  });
}

/** A phrase swiped with the highlighter, tied to its numbered sidenote. */
function Marked({ id, children }: { id: string; children: ReactNode }) {
  return (
    <>
      <mark className={`${styles.marker} font-semibold`}>{children}</mark>
      <sup
        className={`${mono} ml-0.5 text-[0.55em] font-medium text-[#2440C8]`}
      >
        <a
          href={`#note-${id}`}
          aria-label={`Note ${NOTE_ORDER.indexOf(id) + 1}`}
          className={`no-underline ${focus}`}
        >
          {NOTE_ORDER.indexOf(id) + 1}
        </a>
      </sup>
    </>
  );
}

/**
 * One row of the letter: an optional heading in the left gutter (wide screens
 * only), the writing, and its marginalia. Below the lg breakpoint the
 * marginalia fall in line under the paragraph they belong to.
 */
function Row({
  heading,
  children,
  aside,
}: {
  heading?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="grid gap-y-5 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-x-12 xl:grid-cols-[9rem_minmax(0,1fr)_17rem]">
      <div
        className={heading ? "lg:col-span-2 xl:col-span-1" : "hidden xl:block"}
      >
        {heading}
      </div>
      <div className="max-w-[46rem]">{children}</div>
      {aside ? (
        <div className="border-l border-[#D9D6C8] pl-4 lg:border-l-0 lg:pl-0">
          {aside}
        </div>
      ) : null}
    </div>
  );
}

function Heading({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className={`${label} xl:pt-2.5`}>
      {children}
    </h2>
  );
}

function ServiceNotes({ ids }: { ids: string[] }) {
  return (
    <ul className="space-y-6">
      {notesFor(ids).map(({ n, service }) => (
        <li
          key={service.id}
          id={`note-${service.id}`}
          className="grid scroll-mt-8 grid-cols-[4.5rem_minmax(0,1fr)] gap-x-3.5"
        >
          <Image
            src={service.image}
            alt={service.alt}
            width={144}
            height={144}
            sizes="72px"
            className="h-18 w-18 rounded-[2px] object-cover"
          />
          <div>
            <p className="text-[15px] leading-snug font-semibold">
              <span className={`${mono} mr-1.5 text-xs text-[#2440C8]`}>
                {n}
              </span>
              {service.title}
            </p>
            <p className={`${mono} mt-1.5 text-[12.5px] leading-[1.55]`}>
              {service.text}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

const home = DESTINATIONS[0];
const base = PLACES[0];

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen pb-28 antialiased`}
    >
      <a
        href="#trip"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-[2px] focus:bg-[#1B2B26] focus:px-4 focus:py-2 focus:text-[#FBFAF4]"
      >
        Skip to the trip sentence
      </a>

      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        {/* Letterhead */}
        <header className="flex flex-col gap-x-10 gap-y-4 border-b-4 border-double border-[#1B2B26] pt-7 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[1.7rem] leading-none font-black tracking-[-0.03em]">
              Heavenly Travel
            </p>
            <p className={`${mono} mt-2.5 text-[12.5px] leading-normal`}>
              Langkawi, Kedah. Cars with driver and coach charter, all of
              Malaysia.
              <br />
              {BADGES.map((b) => b.label).join(". ")}.
            </p>
          </div>
          <nav aria-label="Parts of this letter">
            <ul
              className={`${mono} flex flex-wrap gap-x-5 gap-y-1.5 text-[12.5px]`}
            >
              {anchors.map((a) => (
                <li key={a.href}>
                  <a
                    href={a.href}
                    className={`underline decoration-[#D9D6C8] decoration-1 underline-offset-4 hover:decoration-[#2440C8] ${focus}`}
                  >
                    {a.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </header>

        <main>
          {/* The sentence */}
          <section
            id="trip"
            aria-labelledby="trip-title"
            className="scroll-mt-6 pt-10 pb-16 sm:pt-14 sm:pb-24"
          >
            <h1
              id="trip-title"
              className="max-w-[40rem] text-xl leading-snug font-normal italic sm:text-2xl"
            >
              Say the trip in one sentence. We&rsquo;ll write back with a
              vehicle, a drive time and a price.
            </h1>
            <p className={`${label} mt-10 mb-4 sm:mt-14`}>
              Dear Heavenly Travel,
            </p>
            <Sentence />
          </section>

          <div
            className={`${styles.letter} ${styles.ruled} space-y-20 border-t border-[#D9D6C8] pt-14 sm:space-y-28 sm:pt-20`}
          >
            {/* Where we are */}
            {home && base ? (
              <section aria-labelledby="where-title" className="space-y-10">
                <Row
                  heading={<Heading id="where-title">Where we are</Heading>}
                  aside={
                    <table className={`${mono} w-full text-[12.5px]`}>
                      <caption className="pb-2 text-left font-medium">
                        Door to door from {base.name}
                      </caption>
                      <thead className="sr-only">
                        <tr>
                          <th scope="col">To</th>
                          <th scope="col">Distance</th>
                          <th scope="col">Time</th>
                        </tr>
                      </thead>
                      <tbody className="tabular-nums">
                        {PLACES.slice(1).map((p) => (
                          <tr key={p.id} className="border-t border-[#D9D6C8]">
                            <th
                              scope="row"
                              className="py-1.5 text-left font-normal"
                            >
                              {p.name}
                            </th>
                            <td className="py-1.5 pl-2 text-right whitespace-nowrap">
                              {distanceKm(base.id, p.id)} km
                            </td>
                            <td className="py-1.5 pl-2 text-right whitespace-nowrap text-[#2440C8]">
                              {formatDrive(driveMinutes(base.id, p.id))}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-[#D9D6C8]">
                          <td colSpan={3} className="pt-2 leading-normal">
                            {base.note}, then road kilometres from the jetty.
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  }
                >
                  <p className={prose}>
                    <span className="font-bold">
                      We are a travel agency on an island,
                    </span>{" "}
                    which explains a lot. Every trip out of Langkawi starts with
                    a ferry or a flight, so we got good at the joins: the jetty,
                    the arrivals hall, the hotel that is not where the map says
                    it is. From there we drive the whole peninsula, from Penang
                    down to Johor Bahru and across to Kota Bharu.
                  </p>
                  <figure className="mt-8">
                    <Image
                      src={home.image}
                      alt={home.alt}
                      width={1440}
                      height={810}
                      sizes="(min-width: 1280px) 46rem, (min-width: 1024px) 60vw, 92vw"
                      className="aspect-[16/9] w-full rounded-[2px] object-cover"
                    />
                    <figcaption className={`${mono} mt-2.5 text-[12.5px]`}>
                      Fig. 1. {home.alt}. {home.blurb}
                    </figcaption>
                  </figure>
                </Row>
              </section>
            ) : null}

            {/* Services, written rather than listed */}
            <section
              id="work"
              aria-labelledby="work-title"
              className="scroll-mt-8 space-y-10"
            >
              <Row
                heading={<Heading id="work-title">What we do</Heading>}
                aside={<ServiceNotes ids={["transfers", "car"]} />}
              >
                <p className={prose}>
                  <span className="font-bold">
                    Most of our work starts at a door.
                  </span>{" "}
                  <Marked id="transfers">Airport and jetty transfers</Marked>{" "}
                  are the everyday part: somebody holding your name on a board,
                  at whatever hour the flight or the ferry actually arrives. If
                  one ride is not enough, take a{" "}
                  <Marked id="car">car with driver</Marked> for the day, the
                  week or the whole itinerary, and stop explaining the route to
                  a new person every morning.
                </p>
              </Row>
              <Row aside={<ServiceNotes ids={["coach", "mice"]} />}>
                <p className={prose}>
                  Bigger groups want a <Marked id="coach">coach charter</Marked>
                  : 26 to 44 seats for tour groups, schools and companies, with
                  one driver who stays with you from the first morning to the
                  last. For conferences and incentive trips we run{" "}
                  <Marked id="mice">MICE and event shuttles</Marked> to a
                  timetable, with a coordinator standing where the confusion
                  usually is.
                </p>
              </Row>
              <Row aside={<ServiceNotes ids={["tours", "attractions"]} />}>
                <p className={prose}>
                  And when the drive is the point, we do{" "}
                  <Marked id="tours">day tours</Marked>: the Langkawi island
                  loop, Penang&rsquo;s heritage streets, the Cameron tea
                  estates. We can add{" "}
                  <Marked id="attractions">attraction tickets</Marked> to the
                  same booking, so the cable car queue becomes somebody
                  else&rsquo;s afternoon.
                </p>
              </Row>
            </section>

            {/* The fleet, as a letter's enclosure list */}
            <section
              id="enclosures"
              aria-labelledby="encl-title"
              className="scroll-mt-8"
            >
              <Row
                heading={
                  <Heading id="encl-title">Encl. ({FLEET.length})</Heading>
                }
                aside={
                  <figure>
                    <Image
                      src="/brand/coach.jpg"
                      alt="A fleet of green and white executive coaches"
                      width={540}
                      height={360}
                      sizes="(min-width: 1024px) 17rem, 92vw"
                      className="aspect-[3/2] w-full max-w-sm rounded-[2px] object-cover"
                    />
                    <figcaption
                      className={`${mono} mt-2.5 text-[12.5px] leading-[1.55]`}
                    >
                      Fig. 2. The coaches, washed. Day rates are indicative and
                      include the driver. A quote confirms the final price.
                    </figcaption>
                  </figure>
                }
              >
                <p className={prose}>
                  <span className="font-bold">Enclosed, the fleet.</span> Five
                  sizes, so nobody pays for forty empty seats or sits on a
                  suitcase.
                </p>
                <table className="mt-8 w-full border-collapse text-left">
                  <caption className="sr-only">
                    Vehicles with seats, luggage space and indicative day rate
                  </caption>
                  <thead>
                    <tr className={`${label} border-b border-[#1B2B26]`}>
                      <th scope="col" className="w-8 py-2 font-medium">
                        No.
                      </th>
                      <th scope="col" className="py-2 font-medium">
                        Vehicle
                      </th>
                      <th
                        scope="col"
                        className="py-2 pl-3 text-right font-medium"
                      >
                        Seats
                      </th>
                      <th
                        scope="col"
                        className="hidden py-2 pl-6 font-medium sm:table-cell"
                      >
                        Luggage
                      </th>
                      <th
                        scope="col"
                        className="py-2 pl-3 text-right font-medium"
                      >
                        From, a day
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {FLEET.map((v, i) => (
                      <tr
                        key={v.id}
                        className="border-b border-[#D9D6C8] align-baseline"
                      >
                        <td
                          className={`${mono} py-4 text-[13px] text-[#2440C8]`}
                        >
                          {i + 1}
                        </td>
                        <th scope="row" className="py-4 font-normal">
                          <span className="text-lg leading-snug font-semibold sm:text-xl">
                            {v.name}
                          </span>
                          <span
                            className={`${mono} mt-1 block text-[12.5px] leading-[1.55]`}
                          >
                            <span className="sm:hidden">{v.luggage}. </span>
                            {v.perks.join(". ")}.
                          </span>
                        </th>
                        <td
                          className={`${mono} py-4 pl-3 text-right text-[15px] tabular-nums`}
                        >
                          {v.seats}
                        </td>
                        <td
                          className={`${mono} hidden py-4 pl-6 text-[13px] whitespace-nowrap sm:table-cell`}
                        >
                          {v.luggage}
                        </td>
                        <td
                          className={`${mono} py-4 pl-3 text-right text-[15px] whitespace-nowrap tabular-nums`}
                        >
                          {ringgit(v.fromPerDay)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Row>
            </section>

            {/* Reviews, as replies in the same correspondence */}
            <section
              id="replies"
              aria-labelledby="replies-title"
              className="scroll-mt-8 space-y-12"
            >
              <Row heading={<Heading id="replies-title">Replies</Heading>}>
                <p className={prose}>
                  <span className="font-bold">
                    Some letters came back the other way.
                  </span>{" "}
                  We have left them as they were written.
                </p>
              </Row>
              {REVIEWS.map((r) => (
                <Row
                  key={r.name}
                  aside={
                    <p className={`${mono} text-[12.5px] leading-[1.55]`}>
                      <span className="block text-2xl font-medium text-[#2440C8] tabular-nums">
                        {r.score} / 10
                      </span>
                      The score {r.name} gave the trip.
                    </p>
                  }
                >
                  <figure>
                    <p className={`${label} text-[#2440C8]`}>Re: {r.trip}</p>
                    <blockquote className="mt-3 text-[1.35rem] leading-[1.45] italic sm:text-[1.7rem] sm:leading-[1.4]">
                      <p>{r.text}</p>
                    </blockquote>
                    <figcaption className="mt-4 text-lg">
                      <span className="font-bold">{r.name}</span>, {r.from}
                    </figcaption>
                  </figure>
                </Row>
              ))}
            </section>

            {/* Steps, as a paragraph */}
            <section
              id="next"
              aria-labelledby="next-title"
              className="scroll-mt-8"
            >
              <Row
                heading={<Heading id="next-title">What happens next</Heading>}
                aside={
                  <p className={`${mono} text-[12.5px] leading-[1.55]`}>
                    No account, no app, no deposit to see a price. It is one
                    WhatsApp thread from the first message to the drive home.
                  </p>
                }
              >
                <ol className={prose}>
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="inline">
                      <span
                        className={`${mono} mr-1 text-[0.8em] font-medium text-[#2440C8]`}
                      >
                        ({i + 1})
                      </span>
                      <span className="font-bold">{s.title}.</span>{" "}
                      {s.text}{" "}
                    </li>
                  ))}
                </ol>
                <p className={`${prose} mt-6`}>
                  That is the whole process.{" "}
                  <a href="#trip" className={link}>
                    Go back up and say the trip
                  </a>
                  , or just{" "}
                  <a
                    href={WHATSAPP_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={link}
                  >
                    start the chat
                  </a>{" "}
                  and tell us in your own words.
                </p>
              </Row>
            </section>
          </div>
        </main>

        {/* Sign-off */}
        <footer className="mt-20 border-t-4 border-double border-[#1B2B26] pt-10 sm:mt-28">
          <div className="grid gap-y-10 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-x-12 xl:grid-cols-[9rem_minmax(0,1fr)_17rem]">
            <div className="hidden xl:block" />
            <div>
              <p className={prose}>Yours on the road,</p>
              <p className="mt-3 text-[2.6rem] leading-none font-black tracking-[-0.03em] italic sm:text-6xl">
                Heavenly Travel
              </p>
              <address
                className={`${mono} mt-6 text-sm leading-[1.7] not-italic`}
              >
                Langkawi, Kedah, Malaysia
                <br />
                Telephone{" "}
                <a href={`tel:${PHONE.replace(/\s/g, "")}`} className={link}>
                  {PHONE}
                </a>
                <br />
                WhatsApp{" "}
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={link}
                >
                  message us on the same number
                </a>
              </address>
              <p
                className={`${mono} mt-8 max-w-[38rem] text-[12.5px] leading-[1.55]`}
              >
                P.S. Every price on this page is indicative. Your quote confirms
                the final price before anything is booked.
              </p>
            </div>
            <ul className="flex flex-wrap items-center gap-x-6 gap-y-4 self-end lg:flex-col lg:items-start">
              {BADGES.map((b) => (
                <li key={b.label} className="flex items-center gap-3">
                  <Image
                    src={b.image}
                    alt={b.alt}
                    width={280}
                    height={230}
                    sizes="64px"
                    className="h-13 w-auto rounded-[2px] border border-[#D9D6C8]"
                  />
                  <span className={`${mono} text-[12.5px]`}>{b.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
}
