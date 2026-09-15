"use client";

import { useState } from "react";

const fieldClass =
  "w-full rounded-md border border-[#26466c] bg-[#153560] px-3.5 py-3 text-base text-white placeholder:text-[#8fa3b8] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f5b800]";

const labelClass = "mb-1.5 block text-sm font-medium text-[#dbe5ee]";

export function SearchBar() {
  const [service, setService] = useState("coach");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState("");

  return (
    <form
      aria-label="Search for a vehicle"
      className="rounded-2xl bg-[#0c2340] p-5 text-white shadow-[0_18px_40px_-24px_rgba(12,35,64,0.6)] sm:p-6"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.1fr_1fr_1fr_0.9fr_0.7fr_auto] lg:items-end">
        <div>
          <label htmlFor="s-service" className={labelClass}>
            Service
          </label>
          <select
            id="s-service"
            className={fieldClass}
            value={service}
            onChange={(e) => setService(e.target.value)}
          >
            <option value="coach">Coach charter</option>
            <option value="car">Car with driver</option>
          </select>
        </div>
        <div>
          <label htmlFor="s-from" className={labelClass}>
            Pick-up
          </label>
          <input
            id="s-from"
            className={fieldClass}
            placeholder="KLIA, Penang, your hotel"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="s-to" className={labelClass}>
            Destination
          </label>
          <input
            id="s-to"
            className={fieldClass}
            placeholder="Cameron Highlands"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="s-date" className={labelClass}>
            Date
          </label>
          <input
            id="s-date"
            type="date"
            className={fieldClass}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="s-pax" className={labelClass}>
            Passengers
          </label>
          <input
            id="s-pax"
            type="number"
            min={1}
            inputMode="numeric"
            className={fieldClass}
            placeholder="4"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-[50px] items-center justify-center gap-2 rounded-md bg-[#f5b800] px-6 text-base font-semibold text-[#0c2340] hover:bg-[#ffc933] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white sm:col-span-2 lg:col-span-1"
        >
          <svg width="18" height="18" viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="M13 13l4.5 4.5" />
          </svg>
          Search
        </button>
      </div>
    </form>
  );
}
