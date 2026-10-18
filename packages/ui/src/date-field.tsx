"use client";

import { Popover } from "radix-ui";
import { useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import { cx } from "./cx.js";
import { inputClassName } from "./field.js";
import { FormValue } from "./form-value.js";
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon } from "./icons.js";
import { usePortalContainer } from "./portal-container.js";
import { Select } from "./select.js";

/** "2026-10-28" as a local calendar day; null for anything else. */
function dayOf(value: string): Date | null {
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
function isoOf(day: Date) {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${day.getFullYear()}-${two(day.getMonth() + 1)}-${two(day.getDate())}`;
}

const shown = new Intl.DateTimeFormat("en-MY", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/**
 * A day, picked on a calendar, after shadcn's date picker: the button reads
 * "Wed, 28 Oct 2026", the calendar opens under it, and a pick closes it.
 * The value is "2026-10-28", as the browser's date field gave it, so the
 * form and the server read it unchanged. `min` and `max` grey the days
 * outside them.
 */
export function DateField({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  min,
  max,
  disabled,
  required,
  placeholder = "Pick a day",
  className,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** "2026-10-18": the first day that can be picked. */
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value ?? own;
  const day = dayOf(current);
  const first = min ? dayOf(min) : null;
  const last = max ? dayOf(max) : null;
  const { ref, container, trigger } = usePortalContainer();

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          ref={ref}
          id={id}
          disabled={disabled}
          className={cx(
            inputClassName,
            "ui:flex ui:items-center ui:justify-between ui:gap-2 ui:text-left",
            !day && "ui:text-neutral-400",
            className,
          )}
        >
          <span className="ui:truncate">
            {day ? shown.format(day) : placeholder}
          </span>
          <CalendarIcon className="ui:text-neutral-500" />
        </Popover.Trigger>
        <Popover.Portal container={container}>
          <Popover.Content
            align="start"
            sideOffset={4}
            collisionPadding={8}
            className="ui:z-50 ui:rounded-xl ui:border ui:border-neutral-200 ui:bg-white ui:p-3 ui:text-neutral-900 ui:shadow-lg"
          >
            <DayPicker
              mode="single"
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
                if (!picked) return;
                const next = isoOf(picked);
                setOwn(next);
                onChange?.(next);
                setOpen(false);
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeftIcon />
                  ) : (
                    <ChevronRightIcon />
                  ),
              }}
              classNames={{
                root: "ui:relative",
                months: "ui:flex ui:flex-col",
                month: "ui:grid ui:gap-2",
                month_caption:
                  "ui:flex ui:h-8 ui:items-center ui:justify-center ui:text-sm ui:font-medium",
                nav: "ui:absolute ui:inset-x-0 ui:top-0 ui:flex ui:items-center ui:justify-between",
                button_previous:
                  "ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-600 ui:hover:bg-neutral-100 ui:disabled:opacity-30",
                button_next:
                  "ui:inline-flex ui:size-8 ui:items-center ui:justify-center ui:rounded-md ui:text-neutral-600 ui:hover:bg-neutral-100 ui:disabled:opacity-30",
                month_grid: "ui:border-collapse",
                weekdays: "ui:flex",
                weekday:
                  "ui:w-9 ui:text-center ui:text-xs ui:font-normal ui:text-neutral-500",
                week: "ui:mt-1 ui:flex",
                day: "ui:size-9 ui:p-0 ui:text-center ui:text-sm",
                day_button:
                  "ui:inline-flex ui:size-9 ui:items-center ui:justify-center ui:rounded-md ui:hover:bg-neutral-100 ui:focus-visible:outline-2 ui:focus-visible:outline-neutral-900",
                selected:
                  "ui:[&>button]:bg-neutral-900 ui:[&>button]:text-white ui:[&>button]:hover:bg-neutral-800",
                today: "ui:font-semibold ui:text-emerald-700",
                outside: "ui:text-neutral-300",
                disabled:
                  "ui:text-neutral-300 ui:[&>button]:hover:bg-transparent",
                hidden: "ui:invisible",
              }}
            />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <FormValue
        name={name}
        value={current}
        required={required}
        control={trigger}
      />
    </>
  );
}

const HOURS = Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0"),
);

/**
 * A time of day as an hour and a minute, two lists in place of the
 * browser's time field: the minutes in fives, plus the one already set when
 * it is not a five. The value is "09:30", as the browser's field gave it.
 */
export function TimeField({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  disabled,
  required,
  "aria-label": ariaLabel,
}: {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  /** Names the pair: "Pickup time". */
  "aria-label"?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const pair = useRef<HTMLSpanElement>(null);
  const current = value ?? own;
  const [hour = "", minute = ""] = /^\d{2}:\d{2}$/.test(current)
    ? current.split(":")
    : [];
  const minutes =
    minute && !MINUTES.includes(minute) ? [...MINUTES, minute].sort() : MINUTES;

  function set(nextHour: string, nextMinute: string) {
    const next = `${nextHour || "00"}:${nextMinute || "00"}`;
    setOwn(next);
    onChange?.(next);
  }

  return (
    // Refused, the pair is marked as a whole: both lists turn red.
    <span
      ref={pair}
      className="ui:flex ui:items-center ui:gap-1.5 ui:[&[aria-invalid=true]>button]:border-red-500"
    >
      <Select
        id={id}
        aria-label={ariaLabel ? `${ariaLabel}, hour` : "Hour"}
        value={hour}
        onValueChange={(next) => set(next, minute)}
        options={HOURS.map((h) => ({ value: h, label: h }))}
        placeholder="--"
        disabled={disabled}
        className="ui:w-20"
      />
      <span aria-hidden="true" className="ui:text-neutral-500">
        :
      </span>
      <Select
        aria-label={ariaLabel ? `${ariaLabel}, minute` : "Minute"}
        value={minute}
        onValueChange={(next) => set(hour, next)}
        options={minutes.map((m) => ({ value: m, label: m }))}
        placeholder="--"
        disabled={disabled}
        className="ui:w-20"
      />
      <FormValue
        name={name}
        value={current}
        required={required}
        control={pair}
      />
    </span>
  );
}
