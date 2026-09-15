"use client";

import { useState, type FormEvent } from "react";
import styles from "../landing.module.css";

// Placeholder: replace with Heavenly Travel's real WhatsApp business number (digits only, country code first).
const WHATSAPP_NUMBER = "60XXXXXXXXX";

type Request = {
  service: string;
  pickup: string;
  destination: string;
  date: string;
  passengers: string;
  name: string;
};

function toMessage(r: Request) {
  return [
    `Hello Heavenly Travel, I'd like a quote.`,
    `Service: ${r.service}`,
    `Pickup: ${r.pickup}`,
    `Destination: ${r.destination}`,
    `Date: ${r.date}`,
    `Passengers: ${r.passengers}`,
    `Name: ${r.name}`,
  ].join("\n");
}

export function QuoteForm() {
  const [request, setRequest] = useState<Request | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setRequest({
      service: String(data.get("service") ?? ""),
      pickup: String(data.get("pickup") ?? ""),
      destination: String(data.get("destination") ?? ""),
      date: String(data.get("date") ?? ""),
      passengers: String(data.get("passengers") ?? ""),
      name: String(data.get("name") ?? ""),
    });
  }

  if (request) {
    const href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(toMessage(request))}`;
    return (
      <div
        role="status"
        className="rounded-md border border-white/25 bg-white/[0.06] p-6 sm:p-8"
      >
        <h3 className={`${styles.semi} text-2xl font-semibold text-white`}>
          Your request is ready to send
        </h3>
        <p className="mt-3 max-w-prose text-white/80">
          Send it to our coordinators on WhatsApp and we&apos;ll reply with a
          written quote for your trip.
        </p>
        <dl className="mt-6 grid gap-x-8 gap-y-3 text-[0.95rem] sm:grid-cols-2">
          {(
            [
              ["Service", request.service],
              ["Date", request.date],
              ["Pickup", request.pickup],
              ["Destination", request.destination],
              ["Passengers", request.passengers],
              ["Name", request.name],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="border-t border-white/15 pt-2">
              <dt className="text-white/60">{label}</dt>
              <dd className="text-white">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-[3px] bg-[#c49a3c] px-6 py-3.5 font-semibold text-[#0a2a22] hover:bg-[#d4ab50]"
          >
            Send on WhatsApp
          </a>
          <button
            type="button"
            onClick={() => setRequest(null)}
            className="inline-flex items-center rounded-[3px] border border-white/40 px-6 py-3.5 font-semibold text-white hover:bg-white/10"
          >
            Edit details
          </button>
        </div>
      </div>
    );
  }

  const label = "block text-sm font-medium text-white/85 mb-1.5";

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="q-service" className={label}>
          What do you need?
        </label>
        <select
          id="q-service"
          name="service"
          required
          defaultValue=""
          className={styles.field}
        >
          <option value="" disabled>
            Choose a service
          </option>
          <option>Coach charter</option>
          <option>Car with driver</option>
          <option>Airport or jetty transfer</option>
          <option>Not sure yet — advise me</option>
        </select>
      </div>
      <div>
        <label htmlFor="q-pickup" className={label}>
          Pickup point
        </label>
        <input
          id="q-pickup"
          name="pickup"
          required
          placeholder="e.g. Langkawi International Airport"
          className={styles.field}
        />
      </div>
      <div>
        <label htmlFor="q-destination" className={label}>
          Destination
        </label>
        <input
          id="q-destination"
          name="destination"
          required
          placeholder="e.g. Hotel in Pantai Cenang"
          className={styles.field}
        />
      </div>
      <div>
        <label htmlFor="q-date" className={label}>
          Travel date
        </label>
        <input
          id="q-date"
          name="date"
          type="date"
          required
          className={`${styles.field} [color-scheme:dark]`}
        />
      </div>
      <div>
        <label htmlFor="q-passengers" className={label}>
          Number of passengers
        </label>
        <input
          id="q-passengers"
          name="passengers"
          type="number"
          min={1}
          inputMode="numeric"
          required
          placeholder="e.g. 24"
          className={styles.field}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="q-name" className={label}>
          Your name or organisation
        </label>
        <input
          id="q-name"
          name="name"
          required
          autoComplete="name"
          className={styles.field}
        />
      </div>
      <div className="sm:col-span-2 flex flex-wrap items-center gap-x-6 gap-y-3 pt-1">
        <button
          type="submit"
          className="inline-flex items-center rounded-[3px] bg-[#c49a3c] px-6 py-3.5 font-semibold text-[#0a2a22] hover:bg-[#d4ab50]"
        >
          Prepare my quote request
        </button>
        <p className="text-sm text-white/65">
          Nothing is booked until you confirm a written quote.
        </p>
      </div>
    </form>
  );
}
