"use client";

import { useId, useState } from "react";
import styles from "../landing.module.css";

const SERVICES = ["Coach charter", "Car with driver"] as const;

const plate =
  "mt-1.5 block w-full min-w-0 rounded-lg border-2 border-transparent bg-white px-3 py-2.5 text-base font-semibold text-[#263033] placeholder:font-normal placeholder:text-[#263033]/55 focus:border-[#FFC72C] focus:outline-none";

const labelText = "block text-sm font-bold text-white";

export function SearchBar() {
  const id = useId();
  const [service, setService] =
    useState<(typeof SERVICES)[number]>("Coach charter");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [people, setPeople] = useState("2");
  const [status, setStatus] = useState("");

  return (
    <form
      role="search"
      aria-label="Find a ride"
      onSubmit={(e) => {
        e.preventDefault();
        setStatus(
          `Online booking is coming soon. For now, send your ${service.toLowerCase()} request${
            to ? ` to ${to}` : ""
          } on WhatsApp and we'll reply with a quote.`,
        );
      }}
      className={`${styles.sign} ${styles.onDark}`}
    >
      <div className={`${styles.signInner} px-4 pt-4 pb-5 sm:px-6`}>
        <fieldset className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <legend className="sr-only">Service</legend>
          {SERVICES.map((s) => (
            <label
              key={s}
              className={`cursor-pointer rounded-full border-2 px-4 py-1.5 text-[15px] font-extrabold has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#FFC72C] ${
                service === s
                  ? "border-[#FFC72C] bg-[#FFC72C] text-[#263033]"
                  : "border-white/60 text-white hover:border-white"
              }`}
            >
              <input
                type="radio"
                name={`${id}-service`}
                value={s}
                checked={service === s}
                onChange={() => setService(s)}
                className="sr-only"
              />
              {s}
            </label>
          ))}
        </fieldset>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.35fr_0.55fr_auto] lg:items-end">
          <label className={labelText} htmlFor={`${id}-from`}>
            Pick-up
            <input
              id={`${id}-from`}
              className={plate}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="Hotel, airport or jetty"
              autoComplete="off"
            />
          </label>
          <label className={labelText} htmlFor={`${id}-to`}>
            Destination
            <input
              id={`${id}-to`}
              className={plate}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Anywhere in Malaysia"
              autoComplete="off"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:col-span-2 lg:col-span-1">
            <label className={labelText} htmlFor={`${id}-start`}>
              Start date
              <input
                id={`${id}-start`}
                type="date"
                className={plate}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className={labelText} htmlFor={`${id}-end`}>
              Return date
              <input
                id={`${id}-end`}
                type="date"
                className={plate}
                value={end}
                min={start || undefined}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
          </div>
          <label className={labelText} htmlFor={`${id}-people`}>
            Passengers
            <input
              id={`${id}-people`}
              type="number"
              min={1}
              inputMode="numeric"
              className={plate}
              value={people}
              onChange={(e) => setPeople(e.target.value)}
            />
          </label>
          <button
            type="submit"
            className={`${styles.cta} inline-flex h-[50px] items-center justify-center gap-2 rounded-lg bg-[#FFC72C] px-6 text-lg font-extrabold text-[#263033] hover:bg-[#ffd452]`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
            >
              <circle
                cx="10.5"
                cy="10.5"
                r="6.5"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                d="m15.5 15.5 5 5"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            Search
          </button>
        </div>

        <p aria-live="polite" className="text-[15px] text-white">
          {status && (
            <span className="mt-4 block">
              {status}{" "}
              <a href="#quote" className="font-bold underline">
                Go to the quote form
              </a>
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
