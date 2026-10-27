"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import type { ItemStatus, TripCategory } from "@repo/db";
import { BusIcon, CarIcon, ClockIcon } from "@repo/ui/icons";
import { ClassPicture } from "../../../_components/ClassPicture";
import { focus } from "../../_components/Page";
import { classOf, dayLabel, endTime, fareOf, rm, shortPlace } from "./data";
import type { ChosenVehicle, Trip } from "./store";

/** A trip in a few words: "Langkawi Airport → Pelangi Beach Resort", or "8 hours from Pelangi Beach Resort". */
export function routeLine(trip: Pick<Trip, "mode" | "from" | "to" | "hours">) {
  const from = trip.from ? shortPlace(trip.from) : "";
  if (trip.mode === "hourly") {
    return from ? `${trip.hours} hours from ${from}` : `${trip.hours} hours`;
  }
  if (!from) return "Places to choose";
  return trip.to ? `${from} → ${shortPlace(trip.to)}` : `From ${from}`;
}

/** False while the server's page is on screen, true once the browser's state is read. */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

/** Trips by day, in order, each day numbered from the first. */
export function byDay(trips: Trip[]) {
  const days: { date: string; number: number; trips: Trip[] }[] = [];
  const first = trips[0]?.date;
  for (const trip of trips) {
    const day = days.find((d) => d.date === trip.date);
    if (day) day.trips.push(trip);
    else {
      const number = first
        ? Math.round((Date.parse(trip.date) - Date.parse(first)) / 86_400_000) +
          1
        : 1;
      days.push({ date: trip.date, number, trips: [trip] });
    }
  }
  return days;
}

export function DayHeading({
  date,
  number,
  amount,
}: {
  date: string;
  number: number;
  amount: ReactNode;
}) {
  return (
    <div className="mx-1 mb-3 flex items-baseline justify-between gap-4">
      <h2 className="font-(family-name:--font-display) text-[1.6rem] leading-tight text-ink">
        {dayLabel(date)}
        <span className="ml-3 font-(family-name:--font-body) text-[0.75rem] font-bold tracking-[0.2em] text-slate-500 uppercase">
          Day {number}
        </span>
      </h2>
      <span className="font-semibold text-slate-700">{amount}</span>
    </div>
  );
}

const chip =
  "inline-flex h-6 items-center gap-1.5 rounded-full bg-slate-100 px-2.5 text-[0.78rem] font-semibold text-slate-700";

/** What a trip is: its icon, when, its kind, where, and its price. */
export function TripHead({
  trip,
  category,
  price,
  title,
}: {
  trip: Trip;
  category: TripCategory;
  price?: ReactNode;
  /** A line above the time: "Trip 2". */
  title?: ReactNode;
}) {
  const Icon =
    trip.mode === "hourly"
      ? ClockIcon
      : category === "coach-charter"
        ? BusIcon
        : CarIcon;
  return (
    <div className="flex gap-4">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-tint text-brand">
        <Icon className="size-[22px]" />
      </span>
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="text-[0.8rem] font-bold tracking-[0.15em] text-brand uppercase">
            {title}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 text-[1.02rem] font-bold text-ink">
          {trip.mode === "hourly"
            ? `${trip.time} to ${endTime(trip.time, trip.hours)}`
            : trip.time}
          <span className={chip}>
            {trip.mode === "hourly" ? `${trip.hours} hours` : "One-way"}
          </span>
        </div>
        <Route trip={trip} />
      </div>
      {price !== undefined ? (
        <div className="shrink-0 text-right text-[1.15rem] font-bold whitespace-nowrap text-brand">
          {price}
        </div>
      ) : null}
    </div>
  );
}

function Route({ trip }: { trip: Trip }) {
  if (trip.mode === "hourly") {
    return (
      <p className="mt-2 flex items-start gap-3 text-[0.97rem]">
        <span className="mt-[7px] size-2.5 shrink-0 rounded-full border-2 border-brand bg-white" />
        From {trip.from || "a pick-up to choose"}
      </p>
    );
  }
  return (
    <div className="mt-2 grid grid-cols-[10px_1fr] gap-x-3 text-[0.97rem]">
      <span className="mt-[7px] size-2.5 rounded-full border-2 border-brand bg-white" />
      <span>{trip.from}</span>
      <span className="mx-auto h-2.5 w-0.5 bg-[#cfe0f3]" />
      <span />
      <span className="mt-[7px] size-2.5 rounded-full bg-brand" />
      <span>{trip.to}</span>
    </div>
  );
}

/** A trip's price as the cards show it: "Quote" when we price it later, struck through once cancelled. */
export function tripPriceLabel(price: number | null, cancelled = false) {
  if (price === null) return "Quote";
  return cancelled ? (
    <span className="text-slate-400 line-through">{rm(price)}</span>
  ) : (
    rm(price)
  );
}

/** The late-night surcharge in a trip's price, when it has one. */
export function LateNightLine({
  trip,
  classId,
}: {
  trip: Trip;
  classId: string;
}) {
  const { lateNight } = fareOf(trip, classOf(classId));
  if (lateNight === 0 || trip.issue === "quote") return null;
  return (
    <p className="mx-[22px] mt-2 text-[0.85rem] text-slate-500">
      Includes {rm(lateNight)} for a pick-up between 23:00 and 06:00.
    </p>
  );
}

/** The flight and the notes, when a trip has them. */
export function TripExtras({ trip }: { trip: Trip }) {
  if (!trip.flight && !trip.notes) return null;
  return (
    <p className="mx-[22px] mt-2 text-[0.88rem] text-slate-500">
      {trip.flight ? `Flight ${trip.flight}` : ""}
      {trip.flight && trip.notes ? " · " : ""}
      {trip.notes ? `“${trip.notes}”` : ""}
    </p>
  );
}

const NOTE_TONES = {
  red: "bg-[#fdecea] text-[#8c1d16]",
  amber: "bg-[#fff4d6] text-[#6b4e00]",
  blue: "bg-brand-tint text-navy",
};

/** A message about one trip, inside its card. */
export function TripNote({
  tone,
  children,
  actions,
}: {
  tone: keyof typeof NOTE_TONES;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div
      role={tone === "red" ? "alert" : undefined}
      className={`mx-[22px] mt-3 rounded-xl px-4 py-3 text-[0.92rem] ${NOTE_TONES[tone]}`}
    >
      <p>{children}</p>
      {actions ? (
        <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">{actions}</div>
      ) : null}
    </div>
  );
}

/** The booking's vehicle, once for every trip. */
export function VehicleSummary({
  vehicle,
  tripCount,
  action,
}: {
  vehicle: ChosenVehicle;
  tripCount: number;
  action?: ReactNode;
}) {
  const cls = classOf(vehicle.classId);
  return (
    <div className="flex items-center gap-4">
      <ClassPicture
        src={cls.photo}
        sizes="96px"
        className="w-[72px] shrink-0 sm:w-24"
      />
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink">
          {cls.name}{" "}
          <span className="font-semibold text-slate-500">
            for {tripCount === 1 ? "the trip" : `all ${tripCount} trips`}
          </span>
        </p>
        <p className="text-[0.9rem] text-slate-600">
          Any model · {vehicle.passengers}{" "}
          {vehicle.passengers === 1 ? "passenger" : "passengers"}
        </p>
      </div>
      {action}
    </div>
  );
}

const ITEM_TONES: Record<ItemStatus, string> = {
  received: "bg-[#fff4d6] text-[#7a5a00]",
  confirmed: "bg-emerald-50 text-emerald-800",
  assigned: "bg-brand-tint text-brand",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-[#fbe9e7] text-[#b3261e]",
};

const ITEM_LABELS: Record<ItemStatus, string> = {
  received: "Awaiting confirmation",
  confirmed: "Confirmed",
  assigned: "Driver assigned",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function ItemBadge({ status }: { status: ItemStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold ${ITEM_TONES[status]}`}
    >
      {ITEM_LABELS[status]}
    </span>
  );
}

/** The bar a phone keeps at its foot: the total and the next step. */
export function Dock({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,38,75,0.12)] lg:hidden">
      {children}
    </div>
  );
}

/** A link inside a coloured message: underlined, in the message's own colour. */
export const noteLink = `font-semibold underline underline-offset-4 hover:no-underline ${focus}`;
