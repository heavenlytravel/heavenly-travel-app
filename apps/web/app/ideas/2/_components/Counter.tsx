"use client";

import type { CSSProperties } from "react";
import styles from "../page.module.css";
import { FLEET } from "../../../_lib/content";
import { MAX_COUNT, MIN_COUNT, plural } from "../_lib/headcount";
import { focusInk } from "../_lib/styles";
import { useHeadcount } from "./HeadcountProvider";

const stepper = `flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-[#141414] bg-[#F7F4EC] hover:bg-[#141414] hover:text-[#F7F4EC] aria-disabled:cursor-not-allowed aria-disabled:opacity-35 aria-disabled:hover:bg-[#F7F4EC] aria-disabled:hover:text-[#141414] ${focusInk}`;

/** The seat counts where the answer changes vehicle, plus both ends. */
const MARKS = [MIN_COUNT, ...FLEET.map((v) => v.seats), MAX_COUNT].filter(
  (n, i, all) => all.indexOf(n) === i,
);

export function Counter() {
  const { count, previous, party, setCount } = useHeadcount();

  return (
    <div>
      <output
        htmlFor="hc-range hc-minus hc-plus"
        className={`${styles.wide} ${styles.numeral} block`}
      >
        <span
          key={count}
          aria-hidden
          className={`inline-block ${count >= previous ? styles.tickUp : styles.tickDown}`}
        >
          {count}
        </span>
        <span className="sr-only">
          {plural(count, "person", "people")}: {party.label},{" "}
          {plural(party.spare, "seat")} spare
        </span>
      </output>

      <div className="mt-5 flex items-start gap-3 sm:gap-4">
        <button
          id="hc-minus"
          type="button"
          className={stepper}
          onClick={() => setCount(count - 1)}
          aria-disabled={count <= MIN_COUNT}
          aria-label="One fewer person"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path d="M3 10h14" stroke="currentColor" strokeWidth="3" />
          </svg>
        </button>

        <div className="relative min-w-0 flex-1 pb-5">
          <label htmlFor="hc-range" className="sr-only">
            Number of people travelling
          </label>
          <input
            id="hc-range"
            type="range"
            min={MIN_COUNT}
            max={MAX_COUNT}
            step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            aria-valuetext={`${plural(count, "person", "people")}, ${party.label}`}
            className={styles.range}
          />
          <div aria-hidden className={styles.rangeMarks}>
            {MARKS.map((n) => (
              <span
                key={n}
                data-tight={n > MIN_COUNT && n < 6 ? "" : undefined}
                style={
                  {
                    "--at": (n - MIN_COUNT) / (MAX_COUNT - MIN_COUNT),
                  } as CSSProperties
                }
              >
                {n}
              </span>
            ))}
          </div>
        </div>

        <button
          id="hc-plus"
          type="button"
          className={stepper}
          onClick={() => setCount(count + 1)}
          aria-disabled={count >= MAX_COUNT}
          aria-label="One more person"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden>
            <path d="M3 10h14M10 3v14" stroke="currentColor" strokeWidth="3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
