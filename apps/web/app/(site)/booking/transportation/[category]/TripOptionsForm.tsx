"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CONTACT,
  fitsPassengers,
  formatMyr,
  hiddenSearchFields,
  largestGroup,
  offersChildSeats,
  seatsLabel,
  TRIP_MAX_CHILD_SEATS,
  TRIP_MAX_FLIGHT_NUMBER_LENGTH,
  TRIP_MAX_NOTES_LENGTH,
  TRIP_OPTION_FIELDS,
  tripSearchParams,
  type TripCategory,
  type TripSearch,
  type TripView,
} from "@repo/db";
import {
  tripBookingHref,
  tripConfirmPath,
} from "../../../../_lib/transportation-booking";
import {
  control,
  focus,
  primaryButton,
  textLink,
} from "../../../_components/Page";
import { TripBar } from "./TripBar";

/** One vehicle class as priced for this trip. Plain data, sent to the browser. */
export type ClassOption = {
  id: string;
  name: string;
  description: string;
  luggage: string;
  minPassengers: number;
  maxPassengers: number;
  totalSen: number;
  /** Why the class cannot take this trip, or null when it can. */
  unavailable: string | null;
};

/**
 * The trip bar, then vehicle class, passengers, child seats where the
 * category offers them, flight number and notes. A plain GET form: the choices join the search in the confirm
 * page's URL, so the confirm step is shareable and survives the sign-in
 * redirect. Classes the passenger count does not fit, or whose rules refuse
 * the trip, are shown with the reason but cannot be chosen. The passenger
 * count lives here so the trip bar can carry it over a changed trip; the
 * page gives this form the trip as its key, so a changed trip clears the
 * chosen vehicle.
 */
export function TripOptionsForm({
  category,
  search,
  trip,
  classes,
  initialPassengers,
}: {
  category: TripCategory;
  search: TripSearch;
  trip: TripView;
  classes: ClassOption[];
  initialPassengers: number;
}) {
  // The largest class in the category is the most the field accepts.
  const maxPassengers = largestGroup(classes);
  const [passengersText, setPassengersText] = useState(
    String(Math.min(initialPassengers, maxPassengers)),
  );
  const passengers = Number(passengersText);
  const [chosen, setChosen] = useState<string | null>(null);
  const choosable = (c: ClassOption) =>
    c.unavailable === null && fitsPassengers(c, passengers);
  const selected = chosen && classes.find((c) => c.id === chosen);
  const canContinue = Boolean(selected && choosable(selected));

  return (
    <>
      <TripBar
        category={category}
        search={search}
        trip={trip}
        passengers={passengers}
      />
      <form
        method="get"
        action={tripConfirmPath(category)}
        className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start"
      >
        {hiddenSearchFields(search).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}

        <fieldset className="grid gap-3">
          <legend className="mb-3 font-(family-name:--font-display) text-[1.5rem]">
            Choose your vehicle
          </legend>
          {classes.map((c) => {
            const ok = choosable(c);
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
                  name={TRIP_OPTION_FIELDS.vehicleClass}
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
                    {seatsLabel(c)}
                    {" · "}
                    {c.luggage}
                    {c.unavailable
                      ? ` · ${c.unavailable}`
                      : !ok && " · Does not fit your group"}
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
              name={TRIP_OPTION_FIELDS.passengers}
              inputMode="numeric"
              min={1}
              max={maxPassengers}
              required
              value={passengersText}
              onChange={(e) =>
                // Typing past the largest class stops at it; an empty field
                // stays empty so the number can be typed again.
                setPassengersText(
                  Number(e.target.value) > maxPassengers
                    ? String(maxPassengers)
                    : e.target.value,
                )
              }
              className={control}
            />
          </label>
          <p className="-mt-2.5 text-[0.85rem] text-[#67726f]">
            Up to {maxPassengers} passengers. Larger group?{" "}
            <LargerGroupLink category={category} search={search} />
          </p>
          {offersChildSeats(category) && (
            <label className="block">
              <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
                Child seats
              </span>
              <select
                name={TRIP_OPTION_FIELDS.childSeats}
                defaultValue="0"
                className={control}
              >
                {Array.from({ length: TRIP_MAX_CHILD_SEATS + 1 }, (_, n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "None" : n}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[0.9rem] font-semibold text-[#253c38]">
              Flight number{" "}
              <span className="font-normal text-[#67726f]">(optional)</span>
            </span>
            <input
              name={TRIP_OPTION_FIELDS.flightNumber}
              maxLength={TRIP_MAX_FLIGHT_NUMBER_LENGTH}
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
              name={TRIP_OPTION_FIELDS.notes}
              maxLength={TRIP_MAX_NOTES_LENGTH}
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
    </>
  );
}

/**
 * Where a group too large for the category goes: from cars to the coach page
 * with the same trip, from coaches to the team. The only bridge between the
 * two categories. Outside the passengers label, so it is not part of the
 * field's name.
 */
function LargerGroupLink({
  category,
  search,
}: {
  category: TripCategory;
  search: TripSearch;
}) {
  if (category === "car-with-driver") {
    return (
      <Link
        href={tripBookingHref("coach-charter", tripSearchParams(search))}
        className={textLink}
      >
        See coach charter
      </Link>
    );
  }
  return (
    <a
      href={CONTACT.whatsappHref}
      target="_blank"
      rel="noopener noreferrer"
      className={textLink}
    >
      Contact us
    </a>
  );
}
