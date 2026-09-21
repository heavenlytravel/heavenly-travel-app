"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Photo } from "../_components/Brand";
import { ServiceTabsSearch } from "../_components/search/ServiceTabsSearch";
import { HOME_DESTINATIONS } from "./destinations";
import styles from "./home.module.css";

/**
 * The home page is one page, so a destination is not somewhere to go but
 * something to choose: picking a card fills the place into the booking card
 * and brings the card back into view.
 */

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

const Destination = createContext<{
  destination: string | undefined;
  choose: (name: string) => void;
}>({ destination: undefined, choose: () => {} });

export function DestinationProvider({ children }: { children: ReactNode }) {
  const [destination, setDestination] = useState<string>();

  function choose(name: string) {
    setDestination(name);
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document
      .getElementById("booking")
      ?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
  }

  return <Destination value={{ destination, choose }}>{children}</Destination>;
}

/** The booking card, with whichever destination was last chosen filled in. */
export function BookingSearch() {
  const { destination } = useContext(Destination);
  return <ServiceTabsSearch destination={destination} />;
}

export function DestinationCards() {
  const { destination, choose } = useContext(Destination);

  return (
    <ul className="mx-auto grid max-w-[1450px] gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
      {HOME_DESTINATIONS.map((d) => (
        <li key={d.name}>
          <button
            type="button"
            aria-pressed={destination === d.name}
            onClick={() => choose(d.name)}
            className={`${styles.card} ${d.airportCode ? styles.airport : ""} relative block h-[235px] w-full cursor-pointer overflow-hidden rounded-[17px] bg-[#073c36] p-[25px] text-left text-white aria-pressed:ring-3 aria-pressed:ring-[#caa243] aria-pressed:ring-offset-2 sm:h-[330px] ${focus}`}
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
              d.image && (
                <>
                  <Photo
                    src={d.image}
                    alt={d.alt ?? ""}
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{ objectPosition: d.position }}
                  />
                  <span className={`${styles.cardShade} absolute inset-0`} />
                </>
              )
            )}
            <span className="absolute bottom-6 left-[25px] z-[1]">
              <small className="block text-[0.69rem] tracking-[0.16em] text-white/72 uppercase">
                {d.tag}
              </small>
              <strong className="mt-1 mb-[7px] block font-(family-name:--font-display) text-[2rem] leading-[1.1] font-normal">
                {d.name}
              </strong>
              <span className="block text-[0.82rem] text-white/82">
                Book for this location
              </span>
            </span>
            <span
              aria-hidden
              className="absolute right-6 bottom-6 z-[1] text-2xl"
            >
              ↗
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
