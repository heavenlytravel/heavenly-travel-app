"use client";

import { useEffect, useRef, type RefObject } from "react";
import styles from "../page.module.css";
import type { DayTemplate } from "../_lib/days";
import {
  DAY_END,
  DAY_START,
  dayFraction,
  toClock,
  toMinutes,
} from "../_lib/sky";
import { monoFont } from "../_lib/ui";

const HOURS = Array.from(
  { length: (DAY_END - DAY_START) / 60 + 1 },
  (_, i) => DAY_START + i * 60,
);

type Anchor = { top: number; minutes: number };

/**
 * The time of day at the current scroll position. A reading line travels
 * from the top of the viewport to the bottom as the page scrolls, so the day
 * starts at exactly 06:00 and ends at exactly 22:00; between two timed
 * blocks the clock runs evenly.
 */
function minutesAt(anchors: readonly Anchor[]): number {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
  const line = window.scrollY + progress * window.innerHeight;
  let before: Anchor = { top: 0, minutes: DAY_START };
  for (const anchor of anchors) {
    if (anchor.top > line) {
      const span = anchor.top - before.top;
      const p = span > 0 ? (line - before.top) / span : 0;
      return before.minutes + (anchor.minutes - before.minutes) * p;
    }
    before = anchor;
  }
  return before.minutes;
}

/**
 * The hour rail down the left edge (a slim bar on small screens) and its
 * now-marker. Scrolling writes straight to the DOM from one animation frame,
 * so no React state changes while the page moves. With reduced motion the
 * marker is hidden and nothing listens.
 */
export function HourRail({
  day,
  sheetRef,
}: {
  day: DayTemplate;
  /** The element holding every block marked with data-minutes. */
  sheetRef: RefObject<HTMLElement | null>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const markerTimeRef = useRef<HTMLSpanElement>(null);
  const chipTimeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let anchors: Anchor[] = [];
    let frame = 0;
    let shown = "";
    let stop: (() => void) | undefined;

    const measure = () => {
      anchors = Array.from(
        sheet.querySelectorAll<HTMLElement>("[data-minutes]"),
      )
        .map((el) => ({
          top: el.getBoundingClientRect().top + window.scrollY,
          minutes: Number(el.dataset.minutes),
        }))
        .sort((a, b) => a.top - b.top);
    };

    const paint = () => {
      frame = 0;
      const minutes = minutesAt(anchors);
      trackRef.current?.style.setProperty(
        "--now",
        dayFraction(minutes).toFixed(4),
      );
      const clock = toClock(minutes);
      if (clock === shown) return;
      shown = clock;
      if (markerTimeRef.current) markerTimeRef.current.textContent = clock;
      if (chipTimeRef.current) chipTimeRef.current.textContent = clock;
    };

    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(paint);
    };

    const start = () => {
      const remeasure = () => {
        measure();
        schedule();
      };
      // Fires on first observe, on a template swap, and whenever photos or
      // fonts change the height of the sheet.
      const observer = new ResizeObserver(remeasure);
      observer.observe(sheet);
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", remeasure, { passive: true });
      return () => {
        observer.disconnect();
        window.removeEventListener("scroll", schedule);
        window.removeEventListener("resize", remeasure);
        if (frame !== 0) cancelAnimationFrame(frame);
        frame = 0;
      };
    };

    const sync = () => {
      stop?.();
      stop = reduced.matches ? undefined : start();
    };

    sync();
    reduced.addEventListener("change", sync);
    return () => {
      reduced.removeEventListener("change", sync);
      stop?.();
    };
  }, [sheetRef]);

  return (
    <>
      {/* Small screens: a slim bar that stays at the top. */}
      <div
        aria-hidden
        className={`${monoFont} sticky top-0 z-30 flex h-9 items-center gap-3 bg-(--ink) px-4 text-[13px] text-(--paper) lg:hidden`}
      >
        <span className={`${styles.nowChip} inline-flex items-center gap-2`}>
          <span className="h-2 w-2 bg-(--signal)" />
          <span ref={chipTimeRef}>{toClock(DAY_START)}</span>
        </span>
        <span className="truncate text-[#aab0c2]">{day.title}</span>
        <span className="ml-auto whitespace-nowrap text-[#aab0c2]">
          06 to 22
        </span>
      </div>

      {/* Large screens: the rail. Decorative; every time is also in the sheet. */}
      <div
        aria-hidden
        className={`${monoFont} fixed top-0 bottom-0 left-0 z-30 hidden w-(--rail) border-r border-[rgb(244_241_232/0.18)] bg-(--ink) text-(--paper) lg:block`}
      >
        <div ref={trackRef} className="absolute inset-x-0 top-8 bottom-8">
          {HOURS.map((m) => (
            <span
              key={m}
              className="absolute left-4 -translate-y-1/2 text-[12px] text-[#aab0c2]"
              style={{ top: `${dayFraction(m) * 100}%` }}
            >
              {String(m / 60).padStart(2, "0")}
              <span className="absolute top-1/2 left-7 h-px w-3 bg-[#aab0c2]/50" />
            </span>
          ))}
          {day.stops.map((s) => (
            <span
              key={s.time}
              className="absolute right-0 h-0.5 w-4 -translate-y-1/2 bg-(--paper)"
              style={{ top: `${dayFraction(toMinutes(s.time)) * 100}%` }}
            />
          ))}
          <span
            className={`${styles.marker} absolute inset-x-0 flex h-6 -translate-y-1/2 items-center justify-center bg-(--signal) text-[13px] font-medium text-white`}
          >
            <span ref={markerTimeRef}>{toClock(DAY_START)}</span>
          </span>
        </div>
      </div>
    </>
  );
}
