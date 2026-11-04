"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { cx } from "./cx.js";
import { CheckIcon } from "./icons.js";

const QUARTER = 15;
const LAST_QUARTER = 24 * 60 - QUARTER;

/** "09:30" as the minute of the day it names, 570; null for anything else. */
export function minuteOf(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : null;
}

/** 570 as "09:30", the value a time field holds. */
export function valueOf(minute: number) {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(Math.floor(minute / 60))}:${two(minute % 60)}`;
}

/**
 * 570 as "09:30", as the pickers show a time: the 24-hour clock, the same
 * words as the value and as `formatClock` in @repo/db, which the pages and
 * emails use; the package cannot import it, because @repo/ui is built
 * before the database client.
 */
export function clockOf(minute: number) {
  return valueOf(minute);
}

/**
 * A window of the day the list marks, in minutes: 1380 to 420 is 23:00 to
 * 07:00. One that ends before it starts runs past midnight, and its end is
 * not in it, so 07:00 itself is outside.
 */
export type MinuteWindow = { from: number; to: number };

/** Whether a minute of the day falls in a window, as `isInOddHours` in @repo/db reads one. */
export function inWindow({ from, to }: MinuteWindow, minute: number) {
  if (from === to) return false;
  return from < to
    ? minute >= from && minute < to
    : minute >= from || minute < to;
}

/** Today and the minute of the day now, in a time zone: what "earlier" means. */
export function zonedNow(timeZone?: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return {
    today: `${read("year")}-${read("month")}-${read("day")}`,
    minute: (Number(read("hour")) % 24) * 60 + Number(read("minute")),
  };
}

/** The first quarter hour at or after a minute, kept inside the day. */
export function nextQuarter(minute: number) {
  return Math.min(Math.ceil(minute / QUARTER) * QUARTER, LAST_QUARTER);
}

/**
 * The times of the day in quarter hours, 00:00 to 23:45, in one list. It
 * opens on the chosen time, or on `start` when there is none, near the
 * top. Times before `earliest` are grey and cannot be picked: the ones
 * already past today; so are those after `latest`, on a last day that ends
 * early. Times in `marked` carry `markLabel` beside them, "Odd hours". A
 * chosen time off the quarters, such as 10:05 on an older booking, keeps a
 * row of its own. Arrows move, Enter picks, and digits jump to their hour:
 * "1" then "8" within a moment is 18:00.
 */
export function TimeList({
  value,
  onPick,
  start,
  earliest = null,
  latest = null,
  autoFocus = false,
  marked,
  markLabel = "Odd hours",
  className,
  "aria-label": ariaLabel = "Time",
}: {
  value: string;
  onPick: (value: string) => void;
  /** The minute the list opens on when nothing is chosen. */
  start: number;
  earliest?: number | null;
  latest?: number | null;
  /** Focus the row it opens on, for a picker that is only a list. */
  autoFocus?: boolean;
  /** The times to tag, such as the night hours a surcharge may fall on. */
  marked?: MinuteWindow;
  markLabel?: string;
  className?: string;
  "aria-label"?: string;
}) {
  const chosen = minuteOf(value);
  const listRef = useRef<HTMLDivElement>(null);
  const typed = useRef({ digits: "", at: 0 });
  const focused = useRef(false);

  const minutes = Array.from({ length: 96 }, (_, i) => i * QUARTER);
  if (chosen !== null && chosen % QUARTER !== 0) {
    minutes.push(chosen);
    minutes.sort((a, b) => a - b);
  }
  const allowed = (minute: number) =>
    (earliest === null || minute >= earliest) &&
    (latest === null || minute <= latest);
  // The row the list opens on: the chosen time, else the first from
  // `start` that can be picked.
  const anchor = (() => {
    const wanted = chosen ?? start;
    const exact = minutes.find((m) => m >= wanted && allowed(m));
    return exact ?? minutes.find(allowed) ?? minutes[0]!;
  })();

  useLayoutEffect(() => {
    const place = () => {
      const list = listRef.current;
      const row = list?.querySelector<HTMLElement>(`[data-minute="${anchor}"]`);
      if (!list || !row) return;
      // The row near the top, the one before it showing above it.
      list.scrollTop = row.offsetTop - row.offsetHeight;
      if (autoFocus && !focused.current) {
        focused.current = true;
        row.focus({ preventScroll: true });
      }
    };
    // In a sheet the dialog opens just after this runs: wait for it.
    if (listRef.current?.clientHeight) return place();
    const frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [anchor, autoFocus]);

  const rows = () => [
    ...(listRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[data-minute]:not(:disabled)",
    ) ?? []),
  ];

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const all = rows();
    const at = all.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (index: number) =>
      all[Math.max(0, Math.min(all.length - 1, index))]?.focus();
    if (event.key === "ArrowDown") focus(at + 1);
    else if (event.key === "ArrowUp") focus(at < 0 ? all.length - 1 : at - 1);
    else if (event.key === "PageDown") focus(at + 4);
    else if (event.key === "PageUp") focus(at - 4);
    else if (event.key === "Home") focus(0);
    else if (event.key === "End") focus(all.length - 1);
    else if (/^\d$/.test(event.key)) {
      // "1" then "8" within a moment is 18:00; "1" alone is 01:00.
      const now = Date.now();
      const digits =
        now - typed.current.at < 800
          ? typed.current.digits + event.key
          : event.key;
      typed.current = { digits, at: now };
      let hour = Number(digits.slice(-2));
      if (hour > 23) hour = Number(event.key);
      const minute = hour * 60;
      all.find((row) => Number(row.dataset.minute) >= minute)?.focus();
    } else return;
    event.preventDefault();
  }

  return (
    <div className={cx("ui:flex ui:min-h-0 ui:flex-col", className)}>
      <div
        ref={listRef}
        role="listbox"
        aria-label={ariaLabel}
        onKeyDown={onKeyDown}
        className="ui:relative ui:min-h-0 ui:flex-1 ui:overflow-y-auto ui:overscroll-contain ui:pr-1"
      >
        {minutes.map((minute) => {
          const on = minute === chosen;
          const ok = allowed(minute);
          const tagged = marked ? inWindow(marked, minute) : false;
          return (
            <button
              key={minute}
              type="button"
              role="option"
              aria-selected={on}
              data-minute={minute}
              aria-label={
                tagged ? `${clockOf(minute)}, ${markLabel}` : undefined
              }
              disabled={!ok}
              tabIndex={minute === anchor ? 0 : -1}
              onClick={() => onPick(valueOf(minute))}
              className={cx(
                "ui:flex ui:w-full ui:items-center ui:justify-between ui:rounded-md ui:px-3 ui:py-2 ui:text-left ui:text-sm ui:tabular-nums ui:focus-visible:outline-2 ui:focus-visible:-outline-offset-2 ui:focus-visible:outline-ring",
                on
                  ? "ui:bg-accent ui:font-semibold ui:text-accent-foreground"
                  : ok
                    ? "ui:hover:bg-accent ui:hover:text-accent-foreground"
                    : "ui:cursor-not-allowed ui:text-edge",
              )}
            >
              {clockOf(minute)}
              <span className="ui:flex ui:items-center ui:gap-1.5">
                {tagged ? (
                  <span
                    className={cx(
                      "ui:text-2xs ui:font-medium",
                      on ? "ui:text-accent-foreground/70" : "ui:text-muted",
                    )}
                  >
                    {markLabel}
                  </span>
                ) : null}
                {on ? <CheckIcon className="ui:size-4" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
