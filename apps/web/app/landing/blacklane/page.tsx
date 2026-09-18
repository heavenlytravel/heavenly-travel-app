/**
 * Heavenly Travel — landing design
 * Route: /landing/blacklane
 * Model: Claude Fable 5.1 (claude-fable-5-1)
 * Reference: https://www.blacklane.com/
 * Direction: a quiet, premium chauffeur page. A full-height photo hero with a
 * one-way or by-the-hour booking card, services as tall photo panels, vehicle
 * classes with seats and bags, the driver standard in a dark band and
 * city-to-city routes as a plain list. Near-black teal and off-white, amber
 * only for emphasis, light Overpass headlines with plenty of air.
 * Inspired by the reference, not a copy of it.
 * Generated: 2026-09-18
 */

import type { Metadata } from "next";
import styles from "./page.module.css";
import { fontVars } from "../_lib/fonts";
import {
  BADGES,
  DESTINATIONS,
  FLEET,
  PHONE,
  REVIEWS,
  SERVICES,
  WHATSAPP_HREF,
  ringgit,
  type VehicleId,
} from "../../_lib/content";
import { WhatsAppIcon } from "../../_components/WhatsAppIcon";
import { BagIcon, PersonIcon, Photo, Wordmark } from "../_components/Brand";
import { BookingCard } from "./_components/BookingCard";

export const metadata: Metadata = {
  title: "Heavenly Travel | Chauffeur service across Malaysia",
  description:
    "Professional drivers, fixed prices and vehicles from executive sedans to 44-seat coaches. Airport transfers, city-to-city rides and hourly hire across Malaysia.",
};

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e4a93c]";
const eyebrowBase = "text-xs font-semibold tracking-[0.22em] uppercase";
/** Amber on the dark bands; a darker amber that holds contrast on paper. */
const eyebrowOnDark = `${eyebrowBase} text-[#e4a93c]`;
const eyebrow = `${eyebrowBase} text-[#875d0c]`;
const h2 =
  "font-(family-name:--font-display) text-3xl font-light tracking-tight sm:text-[2.75rem] sm:leading-[1.1]";

const NAV = [
  { href: "#services", label: "Services" },
  { href: "#classes", label: "Vehicle classes" },
  { href: "#standard", label: "Our standard" },
  { href: "#routes", label: "City to city" },
];

const FACTS = [
  { value: "Since 2016", label: "Driving guests from Langkawi to Johor" },
  { value: "9.8 / 10", label: "Across 1,027 verified trips" },
  { value: "Fixed price", label: "Tolls, fuel and parking included" },
  { value: "60 minutes", label: "Free waiting at every airport" },
];

/** The four services shown as tall panels, in this order. */
const PANEL_IDS = ["transfers", "car", "coach", "mice"];
const PANELS = PANEL_IDS.flatMap((id) => SERVICES.filter((s) => s.id === id));

/** Vehicle classes: what a guest chooses, instead of a make and model. */
const CLASS_NAMES: Record<VehicleId, { name: string; note: string }> = {
  sedan: { name: "Executive", note: "A quiet sedan for one to three guests" },
  mpv: {
    name: "Premier MPV",
    note: "Captain seats for families and executives",
  },
  van: { name: "Group van", note: "One vehicle for a group and its luggage" },
  minibus: {
    name: "Minibus",
    note: "Touring minibus for teams and tour groups",
  },
  coach: {
    name: "Executive coach",
    note: "Full-size touring coach for large groups",
  },
};

const STANDARD = [
  {
    title: "Drivers, not just licences",
    text: "Every driver is employed, trained and known to us by name. Most have driven these roads for more than ten years.",
  },
  {
    title: "There before you are",
    text: "Your driver arrives fifteen minutes early. Flights are tracked, so a delay changes nothing on your side.",
  },
  {
    title: "One price, agreed first",
    text: "The quote covers tolls, fuel, parking and the driver's meals. It does not move after you confirm.",
  },
  {
    title: "Licensed and insured",
    text: "Commercial permits and passenger insurance on every vehicle, with the paperwork sent on request.",
  },
];

const [leadReview, ...otherReviews] = REVIEWS;

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} min-h-screen font-(family-name:--font-body) antialiased`}
    >
      <a
        href="#services"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:px-4 focus:py-2 focus:text-[#071918]"
      >
        Skip to services
      </a>

      {/* Hero: header sits on the photo */}
      <div id="top" className={`${styles.hero} text-white`}>
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-6 sm:px-10">
          <a href="#top" className={focus}>
            <Wordmark tone="light" />
          </a>
          <nav aria-label="Primary" className="hidden gap-8 lg:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className={`text-sm tracking-wide text-white/80 hover:text-white ${focus}`}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <a
            href={WHATSAPP_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 border border-white/40 px-4 py-2.5 text-sm font-semibold tracking-wide hover:border-white hover:bg-white hover:text-[#071918] ${focus}`}
          >
            <WhatsAppIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Talk to us</span>
            <span className="sm:hidden">Chat</span>
          </a>
        </header>

        <section
          aria-labelledby="hero-h"
          className="mx-auto grid max-w-7xl items-end gap-12 px-5 pt-16 pb-16 sm:px-10 lg:min-h-[min(calc(100svh-5.5rem),46rem)] lg:grid-cols-[1fr_26rem] lg:pt-24 lg:pb-24"
        >
          <div className="max-w-2xl">
            <p className={eyebrowOnDark}>Chauffeur service · Malaysia</p>
            <h1
              id="hero-h"
              className="mt-5 font-(family-name:--font-display) text-[2.75rem] leading-[1.02] font-light tracking-tight sm:text-7xl"
            >
              Your driver is
              <br />
              already there.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/80">
              Professional drivers and immaculate vehicles for airport
              transfers, city-to-city journeys and full days on the road. One
              fixed price, agreed before you travel.
            </p>
          </div>
          <BookingCard />
        </section>
      </div>

      {/* Facts strip */}
      <section aria-label="At a glance" className="bg-[#071918] text-white">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-x-8 gap-y-8 px-5 py-10 sm:px-10 lg:grid-cols-4">
          {FACTS.map((f) => (
            <div key={f.value} className="border-l border-white/20 pl-5">
              <dt className="font-(family-name:--font-display) text-2xl font-light">
                {f.value}
              </dt>
              <dd className="mt-1 text-sm text-white/65">{f.label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <main>
        {/* Services as tall panels */}
        <section
          id="services"
          aria-labelledby="services-h"
          className="mx-auto max-w-7xl scroll-mt-8 px-5 pt-24 sm:px-10 sm:pt-32"
        >
          <div className="max-w-2xl">
            <p className={eyebrow}>Services</p>
            <h2 id="services-h" className={`${h2} mt-4`}>
              One standard, however far you are going.
            </h2>
          </div>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PANELS.map((s) => (
              <li key={s.id}>
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles.panel} group relative flex aspect-[5/4] sm:aspect-[3/4] flex-col justify-end overflow-hidden bg-[#071918] text-white ${focus}`}
                >
                  <Photo
                    src={s.image}
                    alt={s.alt}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-[#071918] via-[#071918]/45 to-transparent" />
                  <span className="relative p-6">
                    <span className="block font-(family-name:--font-display) text-2xl font-normal">
                      {s.title}
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-white/75">
                      {s.text}
                    </span>
                    <span className="mt-4 inline-block border-b border-[#e4a93c] pb-0.5 text-sm font-semibold text-[#e4a93c]">
                      Request a price
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Vehicle classes */}
        <section
          id="classes"
          aria-labelledby="classes-h"
          className="mx-auto max-w-7xl scroll-mt-8 px-5 pt-24 sm:px-10 sm:pt-32"
        >
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className={eyebrow}>Vehicle classes</p>
              <h2 id="classes-h" className={`${h2} mt-4`}>
                Choose the class. We send the right car.
              </h2>
            </div>
            <p className="max-w-xs text-sm text-[#5a6b68]">
              Prices are per day and indicative. Your quote confirms the final
              price.
            </p>
          </div>
          <ul className="mt-12 border-t border-[#d9ddd8]">
            {FLEET.map((v) => {
              const cls = CLASS_NAMES[v.id];
              return (
                <li
                  key={v.id}
                  className="grid items-center gap-6 border-b border-[#d9ddd8] py-7 md:grid-cols-[14rem_1fr_auto]"
                >
                  <Photo
                    src={v.image}
                    alt={v.alt}
                    className="aspect-[16/10] w-full object-cover"
                  />
                  <div>
                    <h3 className="font-(family-name:--font-display) text-2xl font-normal">
                      {cls.name}
                    </h3>
                    <p className="mt-1 text-sm text-[#5a6b68]">{cls.note}</p>
                    <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                      <span className="inline-flex items-center gap-1.5">
                        <PersonIcon /> Up to {v.seats}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <BagIcon /> {v.luggage}
                      </span>
                      <span className="text-[#5a6b68]">
                        {v.perks.join(" · ")}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-8 md:flex-col md:items-end md:gap-3">
                    <p>
                      <span className="text-xs tracking-[0.14em] text-[#5a6b68] uppercase">
                        From
                      </span>{" "}
                      <span className="font-(family-name:--font-display) text-2xl font-semibold">
                        {ringgit(v.fromPerDay)}
                      </span>
                    </p>
                    <a
                      href={WHATSAPP_HREF}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Request ${cls.name}`}
                      className={`border border-[#071918] px-5 py-2.5 text-sm font-semibold tracking-wide hover:bg-[#071918] hover:text-white ${focus}`}
                    >
                      Request
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        {/* The standard: dark band */}
        <section
          id="standard"
          aria-labelledby="standard-h"
          className="mt-24 scroll-mt-0 bg-[#071918] text-white sm:mt-32"
        >
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-10 sm:py-32 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className={eyebrowOnDark}>Our standard</p>
              <h2 id="standard-h" className={`${h2} mt-4`}>
                The part of the trip you never have to think about.
              </h2>
              <Photo
                src="/brand/chauffeur.jpg"
                alt="The leather cabin of a chauffeur-driven MPV"
                className="mt-10 aspect-[4/3] w-full object-cover"
              />
            </div>
            <ol className="self-end">
              {STANDARD.map((s, i) => (
                <li
                  key={s.title}
                  className="grid grid-cols-[3.5rem_1fr] border-t border-white/15 py-7 last:border-b"
                >
                  <span
                    aria-hidden
                    className="font-(family-name:--font-display) text-xl font-light text-[#e4a93c]"
                  >
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="font-(family-name:--font-display) text-xl font-normal">
                      {s.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-white/70">
                      {s.text}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* City to city */}
        <section
          id="routes"
          aria-labelledby="routes-h"
          className="mx-auto grid max-w-7xl scroll-mt-8 gap-12 px-5 pt-24 sm:px-10 sm:pt-32 lg:grid-cols-[1fr_1.4fr]"
        >
          <div>
            <p className={eyebrow}>City to city</p>
            <h2 id="routes-h" className={`${h2} mt-4`}>
              Door to door, across the peninsula.
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-[#5a6b68]">
              Skip the terminal and the transfer at the other end. The same
              driver takes you from your door to theirs, with stops wherever you
              like.
            </p>
          </div>
          <ul className="border-t border-[#d9ddd8]">
            {DESTINATIONS.map((d) => (
              <li key={d.name} className="border-b border-[#d9ddd8]">
                <a
                  href={WHATSAPP_HREF}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`group grid grid-cols-[1fr_auto] items-baseline gap-x-6 py-5 sm:grid-cols-[12rem_1fr_auto] ${focus}`}
                >
                  <span className="font-(family-name:--font-display) text-xl font-normal">
                    {d.name}
                  </span>
                  <span className="order-last col-span-2 mt-1 text-sm text-[#5a6b68] sm:order-none sm:col-span-1 sm:mt-0">
                    {d.blurb}
                  </span>
                  <span className="text-sm whitespace-nowrap text-[#5a6b68] group-hover:text-[#071918]">
                    {d.drive}{" "}
                    <span aria-hidden className="ml-2 text-[#b9831f]">
                      &rarr;
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Reviews */}
        {leadReview && (
          <section
            aria-labelledby="reviews-h"
            className="mx-auto max-w-7xl px-5 pt-24 pb-24 sm:px-10 sm:pt-32 sm:pb-32"
          >
            <h2 id="reviews-h" className={eyebrow}>
              Guests
            </h2>
            <figure className="mt-6 max-w-4xl">
              <blockquote className="font-(family-name:--font-display) text-2xl leading-snug font-light tracking-tight sm:text-4xl sm:leading-[1.2]">
                “{leadReview.text}”
              </blockquote>
              <figcaption className="mt-6 text-sm text-[#5a6b68]">
                <span className="font-semibold text-[#071918]">
                  {leadReview.name}
                </span>
                , {leadReview.from} · {leadReview.trip}
              </figcaption>
            </figure>
            <ul className="mt-16 grid gap-10 border-t border-[#d9ddd8] pt-10 md:grid-cols-3">
              {otherReviews.map((r) => (
                <li key={r.name}>
                  <p className="leading-relaxed">“{r.text}”</p>
                  <p className="mt-4 text-sm text-[#5a6b68]">
                    <span className="font-semibold text-[#071918]">
                      {r.name}
                    </span>
                    , {r.from} · {r.trip}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Closing call */}
        <section aria-labelledby="cta-h" className="bg-[#0c3b3a] text-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-5 py-16 sm:px-10">
            <div>
              <h2
                id="cta-h"
                className="font-(family-name:--font-display) text-3xl font-light tracking-tight"
              >
                Tell us where and when.
              </h2>
              <p className="mt-2 text-white/75">
                A fixed price on WhatsApp within minutes, any day of the week.
              </p>
            </div>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2.5 bg-[#e4a93c] px-7 py-4 font-semibold tracking-wide text-[#071918] hover:bg-[#f0b94d] ${focus}`}
            >
              <WhatsAppIcon className="h-5 w-5" />
              Request a price
            </a>
          </div>
        </section>
      </main>

      <footer className="bg-[#071918] text-white/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          <div>
            <Wordmark tone="light" className="text-white" />
            <p className="mt-4 text-sm leading-relaxed">
              Langkawi, Kedah, since 2016.
              <br />
              {PHONE}
            </p>
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-[0.18em] text-white uppercase">
              Services
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {PANELS.map((s) => (
                <li key={s.id}>{s.title}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xs font-semibold tracking-[0.18em] text-white uppercase">
              Registered
            </h2>
            <ul className="mt-4 flex gap-3">
              {BADGES.map((b) => (
                <li key={b.label}>
                  <Photo
                    src={b.image}
                    alt={b.alt}
                    className="h-12 bg-white p-1"
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="text-sm">
            <h2 className="text-xs font-semibold tracking-[0.18em] text-white uppercase">
              About this page
            </h2>
            <p className="mt-4">
              Inspired by blacklane.com, built by Claude Fable 5.1.
            </p>
          </div>
        </div>
        <div className="px-5 pb-28 text-center text-xs text-white/45">
          Indicative prices. Your quote confirms the final price.
        </div>
      </footer>
    </div>
  );
}
