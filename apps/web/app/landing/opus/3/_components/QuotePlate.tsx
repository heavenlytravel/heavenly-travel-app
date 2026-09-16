"use client";

import { useId, useState } from "react";
import styles from "../landing.module.css";

const VEHICLES = ["Coach charter", "Car with driver", "Not sure yet"] as const;

/* Placeholder until the real number is wired up. */
const WHATSAPP_NUMBER = "60XXXXXXXXX";

const fieldLabel = "block text-sm font-bold text-white";
const fieldInput =
  "mt-1.5 block w-full rounded-lg border-2 border-white/25 bg-[#0A3035] px-3.5 py-3 text-base text-white placeholder:text-white/55 focus:border-[#F2B33D] focus:outline-none";

export function QuotePlate() {
  const id = useId();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [people, setPeople] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicle, setVehicle] =
    useState<(typeof VEHICLES)[number]>("Not sure yet");

  const message = [
    "Hi Heavenly Travel, I would like a quote.",
    `Pick-up: ${from || "-"}`,
    `Drop-off: ${to || "-"}`,
    `Date: ${date || "-"}`,
    `Passengers: ${people || "-"}`,
    `Vehicle: ${vehicle}`,
    notes ? `Notes: ${notes}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const waHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <div className="grid gap-8 font-[family-name:var(--font-overpass)] lg:grid-cols-[1.15fr_1fr] lg:gap-12">
      <form
        className={`${styles.plate} ${styles.plateShadow}`}
        onSubmit={(e) => e.preventDefault()}
        aria-labelledby="quote-title"
        aria-describedby={`${id}-note`}
      >
        <div
          className={`${styles.plateInner} grid gap-5 p-5 sm:grid-cols-2 sm:p-7`}
        >
          <label className={fieldLabel} htmlFor={`${id}-from`}>
            Pick-up point
            <input
              id={`${id}-from`}
              className={fieldInput}
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="e.g. Langkawi International Airport"
              autoComplete="off"
            />
          </label>
          <label className={fieldLabel} htmlFor={`${id}-to`}>
            Drop-off point
            <input
              id={`${id}-to`}
              className={fieldInput}
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="e.g. a hotel in Penang"
              autoComplete="off"
            />
          </label>
          <label className={fieldLabel} htmlFor={`${id}-date`}>
            Travel date
            <input
              id={`${id}-date`}
              type="date"
              className={`${fieldInput} [color-scheme:dark]`}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className={fieldLabel} htmlFor={`${id}-people`}>
            Number of passengers
            <input
              id={`${id}-people`}
              type="number"
              min={1}
              inputMode="numeric"
              className={fieldInput}
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              placeholder="e.g. 24"
            />
          </label>

          <fieldset className="sm:col-span-2">
            <legend className={fieldLabel}>What do you need?</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {VEHICLES.map((v) => (
                <label
                  key={v}
                  className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm font-bold has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#F2B33D] ${
                    vehicle === v
                      ? "border-[#F2B33D] bg-[#F2B33D] text-[#0D3B40]"
                      : "border-white/30 text-white hover:border-white"
                  }`}
                >
                  <input
                    type="radio"
                    name={`${id}-vehicle`}
                    value={v}
                    checked={vehicle === v}
                    onChange={() => setVehicle(v)}
                    className="sr-only"
                  />
                  {v}
                </label>
              ))}
            </div>
          </fieldset>

          <label
            className={`${fieldLabel} sm:col-span-2`}
            htmlFor={`${id}-notes`}
          >
            Anything else we should know
            <textarea
              id={`${id}-notes`}
              rows={3}
              className={fieldInput}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Luggage, return trip, stops along the way"
            />
          </label>
        </div>
      </form>

      <div aria-live="polite">
        <div className={`${styles.plate} ${styles.plateGreen}`}>
          <div className={`${styles.plateInner} px-5 py-5`}>
            <p className="text-sm font-semibold text-white/85">Your route</p>
            <p className="mt-1 text-2xl leading-tight font-extrabold break-words text-white sm:text-3xl">
              {from || "Pick-up"}
            </p>
            <div className="my-2" aria-hidden="true">
              <svg width="22" height="30" viewBox="0 0 22 30" fill="none">
                <path
                  d="M11 2v24M3 18l8 8 8-8"
                  stroke="#F2B33D"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-2xl leading-tight font-extrabold break-words text-white sm:text-3xl">
              {to || "Drop-off"}
            </p>
            <p className="mt-4 text-sm text-white/85">
              {[date, people && `${people} passengers`, vehicle]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <details className="mt-4 rounded-[14px] bg-[#0A3035] px-4 py-3 text-sm text-white">
          <summary className="cursor-pointer font-bold">
            Preview the WhatsApp message
          </summary>
          <pre className="mt-3 font-[inherit] whitespace-pre-wrap text-white/85">
            {message}
          </pre>
        </details>

        <a
          href={waHref}
          className={`${styles.cta} mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#F2B33D] px-6 py-4 text-lg font-extrabold text-[#0D3B40] hover:bg-[#F7C766]`}
        >
          <WhatsAppGlyph />
          Send this on WhatsApp
        </a>
        <p id={`${id}-note`} className="mt-3 text-sm text-white/75">
          We reply with the vehicle, the route and the price. WhatsApp: +60
          X-XXX XXXX
        </p>
      </div>
    </div>
  );
}

export function WhatsAppGlyph({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width="22"
      height="22"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2.2A9.7 9.7 0 0 0 3.6 16.8L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8.9c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.2-.2-.2-.5-.4Z" />
    </svg>
  );
}
