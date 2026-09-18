"use client";

import {
  MAIN_SERVICES,
  SERVICE_LABELS,
  mainServiceOf,
  useTrip,
} from "../../_lib/trip";
import { ProductIcon } from "../Brand";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#157a74]";
const tiny =
  "block text-[11px] font-semibold tracking-[0.16em] text-[#7a6a45] uppercase";
const place =
  "mt-1 w-full border-0 bg-transparent p-0 font-(family-name:--font-display) text-2xl font-black tracking-tight text-[#0c3b3a] placeholder:text-[#0c3b3a]/30 focus-visible:outline-none sm:text-3xl";
const stubField =
  "mt-1 w-full border-0 border-b border-[#0c3b3a]/20 bg-transparent px-0 py-1.5 text-[15px] font-semibold text-[#0c3b3a] hover:border-[#0c3b3a]/60 focus-visible:border-[#157a74] focus-visible:outline-none";

/**
 * Idea: the request as a ticket. The route is the headline, a swap button
 * turns it round for the return leg, and the tear-off stub holds the date, the
 * group size and the send button.
 */
export function TicketSearch() {
  const { trip, set, whatsappHref } = useTrip();
  const product = mainServiceOf(trip.service);

  function swap() {
    set("from", trip.to);
    set("to", trip.from);
  }

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      aria-label="Trip request"
      className="grid overflow-hidden rounded-2xl bg-[#fbf6ea] shadow-[0_24px_60px_-28px_rgba(0,0,0,0.6)] md:grid-cols-[1fr_17rem]"
    >
      {/* Main part: product and route */}
      <div className="p-6 sm:p-8">
        <fieldset>
          <legend className="sr-only">Product</legend>
          <div className="inline-flex rounded-full bg-[#0c3b3a]/8 p-1">
            {MAIN_SERVICES.map((s) => {
              const on = product === s;
              return (
                <label
                  key={s}
                  className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-[#157a74] ${
                    on
                      ? "bg-[#0c3b3a] text-white"
                      : "text-[#3f5653] hover:text-[#0c3b3a]"
                  }`}
                >
                  <input
                    type="radio"
                    name="tk-product"
                    value={s}
                    checked={on}
                    onChange={() => set("service", s)}
                    className="sr-only"
                  />
                  <ProductIcon service={s} className="h-4 w-4" />
                  {SERVICE_LABELS[s]}
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7 grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <div className="border-b-2 border-[#0c3b3a] pb-2">
            <label htmlFor="tk-from" className={tiny}>
              From
            </label>
            <input
              id="tk-from"
              className={place}
              placeholder="Kuala Lumpur"
              value={trip.from}
              onChange={(e) => set("from", e.target.value)}
              autoComplete="off"
            />
          </div>
          <button
            type="button"
            onClick={swap}
            aria-label="Swap pick-up and drop-off"
            className={`grid h-11 w-11 place-items-center justify-self-center rounded-full bg-[#e4a93c] text-[#10201f] hover:bg-[#f0b94d] ${focus}`}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5 rotate-90 sm:rotate-0"
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 8h15m0 0l-4-4m4 4l-4 4M20 16H5m0 0l4-4m-4 4l4 4" />
            </svg>
          </button>
          <div className="border-b-2 border-[#0c3b3a] pb-2">
            <label htmlFor="tk-to" className={tiny}>
              To
            </label>
            <input
              id="tk-to"
              className={place}
              placeholder="Penang"
              value={trip.to}
              onChange={(e) => set("to", e.target.value)}
              autoComplete="off"
            />
          </div>
        </div>
        <p className="mt-5 text-sm text-[#5a6b68]">
          One fixed price for the whole trip: tolls, fuel, parking and driver.
        </p>
      </div>

      {/* Stub, behind a perforation */}
      <div className="relative border-t-2 border-dashed border-[#0c3b3a]/25 bg-[#f5ecd6] p-6 sm:p-7 md:border-t-0 md:border-l-2">
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          <div className="col-span-2">
            <label htmlFor="tk-date" className={tiny}>
              Date
            </label>
            <input
              id="tk-date"
              type="date"
              className={stubField}
              value={trip.date}
              onChange={(e) => set("date", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="tk-time" className={tiny}>
              Time
            </label>
            <input
              id="tk-time"
              type="time"
              className={stubField}
              value={trip.time}
              onChange={(e) => set("time", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="tk-pax" className={tiny}>
              Passengers
            </label>
            <input
              id="tk-pax"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="2"
              className={stubField}
              value={trip.passengers}
              onChange={(e) => set("passengers", e.target.value)}
            />
          </div>
        </div>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-6 flex h-12 items-center justify-center rounded-lg bg-[#0c3b3a] font-(family-name:--font-display) font-bold text-white hover:bg-[#157a74] ${focus}`}
        >
          Get my price
        </a>
      </div>
    </form>
  );
}
