"use client";

import { useRouter } from "next/navigation";
import { CONTACT, TRIP_CATEGORY_LABELS } from "@repo/db";
import { ClassPicture } from "../../../_components/ClassPicture";
import {
  PageTitle,
  primaryButton,
  Stop,
  textLink,
} from "../../_components/Page";
import { CLASSES, fareOf, largestIn, rm, type VehicleClass } from "./data";
import { PassengersField } from "./search/parts";
import { TripsPanel, useBookingPlanner } from "./search/Planner";
import { STEP_PATHS } from "./situations";
import {
  priceOf,
  totalOf,
  update,
  useExample,
  type Trip,
  type Vehicle,
} from "./store";
import { noteLink, tripPriceLabel, useHydrated } from "./ui";

/** What a class adds to the trips for pick-ups between 23:00 and 06:00. */
function lateNightOf(cls: VehicleClass, trips: Trip[]) {
  return trips.reduce(
    (sum, t) => sum + (t.issue === "quote" ? 0 : fareOf(t, cls).lateNight),
    0,
  );
}

/**
 * Step 2, today's options page for every trip at once. The trips are
 * listed above, by date, each with its price in the chosen vehicle, and
 * change there as on the search card. The booking has one vehicle and it
 * does every trip, so the choice is made once, from cards like the
 * location page's. Each card's button says what the class costs for all
 * the trips and goes on to confirm in it. A class too small for the group
 * is not shown, and a line says so. The group's size is set here, as on
 * the search card. A group larger than any car is sent to coach charter,
 * and one larger than any coach to us, as the site
 * does today; a second vehicle is a booking of its own. The contact, the
 * flights and a note for the driver are on the confirm page.
 */
export function VehicleStep() {
  const hydrated = useHydrated();
  const state = useExample();
  const router = useRouter();
  const planner = useBookingPlanner();
  if (!hydrated) return null;

  const { trips, vehicle } = state;
  if (trips.length === 0) {
    return (
      <Stop
        title="Start with a search"
        message="Search for a trip, or open a situation, and the vehicles for it show here."
        href={STEP_PATHS.search}
        linkLabel="Search for a trip"
      />
    );
  }

  const { passengers } = vehicle;
  const classes = CLASSES.filter((c) => c.category === vehicle.category);
  // A class too small for the group is left out, not shown greyed.
  const fits = classes.filter((c) => c.seats >= passengers);
  const tooSmall = classes.filter((c) => c.seats < passengers);
  const largest = largestIn(vehicle.category);
  const chosen = fits.find((c) => c.id === vehicle.classId) ?? null;
  const quotes = trips.filter((t) => t.issue === "quote").length;
  const several = trips.length > 1;
  const isCar = vehicle.category === "car-with-driver";

  function setVehicle(change: Partial<Vehicle>) {
    update((s) => ({ ...s, vehicle: { ...s.vehicle, ...change } }));
  }

  return (
    <>
      <PageTitle
        eyebrow={`${TRIP_CATEGORY_LABELS[vehicle.category]}${several ? ` · ${trips.length} trips` : ""}`}
        title={several ? "Your trips, priced." : "Your trip, priced."}
      >
        {several ? "One vehicle does every trip, so you choose it once. " : ""}
        Prices include the driver and fuel. Pay nothing now: we confirm your
        booking first.
      </PageTitle>

      <TripsPanel
        planner={planner}
        summary={
          chosen ? `${chosen.name} · ${rm(totalOf(trips, chosen.id))}` : null
        }
        priceOf={(row) => {
          const trip = trips.find((t) => t.id === row.id);
          return chosen && trip
            ? tripPriceLabel(priceOf(trip, chosen.id))
            : null;
        }}
      />

      <section aria-labelledby="vehicles">
        <div className="mx-1 mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
          <h2
            id="vehicles"
            className="font-(family-name:--font-display) text-[1.7rem] leading-tight text-ink"
          >
            {several
              ? "Choose one vehicle for every trip"
              : "Choose your vehicle"}
          </h2>
          <PassengersField />
        </div>
        {tooSmall.length > 0 && fits.length > 0 ? (
          <p className="mx-1 -mt-2 mb-4 text-[0.9rem] text-slate-500">
            Not shown: {tooSmall.map((c) => c.name).join(", ")}, for fewer than{" "}
            {passengers}.
          </p>
        ) : null}

        {passengers > largest ? (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-[#fdecea] px-4 py-3 text-[0.95rem] text-[#8c1d16]"
          >
            No {isCar ? "car" : "coach"} seats {passengers}.{" "}
            {isCar ? (
              <>
                A coach does:{" "}
                <button
                  type="button"
                  onClick={() =>
                    setVehicle({ category: "coach-charter", classId: null })
                  }
                  className={noteLink}
                >
                  see coach charter
                </button>
                . Or make a booking for each car.
              </>
            ) : (
              <>
                Make a booking for each coach, or{" "}
                <a
                  href={CONTACT.whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={noteLink}
                >
                  WhatsApp us
                </a>{" "}
                and we plan it with you.
              </>
            )}
          </p>
        ) : null}

        {fits.length > 0 ? (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fits.map((cls) => {
              const on = chosen?.id === cls.id;
              const total = totalOf(trips, cls.id);
              const late = lateNightOf(cls, trips);
              return (
                <li
                  key={cls.id}
                  className={`flex flex-col rounded-[18px] border-2 bg-white p-5 shadow-[0_12px_35px_rgba(0,38,75,0.08)] sm:p-6 ${
                    on ? "border-brand" : "border-transparent"
                  }`}
                >
                  <ClassPicture
                    src={cls.photo}
                    sizes="(min-width: 64rem) 400px, (min-width: 40rem) 50vw, 100vw"
                    className="mb-4"
                  />
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-(family-name:--font-display) text-[1.5rem] leading-tight text-ink">
                        {cls.name}
                      </h3>
                      {on ? (
                        <span className="mt-1 shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[0.75rem] font-semibold text-brand">
                          Your choice
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-slate-700">{cls.blurb}</p>
                    <p className="mt-2 text-[0.95rem] text-slate-700">
                      {cls.models}
                    </p>
                    <p className="mt-3 text-[0.9rem] text-slate-500">
                      Up to {cls.seats} passengers · {cls.bags} large bags
                    </p>
                    {late > 0 ? (
                      <p className="mt-1 text-[0.85rem] text-[#7a5a00]">
                        Includes {rm(late)} for{" "}
                        {several ? "pick-ups" : "a pick-up"} between 23:00 and
                        06:00
                      </p>
                    ) : null}
                    {quotes > 0 ? (
                      <p className="mt-1 text-[0.85rem] text-slate-500">
                        Plus {quotes === 1 ? "1 trip" : `${quotes} trips`} we
                        quote by email
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setVehicle({ classId: cls.id });
                      router.push(STEP_PATHS.confirm);
                    }}
                    className={`${primaryButton} mt-5 w-full`}
                  >
                    Continue · {rm(total)}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
        <p className="mx-1 mt-5 text-[0.92rem] text-slate-500">
          {several ? "Every trip is done in the vehicle you choose. " : ""}A
          second vehicle, or a different one on some trips, is a booking of its
          own.
          {isCar ? (
            <>
              {" "}
              Up to {largest} in one car; a larger group?{" "}
              <button
                type="button"
                onClick={() =>
                  setVehicle({ category: "coach-charter", classId: null })
                }
                className={textLink}
              >
                See coach charter
              </button>
            </>
          ) : null}
        </p>
      </section>
    </>
  );
}
