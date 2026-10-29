import Image from "next/image";
import Link from "next/link";
import { locationPagePath, type TopChoiceCard } from "@repo/db";
import styles from "./home.module.css";

/**
 * The home page's photo cards: the services, each opening its hub, and
 * Marketing's top choices, each opening the location's page.
 */

// A quarter of the row each, centred, so fewer cards make a shorter row.
const cell = "w-full sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-3rem)/4)]";

const card = `${styles.card} relative block h-[235px] w-full overflow-hidden rounded-card bg-navy p-[25px] text-left text-white focus-ring sm:h-[330px]`;

/**
 * One photo card: where it opens, its picture, and its words. The card is
 * one link that reads its words, so its picture is not read: it would only
 * say the name again.
 */
export type PhotoCard = {
  key: string;
  href: string;
  image: { url: string } | null;
  /** The small line over the name; null for none. */
  tag: string | null;
  name: string;
  line: string;
};

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
          <small className="block text-2xs tracking-eyebrow text-white/90 uppercase">
            {tag}
          </small>
        )}
        <strong className="mt-1 mb-[7px] block font-serif text-3xl leading-[1.1] font-normal">
          {name}
        </strong>
        <span className="block text-caption text-white/82">{line}</span>
      </span>
      <span aria-hidden className="absolute right-6 bottom-6 z-[1] text-2xl">
        ↗
      </span>
    </>
  );
}

/** A centred row of photo cards. */
export function PhotoCards({ cards }: { cards: readonly PhotoCard[] }) {
  return (
    <ul className="mx-auto flex max-w-[1450px] flex-wrap justify-center gap-3 sm:gap-4">
      {cards.map((entry) => (
        <li key={entry.key} className={cell}>
          <Link href={entry.href} className={card}>
            {entry.image && (
              <>
                <Image
                  src={entry.image.url}
                  alt=""
                  fill
                  sizes="(min-width: 64rem) 25vw, (min-width: 40rem) 50vw, 100vw"
                  className="object-cover"
                />
                <span className={`${styles.cardShade} absolute inset-0`} />
              </>
            )}
            <CardText tag={entry.tag} name={entry.name} line={entry.line} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Marketing's top choices as photo cards, each opening the location's page. */
export function DestinationCards({ choices }: { choices: TopChoiceCard[] }) {
  return (
    <PhotoCards
      cards={choices.map((choice) => ({
        key: choice.slug,
        href: locationPagePath(choice.slug),
        image: choice.image,
        tag: choice.tagline,
        name: choice.name,
        line: "Explore this location",
      }))}
    />
  );
}
