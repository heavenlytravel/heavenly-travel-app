"use client";

import {
  SERVICE_LABELS,
  useTrip,
  type ServiceKey,
} from "../../../../../_lib/trip";

const field =
  "w-full rounded-lg border border-[#cfe0dc] bg-white px-3.5 py-3 text-[15px] text-[#10201f] placeholder:text-[#7a8c89] focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-[#e4a93c]";
const label =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#3f5653]";

export function QuoteStrip() {
  const { trip, set, whatsappHref } = useTrip();
  return (
    <form
      aria-label="Get a quote"
      onSubmit={(e) => e.preventDefault()}
      className="grid gap-3 rounded-2xl bg-white p-4 shadow-[0_24px_60px_-30px_rgba(12,59,58,0.55)] ring-1 ring-black/5 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_0.9fr_0.7fr_auto] lg:items-end sm:p-5"
    >
      <div>
        <label htmlFor="hq-service" className={label}>
          Service
        </label>
        <select
          id="hq-service"
          className={field}
          value={trip.service}
          onChange={(e) => set("service", e.target.value as ServiceKey)}
        >
          {(Object.keys(SERVICE_LABELS) as ServiceKey[]).map((k) => (
            <option key={k} value={k}>
              {SERVICE_LABELS[k]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="hq-from" className={label}>
          Pick-up
        </label>
        <input
          id="hq-from"
          className={field}
          placeholder="Langkawi airport"
          value={trip.from}
          onChange={(e) => set("from", e.target.value)}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="hq-to" className={label}>
          Drop-off
        </label>
        <input
          id="hq-to"
          className={field}
          placeholder="Pantai Cenang"
          value={trip.to}
          onChange={(e) => set("to", e.target.value)}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="hq-date" className={label}>
          Date
        </label>
        <input
          id="hq-date"
          type="date"
          className={field}
          value={trip.date}
          onChange={(e) => set("date", e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="hq-pax" className={label}>
          People
        </label>
        <input
          id="hq-pax"
          type="number"
          min={1}
          inputMode="numeric"
          className={field}
          placeholder="4"
          value={trip.passengers}
          onChange={(e) => set("passengers", e.target.value)}
        />
      </div>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-[50px] items-center justify-center rounded-lg bg-[#e4a93c] px-6 font-(family-name:--font-display) text-base font-bold text-[#10201f] hover:bg-[#f0b94d] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#0c3b3a]"
      >
        Get a quote
      </a>
    </form>
  );
}
