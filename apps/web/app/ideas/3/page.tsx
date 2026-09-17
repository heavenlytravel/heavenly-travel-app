/**
 * Heavenly Travel — idea 3, "The mileage chart"
 * Route: /ideas/3
 * Direction: the page is a road-atlas spread. The triangular distance chart
 * from the back of the atlas is the hero and the booking control; the fleet
 * is the key, services and places are the gazetteer, photos are plates.
 */

import type { Metadata } from "next";
import Image from "next/image";
import styles from "./page.module.css";
import { fontVars } from "./_lib/fonts";
import {
  BADGES,
  PHONE,
  REVIEWS,
  STEPS,
  WHATSAPP_HREF,
} from "../../_lib/content";
import { placeById } from "../../_lib/routes";
import { WhatsAppIcon } from "../../_components/WhatsAppIcon";
import { Gazetteer } from "./_components/Gazetteer";
import { Key } from "./_components/Key";
import { MileageSpread } from "./_components/MileageSpread";

export const metadata: Metadata = {
  title: "The mileage chart | Heavenly Travel ideas",
  description:
    "Cars with driver and coach charter between any two places in Malaysia. Pick a square on the chart for the drive time, the distance and the fare, then send the journey to Heavenly Travel on WhatsApp.",
};

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--motorway)";
const link = `text-(--motorway) underline decoration-[0.5px] underline-offset-3 hover:text-(--ink) ${focus}`;
const smallCaps =
  "text-[11px] font-semibold tracking-[0.16em] text-(--ink-soft) uppercase";

const GRID_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const GRID_NUMBERS = Array.from({ length: 10 }, (_, i) => i + 1);

const PLATES = [
  {
    src: "/brand/hero-langkawi.jpg",
    alt: "Eagle Square and the Kuah waterfront in Langkawi, seen from the air",
    caption:
      "Eagle Square, Kuah. Langkawi is where the company started and where most journeys on this sheet begin or end.",
    sizes: "(min-width: 1024px) 56vw, 100vw",
    className: "lg:col-span-7 lg:row-span-2",
    ratio: "aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[26rem]",
  },
  {
    src: "/brand/coach.jpg",
    alt: "Green and white executive coaches parked in a row",
    caption:
      "Executive coaches, 44 seats. Groups larger than one coach travel in convoy.",
    sizes: "(min-width: 1024px) 38vw, 100vw",
    className: "lg:col-span-5",
    ratio: "aspect-[16/9]",
  },
  {
    src: "/brand/attractions.jpg",
    alt: "The curved Langkawi Sky Bridge above the rainforest",
    caption:
      "The Sky Bridge, Gunung Mat Cincang. Cable car tickets can be added to a transfer.",
    sizes: "(min-width: 1024px) 38vw, 100vw",
    className: "lg:col-span-5",
    ratio: "aspect-[16/9]",
  },
];

function SectionHead({
  id,
  number,
  title,
  note,
}: {
  id: string;
  number: string;
  title: string;
  note: string;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-baseline gap-x-5 gap-y-1 border-t border-(--ink) pt-2.5">
      <span className={smallCaps}>{number}</span>
      <h2
        id={id}
        className="text-[1.45rem] leading-tight font-bold tracking-[0.1em] uppercase"
      >
        {title}
      </h2>
      <p className={`${styles.italic} text-[15px] text-(--ink-soft)`}>{note}</p>
    </div>
  );
}

export default function Page() {
  const north = placeById("langkawi").name;
  const south = placeById("jb").name;

  return (
    <div className={`${fontVars} ${styles.page} min-h-screen antialiased`}>
      <a
        href="#chart"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:bg-(--ink) focus:px-4 focus:py-2 focus:text-(--sheet)"
      >
        Skip to the chart
      </a>

      <div className="mx-auto max-w-[1560px] px-3 pt-3 pb-28 sm:px-5 sm:pt-5">
        <div className="relative border border-(--ink)">
          {/* Grid letters and numbers, as on the border of an atlas sheet */}
          <div
            aria-hidden="true"
            className="hidden grid-cols-8 border-b border-(--ink) pl-6 text-center text-[11px] font-medium text-(--ink-soft) lg:grid"
          >
            {GRID_LETTERS.map((l) => (
              <span
                key={l}
                className="border-l border-(--rule) py-0.5 first:border-(--ink)"
              >
                {l}
              </span>
            ))}
          </div>
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-0 hidden w-6 flex-col border-r border-(--ink) pt-[22px] text-center text-[11px] font-medium text-(--ink-soft) lg:flex"
          >
            {GRID_NUMBERS.map((n) => (
              <span
                key={n}
                className="flex flex-1 items-center justify-center border-t border-(--rule)"
              >
                {n}
              </span>
            ))}
          </div>

          <div className="lg:pl-6">
            {/* Cover line */}
            <header className="flex flex-wrap items-end justify-between gap-x-8 gap-y-2 border-b border-(--ink) px-4 py-3 sm:px-7 lg:px-9">
              <p className="flex flex-wrap items-baseline gap-x-4">
                <span className="text-[1.35rem] leading-none font-bold tracking-[0.14em] uppercase">
                  Heavenly Travel
                </span>
                <span
                  className={`${styles.italic} text-[15px] text-(--ink-soft)`}
                >
                  Road atlas of getting there, Malaysia
                </span>
              </p>
              <p className="flex items-center gap-x-5 text-[13px]">
                <span className={`${smallCaps} hidden md:inline`}>
                  Sheet 1 of 1
                </span>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 font-semibold tracking-[0.06em] uppercase ${link}`}
                >
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp the office
                </a>
              </p>
            </header>

            <main className="px-4 sm:px-7 lg:px-9">
              <div className="pt-7 pb-14 lg:pt-9">
                <MileageSpread
                  guide={
                    <section aria-labelledby="how-title" className="mt-10">
                      <SectionHead
                        id="how-title"
                        number="Note 1"
                        title="How to use this chart"
                        note="Four steps, from the square to the kerb."
                      />
                      <ol className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
                        {STEPS.map((s, i) => (
                          <li
                            key={s.title}
                            className="grid grid-cols-[2.25rem_minmax(0,1fr)]"
                          >
                            <span
                              aria-hidden="true"
                              className="text-[2.1rem] leading-[0.95] font-bold text-(--a-road)"
                            >
                              {i + 1}
                            </span>
                            <div>
                              <h3 className="text-[15px] font-semibold tracking-[0.08em] uppercase">
                                {s.title}
                              </h3>
                              <p
                                className={`${styles.serif} mt-1 text-[14.5px] leading-normal text-(--ink-soft)`}
                              >
                                {s.text}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </section>
                  }
                >
                  <p className={smallCaps}>
                    Cars with driver and coach charter
                  </p>
                  <h1 className="mt-3 text-[2.35rem] leading-[1.02] font-bold tracking-[0.01em] uppercase sm:text-[2.7rem] min-[1100px]:text-[2.5rem] xl:text-[2.8rem]">
                    Any two places in Malaysia. One driver, one price.
                  </h1>
                  <p
                    className={`${styles.serif} mt-4 max-w-[34rem] text-[16px] leading-[1.55]`}
                  >
                    Find one place on the diagonal, run a finger to the other,
                    and read the journey where they meet: drive time, distance
                    or fare. Choose the square, add your date and group size,
                    and send it to us on WhatsApp. We reply with a confirmed
                    quote.
                  </p>
                </MileageSpread>
              </div>

              <section
                id="key"
                aria-labelledby="key-title"
                className="scroll-mt-6 pb-14"
              >
                <SectionHead
                  id="key-title"
                  number="Note 2"
                  title="Key to vehicles"
                  note="Five classes, drawn as an atlas draws its roads. Every one comes with a driver."
                />
                <Key />
              </section>

              <section
                id="plates"
                aria-labelledby="plates-title"
                className="scroll-mt-6 pb-14"
              >
                <SectionHead
                  id="plates-title"
                  number="Plates 1 to 3"
                  title="Plates"
                  note={`Photographs from the ${north} end of the chart.`}
                />
                <div className="grid gap-x-6 gap-y-7 lg:grid-cols-12">
                  {PLATES.map((p, i) => (
                    <figure
                      key={p.src}
                      className={`flex flex-col ${p.className}`}
                    >
                      <div
                        className={`relative flex-1 border border-(--ink) ${p.ratio}`}
                      >
                        <Image
                          src={p.src}
                          alt={p.alt}
                          fill
                          sizes={p.sizes}
                          className="object-cover"
                        />
                      </div>
                      <figcaption className="mt-2 flex gap-3 text-[14px] leading-snug">
                        <span className="shrink-0 pt-px text-[11px] font-semibold tracking-[0.14em] uppercase">
                          Plate {i + 1}
                        </span>
                        <span className={`${styles.italic} text-(--ink-soft)`}>
                          {p.caption}
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </section>

              <section aria-labelledby="index-title" className="pb-10">
                <SectionHead
                  id="index-title"
                  number="Index"
                  title="Gazetteer of places and services"
                  note="Each entry points to the part of this sheet that answers it."
                />
                <Gazetteer />
              </section>

              <section aria-labelledby="notes-title" className="pb-14">
                <SectionHead
                  id="notes-title"
                  number="Note 3"
                  title="Notes from the road"
                  note="Sent in by passengers, printed as received."
                />
                <ul className="grid gap-x-12 gap-y-8 md:grid-cols-2">
                  {REVIEWS.map((r) => (
                    <li key={r.name}>
                      <figure>
                        <blockquote
                          className={`${styles.italic} text-[1.2rem] leading-[1.45]`}
                        >
                          {r.text}
                        </blockquote>
                        <figcaption className="mt-3 flex flex-wrap items-baseline gap-x-3 border-t border-(--rule) pt-2 text-[13px]">
                          <span className="font-semibold tracking-[0.1em] uppercase">
                            {r.name}, {r.from}
                          </span>
                          <span className="text-(--ink-soft)">{r.trip}</span>
                          <span className="ml-auto font-semibold text-(--trunk)">
                            {r.score} / 10
                          </span>
                        </figcaption>
                      </figure>
                    </li>
                  ))}
                </ul>
              </section>
            </main>

            {/* Colophon */}
            <footer className="border-t border-(--ink) px-4 pt-6 pb-5 sm:px-7 lg:px-9">
              <div className="grid gap-8 md:grid-cols-[1.1fr_1fr_1.2fr]">
                <div>
                  <h2 className={smallCaps}>To book or ask</h2>
                  <p className="mt-2 text-[1.35rem] leading-tight font-bold tracking-[0.04em]">
                    <a
                      href={`tel:${PHONE.replace(/\s/g, "")}`}
                      className={`hover:text-(--motorway) ${focus}`}
                    >
                      {PHONE}
                    </a>
                  </p>
                  <p className="mt-1 text-[15px]">
                    <a
                      href={WHATSAPP_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={link}
                    >
                      Message us on WhatsApp
                    </a>
                    , or{" "}
                    <a href="#chart" className={link}>
                      go back to the chart
                    </a>
                    .
                  </p>
                  <p className="mt-1 text-[15px] text-(--ink-soft)">
                    Heavenly Travel, Langkawi, Kedah, Malaysia.
                  </p>
                </div>
                <div>
                  <h2 className={smallCaps}>Registered</h2>
                  <ul className="mt-2 flex flex-wrap gap-x-6 gap-y-3">
                    {BADGES.map((b) => (
                      <li key={b.label} className="flex items-center gap-2.5">
                        <Image
                          src={b.image}
                          alt={b.alt}
                          width={280}
                          height={230}
                          sizes="64px"
                          className="h-12 w-auto border border-(--rule) bg-white p-0.5"
                        />
                        <span className="text-[14px] font-medium">
                          {b.label}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h2 className={smallCaps}>Colophon</h2>
                  <p
                    className={`${styles.serif} mt-2 text-[13.5px] leading-normal text-(--ink-soft)`}
                  >
                    Distances are rounded road kilometres between town centres,{" "}
                    {north} to {south} and across to the east coast. Drive times
                    assume expressway pace. Fares are indicative and a quote
                    confirms the final price. Set in Encode Sans Condensed and
                    Libre Caslon Text.
                  </p>
                </div>
              </div>
              <p
                className={`${smallCaps} mt-7 flex justify-between gap-4 border-t border-(--rule) pt-2`}
              >
                <span>Sheet 1 of 1</span>
                <span>Page 1</span>
                <span className="hidden sm:inline">
                  Heavenly Travel road atlas
                </span>
              </p>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
