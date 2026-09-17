"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";
import styles from "../page.module.css";
import {
  distanceKm,
  driveMinutes,
  formatDrive,
  placeById,
} from "../../../_lib/routes";
import {
  sheetBounds,
  sheetFor,
  type DayTemplate,
  type InterludeId,
  type Leg,
  type SheetEntry,
  type Stop,
} from "../_lib/days";
import {
  DAY_END,
  DAY_START,
  GOLDEN_AT,
  SKY,
  skyAt,
  skyGradient,
  toClock,
  toneAt,
} from "../_lib/sky";
import { label, monoFont, slabFont } from "../_lib/ui";
import { ReviewsInterlude } from "./Interludes";

/** Interludes that need nothing from the chosen day, rendered by the server. */
export type StaticInterludes = Record<
  "driver" | "included" | "services",
  ReactNode
>;

export const SHEET_GUTTER = "px-5 sm:px-8 lg:px-14";

const INTERLUDE_LABELS: Record<InterludeId, string> = {
  driver: "Before you land",
  vehicle: "On the road",
  included: "Over lunch",
  services: "Meanwhile",
  golden: "Golden hour",
  reviews: "After hours",
};

function legText(leg: Leg): string {
  if (leg.kind === "local") return `${formatDrive(leg.minutes)} drive`;
  const minutes = formatDrive(driveMinutes(leg.from, leg.to));
  return `${minutes} from ${placeById(leg.from).name}, ${distanceKm(leg.from, leg.to)} km`;
}

function StopEntry({ stop }: { stop: Stop }) {
  return (
    <article>
      {stop.leg && (
        <p className={`${label} mb-5 flex items-center gap-3 text-(--muted)`}>
          <span aria-hidden className="h-10 w-px bg-(--fg)" />
          {legText(stop.leg)}
        </p>
      )}
      <div className="grid gap-x-10 gap-y-3 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        <time
          dateTime={stop.time}
          className={`${slabFont} block text-[clamp(4rem,9.5vw,8.25rem)] leading-[0.86] font-light tracking-[-0.045em] tabular-nums`}
        >
          {stop.time}
        </time>
        <div className="border-t-2 border-(--fg) pt-4">
          <h3
            className={`${slabFont} text-[clamp(1.5rem,2.6vw,2.125rem)] leading-[1.12] font-semibold tracking-[-0.01em]`}
          >
            {stop.title}
          </h3>
          <p className="mt-3 max-w-[54ch] text-[18px] leading-[1.6]">
            {stop.detail}
          </p>
          {stop.note && (
            <p className={`${monoFont} mt-4 text-[14px] text-(--muted)`}>
              {stop.note}
            </p>
          )}
        </div>
      </div>
      {stop.photo && (
        <figure className="mt-9">
          <div className="relative aspect-[2/1] w-full overflow-hidden sm:aspect-[5/2]">
            <Image
              src={stop.photo.src}
              alt={stop.photo.alt}
              fill
              sizes="(min-width: 1024px) 80vw, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className={`${label} mt-3 text-(--muted)`}>
            {stop.photo.caption}
          </figcaption>
        </figure>
      )}
    </article>
  );
}

function InterludeEyebrow({
  id,
  minutes,
}: {
  id: InterludeId;
  minutes: number;
}) {
  const clock = toClock(minutes);
  return (
    <p className={`${label} mb-6 flex items-center gap-3`}>
      <span aria-hidden className="h-2.5 w-2.5 bg-(--signal)" />
      <time dateTime={clock}>{clock}</time>
      <span className="text-(--muted)">{INTERLUDE_LABELS[id]}</span>
    </p>
  );
}

/**
 * Golden hour. The words sit on the golden sky; the photograph then carries
 * the page from gold to dusk, the one stretch where no text colour is legible.
 */
function GoldenHour({ from, caption }: { from: number; caption: string }) {
  return (
    <li>
      <div
        className={`${styles.day} ${styles.gap} ${SHEET_GUTTER} pb-14`}
        style={
          {
            background: skyGradient(from, GOLDEN_AT),
            "--gap": 90,
          } as CSSProperties
        }
      >
        <div data-minutes={GOLDEN_AT}>
          <InterludeEyebrow id="golden" minutes={GOLDEN_AT} />
          <h3
            className={`${slabFont} max-w-[16ch] text-[clamp(2.25rem,5.4vw,4.5rem)] leading-none font-semibold tracking-[-0.02em]`}
          >
            Nothing to arrange at this hour.
          </h3>
          <p className="mt-6 max-w-[52ch] text-[18px] leading-[1.6]">
            The light does this most evenings. Your driver knows which way to
            face for it, and how long you can stay before dinner.
          </p>
          <p className={`${label} mt-6 max-w-[60ch] leading-relaxed`}>
            {caption}
          </p>
        </div>
      </div>
      <div
        className="pt-[clamp(3rem,7vw,6rem)] pb-[clamp(6rem,14vw,12rem)]"
        style={{
          background: `linear-gradient(to bottom, ${SKY.golden}, ${SKY.dusk})`,
        }}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[21/9]">
          <Image
            src="/brand/attractions.jpg"
            alt="The Langkawi cable car top station and Sky Bridge above the rainforest, with the Andaman Sea behind"
            fill
            sizes="100vw"
            className="object-cover"
          />
        </div>
      </div>
    </li>
  );
}

/**
 * The day as an ordered list. Each entry paints the sky for the minutes it
 * covers (from halfway to the previous entry to halfway to the next), so the
 * background is one continuous day whichever template is chosen.
 */
export function RunSheet({
  day,
  interludes,
  vehicleInterlude,
  headline,
}: {
  day: DayTemplate;
  interludes: StaticInterludes;
  vehicleInterlude: ReactNode;
  /** The mono line under the title: date, passengers, vehicle. */
  headline: string;
}) {
  const entries = sheetFor(day);
  const bounds = sheetBounds(entries);

  const slot = (entry: Extract<SheetEntry, { kind: "interlude" }>) => {
    if (entry.id === "vehicle") return vehicleInterlude;
    if (entry.id === "reviews")
      return <ReviewsInterlude startMinutes={entry.minutes} />;
    if (entry.id === "golden") return null;
    return interludes[entry.id];
  };

  return (
    <section aria-labelledby="run-sheet" className={styles.swap}>
      <div
        className={`${styles.day} ${SHEET_GUTTER} pt-20`}
        style={{ background: skyAt(bounds.start) }}
      >
        <p className={`${label} text-(--muted)`}>Run sheet</p>
        <h2
          id="run-sheet"
          className={`${slabFont} mt-2 text-[clamp(1.75rem,3.4vw,2.75rem)] leading-tight font-semibold tracking-[-0.01em]`}
        >
          {day.title}
        </h2>
        <p className={`${monoFont} mt-2 text-[14px] text-(--muted)`}>
          {headline}
        </p>
      </div>

      <ol>
        {entries.map((entry, i) => {
          const from = bounds.edges[i] ?? DAY_START;
          const to = bounds.edges[i + 1] ?? DAY_END;
          const previous = entries[i - 1];
          const gap = entry.minutes - (previous?.minutes ?? entry.minutes - 45);

          if (entry.kind === "interlude" && entry.id === "golden") {
            return (
              <GoldenHour
                key="golden"
                from={from}
                caption={day.goldenCaption}
              />
            );
          }

          return (
            <li
              key={entry.kind === "stop" ? entry.stop.time : entry.id}
              className={`${styles[toneAt(from)]} ${styles.gap} ${SHEET_GUTTER}`}
              style={
                {
                  background: skyGradient(from, to),
                  "--gap": gap,
                } as CSSProperties
              }
            >
              <div data-minutes={entry.minutes}>
                {entry.kind === "stop" ? (
                  <StopEntry stop={entry.stop} />
                ) : (
                  <div className="border-t border-(--line) pt-6">
                    <InterludeEyebrow id={entry.id} minutes={entry.minutes} />
                    {slot(entry)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
