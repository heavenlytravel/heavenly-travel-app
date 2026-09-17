/**
 * Heavenly Travel — idea 2, "Headcount"
 * Route: /ideas/2
 * Direction: the company sells seats with a driver, from 1 to 44 and past
 * it. So the page asks one question, how many of you, and answers with a
 * seat plan instead of a search card. Every section below keeps counting.
 */

import type { Metadata } from "next";
import Image from "next/image";
import styles from "./page.module.css";
import { archivo } from "./_lib/fonts";
import {
  BADGES,
  DESTINATIONS,
  FLEET,
  PHONE,
  REVIEWS,
  SERVICES,
  STEPS,
  type Review,
  type Service,
} from "../../_lib/content";
import { MAX_SEATS, vehicleById, type VehicleId } from "../../_lib/routes";
import { shortName } from "./_lib/headcount";
import { PLANS } from "./_lib/plans";
import { eyebrow, focusBone, focusInk, quietButton } from "./_lib/styles";
import { HeadcountProvider } from "./_components/HeadcountProvider";
import { Counter } from "./_components/Counter";
import { PlanPanel } from "./_components/PlanPanel";
import { Manifest } from "./_components/Manifest";
import { Ladder } from "./_components/Ladder";
import { QuoteLink, SetCountButton } from "./_components/QuoteLink";
import { SeatPlan } from "./_components/SeatPlan";

export const metadata: Metadata = {
  title: "Headcount | Heavenly Travel ideas",
  description:
    "Tell us how many of you are travelling and see the vehicle, the seats and the price. Cars with driver and coach charter across Malaysia, from Langkawi.",
};

const shell = "mx-auto w-full max-w-[94rem] px-4 sm:px-8 lg:px-12";
const h2 = `${styles.wide} text-3xl leading-[1.02] font-extrabold sm:text-5xl`;

/** Alt text for the brand photos already lives in the shared content. */
const ALT = new Map(
  [...DESTINATIONS, ...SERVICES, ...FLEET].map((item) => [
    item.image,
    item.alt,
  ]),
);

function serviceById(id: string): Service {
  return SERVICES.find((s) => s.id === id) ?? SERVICES[0]!;
}

/** SERVICES recast by group size. The photo gets wider as the group does. */
const GROUPS: {
  size: number;
  who: string;
  service: Service;
  vehicle: VehicleId;
  image: string;
  photo: string;
  text: string;
  position: string;
  sizes: string;
  flip?: boolean;
}[] = [
  {
    size: 2,
    who: "Two of you, straight off a flight",
    service: serviceById("transfers"),
    vehicle: "sedan",
    image: "/brand/chauffeur.jpg",
    photo: "aspect-[4/3] lg:col-span-3 lg:aspect-[3/4]",
    text: "lg:col-span-6",
    position: "object-[62%_50%]",
    sizes: "(min-width: 1024px) 25vw, 100vw",
  },
  {
    size: 6,
    who: "A family of six on a day tour",
    service: serviceById("tours"),
    vehicle: "mpv",
    image: "/brand/mpv.jpg",
    photo: "aspect-[4/3] lg:col-span-5 lg:aspect-[5/4]",
    text: "lg:col-span-6",
    position: "object-[50%_70%]",
    sizes: "(min-width: 1024px) 42vw, 100vw",
    flip: true,
  },
  {
    size: 26,
    who: "Twenty-six on a school trip",
    service: serviceById("coach"),
    vehicle: "minibus",
    image: "/brand/attractions.jpg",
    photo: "aspect-[4/3] lg:col-span-8 lg:aspect-[2/1]",
    text: "lg:col-span-4",
    position: "object-center",
    sizes: "(min-width: 1024px) 66vw, 100vw",
  },
  {
    size: MAX_SEATS,
    who: "Forty-four for a company retreat or a MICE shuttle",
    service: serviceById("mice"),
    vehicle: "coach",
    image: "/brand/coach.jpg",
    photo: "aspect-[4/3] sm:aspect-[2/1] lg:col-span-12 lg:aspect-[3/1]",
    text: "lg:col-span-12",
    position: "object-[50%_68%]",
    sizes: "100vw",
  },
];

/**
 * REVIEWS carries the trip as a sentence, not as numbers, so the group size
 * and vehicle for each review are kept here, in the same order.
 */
type ReviewGroup = { size: number; vehicle: VehicleId; vehicles: number };

const REVIEW_GROUPS: ReviewGroup[] = [
  { size: 5, vehicle: "mpv", vehicles: 1 },
  { size: 40, vehicle: "coach", vehicles: 1 },
  { size: 2, vehicle: "sedan", vehicles: 1 },
  { size: 60, vehicle: "minibus", vehicles: 2 },
];

export default function Page() {
  return (
    <HeadcountProvider>
      <div
        className={`${archivo.variable} ${styles.page} min-h-screen pb-28 antialiased`}
      >
        <a
          href="#count"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-md focus:bg-[#141414] focus:px-4 focus:py-2 focus:text-[#F7F4EC]"
        >
          Skip to the head count
        </a>

        <header className="sticky top-0 z-40 border-b-2 border-[#141414] bg-[#E9E4D8]">
          <div
            className={`${shell} flex items-center justify-between gap-4 py-2.5`}
          >
            <a
              href="#top"
              className={`${styles.wide} flex items-center gap-2.5 rounded-sm text-[0.8125rem] leading-none font-black tracking-tight whitespace-nowrap uppercase sm:text-lg ${focusInk}`}
            >
              <span
                aria-hidden
                className="grid grid-cols-2 gap-[3px] [&>span]:h-2 [&>span]:w-2 [&>span]:rounded-[2px] [&>span]:border-[1.5px] [&>span]:border-[#141414]"
              >
                <span className="bg-[#E8442A]" />
                <span className="bg-[#E8442A]" />
                <span className="bg-[#E8442A]" />
                <span className="bg-[#F7F4EC]" />
              </span>
              Heavenly Travel
            </a>
            <QuoteLink
              short
              className={`inline-flex items-center gap-2 rounded-md border-2 border-[#141414] bg-[#F7F4EC] px-3 py-1.5 text-sm font-bold whitespace-nowrap hover:bg-[#141414] hover:text-[#F7F4EC] ${focusInk}`}
            />
          </div>
        </header>

        <main id="top">
          {/* Hero: the question, the number, the plan, the trip */}
          <section
            id="count"
            aria-labelledby="question"
            className={`${shell} scroll-mt-16 pt-8 pb-16 sm:pt-12 lg:pb-24`}
          >
            <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
              <div className="flex flex-col">
                <p className={eyebrow}>
                  Cars with driver and coach charter, all of Malaysia
                </p>
                <h1
                  id="question"
                  className={`${styles.wide} mt-3 text-[1.75rem] leading-none font-extrabold sm:text-4xl`}
                >
                  How many of you?
                </h1>
                <div className="mt-6 lg:mt-auto lg:pt-10">
                  <Counter />
                </div>
                <p className="mt-6 max-w-md text-[0.9375rem] leading-relaxed">
                  We sell seats with a driver, from 1 to {MAX_SEATS}. Move the
                  number and the right vehicle draws itself. Past {MAX_SEATS} we
                  send a second coach.
                </p>
              </div>
              <PlanPanel />
            </div>
            <Manifest />
          </section>

          {/* Fleet ladder */}
          <section
            aria-labelledby="ladder-title"
            className="border-y-2 border-[#141414] bg-[#F7F4EC]/60"
          >
            <div className={`${shell} py-16 lg:py-24`}>
              <p className={eyebrow}>The fleet, by seats</p>
              <h2 id="ladder-title" className={`${h2} mt-3 max-w-4xl`}>
                Five vehicles, one ruler.
              </h2>
              <p className="mt-4 max-w-2xl leading-relaxed">
                Each vehicle covers the head counts the one before it cannot.
                The marker is your group. Every one comes with a driver.
              </p>
              <div className="mt-10">
                <Ladder />
              </div>
            </div>
          </section>

          {/* Who travels in what */}
          <section
            aria-labelledby="groups-title"
            className={`${shell} py-16 lg:py-24`}
          >
            <p className={eyebrow}>What the seats are for</p>
            <h2 id="groups-title" className={`${h2} mt-3`}>
              Who travels in what.
            </h2>
            <ul className="mt-12 space-y-16 lg:space-y-24">
              {GROUPS.map((g) => (
                <li
                  key={g.size}
                  className="grid items-end gap-6 lg:grid-cols-12 lg:gap-10"
                >
                  <div
                    className={`relative overflow-hidden rounded-md border-2 border-[#141414] ${g.photo} ${g.flip ? "lg:order-2 lg:col-start-8" : ""}`}
                  >
                    <Image
                      src={g.image}
                      alt={ALT.get(g.image) ?? ""}
                      fill
                      sizes={g.sizes}
                      className={`object-cover ${g.position}`}
                    />
                  </div>
                  <div
                    className={`${g.text} ${g.size === MAX_SEATS ? "grid gap-x-10 gap-y-4 lg:grid-cols-[auto_1fr] lg:items-end" : ""}`}
                  >
                    <p
                      aria-hidden
                      className={`${styles.wide} ${styles.groupNumeral}`}
                    >
                      {g.size}
                    </p>
                    <div className={g.size === MAX_SEATS ? "max-w-2xl" : ""}>
                      <h3
                        className={`${styles.wide} mt-5 text-xl leading-tight font-extrabold sm:text-2xl lg:mt-4`}
                      >
                        {g.who}
                      </h3>
                      <p className={`${eyebrow} mt-3`}>
                        {g.service.title} · {shortName(vehicleById(g.vehicle))}
                      </p>
                      <p className="mt-2 max-w-xl leading-relaxed">
                        {g.service.text}
                      </p>
                      <SetCountButton
                        to={g.size}
                        className={`${quietButton} ${focusInk} mt-5 hover:border-[#141414] hover:bg-[#141414] hover:text-[#F7F4EC]`}
                      />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {/* Reviews, by group */}
          <section
            aria-labelledby="reviews-title"
            className="bg-[#1F4F46] text-[#F7F4EC]"
          >
            <div className={`${shell} py-16 lg:py-24`}>
              <p className={eyebrow}>Groups we have moved</p>
              <h2 id="reviews-title" className={`${h2} mt-3`}>
                Counted out, counted back.
              </h2>
              <ul className="mt-12 border-t-2 border-[#F7F4EC]">
                {REVIEWS.map((review, i) => (
                  <ReviewRow
                    key={review.name}
                    review={review}
                    group={REVIEW_GROUPS[i]}
                  />
                ))}
              </ul>
            </div>
          </section>

          {/* Steps */}
          <section
            aria-labelledby="steps-title"
            className={`${shell} py-16 lg:py-24`}
          >
            <p className={eyebrow}>How booking works</p>
            <h2 id="steps-title" className={`${h2} mt-3`}>
              Four steps, one chat.
            </h2>
            <ol className="mt-10 grid gap-[2px] border-2 border-[#141414] bg-[#141414] sm:grid-cols-2 xl:grid-cols-4">
              {STEPS.map((step, i) => (
                <li key={step.title} className="bg-[#E9E4D8] p-5 sm:p-6">
                  <span
                    aria-hidden
                    className={`${styles.wide} block text-6xl leading-none font-black text-[#E8442A] tabular-nums`}
                  >
                    {i + 1}
                  </span>
                  <h3
                    className={`${styles.wide} mt-5 text-lg leading-tight font-extrabold`}
                  >
                    {step.title}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </main>

        <footer className="bg-[#1F4F46] text-[#F7F4EC]">
          <div
            className={`${shell} grid gap-10 py-14 lg:grid-cols-[1.2fr_1fr_1fr]`}
          >
            <div>
              <p
                className={`${styles.wide} text-2xl leading-tight font-black uppercase`}
              >
                Heavenly Travel
              </p>
              <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed">
                Licensed travel agency in Langkawi, Kedah. Cars with driver and
                coach charter anywhere in Malaysia.
              </p>
            </div>
            <div>
              <p className={eyebrow}>Talk to us</p>
              <p className="mt-3">
                <a
                  href={`tel:${PHONE.replace(/[^+\d]/g, "")}`}
                  className={`${styles.wide} rounded-sm text-xl font-extrabold tabular-nums underline decoration-2 underline-offset-4 ${focusBone}`}
                >
                  {PHONE}
                </a>
              </p>
              <QuoteLink
                className={`${quietButton} ${focusBone} mt-4 hover:border-[#F7F4EC] hover:bg-[#F7F4EC] hover:text-[#1F4F46]`}
              />
            </div>
            <div>
              <p className={eyebrow}>Registered</p>
              <ul className="mt-3 flex flex-wrap gap-5">
                {BADGES.map((badge) => (
                  <li key={badge.label} className="flex items-center gap-3">
                    <Image
                      src={badge.image}
                      alt={badge.alt}
                      width={280}
                      height={230}
                      sizes="68px"
                      className="h-14 w-auto rounded-sm border-2 border-[#141414] bg-white"
                    />
                    <span className="text-sm font-semibold">{badge.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t-2 border-[#F7F4EC]/30">
            <p className={`${shell} py-5 text-sm`}>
              Prices on this page are indicative. A quote confirms the final
              price, the vehicle and the driver.
            </p>
          </div>
        </footer>
      </div>
    </HeadcountProvider>
  );
}

function ReviewRow({
  review,
  group,
}: {
  review: Review;
  group: ReviewGroup | undefined;
}) {
  const vehicle = group ? vehicleById(group.vehicle) : undefined;
  return (
    <li className="grid gap-x-10 gap-y-5 border-b-2 border-[#F7F4EC] py-8 md:grid-cols-[minmax(0,17rem)_minmax(0,1fr)] lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:py-10">
      {group && vehicle && (
        <div>
          <p className={`${styles.wide} ${styles.groupNumeral}`}>
            {group.size}
            <span className="sr-only"> people</span>
          </p>
          <p className={`${eyebrow} mt-4`}>
            {group.vehicles > 1
              ? `${group.vehicles} x ${shortName(vehicle)}`
              : shortName(vehicle)}
          </p>
          <div
            className="mt-3 flex flex-col gap-1.5"
            style={{
              maxWidth: `${(PLANS[group.vehicle].width * 0.03).toFixed(2)}rem`,
            }}
          >
            {Array.from({ length: group.vehicles }, (_, n) => (
              <SeatPlan
                key={n}
                vehicle={vehicle}
                occupied={group.size - n * vehicle.seats}
                tone="onGreen"
                strokeWidth={1.25}
                decorative
                className="h-auto w-full"
              />
            ))}
          </div>
        </div>
      )}
      <figure className="flex flex-col justify-end">
        <blockquote className="max-w-3xl text-xl leading-snug sm:text-2xl">
          {review.text}
        </blockquote>
        <figcaption className="mt-5 text-sm">
          <span className="font-bold">{review.name}</span>, {review.from}.{" "}
          {review.trip}. Rated {review.score} out of 10.
        </figcaption>
      </figure>
    </li>
  );
}
