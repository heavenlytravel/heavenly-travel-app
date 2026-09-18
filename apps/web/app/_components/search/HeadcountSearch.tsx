"use client";

import { ringgit, vehicleFor } from "../../_lib/content";
import { SERVICE_LABELS, useTrip, whatsappHrefFor } from "../../_lib/trip";
import { ProductIcon } from "../Brand";
import { WhatsAppIcon } from "../WhatsAppIcon";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#157a74]";
const field =
  "w-full rounded-lg border border-[#d5e2de] bg-white px-3.5 py-3 text-[15px] placeholder:text-[#8a9a97] hover:border-[#157a74] focus-visible:border-[#157a74] focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-[#157a74]/30";
const label = "mb-1.5 block text-xs font-semibold text-[#3f5653]";
const stepBtn = `grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[#c9d6d3] bg-white text-xl leading-none font-semibold text-[#0c3b3a] hover:border-[#157a74] disabled:opacity-40 ${focus}`;

const MAX = 120;

/**
 * Idea: start from the group size. The headcount picks the product and the
 * vehicle, so the guest never has to know the fleet before asking for a price.
 */
export function HeadcountSearch() {
  const { trip, set } = useTrip({ passengers: "4" });
  const pax = Math.min(MAX, Math.max(1, Number(trip.passengers) || 1));
  const setPax = (n: number) =>
    set("passengers", String(Math.min(MAX, Math.max(1, n))));

  const { vehicle, count } = vehicleFor(pax);
  const service = vehicle.kind;
  const href = whatsappHrefFor({ ...trip, service, passengers: String(pax) });

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      aria-labelledby="hc-h"
      className="rounded-2xl bg-white p-6 shadow-[0_24px_60px_-28px_rgba(12,59,58,0.45)] ring-1 ring-[#0c3b3a]/5 sm:p-7"
    >
      <h3
        id="hc-h"
        className="font-(family-name:--font-display) text-xl font-bold text-[#0c3b3a]"
      >
        How many of you are travelling?
      </h3>

      <div className="mt-5 flex items-center gap-4">
        <button
          type="button"
          aria-label="One passenger fewer"
          disabled={pax <= 1}
          onClick={() => setPax(pax - 1)}
          className={stepBtn}
        >
          &minus;
        </button>
        <div className="flex-1">
          <label htmlFor="hc-pax" className="sr-only">
            Passengers
          </label>
          <input
            id="hc-pax"
            type="range"
            min={1}
            max={MAX}
            value={pax}
            onChange={(e) => setPax(Number(e.target.value))}
            className={`w-full accent-[#157a74] ${focus}`}
          />
        </div>
        <button
          type="button"
          aria-label="One passenger more"
          disabled={pax >= MAX}
          onClick={() => setPax(pax + 1)}
          className={stepBtn}
        >
          +
        </button>
        <output
          htmlFor="hc-pax"
          className="w-16 text-right font-(family-name:--font-display) text-4xl font-black text-[#0c3b3a] tabular-nums"
        >
          {pax}
        </output>
      </div>

      <div
        aria-live="polite"
        className="mt-5 flex items-center gap-4 rounded-xl bg-[#eef7f3] p-4"
      >
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#0c3b3a] text-white">
          <ProductIcon service={service} className="h-6 w-6" />
        </span>
        <p className="text-sm text-[#3f5653]">
          <span className="block text-xs font-semibold tracking-wide text-[#157a74] uppercase">
            {SERVICE_LABELS[service]}
          </span>
          <span className="block text-base font-semibold text-[#10201f]">
            {count > 1 ? `${count} × ` : ""}
            {vehicle.name}
          </span>
          From {ringgit(vehicle.fromPerDay * count)} a day, all-in
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <div>
          <label htmlFor="hc-from" className={label}>
            Pick-up
          </label>
          <input
            id="hc-from"
            className={field}
            placeholder="Kuala Lumpur"
            value={trip.from}
            onChange={(e) => set("from", e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="hc-to" className={label}>
            Drop-off
          </label>
          <input
            id="hc-to"
            className={field}
            placeholder="Cameron Highlands"
            value={trip.to}
            onChange={(e) => set("to", e.target.value)}
            autoComplete="off"
          />
        </div>
        <div>
          <label htmlFor="hc-date" className={label}>
            Date
          </label>
          <input
            id="hc-date"
            type="date"
            className={field}
            value={trip.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
      </div>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-5 flex h-13 items-center justify-center gap-2.5 rounded-lg bg-[#e4a93c] font-(family-name:--font-display) text-base font-bold text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
      >
        <WhatsAppIcon className="h-5 w-5" />
        Price this for {pax} {pax === 1 ? "person" : "people"}
      </a>
    </form>
  );
}
