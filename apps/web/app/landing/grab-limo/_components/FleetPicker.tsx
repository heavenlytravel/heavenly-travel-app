"use client";

import { useState } from "react";
import {
  FLEET,
  WHATSAPP_HREF,
  ringgit,
  type VehicleId,
} from "../../../_lib/content";
import { BagIcon, PersonIcon, Photo } from "../../_components/Brand";

const focus =
  "focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[#157a74]";

/** Short chip labels; the full vehicle name shows in the panel. */
const CHIP: Record<VehicleId, string> = {
  sedan: "Sedan",
  mpv: "MPV",
  van: "Van",
  minibus: "Minibus",
  coach: "Coach",
};

/** Pick a ride size with chips; one large card shows the chosen vehicle. */
export function FleetPicker() {
  const [id, setId] = useState<VehicleId>("mpv");
  const v = FLEET.find((f) => f.id === id) ?? FLEET[0];
  if (!v) return null;

  return (
    <div>
      <div
        role="tablist"
        aria-label="Ride size"
        className="flex flex-wrap justify-center gap-2"
      >
        {FLEET.map((f) => {
          const on = f.id === v.id;
          return (
            <button
              key={f.id}
              type="button"
              role="tab"
              id={`gl-ride-${f.id}`}
              aria-selected={on}
              aria-controls="gl-ride-panel"
              onClick={() => setId(f.id)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold ${
                on
                  ? "bg-[#0c3b3a] text-white"
                  : "bg-white text-[#3f5653] ring-1 ring-[#d5e2de] hover:ring-[#157a74]"
              } ${focus}`}
            >
              {CHIP[f.id]}
              <span
                className={`ml-2 text-xs font-medium ${on ? "text-white/70" : "text-[#7a8c89]"}`}
              >
                {f.seats} seats
              </span>
            </button>
          );
        })}
      </div>

      <div
        id="gl-ride-panel"
        role="tabpanel"
        aria-labelledby={`gl-ride-${v.id}`}
        className="mt-8 grid overflow-hidden rounded-3xl bg-white ring-1 ring-[#0c3b3a]/5 md:grid-cols-2"
      >
        <Photo
          src={v.image}
          alt={v.alt}
          className="aspect-[4/3] h-full w-full object-cover"
        />
        <div className="flex flex-col p-7 sm:p-9">
          <h3 className="font-(family-name:--font-display) text-2xl font-black tracking-tight">
            {v.name}
          </h3>
          <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-[#3f5653]">
            <span className="inline-flex items-center gap-1.5">
              <PersonIcon /> Up to {v.seats} passengers
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BagIcon /> {v.luggage}
            </span>
          </p>
          <ul className="mt-5 space-y-2 text-[15px]">
            {v.perks.map((p) => (
              <li key={p} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="grid h-5 w-5 place-items-center rounded-full bg-[#e3f3ee] text-xs font-bold text-[#157a74]"
                >
                  ✓
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-4 pt-8">
            <p>
              <span className="block text-xs text-[#5a6b68]">
                From, per day, all-in
              </span>
              <span className="font-(family-name:--font-display) text-3xl font-black text-[#0c3b3a]">
                {ringgit(v.fromPerDay)}
              </span>
            </p>
            <a
              href={WHATSAPP_HREF}
              target="_blank"
              rel="noopener noreferrer"
              className={`rounded-full bg-[#157a74] px-6 py-3 text-sm font-bold text-white hover:bg-[#0c3b3a] ${focus}`}
            >
              Book this ride
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
