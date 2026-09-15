"use client";

import { useState, type FormEvent } from "react";
import styles from "../landing.module.css";

const SERVICES = ["Coach charter", "Car with driver"] as const;
type Service = (typeof SERVICES)[number];

export function TripSearch() {
  const [service, setService] = useState<Service>("Coach charter");
  const [passengers, setPassengers] = useState(20);
  const [summary, setSummary] = useState<string | null>(null);

  function choose(next: Service) {
    setService(next);
    setPassengers(next === "Coach charter" ? 20 : 2);
    setSummary(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const from = String(data.get("from") ?? "").trim() || "your pick-up point";
    const to = String(data.get("to") ?? "").trim() || "your destination";
    setSummary(
      `${service} for ${passengers} from ${from} to ${to}. Request a quote below and a coordinator will confirm availability.`,
    );
  }

  const label = "block text-[0.8rem] font-medium text-[#4f5b56]";
  const input =
    "mt-1 w-full bg-transparent text-[1rem] font-medium text-[#0a2a22] placeholder:font-normal placeholder:text-[#7a8580]";
  const cell =
    "relative px-4 py-3 focus-within:bg-[#eef1ee] focus-within:shadow-[inset_0_-3px_0_#c49a3c]";

  return (
    <div className="rounded-md bg-white text-[#0a2a22] shadow-[0_24px_48px_-20px_rgba(4,24,18,0.6)]">
      <form onSubmit={handleSubmit} aria-label="Find a vehicle">
        <fieldset className="flex flex-wrap items-center gap-x-5 gap-y-3 border-b border-[#0e3a2f]/12 px-4 pb-3 pt-4">
          <legend className="sr-only">Service</legend>
          <div className="flex rounded-[4px] bg-[#eef1ee] p-1">
            {SERVICES.map((s) => (
              <label
                key={s}
                className={`${styles.semi} cursor-pointer rounded-[3px] px-3.5 py-2 text-[0.92rem] font-semibold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#c49a3c] ${
                  service === s
                    ? "bg-[#0e3a2f] text-white"
                    : "text-[#0a2a22] hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="service"
                  value={s}
                  checked={service === s}
                  onChange={() => choose(s)}
                  className="sr-only"
                />
                {s}
              </label>
            ))}
          </div>
          <p className="text-[0.88rem] text-[#4f5b56]">
            {service === "Coach charter"
              ? "Sized to your group, from a school trip to a full conference."
              : "A private car and driver, for a transfer or the whole day."}
          </p>
        </fieldset>

        <div className="grid divide-y divide-[#0e3a2f]/12 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-[1.35fr_1.35fr_1fr_1fr_0.85fr_auto]">
          <div className={`${cell} sm:border-b sm:border-r sm:border-[#0e3a2f]/12 lg:border-b-0`}>
            <label htmlFor="ts-from" className={label}>
              Pick-up location
            </label>
            <input
              id="ts-from"
              name="from"
              placeholder="Airport, hotel or address"
              autoComplete="off"
              className={input}
            />
          </div>
          <div className={`${cell} sm:border-b sm:border-[#0e3a2f]/12 lg:border-b-0 lg:border-r`}>
            <label htmlFor="ts-to" className={label}>
              Destination
            </label>
            <input
              id="ts-to"
              name="to"
              placeholder="Where you're heading"
              autoComplete="off"
              className={input}
            />
          </div>
          <div className={`${cell} sm:border-b sm:border-r sm:border-[#0e3a2f]/12 lg:border-b-0`}>
            <label htmlFor="ts-start" className={label}>
              Pick-up date
            </label>
            <input id="ts-start" name="start" type="date" className={input} />
          </div>
          <div className={`${cell} sm:border-b sm:border-[#0e3a2f]/12 lg:border-b-0 lg:border-r`}>
            <label htmlFor="ts-end" className={label}>
              Return date <span className="font-normal">(optional)</span>
            </label>
            <input id="ts-end" name="end" type="date" className={input} />
          </div>
          <div className={`${cell} sm:border-r sm:border-[#0e3a2f]/12`}>
            <span id="ts-pax-label" className={label}>
              Passengers
            </span>
            <div
              role="group"
              aria-labelledby="ts-pax-label"
              className="mt-1 flex items-center justify-between gap-2"
            >
              <button
                type="button"
                onClick={() => setPassengers((p) => Math.max(1, p - 1))}
                aria-label="Fewer passengers"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0e3a2f]/30 text-lg leading-none hover:border-[#0e3a2f]"
              >
                &minus;
              </button>
              <output aria-live="polite" className={`${styles.semi} min-w-[2ch] text-center font-semibold`}>
                {passengers}
              </output>
              <button
                type="button"
                onClick={() => setPassengers((p) => Math.min(999, p + 1))}
                aria-label="More passengers"
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[#0e3a2f]/30 text-lg leading-none hover:border-[#0e3a2f]"
              >
                +
              </button>
            </div>
          </div>
          <div className="p-3">
            <button
              type="submit"
              className={`${styles.semi} flex h-full min-h-[52px] w-full items-center justify-center rounded-[4px] bg-[#c49a3c] px-7 font-bold text-[#0a2a22] transition-colors hover:bg-[#d4ab50]`}
            >
              Search
            </button>
          </div>
        </div>
      </form>
      <p
        role="status"
        className={summary ? "border-t border-[#0e3a2f]/12 px-4 py-3 text-[0.92rem] text-[#0a2a22]" : "sr-only"}
      >
        {summary ?? ""}
      </p>
    </div>
  );
}
