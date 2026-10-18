"use client";

import { useState, type ReactNode } from "react";
import { Calendar, dayOf } from "./calendar.js";
import { cx } from "./cx.js";
import { inputClassName } from "./field.js";
import { FormValue } from "./form-value.js";
import { CalendarIcon, ClockIcon } from "./icons.js";
import { Picker } from "./picker.js";
import { usePortalContainer } from "./portal-container.js";
import {
  clockOf,
  minuteOf,
  nextQuarter,
  TimeList,
  zonedNow,
} from "./time-list.js";

const BOX = cx(
  inputClassName,
  "ui:flex ui:items-center ui:justify-between ui:gap-2 ui:text-left ui:data-placeholder:text-neutral-400",
);
/** A trigger with no box of its own, for a search card that draws the box. */
const BARE =
  "ui:flex ui:w-full ui:items-center ui:justify-between ui:gap-2 ui:text-left ui:outline-none";

const longDay = new Intl.DateTimeFormat("en-MY", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});
const shortDay = new Intl.DateTimeFormat("en-MY", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

/** "Wed, 28 Oct 2026" for "2026-10-28"; null for no day. */
function dayLabel(value: string, short = false) {
  const day = dayOf(value);
  if (!day) return null;
  return short && day.getFullYear() === new Date().getFullYear()
    ? shortDay.format(day)
    : longDay.format(day);
}

/** "9:30 AM" for "09:30"; null for no time. */
function timeLabel(value: string) {
  const minute = minuteOf(value);
  return minute === null ? null : clockOf(minute);
}

type Common = {
  id?: string;
  disabled?: boolean;
  required?: boolean;
  /** No box of its own: the caller's `className` draws the trigger. */
  bare?: boolean;
  className?: string;
  /** Where "now" and "today" are read: Malaysia for a pick-up. */
  timeZone?: string;
  "aria-label"?: string;
};

/** The field's button: its value, or the placeholder, and an icon. */
function trigger({
  id,
  ref,
  disabled,
  bare,
  className,
  ariaLabel,
  text,
  placeholder,
  icon,
}: {
  id?: string;
  ref: (node: HTMLElement | null) => void;
  disabled?: boolean;
  bare?: boolean;
  className?: string;
  ariaLabel?: string;
  text: string | null;
  placeholder: string;
  icon: ReactNode;
}) {
  return (
    <button
      ref={ref}
      type="button"
      id={id}
      disabled={disabled}
      aria-label={ariaLabel}
      data-placeholder={text ? undefined : ""}
      className={cx(bare ? BARE : BOX, className)}
    >
      <span className="ui:min-w-0 ui:truncate">{text ?? placeholder}</span>
      <span className="ui:shrink-0 ui:opacity-60">{icon}</span>
    </button>
  );
}

/**
 * A day, picked on a calendar, after shadcn's date picker: the button reads
 * "Wed, 28 Oct 2026" and a pick closes the calendar. The value is
 * "2026-10-28", as the browser's date field gave it, so forms and servers
 * read it unchanged. `min` and `max` grey the days outside them.
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
  bare,
  className,
  placeholder = "Pick a day",
  "aria-label": ariaLabel,
}: Common & {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  /** "2026-10-18": the first day that can be picked. */
  min?: string;
  max?: string;
  placeholder?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value ?? own;
  const { ref, container, trigger: shown } = usePortalContainer();

  return (
    <>
      <Picker
        open={open}
        onOpenChange={setOpen}
        title={ariaLabel ?? "Date"}
        container={container}
        trigger={trigger({
          id,
          ref,
          disabled,
          bare,
          className,
          ariaLabel,
          text: dayLabel(current),
          placeholder,
          icon: <CalendarIcon />,
        })}
      >
        <Calendar
          autoFocus
          className="ui:p-3 ui:max-sm:mx-auto ui:max-sm:p-0"
          value={current}
          min={min}
          max={max}
          onPick={(next) => {
            setOwn(next);
            onChange?.(next);
            setOpen(false);
          }}
        />
      </Picker>
      <FormValue
        name={name}
        value={current}
        required={required}
        control={shown}
        missing="Pick a day."
      />
    </>
  );
}

/**
 * A time of day from a list in quarter hours under an AM and PM switch, in
 * place of the browser's time field. It opens near the time now, read in
 * `timeZone`, when nothing is chosen, and a pick closes it. The value is
 * "09:30", as the browser's field gave it.
 */
export function TimeField({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  disabled,
  required,
  bare,
  className,
  timeZone,
  placeholder = "Pick a time",
  "aria-label": ariaLabel,
}: Common & {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value ?? own;
  const { ref, container, trigger: shown } = usePortalContainer();

  return (
    <>
      <Picker
        open={open}
        onOpenChange={setOpen}
        title={ariaLabel ?? "Time"}
        container={container}
        trigger={trigger({
          id,
          ref,
          disabled,
          bare,
          className,
          ariaLabel,
          text: timeLabel(current),
          placeholder,
          icon: <ClockIcon />,
        })}
      >
        <TimeList
          autoFocus
          className="ui:h-80 ui:p-3 ui:sm:w-48 ui:max-sm:p-0"
          aria-label={ariaLabel}
          value={current}
          start={nextQuarter(zonedNow(timeZone).minute)}
          onPick={(next) => {
            setOwn(next);
            onChange?.(next);
            setOpen(false);
          }}
        />
      </Picker>
      <FormValue
        name={name}
        value={current}
        required={required}
        control={shown}
        missing="Pick a time."
      />
    </>
  );
}

type Moment = { date: string; time: string };

/**
 * A day and a time in one field, the calendar and the time list side by
 * side, as a car rental site asks for a pick-up. The button reads
 * "Wed, 28 Oct · 9:30 AM". The list opens near the time now and greys the
 * times already past when the day is today, both read in `timeZone`; a day
 * before today cannot be picked unless `min` says so. Choosing the time
 * after the day closes it, as does "Done". The two values post as
 * `dateName` and `timeName`, "2026-10-28" and "09:30".
 */
export function DateTimeField({
  id,
  dateName,
  timeName,
  value,
  defaultValue = { date: "", time: "" },
  onChange,
  min,
  max,
  disabled,
  required,
  bare,
  className,
  timeZone,
  placeholder = "Pick a date and time",
  title = "Date and time",
  "aria-label": ariaLabel,
}: Common & {
  dateName?: string;
  timeName?: string;
  value?: Moment;
  defaultValue?: Moment;
  onChange?: (value: Moment) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  /** The sheet's heading on a phone. */
  title?: string;
}) {
  const [own, setOwn] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const current = value ?? own;
  const { ref, container, trigger: shown } = usePortalContainer();

  const day = dayLabel(current.date, true);
  const time = timeLabel(current.time);
  const text =
    day || time ? `${day ?? "Pick a day"} · ${time ?? "Pick a time"}` : null;

  function change(next: Moment) {
    setOwn(next);
    onChange?.(next);
  }

  return (
    <>
      <Picker
        open={open}
        onOpenChange={setOpen}
        title={title}
        container={container}
        trigger={trigger({
          id,
          ref,
          disabled,
          bare,
          className,
          ariaLabel,
          text,
          placeholder,
          icon: <CalendarIcon />,
        })}
      >
        <MomentPanel
          value={current}
          min={min}
          max={max}
          timeZone={timeZone}
          onChange={change}
          onClose={() => setOpen(false)}
        />
      </Picker>
      <FormValue
        name={dateName}
        value={current.date}
        required={required}
        control={shown}
        missing="Pick a day."
      />
      <FormValue
        name={timeName}
        value={current.time}
        required={required}
        control={shown}
        missing="Pick a time."
      />
    </>
  );
}

/** The calendar and the time list of a `DateTimeField`, read once it opens. */
function MomentPanel({
  value,
  min,
  max,
  timeZone,
  onChange,
  onClose,
}: {
  value: Moment;
  min?: string;
  max?: string;
  timeZone?: string;
  onChange: (value: Moment) => void;
  onClose: () => void;
}) {
  const now = zonedNow(timeZone);
  const start = nextQuarter(now.minute);
  const earliestOn = (date: string) => (date === now.today ? start : null);
  const earliest = earliestOn(value.date);
  const summary = [dayLabel(value.date), timeLabel(value.time)]
    .filter(Boolean)
    .join(" at ");

  return (
    <div className="ui:flex ui:flex-col">
      <div className="ui:flex ui:flex-col ui:gap-4 ui:sm:flex-row ui:sm:gap-0">
        <Calendar
          autoFocus={!value.date || !value.time}
          className="ui:max-sm:mx-auto ui:sm:border-r ui:sm:border-popover-line ui:sm:p-3"
          value={value.date}
          min={min ?? now.today}
          max={max}
          onPick={(date) => {
            // A time already past on the new day is dropped, not kept wrong.
            const first = earliestOn(date);
            const minute = minuteOf(value.time);
            const keeps = first === null || minute === null || minute >= first;
            onChange({ date, time: keeps ? value.time : "" });
          }}
        />
        <TimeList
          autoFocus={Boolean(value.date && value.time)}
          className="ui:h-56 ui:sm:h-[20.5rem] ui:sm:w-44 ui:sm:p-3"
          aria-label="Time"
          value={value.time}
          start={start}
          earliest={earliest}
          onPick={(time) => {
            onChange({ ...value, time });
            if (value.date) onClose();
          }}
        />
      </div>
      <div className="ui:mt-4 ui:flex ui:items-center ui:justify-between ui:gap-3 ui:text-sm ui:sm:mt-0 ui:sm:border-t ui:sm:border-popover-line ui:sm:px-3 ui:sm:py-2.5">
        <span className="ui:min-w-0 ui:truncate ui:text-neutral-600">
          {summary || "Pick a day and a time"}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ui:shrink-0 ui:rounded-md ui:bg-primary ui:px-3.5 ui:py-1.5 ui:text-sm ui:font-semibold ui:text-primary-foreground ui:hover:opacity-90 ui:focus-visible:outline-2 ui:focus-visible:outline-offset-2 ui:focus-visible:outline-ring"
        >
          Done
        </button>
      </div>
    </div>
  );
}
