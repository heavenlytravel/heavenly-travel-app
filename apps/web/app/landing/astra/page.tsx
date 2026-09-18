/**
 * Heavenly Travel — landing design
 * Route: /landing/astra
 * Design: GPT Astra, delivered as a single HTML file. Converted to this
 * codebase by Claude Fable 5.1 (claude-fable-5-1): real routes in place of hash
 * routing, next/font in place of embedded fonts, image files in place of
 * base64, the shared search model for the booking box and WhatsApp for every
 * action, as on the other landing designs. The look is kept as designed.
 * Converted: 2026-09-18
 */

import type { Metadata } from "next";
import Link from "next/link";
import styles from "./astra.module.css";
import { Photo } from "../../_components/Brand";
import { SiteHeader } from "./_components/SiteHeader";
import { Booking, Closing, SiteFooter, eyebrow } from "./_components/Sections";
import { ASTRA_DESTINATIONS, ASTRA_HOME } from "./_lib/destinations";
import { fontVars } from "./_lib/fonts";

export const metadata: Metadata = {
  title: "Heavenly Travel — Travel made simple",
  description:
    "Book car rental, chauffeured rides, coach rental, attractions, hotels and custom travel packages across Malaysia with Heavenly Travel.",
};

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

const NAV = [
  { href: "#destinations", label: "Destinations" },
  { href: "#why-us", label: "Why Heavenly" },
  { href: "#contact", label: "Contact" },
];

export default function Page() {
  return (
    <div
      className={`${fontVars} ${styles.page} relative min-h-screen font-(family-name:--font-body) leading-normal antialiased`}
    >
      <SiteHeader
        tone="ink"
        links={NAV}
        cta={{ href: "#booking", label: "Plan your trip" }}
      />

      <main>
        <section
          aria-labelledby="hero-title"
          className="relative h-[610px] overflow-hidden bg-[#dce9ec] sm:h-[690px]"
        >
          <Photo
            src="/astra/langkawi-bay.webp"
            alt="A calm tropical bay with limestone islands in Malaysia"
            className="absolute h-full w-full object-cover object-center"
            loading="eager"
          />
          <div className={`${styles.heroWash} absolute inset-0`} />
          <div className="relative z-[1] max-w-[650px] px-[22px] pt-[125px] sm:px-[clamp(24px,6vw,96px)] sm:pt-[150px]">
            <p className="origin-left -rotate-3 font-(family-name:--font-script) text-[4rem] leading-[0.75] text-[#071f1d] sm:text-[5.4rem]">
              Travel
            </p>
            <h1
              id="hero-title"
              className="mt-[0.1em] mb-[0.25em] font-(family-name:--font-display) text-[3.75rem] leading-[0.9] text-[#082c29] sm:text-[clamp(3.6rem,6vw,6.5rem)]"
            >
              made simple.
            </h1>
            <p className="max-w-[330px] text-[#334744] sm:max-w-[500px] sm:text-[1.18rem]">
              Cars, drivers, coaches, stays and experiences—thoughtfully brought
              together for your journey.
            </p>
          </div>
          <p
            aria-hidden
            className="absolute top-[16%] right-[7%] z-[1] mt-8 hidden -rotate-[7deg] border-b-[3px] border-[#caa243] font-(family-name:--font-script) text-[2rem] leading-[0.85] lg:block"
          >
            More
            <br />
            than a trip
          </p>
        </section>

        <Booking lift="-mt-[145px] sm:-mt-[180px] lg:-mt-[235px]" />

        <section
          id="destinations"
          aria-labelledby="destinations-title"
          className="scroll-mt-8 px-3 pt-[75px] pb-[55px] text-center sm:px-[clamp(20px,4vw,70px)] sm:pt-[105px] sm:pb-[90px]"
        >
          <p className={`${eyebrow} mb-2`}>Locations we cover</p>
          <h2
            id="destinations-title"
            className="font-(family-name:--font-display) text-[clamp(2.7rem,5vw,4.4rem)] leading-none"
          >
            Choose your destination
          </h2>
          <p className="mt-[13px] mb-[34px] text-[1.06rem] text-[#67726f]">
            Start with where you are going. We’ll show you the right services
            for that location.
          </p>

          <ul className="mx-auto grid max-w-[1450px] gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
            {ASTRA_DESTINATIONS.map((d) => (
              <li key={d.slug}>
                <Link
                  href={`${ASTRA_HOME}/${d.slug}`}
                  className={`${styles.card} ${d.airportCode ? styles.airport : ""} relative block h-[235px] overflow-hidden rounded-[17px] bg-[#073c36] p-[25px] text-left text-white sm:h-[330px] ${focus}`}
                >
                  {d.airportCode ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute top-[25px] right-[18px] font-(family-name:--font-display) text-[6rem] leading-none text-white/10"
                      >
                        {d.airportCode}
                      </span>
                      <span
                        aria-hidden
                        className="absolute top-[74px] left-[25px] h-0.5 w-[65px] bg-[#caa243]"
                      />
                    </>
                  ) : (
                    <>
                      <Photo
                        src={d.image}
                        alt={d.cardAlt}
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ objectPosition: d.cardPosition }}
                      />
                      <span
                        className={`${styles.cardShade} absolute inset-0`}
                      />
                    </>
                  )}
                  <span className="absolute bottom-6 left-[25px] z-[1]">
                    <small className="block text-[0.69rem] tracking-[0.16em] text-white/72 uppercase">
                      {d.tag}
                    </small>
                    <strong className="mt-1 mb-[7px] block font-(family-name:--font-display) text-[2rem] leading-[1.1] font-normal">
                      {d.name}
                    </strong>
                    <span className="block text-[0.82rem] text-white/82">
                      Explore location
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className="absolute right-6 bottom-6 z-[1] text-2xl"
                  >
                    ↗
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <Closing
          eyebrow="Local knowledge, one team"
          heading="Tell us where you want to go."
        />
      </main>

      <SiteFooter />
    </div>
  );
}
