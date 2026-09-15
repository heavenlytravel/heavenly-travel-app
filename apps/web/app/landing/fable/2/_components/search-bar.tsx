"use client";

import { useState } from "react";
import styles from "../page.module.css";

type Service = "coach" | "car";

const cell = "grid gap-1 px-5 py-4";
const label = "text-[13px] font-semibold text-(--muted)";
const input =
  "w-full bg-transparent text-[15px] text-(--text) placeholder:text-(--muted)/60 focus:outline-none";

export function SearchBar() {
  const [service, setService] = useState<Service>("coach");
  const [message, setMessage] = useState("");

  return (
    <form
      role="search"
      aria-label="Search for transport across Malaysia"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(
          "Live availability is on its way. Send the same details through the quote form and a coordinator will confirm the vehicle.",
        );
      }}
      className="rounded-2xl border border-(--line) bg-(--mist) text-(--text) shadow-[0_28px_60px_-24px_rgba(8,43,46,0.5)]"
    >
      <fieldset className="flex flex-wrap items-center gap-2 border-b border-(--line) px-5 py-3">
        <legend className="sr-only">Service</legend>
        {(
          [
            ["coach", "Coach charter"],
            ["car", "Car with driver"],
          ] as const
        ).map(([value, text]) => (
          <label
            key={value}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm font-semibold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-(--lantern) ${
              service === value
                ? "border-(--ink) bg-(--ink) text-white"
                : "border-(--line) bg-white text-(--ink) hover:border-(--ink)"
            }`}
          >
            <input
              type="radio"
              name="service"
              value={value}
              checked={service === value}
              onChange={() => setService(value)}
              className="sr-only"
            />
            {text}
          </label>
        ))}
        <span className="ml-auto hidden text-sm text-(--muted) sm:inline">
          Pick-ups anywhere in Malaysia
        </span>
      </fieldset>

      <div className="grid sm:grid-cols-2 lg:grid-cols-[1.2fr_1.2fr_1.4fr_0.8fr_auto] lg:divide-x lg:divide-(--line)">
        <div className={`${cell} border-b border-(--line) lg:border-b-0`}>
          <label htmlFor="s-pickup" className={label}>
            Pick-up
          </label>
          <input
            id="s-pickup"
            name="pickup"
            className={input}
            placeholder="Hotel, airport, office"
            autoComplete="off"
          />
        </div>
        <div className={`${cell} border-b border-(--line) sm:border-l lg:border-b-0 lg:border-l-0`}>
          <label htmlFor="s-destination" className={label}>
            Destination
          </label>
          <input
            id="s-destination"
            name="destination"
            className={input}
            placeholder="Where the day ends"
            autoComplete="off"
          />
        </div>
        <div className={`${cell} border-b border-(--line) lg:border-b-0`}>
          <span className={label} id="s-dates-label">
            Dates
          </span>
          <div className="flex items-center gap-2" role="group" aria-labelledby="s-dates-label">
            <label htmlFor="s-from" className="sr-only">
              From
            </label>
            <input id="s-from" name="from" type="date" className={input} />
            <span className="text-(--muted)" aria-hidden="true">
              to
            </span>
            <label htmlFor="s-to" className="sr-only">
              To
            </label>
            <input id="s-to" name="to" type="date" className={input} />
          </div>
        </div>
        <div className={`${cell} border-b border-(--line) sm:border-l lg:border-b-0 lg:border-l-0`}>
          <label htmlFor="s-pax" className={label}>
            Passengers
          </label>
          <input
            id="s-pax"
            name="passengers"
            type="number"
            inputMode="numeric"
            min={1}
            defaultValue={service === "coach" ? 30 : 2}
            key={service}
            className={input}
          />
        </div>
        <div className="p-3 sm:col-span-2 lg:col-span-1">
          <button
            type="submit"
            className="flex h-full w-full items-center justify-center gap-2 rounded-xl bg-(--lantern) px-6 py-3 font-semibold text-(--ink) hover:bg-(--lantern-deep) lg:min-w-36"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <circle cx="8.5" cy="8.5" r="5.5" />
              <path d="M13 13l4.5 4.5" />
            </svg>
            Search
          </button>
        </div>
      </div>

      <p aria-live="polite" className={`${styles.display} px-5 text-[17px] text-(--sea) ${message ? "pb-4" : ""}`}>
        {message}
      </p>
    </form>
  );
}
