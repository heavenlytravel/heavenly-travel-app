"use client";

import { SERVICE_LABELS, useTrip, type ServiceKey } from "../../_lib/trip";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white";
const TABS: ServiceKey[] = ["car", "coach", "transfer", "tour"];

/**
 * Booking.com-style bar: pill tabs above, then one horizontal white bar with
 * a thick amber outline and a solid button at the end.
 */
export function OutlinedSearch() {
  const { trip, set, whatsappHref } = useTrip();

  return (
    <div>
      <div role="tablist" aria-label="Service" className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const on = trip.service === t;
          return (
            <button
              key={t}
              role="tab"
              type="button"
              id={`bk-tab-${t}`}
              aria-selected={on}
              aria-controls="bk-panel"
              onClick={() => set("service", t)}
              className={`rounded-full border px-4 py-2 text-sm font-medium ${
                on
                  ? "border-[#e4a93c] bg-white/10 text-white"
                  : "border-transparent text-white/85 hover:bg-white/10"
              } ${focus}`}
            >
              {SERVICE_LABELS[t]}
            </button>
          );
        })}
      </div>

      <form
        id="bk-panel"
        role="tabpanel"
        aria-labelledby={`bk-tab-${trip.service}`}
        onSubmit={(e) => e.preventDefault()}
        className="mt-4 grid gap-1 rounded-xl bg-[#e4a93c] p-1 md:grid-cols-[1.2fr_1.2fr_0.9fr_0.7fr_auto]"
      >
        <Cell id="bk-from" label="Pick-up" first>
          <input
            id="bk-from"
            placeholder="Airport, jetty, hotel or address"
            value={trip.from}
            onChange={(e) => set("from", e.target.value)}
            autoComplete="off"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#8a9a97]"
          />
        </Cell>
        <Cell id="bk-to" label="Drop-off">
          <input
            id="bk-to"
            placeholder="Where are you going?"
            value={trip.to}
            onChange={(e) => set("to", e.target.value)}
            autoComplete="off"
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#8a9a97]"
          />
        </Cell>
        <Cell id="bk-date" label="Date">
          <input
            id="bk-date"
            type="date"
            value={trip.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none"
          />
        </Cell>
        <Cell id="bk-pax" label="Passengers">
          <input
            id="bk-pax"
            type="number"
            min={1}
            inputMode="numeric"
            placeholder="2 adults"
            value={trip.passengers}
            onChange={(e) => set("passengers", e.target.value)}
            className="w-full bg-transparent text-[15px] outline-none placeholder:text-[#8a9a97]"
          />
        </Cell>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex min-h-14 items-center justify-center rounded-lg bg-[#157a74] px-7 font-(family-name:--font-display) text-lg font-bold text-white hover:bg-[#0c3b3a] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0c3b3a]`}
        >
          Search
        </a>
      </form>
    </div>
  );
}

function Cell({
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
      className={`block cursor-text bg-white px-4 py-2.5 ${
        first ? "rounded-t-lg md:rounded-l-lg md:rounded-tr-none" : ""
      } focus-within:bg-[#f7faf9]`}
    >
      <span className="block text-xs font-semibold text-[#3f5653]">
        {label}
      </span>
      {children}
    </label>
  );
}
