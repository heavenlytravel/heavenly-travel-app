"use client";

import { useState, type ReactNode } from "react";
import styles from "../page.module.css";
import {
  PLACES,
  VEHICLE_IDS,
  placeById,
  vehicleById,
  vehicleFor,
  type PlaceId,
  type VehicleId,
} from "../../../_lib/routes";
import { useTrip, whatsappHrefFor, type ServiceKey } from "../../../_lib/trip";
import {
  DEFAULT_JOURNEY,
  MODES,
  PLACE_NOTES,
  type Journey,
  type Mode,
} from "../_lib/chart";
import { DistanceChart } from "./DistanceChart";
import { JourneyPanel, passengerCount, type Direction } from "./JourneyPanel";
import { Segmented } from "./Segmented";

const selectClass =
  "h-10 w-full rounded-none border border-(--ink) bg-white px-2 text-[15px] text-(--ink) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--motorway)";
const labelClass =
  "mb-1 block text-[11px] font-semibold tracking-[0.14em] text-(--ink-soft) uppercase";

const MODE_UNITS: Record<Mode, string> = {
  time: "Hours and minutes, door to door",
  km: "Road kilometres between town centres",
  fare: "Ringgit, one way, one vehicle",
};

function serviceFor(journey: Journey, kind: "car" | "coach"): ServiceKey {
  if (kind === "coach") return "coach";
  return journey.from === "klia" || journey.to === "klia" ? "transfer" : "car";
}

/**
 * The first spread: intro, the chart and the journey panel, which share one
 * piece of state. `children` is the server-rendered headline block and
 * `guide` the instructions printed under the chart.
 */
export function MileageSpread({
  children,
  guide,
}: {
  children: ReactNode;
  guide: ReactNode;
}) {
  const [journey, setJourney] = useState<Journey>(DEFAULT_JOURNEY);
  const [mode, setMode] = useState<Mode>("time");
  const [chartVehicle, setChartVehicle] = useState<VehicleId>("mpv");
  const [direction, setDirection] = useState<Direction>("oneway");
  const { trip, set } = useTrip({ passengers: "4" });

  const { vehicle } = vehicleFor(passengerCount(trip.passengers));
  const whatsappHref = whatsappHrefFor({
    ...trip,
    service: serviceFor(journey, vehicle.kind),
    from: placeById(journey.from).name,
    to:
      placeById(journey.to).name +
      (direction === "return" ? ", and back again" : ""),
  });

  /** Choosing the place already at the other end swaps the two. */
  const setEnd = (end: keyof Journey, id: PlaceId) =>
    setJourney((j) => {
      const other = end === "from" ? "to" : "from";
      return j[other] === id ? { from: j.to, to: j.from } : { ...j, [end]: id };
    });

  return (
    <div className={styles.spread}>
      <div className={styles.intro}>{children}</div>

      <form
        aria-label="Choose a journey"
        onSubmit={(e) => e.preventDefault()}
        className={`${styles.pick} grid grid-cols-2 gap-3`}
      >
        {(["from", "to"] as const).map((end) => (
          <div key={end}>
            <label htmlFor={`mc-${end}`} className={labelClass}>
              {end === "from" ? "From" : "To"}
            </label>
            <select
              id={`mc-${end}`}
              className={selectClass}
              value={journey[end]}
              onChange={(e) => setEnd(end, e.target.value as PlaceId)}
            >
              {PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ))}
      </form>

      <JourneyPanel
        journey={journey}
        direction={direction}
        trip={trip}
        whatsappHref={whatsappHref}
        onReverse={() => setJourney((j) => ({ from: j.to, to: j.from }))}
        onDirection={setDirection}
        onDate={(date) => set("date", date)}
        onPassengers={(passengers) => set("passengers", passengers)}
      />

      <section
        id="chart"
        aria-labelledby="chart-title"
        className={`${styles.chartArea} scroll-mt-6`}
      >
        <h2 id="chart-title" className="sr-only">
          The chart
        </h2>
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <Segmented
            name="mc-mode"
            legend="What the chart shows"
            options={MODES}
            value={mode}
            onChange={setMode}
            className="w-full pr-px min-[700px]:w-auto"
          />
          {mode === "fare" && (
            <div className="w-full min-[700px]:w-56">
              <label htmlFor="mc-vehicle" className="sr-only">
                Vehicle for the fares shown
              </label>
              <select
                id="mc-vehicle"
                className={`${selectClass} h-[37px]!`}
                value={chartVehicle}
                onChange={(e) => setChartVehicle(e.target.value as VehicleId)}
              >
                {VEHICLE_IDS.map((id) => (
                  <option key={id} value={id}>
                    {vehicleById(id).name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <p
            className={`${styles.italic} pb-1.5 text-[13.5px] text-(--ink-soft)`}
          >
            {MODE_UNITS[mode]}.
          </p>
        </div>

        <p id="chart-help" className="sr-only">
          Each square is the journey between the place at the end of its row and
          the place at the top of its column. Move with the arrow keys and press
          Enter to choose a journey.
        </p>
        <p
          className={`${styles.italic} mt-3 text-[13px] text-(--ink-soft) min-[700px]:hidden`}
        >
          The full chart, by place code. Scroll sideways and tap a square.
        </p>

        <div className={`${styles.chartScroll} mt-3 min-[700px]:mt-5`}>
          <DistanceChart
            mode={mode}
            vehicle={chartVehicle}
            journey={journey}
            onSelect={setJourney}
          />
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 border-t border-(--rule) pt-3">
          <ul
            className={`${styles.italic} space-y-0.5 text-[13px] leading-snug text-(--ink-soft)`}
          >
            {PLACE_NOTES.map((n) => (
              <li key={n.id}>
                {n.mark} {placeById(n.id).name}. {n.note}.
              </li>
            ))}
          </ul>
          {/* routes.ts paces a drive at 0.8 min per km: 100 km is 1 h 20. */}
          <div
            role="img"
            aria-label="Scale: 100 kilometres is about 1 hour 20 on the expressway, 200 kilometres about 2 hours 40"
            className="w-56 text-[11px] font-medium tracking-[0.06em] text-(--ink-soft)"
          >
            <div className="flex justify-between">
              <span>0</span>
              <span>100 km</span>
              <span>200 km</span>
            </div>
            <div className={`${styles.scale} my-1`}>
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="flex justify-between">
              <span>0</span>
              <span>1 h 20</span>
              <span>2 h 40</span>
            </div>
          </div>
        </div>

        {guide}
      </section>
    </div>
  );
}
