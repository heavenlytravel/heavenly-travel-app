"use client";

import { useId, useState, type FormEvent } from "react";
import styles from "../landing.module.css";

const services = ["Coach charter", "Car with driver"] as const;
type Service = (typeof services)[number];

const sign = "font-[family-name:var(--font-overpass)]";
const cell = "flex flex-col justify-center px-4 py-3 lg:px-5";
const label = `${sign} text-[0.8125rem] font-semibold text-white/75`;
const input =
  "mt-1 w-full min-w-0 rounded-md bg-transparent py-1 text-base text-white placeholder:text-white/50 focus:outline-none";

export function BookingSearch() {
  const id = useId();
  const [service, setService] = useState<Service>("Coach charter");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [passengers, setPassengers] = useState(20);
  const [submitted, setSubmitted] = useState(false);

  function chooseService(next: Service) {
    setService(next);
    setPassengers(next === "Coach charter" ? 20 : 2);
    setSubmitted(false);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Search for transport"
      className={`${styles.dark} relative rounded-[22px] bg-[#0D3B40] p-2 text-white`}
    >
      <div className={`${styles.plate} rounded-[16px] p-3 sm:p-4`}>
        <fieldset className="flex flex-wrap items-center gap-2 px-1 pb-3 sm:px-2">
          <legend className="sr-only">Service</legend>
          {services.map((option) => (
            <label
              key={option}
              className={`${sign} flex min-h-10 cursor-pointer items-center rounded-full border-2 px-4 text-[0.9375rem] font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#F2B33D] ${
                service === option
                  ? "border-[#F2B33D] bg-[#F2B33D] text-[#0D3B40]"
                  : "border-white/30 text-white hover:border-white/60"
              }`}
            >
              <input
                type="radio"
                name="service"
                value={option}
                checked={service === option}
                onChange={() => chooseService(option)}
                className="sr-only"
              />
              {option}
            </label>
          ))}
        </fieldset>

        <div className="grid overflow-hidden rounded-[12px] bg-[#0A3035] sm:grid-cols-2 lg:grid-cols-[1.15fr_1.15fr_1.5fr_0.85fr_auto]">
          <div
            className={`${cell} border-b border-white/15 sm:border-r lg:border-b-0`}
          >
            <label htmlFor={`${id}-pickup`} className={label}>
              Pick-up
            </label>
            <input
              id={`${id}-pickup`}
              type="text"
              autoComplete="off"
              placeholder="Airport, hotel or address"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className={input}
            />
          </div>

          <div
            className={`${cell} border-b border-white/15 lg:border-b-0 lg:border-r`}
          >
            <label htmlFor={`${id}-destination`} className={label}>
              Destination
            </label>
            <input
              id={`${id}-destination`}
              type="text"
              autoComplete="off"
              placeholder="Where are you headed?"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className={input}
            />
          </div>

          <fieldset
            className={`${cell} border-b border-white/15 sm:border-r lg:border-b-0`}
          >
            <legend className="sr-only">Dates</legend>
            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <label htmlFor={`${id}-start`} className={`${label} block`}>
                  Date
                </label>
                <input
                  id={`${id}-start`}
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className={`${input} [color-scheme:dark]`}
                />
              </div>
              <div className="min-w-0">
                <label htmlFor={`${id}-end`} className={`${label} block`}>
                  Return{" "}
                  <span className="font-normal text-white/55">(optional)</span>
                </label>
                <input
                  id={`${id}-end`}
                  type="date"
                  min={start || undefined}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className={`${input} [color-scheme:dark]`}
                />
              </div>
            </div>
          </fieldset>

          <div
            className={`${cell} border-b border-white/15 lg:border-b-0 lg:border-r`}
          >
            <label htmlFor={`${id}-pax`} className={label}>
              Passengers
            </label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPassengers((n) => Math.max(1, n - 1))}
                aria-label="Remove a passenger"
                aria-controls={`${id}-pax`}
                className={`${sign} flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white/30 text-lg font-bold hover:border-white/70`}
              >
                <span aria-hidden="true">&minus;</span>
              </button>
              <input
                id={`${id}-pax`}
                type="number"
                inputMode="numeric"
                min={1}
                value={passengers}
                onChange={(e) =>
                  setPassengers(Math.max(1, Number(e.target.value) || 1))
                }
                className={`${input} ${sign} mt-0 w-12 text-center text-lg font-extrabold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
              <button
                type="button"
                onClick={() => setPassengers((n) => n + 1)}
                aria-label="Add a passenger"
                aria-controls={`${id}-pax`}
                className={`${sign} flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white/30 text-lg font-bold hover:border-white/70`}
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </div>

          <div className="flex p-2 sm:col-span-2 lg:col-span-1">
            <button
              type="submit"
              className={`${sign} inline-flex min-h-14 w-full items-center justify-center gap-2.5 rounded-[10px] bg-[#F2B33D] px-7 text-[1.0625rem] font-extrabold text-[#0D3B40] hover:bg-[#F7C766]`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
                <circle
                  cx="10.5"
                  cy="10.5"
                  r="6.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                />
                <path
                  d="m15.5 15.5 5 5"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </svg>
              Search
            </button>
          </div>
        </div>

        <p
          role="status"
          className={`${sign} px-2 text-sm text-white/80 ${submitted ? "pt-3" : ""}`}
        >
          {submitted
            ? `Online booking is almost ready. For now, send these trip details to our team and we'll quote your ${service.toLowerCase()}.`
            : ""}
        </p>
        {submitted ? (
          <p className="px-2 pb-1 pt-1">
            <a
              href="#quote"
              className={`${sign} text-sm font-bold text-[#F2B33D] underline underline-offset-4`}
            >
              Request a quote instead
            </a>
          </p>
        ) : null}
      </div>
    </form>
  );
}
