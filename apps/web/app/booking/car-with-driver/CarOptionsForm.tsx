"use client";

import { useState } from "react";
import { formatMyr } from "@repo/db";
import {
  CAR_CONFIRM_PATH,
  CAR_OPTION_FIELDS,
  MAX_CHILD_SEATS,
  MAX_FLIGHT_NUMBER_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_PASSENGERS,
} from "../../_lib/car-booking";
import { control, focus, primaryButton } from "../_components/Page";

/** One vehicle class as priced for this trip. Plain data, sent to the browser. */
export type ClassOption = {
  id: string;
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  totalSen: number;
};

/**
 * Vehicle class, passengers, child seats, flight number and notes. A plain
 * GET form: the choices join the search in the confirm page's URL, so the
 * confirm step is shareable and survives the sign-in redirect. Classes the
 * passenger count does not fit are shown but cannot be chosen.
 */
export function CarOptionsForm({
  classes,
  initialPassengers,
  hiddenFields,
}: {
  classes: ClassOption[];
  initialPassengers: number;
  /** The search, carried on unchanged. */
  hiddenFields: [name: string, value: string][];
}) {
  const [passengers, setPassengers] = useState(initialPassengers);
  const [chosen, setChosen] = useState<string | null>(null);
  const fits = (c: ClassOption) =>
    passengers >= c.minPassengers && passengers <= c.maxPassengers;
  const selected = chosen && classes.find((c) => c.id === chosen);
  const canContinue = Boolean(selected && fits(selected));

  return (
    <form
      method="get"
      action={CAR_CONFIRM_PATH}
      className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start"
    >
      {hiddenFields.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}

      <fieldset className="grid gap-3">
        <legend className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
          Choose your vehicle
        </legend>
        {classes.map((c) => {
          const ok = fits(c);
          const on = chosen === c.id && ok;
          return (
            <label
              key={c.id}
              className={`flex cursor-pointer items-start gap-4 rounded-[16px] border-2 bg-white p-5 transition-colors has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 ${
                on
                  ? "border-[#073c36] bg-[#e8f2ef]"
                  : "border-[#dce3e0] hover:border-[#073c36]/50"
              }`}
            >
              <input
                type="radio"
                name={CAR_OPTION_FIELDS.vehicleClass}
                value={c.id}
                checked={on}
                disabled={!ok}
                required
                onChange={() => setChosen(c.id)}
                className={`mt-1.5 h-[18px] w-[18px] shrink-0 accent-[#073c36] ${focus}`}
              />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-baseline justify-between gap-x-4">
                  <span className="text-[1.1rem] font-bold text-[#082f2b]">
                    {c.name}
                  </span>
                  <span className="text-[1.15rem] font-bold text-[#073c36]">
                    {formatMyr(c.totalSen)}
                  </span>
                </span>
                <span className="text-[0.95rem] text-[#324844]">
                  {c.description}
                </span>
                <span className="text-[0.85rem] text-[#67726f]">
                  {c.minPassengers === 1
                    ? `Up to ${c.maxPassengers} passengers`
                    : `${c.minPassengers} to ${c.maxPassengers} passengers`}
                  {" · "}
                  {c.luggage}
                  {!ok && " · Does not fit your group"}
                </span>
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="grid gap-4 rounded-[18px] bg-white p-5 shadow-[0_12px_35px_rgba(9,43,39,0.08)] sm:p-6">
        <h2 className="font-(family-name:--font-display) text-[1.5rem]">
          Your details
        </h2>
        <label className="block">
          <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
            Passengers
          </span>
          <input
            type="number"
            name={CAR_OPTION_FIELDS.passengers}
            inputMode="numeric"
            min={1}
            max={MAX_PASSENGERS}
            required
            value={passengers}
            onChange={(e) => setPassengers(Number(e.target.value))}
            className={control}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
            Child seats
          </span>
          <select
            name={CAR_OPTION_FIELDS.childSeats}
            defaultValue="0"
            className={control}
          >
            {Array.from({ length: MAX_CHILD_SEATS + 1 }, (_, n) => (
              <option key={n} value={n}>
                {n === 0 ? "None" : n}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
            Flight number{" "}
            <span className="font-normal text-[#67726f]">(optional)</span>
          </span>
          <input
            name={CAR_OPTION_FIELDS.flightNumber}
            maxLength={MAX_FLIGHT_NUMBER_LENGTH}
            placeholder="MH 1234"
            autoComplete="off"
            className={`${control} uppercase`}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
            Notes for the driver{" "}
            <span className="font-normal text-[#67726f]">(optional)</span>
          </span>
          <textarea
            name={CAR_OPTION_FIELDS.notes}
            maxLength={MAX_NOTES_LENGTH}
            rows={3}
            placeholder="Meeting point, extra stops, anything we should know"
            className={control}
          />
        </label>
        <button
          type="submit"
          disabled={!canContinue}
          className={`${primaryButton} mt-2`}
        >
          {selected && canContinue
            ? `Continue · ${formatMyr(selected.totalSen)}`
            : "Choose a vehicle to continue"}
        </button>
      </div>
    </form>
  );
}
