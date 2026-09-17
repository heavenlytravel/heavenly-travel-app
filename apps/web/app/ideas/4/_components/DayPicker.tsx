"use client";

import { ringgit, type Vehicle } from "../../../_lib/content";
import { MAX_SEATS } from "../../../_lib/routes";
import type { Trip } from "../../../_lib/trip";
import { WhatsAppIcon } from "../../../_components/WhatsAppIcon";
import { DAYS, type DayId, type DayTemplate } from "../_lib/days";
import {
  focusRing,
  label,
  monoFont,
  primaryButton,
  slabFont,
} from "../_lib/ui";

const fieldLabel = `${label} block text-(--muted)`;
const field = `${monoFont} mt-1.5 block h-12 w-full rounded-none border-0 border-b-2 border-(--fg) bg-transparent px-0 text-[17px] text-(--fg) placeholder:text-(--muted) ${focusRing}`;

/**
 * "Which day do you want?" Four day templates as a radio group, then the
 * three things a quote needs, the vehicle that follows from the group size,
 * and the hand-off to WhatsApp.
 */
export function DayPicker({
  day,
  onDayChange,
  trip,
  onTripChange,
  vehicle,
  vehicleCount,
  whatsappHref,
}: {
  day: DayTemplate;
  onDayChange: (id: DayId) => void;
  trip: Trip;
  onTripChange: (key: "from" | "date" | "passengers", value: string) => void;
  vehicle: Vehicle;
  vehicleCount: number;
  whatsappHref: string;
}) {
  return (
    <form
      aria-labelledby="which-day"
      onSubmit={(e) => e.preventDefault()}
      className="grid gap-x-14 gap-y-12 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
    >
      <fieldset className="min-w-0">
        <legend
          id="which-day"
          className={`${slabFont} mb-6 text-[clamp(1.6rem,3vw,2.25rem)] leading-tight font-semibold`}
        >
          Which day do you want?
        </legend>
        <div className="border-b-2 border-(--fg)">
          {DAYS.map((d, i) => {
            const selected = d.id === day.id;
            const first = d.stops[0]?.time;
            const last = d.stops[d.stops.length - 1]?.time;
            return (
              <label
                key={d.id}
                className={`relative grid cursor-pointer grid-cols-[2.25rem_1fr] gap-x-3 border-t-2 border-(--fg) px-3 py-5 has-focus-visible:outline-3 has-focus-visible:outline-offset-3 has-focus-visible:outline-(--fg) sm:grid-cols-[3.5rem_1fr_auto] sm:px-5 ${
                  selected ? "bg-(--ink) text-(--paper)" : "hover:bg-(--wash)"
                }`}
              >
                <input
                  type="radio"
                  name="day-template"
                  value={d.id}
                  checked={selected}
                  onChange={() => onDayChange(d.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden
                  className={`${monoFont} flex items-center gap-2 pt-1.5 text-[14px]`}
                >
                  <span
                    className={`h-2.5 w-2.5 ${selected ? "bg-(--signal)" : "border border-current"}`}
                  />
                  <span className="hidden sm:inline">{i + 1}</span>
                </span>
                <span className="min-w-0">
                  <span
                    className={`${slabFont} block text-[clamp(1.35rem,2.6vw,2rem)] leading-[1.12] font-semibold tracking-[-0.01em]`}
                  >
                    {d.title}
                  </span>
                  <span
                    className={`mt-1.5 block max-w-[58ch] text-[15px] leading-snug ${selected ? "text-[#d5d7de]" : "text-(--muted)"}`}
                  >
                    {d.summary}
                  </span>
                </span>
                <span
                  className={`${monoFont} col-start-2 mt-3 text-[13px] leading-relaxed sm:col-start-3 sm:mt-1.5 sm:text-right ${selected ? "text-[#d5d7de]" : "text-(--muted)"}`}
                >
                  <span className="block">{`${first} to ${last}`}</span>
                  <span className="block">{d.vehicleHint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="min-w-0">
        <h2
          className={`${slabFont} mb-6 text-[clamp(1.6rem,3vw,2.25rem)] leading-tight font-semibold`}
        >
          Who, when, from where.
        </h2>
        <div className="grid grid-cols-2 gap-x-6 gap-y-6 border-t-2 border-(--fg) pt-5">
          <div>
            <label htmlFor="d4-pax" className={fieldLabel}>
              Passengers
            </label>
            <input
              id="d4-pax"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_SEATS * 4}
              className={field}
              value={trip.passengers}
              onChange={(e) => onTripChange("passengers", e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="d4-date" className={fieldLabel}>
              Date
            </label>
            <input
              id="d4-date"
              type="date"
              className={field}
              value={trip.date}
              onChange={(e) => onTripChange("date", e.target.value)}
            />
          </div>
          <div className="col-span-2">
            <label htmlFor="d4-from" className={fieldLabel}>
              Pick-up place
            </label>
            <input
              id="d4-from"
              type="text"
              autoComplete="off"
              className={`${field} font-(family-name:--font-text)`}
              placeholder={day.from}
              value={trip.from}
              onChange={(e) => onTripChange("from", e.target.value)}
            />
          </div>
        </div>

        <p aria-live="polite" className="mt-7 border-t border-(--line) pt-5">
          <span className={fieldLabel}>Your vehicle</span>
          <span
            className={`${slabFont} mt-1.5 block text-[22px] leading-tight font-semibold`}
          >
            {vehicleCount > 1 ? `${vehicleCount} × ` : ""}
            {vehicle.name}
          </span>
          <span className={`${monoFont} mt-1 block text-[15px]`}>
            {`from ${ringgit(vehicle.fromPerDay * vehicleCount)} a day`}
            {vehicleCount > 1 ? `, ${vehicleCount} vehicles in convoy` : ""}
          </span>
        </p>

        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className={`${primaryButton} mt-6 w-full`}
        >
          <WhatsAppIcon />
          Book this day on WhatsApp
        </a>
        <p className="mt-4 max-w-[52ch] text-[14px] leading-normal text-(--muted)">
          Prices are indicative. The message opens pre-written with this day,
          and a quote from us confirms the price before anything is held.
        </p>
      </div>
    </form>
  );
}
