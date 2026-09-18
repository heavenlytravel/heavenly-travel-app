"use client";

import { useTrip } from "../../_lib/trip";

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";
const field =
  "w-full border-0 border-b border-[#c9d2cf] bg-transparent px-0 pt-1 pb-2.5 text-[15px] text-[#071918] placeholder:text-[#8a9a97] hover:border-[#071918] focus-visible:border-[#0c3b3a] focus-visible:outline-none focus-visible:shadow-[0_2px_0_0_#0c3b3a]";
const label =
  "block text-[11px] font-semibold tracking-[0.14em] text-[#5a6b68] uppercase";

const HOURS = ["2", "3", "4", "6", "8", "10", "12"];
const DEFAULT_HOURS = "4";

type Mode = "oneway" | "hourly";

const MODES: { key: Mode; label: string }[] = [
  { key: "oneway", label: "One way" },
  { key: "hourly", label: "By the hour" },
];

/**
 * Chauffeur-style booking card: a one-way trip or a driver kept by the hour.
 * The mode is derived from the trip itself (hours set or not), so there is no
 * second piece of state to keep in step with it.
 */
export function BookingCard() {
  const { trip, set, whatsappHref } = useTrip();
  const mode: Mode = trip.hours ? "hourly" : "oneway";

  function choose(next: Mode) {
    if (next === mode) return;
    if (next === "hourly") {
      set("to", "");
      set("hours", DEFAULT_HOURS);
    } else {
      set("hours", "");
    }
  }

  return (
    <div className="bg-white p-6 text-[#071918] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.7)] sm:p-8">
      <div
        role="tablist"
        aria-label="Trip type"
        className="flex border-b border-[#e3e8e6]"
      >
        {MODES.map((m) => {
          const on = m.key === mode;
          return (
            <button
              key={m.key}
              type="button"
              role="tab"
              id={`bl-tab-${m.key}`}
              aria-selected={on}
              aria-controls="bl-panel"
              onClick={() => choose(m.key)}
              className={`-mb-px flex-1 border-b-2 pb-3 text-sm font-semibold tracking-wide ${
                on
                  ? "border-[#071918] text-[#071918]"
                  : "border-transparent text-[#7a8c89] hover:text-[#071918]"
              } ${focus}`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <form
        id="bl-panel"
        role="tabpanel"
        aria-labelledby={`bl-tab-${mode}`}
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 space-y-5"
      >
        <div>
          <label htmlFor="bl-from" className={label}>
            From
          </label>
          <input
            id="bl-from"
            className={field}
            placeholder="Address, airport or hotel"
            value={trip.from}
            onChange={(e) => set("from", e.target.value)}
            autoComplete="off"
          />
        </div>

        {mode === "oneway" ? (
          <div>
            <label htmlFor="bl-to" className={label}>
              To
            </label>
            <input
              id="bl-to"
              className={field}
              placeholder="Address, airport or hotel"
              value={trip.to}
              onChange={(e) => set("to", e.target.value)}
              autoComplete="off"
            />
          </div>
        ) : (
          <div>
            <label htmlFor="bl-hours" className={label}>
              Duration
            </label>
            <select
              id="bl-hours"
              className={field}
              value={trip.hours}
              onChange={(e) => set("hours", e.target.value)}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>
                  {h} hours
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-5">
          <div>
            <label htmlFor="bl-date" className={label}>
              Date
            </label>
            <input
              id="bl-date"
              type="date"
              className={field}
              value={trip.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="bl-time" className={label}>
              Pick-up time
            </label>
            <input
              id="bl-time"
              type="time"
              className={field}
              value={trip.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </div>
        </div>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex h-13 items-center justify-center bg-[#071918] font-(family-name:--font-display) text-[15px] font-semibold tracking-wide text-white hover:bg-[#0c3b3a] ${focus}`}
        >
          Get my fixed price
        </a>
        <p className="text-center text-xs text-[#5a6b68]">
          {mode === "oneway"
            ? "Tolls, fuel and 60 minutes of airport waiting included."
            : "Your driver and vehicle stay with you for the whole booking."}
        </p>
      </form>
    </div>
  );
}
