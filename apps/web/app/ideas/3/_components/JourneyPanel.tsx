"use client";

import styles from "../page.module.css";
import { ringgit } from "../../../_lib/content";
import {
  MAX_SEATS,
  distanceKm,
  driveMinutes,
  formatDrive,
  oneWayFare,
  placeById,
  vehicleFor,
} from "../../../_lib/routes";
import type { Trip } from "../../../_lib/trip";
import { PLACE_MARKS, type Journey } from "../_lib/chart";
import { Segmented } from "./Segmented";
import { WhatsAppIcon } from "../../../_components/WhatsAppIcon";

export type Direction = "oneway" | "return";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "oneway", label: "One way" },
  { value: "return", label: "Return" },
];

const label =
  "mb-1 block text-[11px] font-semibold tracking-[0.14em] text-(--ink-soft) uppercase";
const field =
  "h-10 w-full rounded-none border border-(--ink) bg-white px-2.5 text-[15px] text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--motorway)";

/** Whole passengers, at least one; an empty box is priced as one person. */
export function passengerCount(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 999) : 1;
}

export function JourneyPanel({
  journey,
  direction,
  trip,
  whatsappHref,
  onReverse,
  onDirection,
  onDate,
  onPassengers,
}: {
  journey: Journey;
  direction: Direction;
  trip: Trip;
  whatsappHref: string;
  onReverse: () => void;
  onDirection: (direction: Direction) => void;
  onDate: (date: string) => void;
  onPassengers: (passengers: string) => void;
}) {
  const from = placeById(journey.from);
  const to = placeById(journey.to);
  const pax = passengerCount(trip.passengers);
  const { vehicle, count } = vehicleFor(pax);
  const legs = direction === "return" ? 2 : 1;
  const each = oneWayFare(vehicle.id, from.id, to.id);
  const total = each * count * legs;
  const notes = [from, to].filter((p) => p.note);

  return (
    <section
      aria-labelledby="journey-title"
      className={`${styles.panel} border border-(--ink) bg-(--sheet)`}
    >
      <p className="flex items-baseline justify-between border-b border-(--ink) px-4 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
        <span>Your journey</span>
        <span className="text-(--a-road)">
          {from.code} / {to.code}
        </span>
      </p>

      <div className="grid min-[700px]:max-[1099px]:grid-cols-2">
        <div className="px-4 pt-4 pb-4 min-[700px]:max-[1099px]:border-r min-[700px]:max-[1099px]:border-(--rule)">
          <div key={`${from.id}-${to.id}`} className={styles.fade}>
            <h2
              id="journey-title"
              className="text-[1.6rem] leading-[1.08] font-bold tracking-[0.02em] uppercase"
            >
              {from.name}{" "}
              <span
                className={`${styles.italic} text-[1.15rem] font-normal tracking-normal text-(--ink-soft) normal-case`}
              >
                to
              </span>{" "}
              {to.name}
            </h2>
            <dl className="mt-3 grid grid-cols-2 border-y border-(--rule)">
              <div className="border-r border-(--rule) py-2 pr-3">
                <dt className={label}>Drive</dt>
                <dd className="text-xl font-semibold">
                  {formatDrive(driveMinutes(from.id, to.id))}
                </dd>
              </div>
              <div className="py-2 pl-3">
                <dt className={label}>Distance</dt>
                <dd className="text-xl font-semibold">
                  {distanceKm(from.id, to.id).toLocaleString("en-MY")} km
                </dd>
              </div>
            </dl>
            {notes.length > 0 && (
              <ul
                className={`${styles.italic} mt-2 space-y-0.5 text-[13.5px] leading-snug text-(--ink-soft)`}
              >
                {notes.map((p) => (
                  <li key={p.id}>
                    {PLACE_MARKS.get(p.id)} {p.name}. {p.note}.
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            type="button"
            onClick={onReverse}
            className="mt-3 cursor-pointer border-b border-(--motorway) text-[13px] font-semibold tracking-[0.06em] text-(--motorway) uppercase hover:border-(--ink) hover:text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-(--motorway)"
          >
            Reverse the journey
          </button>
        </div>

        <form
          aria-label="Journey details"
          onSubmit={(e) => e.preventDefault()}
          className="border-t border-(--rule) px-4 pt-4 pb-4 min-[700px]:max-[1099px]:border-t-0"
        >
          <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-3">
            <div>
              <label htmlFor="mc-pax" className={label}>
                Passengers
              </label>
              <input
                id="mc-pax"
                type="number"
                min={1}
                max={999}
                inputMode="numeric"
                className={field}
                value={trip.passengers}
                onChange={(e) => onPassengers(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="mc-date" className={label}>
                Date
              </label>
              <input
                id="mc-date"
                type="date"
                className={field}
                value={trip.date}
                onChange={(e) => onDate(e.target.value)}
              />
            </div>
          </div>
          <Segmented
            name="mc-direction"
            legend="One way or return"
            options={DIRECTIONS}
            value={direction}
            onChange={onDirection}
            className="mt-3 pr-px"
          />

          <div
            aria-live="polite"
            aria-atomic="true"
            className="mt-4 border-t border-(--ink) pt-3"
          >
            <div
              key={`${from.id}-${to.id}-${vehicle.id}-${count}-${legs}`}
              className={`${styles.fade} flex items-end justify-between gap-3`}
            >
              <p className="text-[14px] leading-snug">
                <span className={label}>Vehicle</span>
                <span className="font-semibold">
                  {count > 1 ? `${count} × ` : ""}
                  {vehicle.name}
                </span>
                {count > 1 && (
                  <span className="block text-[13px] text-(--ink-soft)">
                    Groups over {MAX_SEATS} travel in convoy.
                  </span>
                )}
              </p>
              <p className="text-right whitespace-nowrap">
                <span className={label}>
                  {direction === "return" ? "Return fare" : "One-way fare"}
                </span>
                <span className="text-[1.7rem] leading-none font-bold">
                  {ringgit(total)}
                </span>
              </p>
            </div>
          </div>

          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-12 items-center justify-center gap-2 bg-(--motorway) px-4 text-[15px] font-semibold tracking-[0.08em] text-white uppercase hover:bg-[#174c87] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--ink)"
          >
            <WhatsAppIcon />
            Send this journey on WhatsApp
          </a>
          <p
            className={`${styles.italic} mt-2.5 text-[13px] leading-snug text-(--ink-soft)`}
          >
            Fares on this sheet are indicative, per vehicle with driver. Your
            quote confirms the final price.
          </p>
        </form>
      </div>
    </section>
  );
}
