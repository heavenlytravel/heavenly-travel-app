"use client";

import { useId, useState, type FormEvent } from "react";
import styles from "../landing.module.css";

type Service = "coach" | "car";

const SERVICES: { value: Service; label: string; hint: string }[] = [
  { value: "coach", label: "Coach charter", hint: "12 to 44 seats" },
  { value: "car", label: "Car with driver", hint: "up to 6 passengers" },
];

export function SearchBar() {
  const id = useId();
  const [service, setService] = useState<Service>("coach");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [date, setDate] = useState("");
  const [passengers, setPassengers] = useState("2");
  const [note, setNote] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const what = service === "coach" ? "a coach" : "a car with driver";
    const where = [pickup.trim(), destination.trim()]
      .filter(Boolean)
      .join(" to ");
    setNote(
      `Online booking is on its way. For ${what}${where ? ` from ${where}` : ""}${
        date ? ` on ${date}` : ""
      }, send the same details on WhatsApp or in the quote form below and we will price it within a working day.`,
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-labelledby={`${id}-title`}
      className="rounded-2xl border border-[var(--line)] bg-white p-4 text-[var(--ink)] shadow-[0_18px_50px_-20px_rgba(12,59,58,0.45)] sm:p-5"
    >
      <h2 id={`${id}-title`} className="sr-only">
        Search for a coach or a car with driver
      </h2>

      <fieldset className="m-0 border-0 p-0">
        <legend className="sr-only">Service</legend>
        <div
          role="presentation"
          className="inline-flex rounded-lg bg-[var(--foam)] p-1"
        >
          {SERVICES.map((s) => {
            const checked = service === s.value;
            return (
              <label
                key={s.value}
                className={`relative cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-colors ${
                  checked
                    ? "bg-[var(--sea-deep)] text-white"
                    : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
                }`}
              >
                <input
                  type="radio"
                  name="service"
                  value={s.value}
                  checked={checked}
                  onChange={() => setService(s.value)}
                  className="peer sr-only"
                />
                <span className="pointer-events-none absolute inset-0 rounded-md peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--gold)]" />
                {s.label}
                <span className="hidden font-normal opacity-80 sm:inline">
                  , {s.hint}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.25fr_1.25fr_0.9fr_0.65fr_auto] lg:items-end">
        <div>
          <label
            htmlFor={`${id}-pickup`}
            className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]"
          >
            Pick-up
          </label>
          <input
            id={`${id}-pickup`}
            name="pickup"
            type="text"
            autoComplete="off"
            placeholder="City, hotel, airport or jetty"
            value={pickup}
            onChange={(e) => setPickup(e.target.value)}
            className={styles.fieldLight}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-dest`}
            className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]"
          >
            Destination
          </label>
          <input
            id={`${id}-dest`}
            name="destination"
            type="text"
            autoComplete="off"
            placeholder="Anywhere in Malaysia"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className={styles.fieldLight}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-date`}
            className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]"
          >
            Date
          </label>
          <input
            id={`${id}-date`}
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={styles.fieldLight}
          />
        </div>
        <div>
          <label
            htmlFor={`${id}-pax`}
            className="mb-1 block text-xs font-semibold text-[var(--ink-soft)]"
          >
            Passengers
          </label>
          <input
            id={`${id}-pax`}
            name="passengers"
            type="number"
            min={1}
            max={44}
            inputMode="numeric"
            value={passengers}
            onChange={(e) => setPassengers(e.target.value)}
            className={styles.fieldLight}
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-[var(--gold)] px-6 text-[15px] font-semibold text-[var(--sea-deep)] transition-colors hover:bg-[var(--gold-bright)] sm:col-span-2 lg:col-span-1"
        >
          <svg
            viewBox="0 0 20 20"
            aria-hidden="true"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
          >
            <circle cx="8.5" cy="8.5" r="5.5" />
            <path d="m13 13 4 4" strokeLinecap="round" />
          </svg>
          Search
        </button>
      </div>

      <p
        aria-live="polite"
        className={`text-sm leading-relaxed text-[var(--ink-soft)] ${note ? "mt-4" : ""}`}
      >
        {note}
      </p>
    </form>
  );
}
