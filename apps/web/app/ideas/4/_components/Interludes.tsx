import Image from "next/image";
import type { ReactNode } from "react";
import { REVIEWS, SERVICES } from "../../../_lib/content";
import { toClock } from "../_lib/sky";
import { label, monoFont, slabFont } from "../_lib/ui";

/**
 * The company's story, told at the hour it matters. None of these hold
 * state: the three that need nothing from the chosen day are rendered by the
 * server page and handed to the run sheet as slots.
 */

export function InterludeHeading({ children }: { children: ReactNode }) {
  return (
    <h3
      className={`${slabFont} max-w-[18ch] text-[clamp(2rem,4.6vw,3.75rem)] leading-[1.04] font-semibold tracking-[-0.02em]`}
    >
      {children}
    </h3>
  );
}

export const interludeLede = "mt-6 max-w-[56ch] text-[18px] leading-[1.6]";
export const rowFigure = `${monoFont} text-[14px] text-(--muted)`;

type Row = { when: string; what: string };

/** A timetable: a mono column on the left, plain words on the right. */
function Rows({ rows }: { rows: readonly Row[] }) {
  return (
    <dl className="mt-10 max-w-3xl border-t-2 border-(--fg)">
      {rows.map((row) => (
        <div
          key={row.what}
          className="grid grid-cols-[6.5rem_1fr] gap-x-4 border-b border-(--line) py-3.5 sm:grid-cols-[9rem_1fr]"
        >
          <dt className={`${rowFigure} pt-0.5`}>{row.when}</dt>
          <dd className="text-[16px] leading-normal">{row.what}</dd>
        </div>
      ))}
    </dl>
  );
}

function service(id: string) {
  return SERVICES.find((s) => s.id === id);
}

const DRIVER_ROWS: readonly Row[] = [
  {
    when: "Day before",
    what: "Driver's name, number and plate sent on WhatsApp.",
  },
  {
    when: "Take-off",
    what: "Your flight is tracked. A delay moves the pick-up.",
  },
  {
    when: "30 min before",
    what: "Parked, board written, standing where you come out.",
  },
  {
    when: "Landing + 60",
    what: "Waiting is included for the first hour. Indicative.",
  },
];

export function DriverInterlude() {
  return (
    <>
      <InterludeHeading>The driver is there before you are.</InterludeHeading>
      <p className={interludeLede}>
        {service("transfers")?.text} That is the airport and jetty transfer, and
        it is also how every day on this page begins.
      </p>
      <Rows rows={DRIVER_ROWS} />
    </>
  );
}

const INCLUDED_ROWS: readonly Row[] = [
  { when: "Included", what: "Fuel for the route on your sheet." },
  { when: "Included", what: "Tolls and parking along that route." },
  { when: "Included", what: "Waiting time at every stop, lunch as well." },
  {
    when: "Included",
    what: "The driver's own meals, and his room on overnight trips.",
  },
  {
    when: "Not included",
    what: "Your lunch, entrance tickets unless added, hours beyond the sheet.",
  },
];

export function IncludedInterlude() {
  return (
    <>
      <InterludeHeading>While you eat, he waits.</InterludeHeading>
      <p className={interludeLede}>
        A day rate means the day. Nothing is ticking while you order a second
        plate, and the car is cold when you come back to it.
      </p>
      <Rows rows={INCLUDED_ROWS} />
      <p
        className={`${label} mt-5 max-w-[60ch] leading-relaxed text-(--muted)`}
      >
        Indicative. Your quote lists exactly what is covered.
      </p>
    </>
  );
}

const OTHER_SERVICES = ["coach", "mice", "tours", "attractions"]
  .map(service)
  .filter((s) => s !== undefined);

export function ServicesInterlude() {
  const mice = service("mice");
  return (
    <>
      <InterludeHeading>Other days we run.</InterludeHeading>
      <p className={interludeLede}>
        The afternoon is long. While you are on the water or in a meeting, these
        are also leaving on time somewhere in Malaysia.
      </p>
      <ol className="mt-10 border-t-2 border-(--fg)">
        {OTHER_SERVICES.map((s, i) => (
          <li
            key={s.id}
            className="grid gap-x-6 gap-y-1 border-b border-(--line) py-5 sm:grid-cols-[4rem_minmax(0,16rem)_1fr]"
          >
            <span className={rowFigure}>{`S${i + 1}`}</span>
            <h4
              className={`${slabFont} text-[21px] leading-tight font-semibold`}
            >
              {s.title}
            </h4>
            <p className="max-w-[52ch] text-[16px] leading-normal">{s.text}</p>
          </li>
        ))}
      </ol>
      {mice && (
        <figure className="mt-10">
          <div className="relative aspect-[5/2] w-full overflow-hidden">
            <Image
              src={mice.image}
              alt={mice.alt}
              fill
              sizes="(min-width: 1024px) 70vw, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className={`${label} mt-3 text-(--muted)`}>
            S2. Conference shuttles in Langkawi, timed to the minute.
          </figcaption>
        </figure>
      )}
    </>
  );
}

/** Reviews read as a log, one entry every ten minutes from `startMinutes`. */
export function ReviewsInterlude({ startMinutes }: { startMinutes: number }) {
  return (
    <>
      <InterludeHeading>The guest log.</InterludeHeading>
      <p className={interludeLede}>
        Written by passengers after the day was over, which is when it counts.
        The times are ours, for the look of the thing.
      </p>
      <ol className="mt-10 border-t-2 border-(--fg)">
        {REVIEWS.map((r, i) => {
          const at = toClock(startMinutes + 5 + i * 10);
          return (
            <li
              key={r.name}
              className="grid gap-x-6 gap-y-2 border-b border-(--line) py-6 sm:grid-cols-[9rem_1fr]"
            >
              <p className={rowFigure}>
                <time dateTime={at} className="text-(--fg)">
                  {at}
                </time>
                <span className="block">{`${r.score.toFixed(1)} / 10`}</span>
              </p>
              <blockquote>
                <p className="max-w-[56ch] text-[18px] leading-[1.55]">
                  {r.text}
                </p>
                <footer className={`${label} mt-3 text-(--muted)`}>
                  {`${r.name}, ${r.from}. ${r.trip}`}
                </footer>
              </blockquote>
            </li>
          );
        })}
      </ol>
    </>
  );
}
