"use client";

import { useId, useState, type FormEvent } from "react";
import styles from "../landing.module.css";

const SERVICES = ["Coach charter", "Car with driver"] as const;
type Service = (typeof SERVICES)[number];

/* opus/1's plate shell and passenger stepper, opus/2's white sign-plate fields. */
const labelText = "block text-sm font-bold text-white";
const field =
  "mt-1.5 block w-full min-w-0 rounded-lg border-2 border-transparent bg-white px-3 py-2.5 text-base font-semibold text-[#14272A] placeholder:font-normal placeholder:text-[#14272A]/55 focus:border-[#F2B33D] focus:outline-none";

export function SearchPlate() {
  const id = useId();
  const [service, setService] = useState<Service>("Coach charter");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [passengers, setPassengers] = useState(20);
  const [status, setStatus] = useState("");

  function chooseService(next: Service) {
    setService(next);
    setPassengers(next === "Coach charter" ? 20 : 2);
    setStatus("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(
      `Online booking is almost ready. For now, send your ${service.toLowerCase()} request${
        to ? ` to ${to}` : ""
      } to our team and we will reply with a price for the whole trip.`,
    );
  }

  return (
    <form
      role="search"
      aria-label="Find a coach or a car with driver"
      onSubmit={onSubmit}
      className={`${styles.plate} ${styles.dark} ${styles.plateShadow} font-[family-name:var(--font-overpass)] text-white`}
    >
      <div className={`${styles.plateInner} px-4 pt-4 pb-5 sm:px-6`}>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="sr-only">Service</legend>
            {SERVICES.map((option) => (
              <label
                key={option}
                className={`flex min-h-10 cursor-pointer items-center rounded-full border-2 px-4 text-[0.9375rem] font-extrabold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#F2B33D] ${
                  service === option
                    ? "border-[#F2B33D] bg-[#F2B33D] text-[#0D3B40]"
                    : "border-white/35 text-white hover:border-white"
                }`}
              >
                <input
                  type="radio"
                  name={`${id}-service`}
                  value={option}
                  checked={service === option}
                  onChange={() => chooseService(option)}
                  className="sr-only"
                />
                {option}
              </label>
            ))}
          </fieldset>
          <p className="text-[0.8125rem] font-semibold text-white/75">
            Pick-up and drop-off anywhere in Malaysia
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.35fr_0.7fr_auto] lg:items-end">
          <label className={labelText} htmlFor={`${id}-from`}>
            Pick-up
            <input
              id={`${id}-from`}
              className={field}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Airport, jetty or hotel"
              autoComplete="off"
            />
          </label>

          <label className={labelText} htmlFor={`${id}-to`}>
            Destination
            <input
              id={`${id}-to`}
              className={field}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Where are you headed?"
              autoComplete="off"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:col-span-2 lg:col-span-1">
            <label className={labelText} htmlFor={`${id}-start`}>
              Travel date
              <input
                id={`${id}-start`}
                type="date"
                className={field}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className={labelText} htmlFor={`${id}-end`}>
              Return{" "}
              <span className="font-semibold text-white/70">(optional)</span>
              <input
                id={`${id}-end`}
                type="date"
                className={field}
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>

          <div>
            <label className={labelText} htmlFor={`${id}-pax`}>
              Passengers
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPassengers((n) => Math.max(1, n - 1))}
                aria-label="Remove a passenger"
                aria-controls={`${id}-pax`}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-lg font-bold hover:border-white"
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
                className={`${field} mt-0 w-14 px-1 text-center text-lg font-extrabold [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none`}
              />
              <button
                type="button"
                onClick={() => setPassengers((n) => n + 1)}
                aria-label="Add a passenger"
                aria-controls={`${id}-pax`}
                className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-lg font-bold hover:border-white"
              >
                <span aria-hidden="true">+</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`${styles.cta} inline-flex h-[50px] items-center justify-center gap-2 rounded-full bg-[#F2B33D] px-7 text-[1.0625rem] font-extrabold text-[#0D3B40] hover:bg-[#F7C766]`}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5">
              <circle
                cx="10.5"
                cy="10.5"
                r="6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.8"
              />
              <path
                d="m15.5 15.5 5 5"
                stroke="currentColor"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </svg>
            Search
          </button>
        </div>

        <p aria-live="polite" className="text-[0.9375rem] text-white">
          {status ? (
            <span className="mt-4 block">
              {status}{" "}
              <a
                href="#quote"
                className="font-bold text-[#F2B33D] underline underline-offset-4"
              >
                Request a quote
              </a>
            </span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
