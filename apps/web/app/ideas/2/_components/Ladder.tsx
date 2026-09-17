"use client";

import type { CSSProperties } from "react";
import styles from "../page.module.css";
import { ringgit } from "../../../_lib/content";
import { vehicleById } from "../../../_lib/routes";
import { PLANS } from "../_lib/plans";
import {
  BANDS,
  ladderPosition,
  plural,
  shortName,
  type Band,
} from "../_lib/headcount";
import { eyebrow, focusInk, quietButton } from "../_lib/styles";
import { useHeadcount } from "./HeadcountProvider";
import { SeatPlan } from "./SeatPlan";

const coach = vehicleById("coach");

/** Where a head count sits inside its band: across on desktop, down on mobile. */
function within(band: Band, seats: number) {
  const start = ladderPosition(band.lo - 1);
  const span = ladderPosition(band.hi) - start;
  return {
    across: (ladderPosition(seats - 0.5) - start) / span,
    down: (seats - band.lo + 0.5) / (band.hi - band.lo + 1),
  };
}

function percent(fraction: number) {
  return `${(fraction * 100).toFixed(2)}%`;
}

export function Ladder() {
  const { count, setCount } = useHeadcount();

  const columns = BANDS.map(
    (b) =>
      `${((ladderPosition(b.hi) - ladderPosition(b.lo - 1)) * 100).toFixed(2)}fr`,
  ).join(" ");

  return (
    <div className={styles.ladder}>
      <ol
        className={styles.ladderBands}
        style={{ "--columns": columns } as CSSProperties}
      >
        {BANDS.map((band) => {
          const active = count >= band.lo && count <= band.hi;
          const vehicle = band.vehicle ?? coach;
          const convoy = band.vehicle === null;
          const ticks = Array.from(
            { length: band.hi - band.lo + 1 },
            (_, i) => band.lo + i,
          );
          const marker = within(band, count);

          return (
            <li
              key={band.key}
              className={styles.band}
              aria-current={active ? "true" : undefined}
            >
              <div className={styles.rail}>
                <span className={`${styles.wide} ${styles.railLabel}`}>
                  {convoy ? `${band.lo}+` : `${band.lo} to ${band.hi}`}
                </span>
                {ticks.map((n) => {
                  const at = within(band, n);
                  return (
                    <span
                      key={n}
                      aria-hidden
                      className={styles.tick}
                      data-major={n === band.hi || n % 5 === 0 || undefined}
                      style={
                        {
                          "--across": percent(at.across),
                          "--down": percent(at.down),
                        } as CSSProperties
                      }
                    />
                  );
                })}
                {active && (
                  <span
                    className={`${styles.wide} ${styles.marker}`}
                    style={
                      {
                        "--across": percent(marker.across),
                        "--down": percent(marker.down),
                      } as CSSProperties
                    }
                  >
                    <span className="sr-only">Your group: </span>
                    {count}
                  </span>
                )}
              </div>

              <div className={styles.bandBody}>
                <div className={styles.bandThumbs}>
                  {(convoy ? [vehicle.seats, 8] : [0]).map((occupied, i) => (
                    <SeatPlan
                      key={i}
                      vehicle={vehicle}
                      occupied={occupied}
                      strokeWidth={1.25}
                      decorative
                      className={`${styles.thumb} ${convoy ? styles.thumbFit : ""}`}
                      style={
                        {
                          "--len": convoy ? undefined : PLANS[vehicle.id].width,
                        } as CSSProperties
                      }
                    />
                  ))}
                </div>
                <div className="min-w-0">
                  <h3
                    className={`${styles.wide} text-base leading-tight font-extrabold`}
                  >
                    {convoy ? "Convoy" : shortName(vehicle)}
                  </h3>
                  <p className="mt-1 text-sm">
                    {convoy
                      ? `Two coaches, up to ${plural(vehicle.seats * 2, "seat")}`
                      : `${plural(vehicle.seats, "seat")}, ${vehicle.luggage.toLowerCase()}`}
                  </p>
                  <p className="mt-2 flex flex-wrap items-baseline gap-x-1.5">
                    <span className={eyebrow}>From</span>
                    <span
                      className={`${styles.wide} text-lg font-extrabold tabular-nums`}
                    >
                      {ringgit(vehicle.fromPerDay * (convoy ? 2 : 1))}
                    </span>
                    <span className="text-xs">a day</span>
                  </p>
                  <button
                    type="button"
                    onClick={() => setCount(band.hi)}
                    aria-pressed={count === band.hi}
                    className={`${quietButton} ${focusInk} mt-3 hover:border-[#141414] hover:bg-[#141414] hover:text-[#F7F4EC] aria-pressed:border-[#141414] aria-pressed:bg-[#141414] aria-pressed:text-[#F7F4EC]`}
                  >
                    <span className="sr-only">Set the head count to </span>
                    <span aria-hidden>Seat</span>
                    <span>{band.hi}</span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <p className="mt-5 max-w-3xl text-sm">
        The scale is squeezed at the big end, slide-rule style, so the sedan
        does not disappear next to the coach. Day rates include the driver and
        are indicative.
      </p>
    </div>
  );
}
