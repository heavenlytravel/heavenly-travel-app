/**
 * Heavenly Travel — landing design
 * Route: /landing/astra/[slug]
 * A destination page of the GPT Astra concept: the same booking card with the
 * place filled in, under a dark photo hero. See ../page.tsx for the conversion.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "../astra.module.css";
import { Photo } from "../../../_components/Brand";
import { PRODUCTS } from "../../../_lib/search";
import { SiteHeader } from "../_components/SiteHeader";
import { Booking, Closing, SiteFooter, eyebrow } from "../_components/Sections";
import { ASTRA_DESTINATIONS, ASTRA_HOME } from "../_lib/destinations";
import { fontVars } from "../_lib/fonts";

type Props = PageProps<"/landing/astra/[slug]">;

const find = (slug: string) => ASTRA_DESTINATIONS.find((d) => d.slug === slug);

/** Only the four destinations exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return ASTRA_DESTINATIONS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = find((await params).slug);
  if (!d) return {};
  return {
    title: `${d.name} Travel Services — Heavenly Travel`,
    description: d.intro,
  };
}

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

const NAV = [
  { href: `${ASTRA_HOME}#destinations`, label: "Destinations" },
  { href: "#booking", label: "Book a service" },
  { href: "#contact", label: "Contact" },
];

/** Every service is offered at every destination. */
const SERVICES = [
  PRODUCTS.rental,
  PRODUCTS.car,
  PRODUCTS.coach,
  PRODUCTS.package,
  PRODUCTS.attraction,
  PRODUCTS.hotel,
];

export default async function Page({ params }: Props) {
  const d = find((await params).slug);
  if (!d) notFound();

  return (
    <div
      className={`${fontVars} ${styles.page} relative min-h-screen font-(family-name:--font-body) leading-normal antialiased`}
    >
      <SiteHeader
        tone="white"
        links={NAV}
        cta={{ href: "#booking", label: "Plan your trip" }}
      />

      <main>
        <section
          aria-labelledby="hero-title"
          className="relative h-[460px] overflow-hidden bg-[#073c36] text-white sm:h-[525px]"
        >
          <Photo
            src={d.image}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={{ objectPosition: d.heroPosition }}
            loading="eager"
          />
          <div className={`${styles.destinationWash} absolute inset-0`} />
          <div className="relative z-[1] max-w-[780px] px-[22px] pt-[118px] sm:px-[clamp(24px,6vw,96px)] sm:pt-[145px]">
            <Link
              href={`${ASTRA_HOME}#destinations`}
              className={`text-[0.8rem] tracking-[0.14em] text-white/74 uppercase hover:text-white ${focus}`}
            >
              ← All destinations
            </Link>
            <h1
              id="hero-title"
              className="mt-[22px] mb-4 font-(family-name:--font-display) text-[clamp(3.7rem,7vw,7rem)] leading-[0.92]"
            >
              {d.name}
            </h1>
            <p className="max-w-[600px] text-[1.08rem] text-white/86">
              {d.intro}
            </p>
          </div>
        </section>

        <Booking
          destination={d.name}
          lift="-mt-[65px] sm:-mt-[85px] lg:-mt-[112px]"
        />

        <section className="grid items-start gap-[clamp(35px,7vw,110px)] px-[22px] py-[68px] sm:px-[clamp(24px,7vw,110px)] sm:py-[88px] lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className={`${eyebrow} mb-2`}>{d.eyebrow}</p>
            <h2 className="font-(family-name:--font-display) text-[clamp(2.4rem,4vw,4rem)] leading-[1.05]">
              {d.heading}
            </h2>
          </div>
          <div>
            <p className="mb-7 text-[1.05rem] text-[#52635f]">{d.overview}</p>
            <ul className="grid gap-2.5 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <li
                  key={s.key}
                  className="rounded-xl border border-[#dce3e0] bg-white px-3.5 py-3 font-semibold text-[#073c36]"
                >
                  {s.label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <Closing
          eyebrow="Need a custom plan?"
          heading={`Tell us about your ${d.name} trip.`}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
