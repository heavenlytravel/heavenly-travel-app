/**
 * Heavenly Travel — home page
 * Route: /
 * One page: a pale photo hero, the booking card for all six services pulled up
 * over it, the locations we cover and a closing call. Choosing a location
 * fills it into the booking card. Its pieces live in ./_home.
 */

import type { Metadata } from "next";
import styles from "./_home/home.module.css";
import { Photo } from "./_components/Brand";
import {
  DestinationCards,
  DestinationProvider,
} from "./_home/DestinationPicker";
import { Booking, Closing, SiteFooter, eyebrow } from "./_home/Sections";
import { SiteHeader } from "./_home/SiteHeader";
import { fontVars } from "./_home/fonts";

export const metadata: Metadata = {
  title: "Heavenly Travel — Travel made simple",
  description:
    "Book car rental, chauffeured rides, coach rental, attractions, hotels and custom travel packages across Malaysia with Heavenly Travel.",
};

export default function Page() {
  return (
    <div
      id="top"
      className={`${fontVars} ${styles.page} relative min-h-screen font-(family-name:--font-body) leading-normal antialiased`}
    >
      <SiteHeader />

      <DestinationProvider>
        <main>
          <section
            aria-labelledby="hero-title"
            className="relative h-[610px] overflow-hidden bg-[#dce9ec] sm:h-[690px]"
          >
            <Photo
              src="/brand/hero-langkawi.jpg"
              alt="Eagle Square in Langkawi from the air"
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
                Cars, drivers, coaches, stays and experiences—thoughtfully
                brought together for your journey.
              </p>
            </div>
            <p
              aria-hidden
              className="absolute top-[16%] right-[7%] z-[1] mt-8 hidden -rotate-[7deg] border-b-[3px] border-[#caa243] font-(family-name:--font-script) text-[2rem] leading-[0.85] text-white lg:block"
            >
              More
              <br />
              than a trip
            </p>
          </section>

          <Booking />

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
              Start with where you are going. We’ll fill it into your booking.
            </p>
            <DestinationCards />
          </section>

          <Closing />
        </main>
      </DestinationProvider>

      <SiteFooter />
    </div>
  );
}
