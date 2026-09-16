"use client";

import { useState } from "react";

/* Placeholder number — replace with the real WhatsApp business line. */
const WHATSAPP_NUMBER = "60XXXXXXXXX";

const vehicles = [
  "Not sure yet, please advise",
  "Car with driver (up to 4 passengers)",
  "Minivan",
  "Mini coach",
  "Full-size coach",
];

const inputClass =
  "w-full rounded-md border border-[#9fb0c0] bg-white px-3.5 py-3 text-base text-[#0c2340] placeholder:text-[#7a8794] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#f5b800]";

const labelClass = "mb-1.5 block text-sm font-medium text-[#dbe5ee]";

export function QuoteForm() {
  const [form, setForm] = useState({
    from: "",
    to: "",
    date: "",
    passengers: "",
    vehicle: vehicles[0],
    name: "",
  });

  const update =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const message = [
    `Hi Heavenly Travel, I'd like a quote.`,
    form.from && `Pick-up: ${form.from}`,
    form.to && `Drop-off: ${form.to}`,
    form.date && `Date: ${form.date}`,
    form.passengers && `Passengers: ${form.passengers}`,
    `Vehicle: ${form.vehicle}`,
    form.name && `Name: ${form.name}`,
  ]
    .filter(Boolean)
    .join("\n");

  const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        window.open(href, "_blank", "noopener,noreferrer");
      }}
    >
      <div>
        <label htmlFor="q-from" className={labelClass}>
          Pick-up
        </label>
        <input
          id="q-from"
          className={inputClass}
          placeholder="Penang airport"
          value={form.from}
          onChange={update("from")}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="q-to" className={labelClass}>
          Drop-off
        </label>
        <input
          id="q-to"
          className={inputClass}
          placeholder="Cameron Highlands"
          value={form.to}
          onChange={update("to")}
          autoComplete="off"
        />
      </div>
      <div>
        <label htmlFor="q-date" className={labelClass}>
          Date
        </label>
        <input
          id="q-date"
          type="date"
          className={inputClass}
          value={form.date}
          onChange={update("date")}
        />
      </div>
      <div>
        <label htmlFor="q-pax" className={labelClass}>
          Passengers
        </label>
        <input
          id="q-pax"
          type="number"
          min={1}
          inputMode="numeric"
          className={inputClass}
          placeholder="12"
          value={form.passengers}
          onChange={update("passengers")}
        />
      </div>
      <div>
        <label htmlFor="q-vehicle" className={labelClass}>
          Vehicle
        </label>
        <select
          id="q-vehicle"
          className={inputClass}
          value={form.vehicle}
          onChange={update("vehicle")}
        >
          {vehicles.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="q-name" className={labelClass}>
          Your name
        </label>
        <input
          id="q-name"
          className={inputClass}
          placeholder="Aisyah"
          value={form.name}
          onChange={update("name")}
          autoComplete="name"
        />
      </div>

      <div className="sm:col-span-2 flex flex-col gap-3 pt-2 sm:flex-row sm:items-center">
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f5b800] px-6 py-3.5 text-base font-semibold text-[#0c2340] hover:bg-[#ffc933] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <WhatsAppIcon />
          Send this request on WhatsApp
        </button>
        <p className="text-sm text-[#b9c8d6]">
          Opens WhatsApp with your details filled in. Nothing is stored on this
          site.
        </p>
      </div>
    </form>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="currentColor"
    >
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
    </svg>
  );
}
