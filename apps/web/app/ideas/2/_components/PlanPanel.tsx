"use client";

import styles from "../page.module.css";
import { ringgit } from "../../../_lib/content";
import { PLANS } from "../_lib/plans";
import { plural } from "../_lib/headcount";
import { eyebrow } from "../_lib/styles";
import { useHeadcount } from "./HeadcountProvider";
import { SeatPlan } from "./SeatPlan";

/** Plan units to rem, so a sedan draws smaller than a coach. */
const REM_PER_UNIT = 0.082;

const LEGEND = [
  { swatch: "bg-[#E8442A]", label: "Taken" },
  { swatch: "bg-[#F7F4EC]", label: "Spare" },
  { swatch: "bg-[#141414]", label: "Driver" },
  { swatch: "border-dashed", label: "Crew, not sold" },
  { swatch: styles.hatch ?? "", label: "Luggage" },
];

export function PlanPanel() {
  const { count, party, previousParty } = useHeadcount();
  const { vehicle, vehicles, loads, spare } = party;
  const plan = PLANS[party.vehicleId];
  const sameLayout =
    previousParty.vehicleId === party.vehicleId &&
    previousParty.vehicles === vehicles;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-baseline justify-between gap-4">
        <p className={eyebrow}>Seat plan, front on the left</p>
        <p className={`${eyebrow} tabular-nums`}>
          {count} of {vehicles * vehicle.seats}
        </p>
      </div>

      <div
        key={`${party.vehicleId}-${vehicles}`}
        className={`${styles.planSwap} flex min-h-[15rem] flex-1 flex-col items-center justify-center gap-5 py-6 lg:min-h-[19rem]`}
      >
        {loads.map((load, i) => (
          <SeatPlan
            key={i}
            vehicle={vehicle}
            occupied={load}
            staggerFrom={sameLayout ? (previousParty.loads[i] ?? 0) : 0}
            animate
            className="h-auto w-full"
            style={{ maxWidth: `${(plan.width * REM_PER_UNIT).toFixed(2)}rem` }}
          />
        ))}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-1.5">
            <span
              aria-hidden
              className={`h-3 w-3 rounded-[3px] border-[1.5px] border-[#141414] ${item.swatch}`}
            />
            {item.label}
          </li>
        ))}
      </ul>

      <div className="mt-5 border-t-2 border-[#141414] pt-4">
        <p
          className={`${styles.wide} text-2xl leading-tight font-extrabold sm:text-[1.75rem]`}
        >
          {vehicles > 1 ? party.label : vehicle.name}
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-[0.9375rem] sm:grid-cols-[auto_auto_1fr]">
          <div>
            <dt className={eyebrow}>Seats</dt>
            <dd className="mt-0.5 tabular-nums">
              {count} taken, {spare === 0 ? "none" : spare} spare
            </dd>
          </div>
          <div>
            <dt className={eyebrow}>Luggage</dt>
            <dd className="mt-0.5">
              {vehicle.luggage}
              {vehicles > 1 ? ", each" : ""}
            </dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className={eyebrow}>On board</dt>
            <dd className="mt-0.5">{vehicle.perks.join(", ")}</dd>
          </div>
        </dl>
        <p className="mt-4 flex flex-wrap items-baseline gap-x-2">
          <span className={eyebrow}>From</span>
          <span
            className={`${styles.wide} text-2xl font-extrabold tabular-nums`}
          >
            {ringgit(party.dayRate)}
          </span>
          <span className="text-sm">
            a day with driver
            {vehicles > 1 ? `, for ${plural(vehicles, "vehicle")}` : ""}
          </span>
        </p>
      </div>
    </div>
  );
}
