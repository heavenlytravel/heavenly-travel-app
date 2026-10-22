import Image from "next/image";
import Link from "next/link";
import { locationPagePath, type TopChoiceCard } from "@repo/db";
import styles from "./home.module.css";

/**
 * The home page's cards: Marketing's top choices, each opening the
 * location's page.
 */

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-azure";

// A quarter of the row each, centred, so fewer cards make a shorter row.
const cell = "w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]";

const card = `${styles.card} relative block h-[235px] w-full overflow-hidden rounded-[17px] bg-navy p-[25px] text-left text-white sm:h-[330px] ${focus}`;

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
  return (
    <ul className="mx-auto flex max-w-[1450px] flex-wrap justify-center gap-3 sm:gap-4">
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
