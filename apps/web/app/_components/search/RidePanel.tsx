"use client";

import { WhatsAppIcon } from "../WhatsAppIcon";
import { SERVICE_LABELS, type ServiceKey } from "../../_lib/trip";
import { useTrip } from "../../_lib/useTrip";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#157a74]";
const field =
  "w-full rounded-xl border border-[#d5e2de] bg-[#f6faf8] px-4 py-3 text-[15px] placeholder:text-[#8a9a97] hover:border-[#157a74] focus-visible:border-[#157a74] focus-visible:bg-white focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-[#157a74]/30";
const label = "mb-1.5 block text-sm font-semibold text-[#10201f]";
const stepBtn = `grid h-9 w-9 place-items-center rounded-full border border-[#d5e2de] bg-white text-lg leading-none font-semibold text-[#0c3b3a] hover:border-[#157a74] disabled:opacity-40 disabled:hover:border-[#d5e2de] ${focus}`;

const SERVICES: ServiceKey[] = ["transfer", "car", "coach", "tour"];
const MAX_PASSENGERS = 44;

/** Pre-booking panel: pick the kind of ride, fill in the trip, send it. */
export function RidePanel() {
  const { trip, set, whatsappHref } = useTrip({
    service: "transfer",
    passengers: "2",
  });
  const pax = Number(trip.passengers) || 1;
  const setPax = (n: number) =>
    set("passengers", String(Math.min(MAX_PASSENGERS, Math.max(1, n))));

  return (
    <form
      id="book"
      aria-labelledby="book-h"
      onSubmit={(e) => e.preventDefault()}
      className="scroll-mt-24 rounded-3xl bg-white p-6 shadow-[0_24px_60px_-28px_rgba(12,59,58,0.45)] ring-1 ring-[#0c3b3a]/5 sm:p-7"
    >
      <h2
        id="book-h"
        className="font-(family-name:--font-display) text-xl font-bold"
      >
        Book a ride in advance
      </h2>

      <fieldset className="mt-5">
        <legend className={label}>What do you need?</legend>
        <div className="grid grid-cols-2 gap-2">
          {SERVICES.map((s) => {
            const on = trip.service === s;
            return (
              <label
                key={s}
                className={`cursor-pointer rounded-xl border px-3 py-2.5 text-center text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#157a74] ${
                  on
                    ? "border-[#157a74] bg-[#e3f3ee] text-[#0c3b3a]"
                    : "border-[#d5e2de] text-[#3f5653] hover:border-[#157a74]"
                }`}
              >
                <input
                  type="radio"
                  name="gl-service"
                  value={s}
                  checked={on}
                  onChange={() => set("service", s)}
                  className="sr-only"
                />
                {SERVICE_LABELS[s]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 space-y-4">
        <div>
          <label htmlFor="gl-from" className={label}>
            Pick-up
          </label>
          <input
            id="gl-from"
            className={field}
            placeholder="KLIA Terminal 1"
            value={trip.from}
            onChange={(e) => set("from", e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="gl-to" className={label}>
            Drop-off
          </label>
          <input
            id="gl-to"
            className={field}
            placeholder="Hotel in Bukit Bintang"
            value={trip.to}
            onChange={(e) => set("to", e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="gl-date" className={label}>
              Date
            </label>
            <input
              id="gl-date"
              type="date"
              className={field}
              value={trip.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="gl-time" className={label}>
              Time
            </label>
            <input
              id="gl-time"
              type="time"
              className={field}
              value={trip.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </div>
        </div>

        <div
          role="group"
          aria-labelledby="gl-pax-label"
          className="flex items-center justify-between"
        >
          <span id="gl-pax-label" className="text-sm font-semibold">
            Passengers
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="One passenger fewer"
              disabled={pax <= 1}
              onClick={() => setPax(pax - 1)}
              className={stepBtn}
            >
              &minus;
            </button>
            <output
              aria-live="polite"
              className="w-8 text-center font-(family-name:--font-display) text-lg font-bold tabular-nums"
            >
              {pax}
            </output>
            <button
              type="button"
              aria-label="One passenger more"
              disabled={pax >= MAX_PASSENGERS}
              onClick={() => setPax(pax + 1)}
              className={stepBtn}
            >
              +
            </button>
          </div>
        </div>
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-6 flex h-13 items-center justify-center gap-2.5 rounded-full bg-[#e4a93c] font-(family-name:--font-display) text-base font-bold text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
      >
        <WhatsAppIcon className="h-5 w-5" />
        Get my fare
      </a>
      <p className="mt-3 text-center text-xs text-[#5a6b68]">
        Fixed fare in minutes. Free changes until the day before.
      </p>
    </form>
  );
}
