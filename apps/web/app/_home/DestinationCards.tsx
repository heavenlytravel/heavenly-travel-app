"use client";

import Image from "next/image";
import Link from "next/link";
import { locationPagePath, type TopChoiceCard } from "@repo/db";
import { useSearchCard } from "../_components/search/SearchProvider";
import { AIRPORT_CARD } from "./destinations";
import styles from "./home.module.css";

/**
 * The home page's cards: the airport, then Marketing's top choices. A
 * location card opens the location's page. The airport is not somewhere to
 * go but something to choose: its card fills the pick-up into the booking
 * card and brings the card back into view.
 */

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#caa243]";

// A row of up to four, centred, so fewer cards make a shorter row.
const cell = "w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]";

const card = `${styles.card} relative block h-[235px] w-full overflow-hidden rounded-[17px] bg-[#073c36] p-[25px] text-left text-white sm:h-[330px] ${focus}`;

function CardText({
  tag,
  name,
  line,
}: {
  tag: string | null;
  name: string;
  line: string;
}) {
  return (
    <>
      <span className="absolute right-[60px] bottom-6 left-[25px] z-[1]">
        {tag && (
          <small className="block text-[0.69rem] tracking-[0.16em] text-white/72 uppercase">
            {tag}
          </small>
        )}
        <strong className="mt-1 mb-[7px] block font-(family-name:--font-display) text-[2rem] leading-[1.1] font-normal">
          {name}
        </strong>
        <span className="block text-[0.82rem] text-white/82">{line}</span>
      </span>
      <span aria-hidden className="absolute right-6 bottom-6 z-[1] text-2xl">
        ↗
      </span>
    </>
  );
}

export function DestinationCards({ choices }: { choices: TopChoiceCard[] }) {
  const { values, fillPickup } = useSearchCard();

  return (
    <ul className="mx-auto flex max-w-[1450px] flex-wrap justify-center gap-3 sm:gap-4">
      <li className={cell}>
        <button
          type="button"
          aria-pressed={values.from === AIRPORT_CARD.name}
          onClick={() => fillPickup(AIRPORT_CARD.name)}
          className={`${card} ${styles.airport} cursor-pointer aria-pressed:ring-3 aria-pressed:ring-[#caa243] aria-pressed:ring-offset-2`}
        >
          <span
            aria-hidden
            className="absolute top-[25px] right-[18px] font-(family-name:--font-display) text-[6rem] leading-none text-white/10"
          >
            {AIRPORT_CARD.code}
          </span>
          <span
            aria-hidden
            className="absolute top-[74px] left-[25px] h-0.5 w-[65px] bg-[#caa243]"
          />
          <CardText
            tag={AIRPORT_CARD.tag}
            name={AIRPORT_CARD.name}
            line="Book for this location"
          />
        </button>
      </li>
      {choices.map((choice) => (
        <li key={choice.slug} className={cell}>
          <Link href={locationPagePath(choice.slug)} className={card}>
            {choice.image && (
              <>
                <Image
                  src={choice.image.url}
                  alt={choice.image.alt}
                  fill
                  sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw"
                  className="object-cover"
                />
                <span className={`${styles.cardShade} absolute inset-0`} />
              </>
            )}
            <CardText
              tag={choice.tagline}
              name={choice.name}
              line="Explore this location"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
