"use client";

import { useId, type ComponentType, type ReactNode } from "react";
import { BOOKING_RULES } from "@repo/db";
import { DateTimeField } from "@repo/ui/date-field";
import { Radio } from "@repo/ui/field";
import {
  ArrowRightIcon,
  CalendarIcon,
  ClockIcon,
  FlagIcon,
  MapPinIcon,
  UsersIcon,
} from "@repo/ui/icons";
import { NumberField } from "@repo/ui/number-field";
import { PlaceInput } from "@repo/ui/place-input";
import { Select } from "@repo/ui/select";
import { ProductIcon } from "../../../../_components/Brand";
import { PRODUCTS, type Product } from "../../../../_lib/search";
import { focus } from "../../../_components/Page";
import { dayLabel, HOUR_CHOICES } from "../data";
import { update, useExample, type SearchRow } from "../store";

/** The pieces every search card is built from: its frame and tabs, and the boxes of its row. */

const { timeZone } = BOOKING_RULES;

/** What the search page gives each card: the trips to start from, and where they go when sent. */
export type CardProps = {
  seed: SearchRow[];
  /** The row to open first; the last when null. */
  seedOpen: string | null;
  /** The card holds a priced booking's trips: it updates them. */
  priced: boolean;
  onSend: (rows: SearchRow[]) => void;
};

type Icon = ComponentType<{ className?: string }>;

const TABS: Product[] = [
  PRODUCTS["car-with-driver"],
  PRODUCTS["coach-charter"],
  PRODUCTS.attraction,
  PRODUCTS.hotel,
  PRODUCTS.rental,
  PRODUCTS.package,
];

const HOURS = HOUR_CHOICES.map((h) => ({
  value: String(h),
  label: `${h} hours`,
}));

const input =
  "h-full min-h-[70px] w-full border-0 bg-transparent pt-[34px] pb-2.5 pr-[18px] pl-[18px] text-slate-500 outline-none placeholder:text-slate-500/80 focus:text-ink data-placeholder:text-slate-500/80";

/** The home page's search card around a card's form: the blue frame and the service tabs. */
export function CardFrame({ children }: { children: ReactNode }) {
  const { vehicle } = useExample();
  return (
    <div className="rounded-[26px] bg-linear-to-br from-ink via-navy to-brand p-3 sm:p-8">
      <div className="rounded-[18px] bg-white text-slate-900 shadow-[0_22px_55px_rgba(0,38,75,0.16)] sm:rounded-[22px]">
        <div
          role="tablist"
          aria-label="Choose a travel service"
          className="flex snap-x snap-mandatory overflow-x-auto rounded-t-[inherit] border-b border-slate-200 [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible lg:grid-cols-6"
        >
          {TABS.map((p) => {
            const on = p.key === vehicle.category;
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={on}
                disabled={!p.bookable}
                onClick={() => {
                  const category = p.key;
                  if (
                    category === "car-with-driver" ||
                    category === "coach-charter"
                  ) {
                    update((s) => ({
                      ...s,
                      vehicle: {
                        ...s.vehicle,
                        category,
                        classId:
                          s.vehicle.category === category
                            ? s.vehicle.classId
                            : null,
                      },
                    }));
                  }
                }}
                className={`relative flex min-h-[54px] shrink-0 snap-start items-center justify-center gap-2.5 border-r border-slate-100 px-4 py-3 text-[0.83rem] font-semibold whitespace-nowrap last:border-r-0 disabled:cursor-not-allowed disabled:text-slate-500/60 sm:text-[0.95rem] lg:min-h-[58px] ${
                  on
                    ? "bg-brand-tint text-brand"
                    : "bg-white enabled:hover:bg-slate-50"
                } ${focus}`}
              >
                <ProductIcon
                  service={p.key}
                  className="h-5 w-5 shrink-0 stroke-[1.8]"
                />
                <span>{p.label}</span>
                {!p.bookable && (
                  <span className="absolute top-1.5 right-2 text-[0.55rem] leading-none font-bold tracking-[0.12em] text-azure uppercase">
                    Soon
                  </span>
                )}
                {on && (
                  <span
                    aria-hidden
                    className="absolute bottom-0 h-[3px] w-[50px] rounded-[3px] bg-azure"
                  />
                )}
              </button>
            );
          })}
        </div>
        {children}
      </div>
    </div>
  );
}

type ChoiceOption = { value: string; label: string; icon: Icon };

/** The kinds of trip the row asks for. A return is two one-way trips, a hire over several days one hourly trip a day. */
export const KINDS = {
  oneway: { value: "oneway", label: "One-way", icon: ArrowRightIcon },
  hourly: { value: "hourly", label: "Hourly", icon: ClockIcon },
} satisfies Record<string, ChoiceOption>;

/** When a trip starts, as the list says it: "Tue 3 Nov · 10:30". */
export const whenLine = (row: SearchRow) =>
  row.date
    ? `${dayLabel(row.date)}${row.time ? ` · ${row.time}` : ""}`
    : "Day to choose";

/** The kind of trip as radios, in the row's first box where the live card has its "Trip" list. The row's boxes join up when their container is wide enough. */
export function TripChoice({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: ChoiceOption[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="flex min-h-[70px] min-w-0 flex-col justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 @3xl:w-[158px] @3xl:shrink-0 @3xl:rounded-none @3xl:rounded-l-[14px]">
      <legend className="sr-only">Type of trip</legend>
      {options.map(({ value: option, label, icon: Icon }) => (
        <label
          key={option}
          className="flex cursor-pointer items-center gap-2 text-[0.9rem]/5 font-semibold whitespace-nowrap text-slate-600 hover:text-ink has-[:checked]:text-brand"
        >
          <Radio
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <Icon className="size-4 shrink-0" />
          {label}
        </label>
      ))}
    </fieldset>
  );
}

/** A field's box on the card, its label laid over its top, joined to its neighbours on a wide screen. */
function Box({
  id,
  label,
  icon: Icon,
  invalid = false,
  place,
  className = "",
  children,
}: {
  id: string;
  label: string;
  icon: Icon;
  invalid?: boolean;
  place?: "first" | "last";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative grid min-w-0 grid-cols-1 rounded-xl border bg-white focus-within:z-10 focus-within:border-brand @3xl:rounded-none ${
        invalid ? "z-[1] border-[#b3261e]" : "border-slate-200"
      } ${place === "first" ? "@3xl:rounded-l-[14px]" : "@3xl:-ml-px"} ${
        place === "last" ? "@3xl:rounded-r-[14px]" : ""
      } ${className}`}
    >
      <label
        htmlFor={id}
        className="pointer-events-none absolute top-2.5 left-[18px] z-[1] flex items-center gap-1.5 text-[0.82rem]/5 font-semibold text-slate-800"
      >
        <Icon className="size-[15px] text-slate-500" />
        {label}
      </label>
      {children}
    </div>
  );
}

export function PlaceBox({
  id,
  field,
  label,
  value,
  place,
  invalid = false,
  className = "@3xl:flex-[2]",
  onChange,
}: {
  id: string;
  field: "from" | "to";
  /** In place of "Pick-up" or "Drop-off". */
  label?: string;
  value: string;
  place?: "first" | "last";
  invalid?: boolean;
  className?: string;
  onChange: (value: string) => void;
}) {
  return (
    <Box
      id={id}
      label={label ?? (field === "from" ? "Pick-up" : "Drop-off")}
      icon={field === "from" ? MapPinIcon : FlagIcon}
      invalid={invalid}
      place={place}
      className={className}
    >
      <PlaceInput
        id={id}
        value={value}
        placeholder={
          field === "from"
            ? "Airport, hotel or address"
            : "Where are you going?"
        }
        onChange={(next) => onChange(next)}
        className={input}
      />
    </Box>
  );
}

export function HoursBox({
  id,
  value,
  onChange,
}: {
  id: string;
  value: number;
  onChange: (hours: number) => void;
}) {
  return (
    <Box id={id} label="Hours" icon={ClockIcon} className="@3xl:flex-1">
      <Select
        id={id}
        bare
        value={String(value)}
        onValueChange={(v) => onChange(Number(v))}
        options={HOURS}
        className={input}
      />
    </Box>
  );
}

export function WhenBox({
  id,
  label = "When",
  date,
  time,
  min,
  place,
  invalid = false,
  onChange,
}: {
  id: string;
  label?: string;
  date: string;
  time: string;
  min: string;
  place?: "first" | "last";
  invalid?: boolean;
  onChange: (date: string, time: string) => void;
}) {
  return (
    <Box
      id={id}
      label={label}
      icon={CalendarIcon}
      invalid={invalid}
      place={place}
      className="@3xl:flex-[1.5]"
    >
      <DateTimeField
        id={id}
        bare
        title={label}
        value={{ date, time }}
        onChange={(next) => onChange(next.date, next.time)}
        min={min}
        timeZone={timeZone}
        className={input}
      />
    </Box>
  );
}

/** The card's blue button, under the form. */
export function SendButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className={`flex min-h-[56px] w-full items-center justify-center rounded-[14px] bg-brand px-5 text-[1.02rem] font-bold whitespace-nowrap text-white shadow-[0_8px_20px_rgba(4,107,210,0.18)] hover:bg-brand-strong sm:ml-auto sm:w-auto sm:min-w-[230px] ${focus}`}
    >
      {label} &nbsp;→
    </button>
  );
}

export function Problems({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <p role="alert" className="mx-1 mt-3 text-[0.92rem] text-[#b3261e]">
      {messages.join(" ")}
    </p>
  );
}

export function TripNumber({
  value,
  small = false,
}: {
  value: number;
  small?: boolean;
}) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-brand font-bold text-white ${
        small ? "size-[22px] text-[0.72rem]" : "size-6 text-[0.78rem]"
      }`}
    >
      {value}
    </span>
  );
}

export function AddButton({
  icon: Icon,
  onClick,
  children,
}: {
  icon: Icon;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 text-[0.95rem] font-semibold text-brand hover:underline ${focus}`}
    >
      <Icon className="size-4" />
      {children}
    </button>
  );
}

/** The box that lists the trips: its title, a hint or an action beside it, and the list. */
export function TripListBox({
  hint,
  action,
  className = "mb-5",
  children,
}: {
  hint?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`rounded-2xl bg-mist p-2.5 @container sm:p-3.5 ${className}`}
    >
      <div className="mx-1 mb-2 flex flex-wrap items-baseline gap-x-2.5 text-[0.92rem]">
        <b className="text-ink">Your trips</b>
        {hint ? <span className="text-slate-500">{hint}</span> : null}
        {action ? <span className="ml-auto">{action}</span> : null}
      </div>
      {children}
    </div>
  );
}

/** The group's size, once for the booking: the one vehicle must seat them all. */
export function PassengersField() {
  const id = useId();
  const { vehicle } = useExample();
  return (
    <label
      htmlFor={id}
      className="flex items-center gap-3 rounded-[14px] border border-slate-200 bg-white py-1.5 pr-1.5 pl-4 text-[0.92rem] font-semibold text-slate-800"
    >
      <UsersIcon className="size-[18px] text-slate-500" />
      Passengers
      <NumberField
        id={id}
        bare
        min={1}
        max={99}
        value={vehicle.passengers}
        onChange={(e) =>
          update((s) => ({
            ...s,
            vehicle: {
              ...s.vehicle,
              passengers: Math.max(1, Number(e.target.value) || 1),
            },
          }))
        }
        className="w-[120px] text-[1rem] text-ink"
      />
    </label>
  );
}
