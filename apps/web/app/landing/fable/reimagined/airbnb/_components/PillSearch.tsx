"use client";

import { useState } from "react";
import { useTrip } from "../../_lib/trip";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0c3b3a]";

/**
 * Airbnb-style pill: compact by default, expands to segmented fields on
 * focus or tap. The compact and expanded states share one form so screen
 * readers see a single search control.
 */
export function PillSearch() {
  const { trip, set, whatsappHref } = useTrip({ service: "car" });
  const [open, setOpen] = useState(false);

  const summary = [
    trip.from || "Anywhere",
    trip.date || "Any date",
    trip.passengers ? `${trip.passengers} guests` : "Add guests",
  ];

  return (
    <form
      aria-label="Search vehicles"
      onSubmit={(e) => e.preventDefault()}
      onFocus={() => setOpen(true)}
      className="mx-auto w-full max-w-3xl"
    >
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={`mx-auto flex h-12 items-center rounded-full border border-[#dde5e3] bg-white pr-2 pl-5 text-sm shadow-[0_3px_12px_rgba(0,0,0,0.08)] hover:shadow-[0_3px_16px_rgba(0,0,0,0.14)] ${focus}`}
        >
          {summary.map((s, i) => (
            <span key={s} className="flex items-center">
              {i > 0 && (
                <span aria-hidden className="mx-3 h-6 w-px bg-[#dde5e3]" />
              )}
              <span className={i === 0 ? "font-semibold" : "text-[#5b6c69]"}>
                {s}
              </span>
            </span>
          ))}
          <span className="ml-3 grid h-8 w-8 place-items-center rounded-full bg-[#157a74] text-white">
            <SearchIcon />
          </span>
        </button>
      ) : (
        <div className="grid items-stretch rounded-[2rem] border border-[#dde5e3] bg-white shadow-[0_6px_24px_rgba(0,0,0,0.12)] sm:rounded-full md:grid-cols-[1.3fr_1.3fr_1fr_0.9fr_auto]">
          <Segment id="a-from" label="Where from" first>
            <input
              id="a-from"
              placeholder="Airport, jetty, hotel"
              value={trip.from}
              onChange={(e) => set("from", e.target.value)}
              autoFocus
              autoComplete="off"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#8a9a97]"
            />
          </Segment>
          <Segment id="a-to" label="Where to">
            <input
              id="a-to"
              placeholder="Anywhere in Malaysia"
              value={trip.to}
              onChange={(e) => set("to", e.target.value)}
              autoComplete="off"
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#8a9a97]"
            />
          </Segment>
          <Segment id="a-date" label="When">
            <input
              id="a-date"
              type="date"
              value={trip.date}
              onChange={(e) => set("date", e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
          </Segment>
          <Segment id="a-pax" label="Who">
            <input
              id="a-pax"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Add guests"
              value={trip.passengers}
              onChange={(e) => set("passengers", e.target.value)}
              className="w-full bg-transparent text-sm outline-none placeholder:text-[#8a9a97]"
            />
          </Segment>
          <div className="flex items-center p-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#157a74] px-5 text-sm font-semibold text-white hover:bg-[#0c3b3a] sm:w-auto ${focus}`}
            >
              <SearchIcon />
              Search
            </a>
          </div>
        </div>
      )}
    </form>
  );
}

function Segment({
  id,
  label,
  first = false,
  children,
}: {
  id: string;
  label: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className={`block cursor-text rounded-full px-6 py-3 hover:bg-[#f1f5f4] ${
        first ? "" : "md:border-l md:border-[#e9eeed]"
      }`}
    >
      <span className="block text-xs font-semibold">{label}</span>
      {children}
    </label>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" strokeLinecap="round" />
    </svg>
  );
}
