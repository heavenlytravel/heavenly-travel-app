"use client";

import {
  MAIN_SERVICES,
  MAIN_SERVICE_NOTES,
  SERVICE_LABELS,
  mainServiceOf,
  type MainService,
} from "../../_lib/trip";
import { useTrip } from "../../_lib/useTrip";
import { ProductIcon } from "../Brand";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#e4a93c]";
const field =
  "w-full rounded-md border border-[#c9d6d3] bg-white px-3 py-3 text-[15px] placeholder:text-[#8a9a97] hover:border-[#157a74] focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-[#157a74]";
const label = "mb-1 block text-xs font-semibold text-[#3f5653]";

const placeholders: Record<MainService, { from: string; to: string }> = {
  car: { from: "Kuala Lumpur", to: "Cameron Highlands" },
  coach: { from: "Johor Bahru", to: "Kuala Lumpur" },
};

/** The two products as tabs, fields in a white card. */
export function TabbedSearch() {
  const { trip, set, whatsappHref } = useTrip();
  const product = mainServiceOf(trip.service);
  const ph = placeholders[product];

  return (
    <div className="rounded-xl bg-white p-2 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.55)]">
      <div
        role="tablist"
        aria-label="Product"
        className="grid gap-1 px-1 pt-1 sm:grid-cols-2 md:flex"
      >
        {MAIN_SERVICES.map((t) => {
          const on = product === t;
          return (
            <button
              key={t}
              role="tab"
              type="button"
              aria-selected={on}
              id={`tab-${t}`}
              aria-controls="search-panel"
              onClick={() => set("service", t)}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-left ${
                on
                  ? "bg-[#e8f2ef] text-[#0c3b3a]"
                  : "text-[#3f5653] hover:bg-[#f1f5f4]"
              } ${focus}`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                  on ? "bg-[#0c3b3a] text-white" : "bg-[#eef3f1]"
                }`}
              >
                <ProductIcon service={t} />
              </span>
              <span>
                <span className="block text-[15px] font-bold">
                  {SERVICE_LABELS[t]}
                </span>
                <span className="block text-xs text-[#5a6b68]">
                  {MAIN_SERVICE_NOTES[t]}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <form
        id="search-panel"
        role="tabpanel"
        aria-labelledby={`tab-${product}`}
        onSubmit={(e) => e.preventDefault()}
        className="grid gap-3 p-3 md:grid-cols-[1.2fr_1.2fr_0.9fr_0.7fr_auto] md:items-end"
      >
        <div>
          <label htmlFor="ag-from" className={label}>
            Pick-up
          </label>
          <input
            id="ag-from"
            className={field}
            placeholder={ph.from}
            value={trip.from}
            onChange={(e) => set("from", e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="ag-to" className={label}>
            Drop-off
          </label>
          <input
            id="ag-to"
            className={field}
            placeholder={ph.to}
            value={trip.to}
            onChange={(e) => set("to", e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="ag-date" className={label}>
            Date
          </label>
          <input
            id="ag-date"
            type="date"
            className={field}
            value={trip.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="ag-pax" className={label}>
            Passengers
          </label>
          <input
            id="ag-pax"
            type="number"
            min={1}
            inputMode="numeric"
            className={field}
            placeholder="2"
            value={trip.passengers}
            onChange={(e) => set("passengers", e.target.value)}
          />
        </div>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex h-[50px] items-center justify-center rounded-md bg-[#e4a93c] px-8 font-(family-name:--font-display) text-base font-bold text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
        >
          Search
        </a>
      </form>
    </div>
  );
}
