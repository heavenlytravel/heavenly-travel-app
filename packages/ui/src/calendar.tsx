"use client";

import { DayPicker } from "react-day-picker";
import { cx } from "./cx.js";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons.js";

/** "2026-10-28" as a local calendar day; null for anything else. */
export function dayOf(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const day = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  return Number.isNaN(day.getTime()) ? null : day;
}

/** A local calendar day as "2026-10-28". */
export function isoOf(day: Date) {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}`;
}

/**
 * One month of days to pick from, after shadcn's calendar (react-day-picker
 * underneath). Values are "2026-10-28", as a date field gives them. Days
 * outside `min` and `max` are grey and cannot be picked; today is shaded;
 * the week starts on Monday. Its colours are the theme's: see styles.css.
 */
export function Calendar({
  value,
  onPick,
  min,
  max,
  autoFocus,
  className,
}: {
  value: string;
  onPick: (value: string) => void;
  min?: string;
  max?: string;
  /** Focus the chosen day, or today, when it appears. */
  autoFocus?: boolean;
  className?: string;
}) {
  const day = dayOf(value);
  const first = min ? dayOf(min) : null;
  const last = max ? dayOf(max) : null;
  const button =
    "ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-slate-600 ui:enabled:hover:bg-accent ui:focus-ring ui:touch-target ui:disabled:cursor-not-allowed ui:disabled:opacity-50";

  return (
    <DayPicker
      mode="single"
      autoFocus={autoFocus}
      weekStartsOn={1}
      selected={day ?? undefined}
      defaultMonth={day ?? first ?? undefined}
      startMonth={first ?? undefined}
      endMonth={last ?? undefined}
      disabled={[
        ...(first ? [{ before: first }] : []),
        ...(last ? [{ after: last }] : []),
      ]}
      onSelect={(picked) => {
        if (picked) onPick(isoOf(picked));
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeftIcon /> : <ChevronRightIcon />,
      }}
      className={cx("ui:w-fit", className)}
      classNames={{
        root: "ui:relative",
        months: "ui:flex ui:flex-col",
        month: "ui:grid ui:gap-2",
        month_caption:
          "ui:flex ui:h-8 ui:items-center ui:justify-center ui:text-sm ui:font-semibold",
        nav: "ui:absolute ui:inset-x-0 ui:top-0 ui:flex ui:items-center ui:justify-between",
        button_previous: button,
        button_next: button,
        month_grid: "ui:border-collapse",
        weekdays: "ui:flex",
        weekday:
          "ui:w-9 ui:text-center ui:text-xs ui:font-normal ui:text-muted",
        week: "ui:mt-1 ui:flex",
        day: "ui:size-9 ui:p-0 ui:text-center ui:text-sm",
        day_button:
          "ui:inline-flex ui:size-9 ui:items-center ui:justify-center ui:rounded-md ui:enabled:hover:bg-accent ui:enabled:hover:text-accent-foreground ui:focus-visible:outline-2 ui:focus-visible:outline-ring",
        today:
          "ui:font-semibold ui:[&>button]:bg-accent ui:[&>button]:text-accent-foreground",
        selected:
          "ui:font-semibold ui:[&>button]:bg-primary! ui:[&>button]:text-primary-foreground! ui:[&>button]:hover:opacity-90",
        outside: "ui:text-slate-300",
        disabled: "ui:text-slate-300 ui:[&>button]:cursor-not-allowed",
        hidden: "ui:invisible",
      }}
    />
  );
}
