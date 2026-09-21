/**
 * Heavenly Travel — home page
 * Route: /
 * One page: a full-screen pale photo hero with the booking card for all six
 * services resting on its floor, why to book with us, the locations we cover
 * and a closing call. Choosing a location fills it into the booking card. Its
 * pieces live in ./_home.
 */

import type { Metadata } from "next";
import styles from "./_home/home.module.css";
import { Photo } from "./_components/Brand";
import {
  DestinationCards,
  DestinationProvider,
} from "./_home/DestinationPicker";
import { Booking, Closing, SiteFooter, Trust, eyebrow } from "./_home/Sections";
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
            className="relative flex min-h-svh flex-col"
          >
            {/* From lg up the photo is fixed to the viewport, so it fills the
                window the same at any zoom. The clip keeps it inside the hero
                without clipping the booking card's menus. Below lg the stacked
                card outgrows the screen, so the photo stops at the first one. */}
            <div className="absolute inset-x-0 top-0 h-svh bg-[#dce9ec] [clip-path:inset(0)] lg:h-full">
              <Photo
                src="/brand/hero-langkawi.jpg"
                alt="Eagle Square in Langkawi from the air"
                className="absolute inset-0 h-full w-full object-cover object-center lg:fixed"
                loading="eager"
              />
              <div className={`${styles.heroWash} absolute inset-0`} />
            </div>
            {/* The words sit in the middle of the room between the header and
                the booking card. From sm up one type size follows the window's
                height as well as its width, so the headline and the whole card
                fit on one screen down to about 600px tall; the script word is
                sized from it, so the pair keeps its proportions. */}
            <div className="relative z-[1] flex flex-1 flex-col justify-center px-[22px] pt-[125px] pb-6 sm:px-[clamp(24px,6vw,96px)] sm:pt-[92px] sm:pb-8">
              <div className="text-[3.75rem] sm:text-[clamp(3.75rem,min(9vw,12svh),6.5rem)]">
                <p className="origin-left -rotate-3 font-(family-name:--font-script) text-[1.07em] leading-[0.75] text-[#071f1d] sm:text-[0.83em]">
                  Travel
                </p>
                <h1
                  id="hero-title"
                  className="mt-[0.1em] mb-[0.25em] font-(family-name:--font-display) text-[1em] leading-[0.9] text-[#082c29] sm:whitespace-nowrap"
                >
                  made simple.
                </h1>
              </div>
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

            <Booking />
          </section>

          <Trust />

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
