"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  classFitNote,
  CONTACT,
  formatMyr,
  largestGroup,
  TRIP_CATEGORY_LABELS,
  type TripCategory,
  type TripSearch,
} from "@repo/db";
import { toast } from "@repo/ui/toast";
import { ClassCard } from "../../../../_components/ClassCard";
import { PassengersStepper } from "../../../../_components/trips/PassengersStepper";
import { TripsPanel } from "../../../../_components/trips/TripsPanel";
import { useLinkSeed } from "../../../../_components/trips/useLinkSeed";
import { useNewBooking } from "../../../../_components/trips/useNewBooking";
import {
  usePlanner,
  type PlannerChange,
} from "../../../../_components/trips/usePlanner";
import {
  classOnTrip,
  planPrices,
  quoteOf,
  tripNameOf,
  tripOfSearch,
  type PlannedTrip,
} from "../../../../_lib/trip-plan";
import {
  currentPlan,
  updatePlan,
  useTripPlan,
} from "../../../../_lib/trip-plan-store";
import {
  tripBookingPath,
  tripConfirmPath,
} from "../../../../_lib/transportation-booking";
import {
  PageTitle,
  panel,
  Pending,
  primaryButton,
  Stop,
  textLink,
} from "../../../_components/Page";
import { usePlanPricing } from "./usePlanPricing";

const listFormat = new Intl.ListFormat("en-GB", { type: "conjunction" });
const alertBox =
  "mb-4 rounded-xl bg-[#fdecea] px-4 py-3 text-[0.95rem] text-[#8c1d16]";
const noteLink =
  "font-semibold underline underline-offset-4 hover:no-underline";

/** What a link brought: today's one-trip search, read as a list of one. */
export type VehicleSeed = { search: TripSearch; passengers: number | null };

/**
 * The vehicle step: every class of the category priced for all the trips
 * at once. "Your trips" sits at the top, each trip priced in the vehicle
 * chosen before, if any, and changed or added in place as on the search
 * card, priced again with a toast; removing one offers Undo. A thin bar
 * keeps the trips in view once the list scrolls away. One vehicle does
 * every trip, so it is chosen once, from cards like a location's class
 * cards, each with its own Continue and the total for all the trips; it
 * goes straight to the confirm page. A class too small for the group, or
 * one that cannot take a trip under its own rules, is not shown, and a
 * line says which and why. A trip that cannot be booked at all says so,
 * and the vehicles wait until it is changed or removed. A group larger
 * than any car is sent to coach charter with the same trips, one larger
 * than any coach to us. The plan lives in the browser; a link with
 * today's one-trip search starts it, asking first when it would replace
 * other trips. See docs/261027-multi-trip-booking.md.
 */
export function VehicleStep({
  category,
  seed,
}: {
  category: TripCategory;
  seed: VehicleSeed | null;
}) {
  const plan = useTripPlan();
  const router = useRouter();
  const newBooking = useNewBooking();
  // A link's trip starts the plan, asking first when it would replace
  // other trips; the trips are priced once it is in.
  const seeded = useLinkSeed(
    seed !== null,
    plan !== null,
    () =>
      seed
        ? newBooking.start(
            category,
            [tripOfSearch(seed.search)],
            seed.passengers ?? currentPlan().passengers,
          )
        : Promise.resolve(),
    tripBookingPath(category),
  );
  const { pricing, error, retry } = usePlanPricing(
    seeded && plan?.category === category ? plan : null,
  );
  const planner = usePlanner({
    trips: plan?.trips ?? [],
    keepOpen: false,
    onTrips: (next: PlannedTrip[], change: PlannerChange) => {
      const before = currentPlan().trips;
      updatePlan((now) => ({ ...now, trips: next }));
      if (change === "removed") {
        toast.success("Trip removed", {
          action: {
            label: "Undo",
            onClick: () => updatePlan((now) => ({ ...now, trips: before })),
          },
        });
      } else {
        toast.success(change === "added" ? "Trip added" : "Trip updated");
      }
    },
  });

  // The page's category is the plan's.
  useEffect(() => {
    if (seeded && plan && plan.category !== category) switchCategory(category);
  });

  if (!plan || !seeded || plan.category !== category) {
    return newBooking.dialog;
  }
  const { trips, passengers, priced, classId } = plan;
  if (trips.length === 0) {
    return (
      <>
        <Stop
          title="Start with a search"
          message="Tell us where and when you need a driver, and we will show you prices."
          linkLabel="Search for a trip"
        />
        {newBooking.dialog}
      </>
    );
  }

  const several = trips.length > 1;
  const { quotes, failed, complete, choices } = planPrices(
    trips,
    priced,
    passengers,
  );
  const shown = choices.filter((c) => c.fit.ok);
  const chosen = shown.find((c) => c.card.id === classId) ?? null;
  const tooSmall = choices.filter((c) => !c.fit.ok && c.fit.reason === "seats");
  const largest = largestGroup(priced?.classes ?? []);
  const tripName = tripNameOf(trips);
  const notShown = [
    ...(tooSmall.length > 0
      ? [
          `${listFormat.format(tooSmall.map((c) => c.card.name))}, for fewer than ${passengers}`,
        ]
      : []),
    ...choices.flatMap(({ card, fit }) =>
      !fit.ok && fit.reason !== "seats"
        ? [`${card.name}, ${classFitNote(fit, tripName)}`]
        : [],
    ),
  ];
  const isCar = category === "car-with-driver";
  const pictured = shown.some((c) => c.card.imageUrl !== null);

  function choose(id: string) {
    updatePlan((now) => ({
      ...now,
      classId: id,
      modelId: now.classId === id ? now.modelId : null,
    }));
    router.push(tripConfirmPath(category));
  }

  function toCoaches() {
    switchCategory("coach-charter");
    router.push(tripBookingPath("coach-charter"));
  }

  const coachLink = (label: string) => (
    <button type="button" onClick={toCoaches} className={textLink}>
      {label}
    </button>
  );

  return (
    <>
      <PageTitle
        eyebrow={`${TRIP_CATEGORY_LABELS[category]}${several ? ` · ${trips.length} trips` : ""}`}
        title={several ? "Your trips, priced." : "Your trip, priced."}
      >
        {several ? "One vehicle does every trip, so you choose it once. " : ""}
        Prices include the driver and fuel. Pay nothing now: we confirm your
        booking first.
      </PageTitle>

      <TripsPanel
        planner={planner}
        category={category}
        summary={
          chosen?.fit.ok
            ? `${chosen.card.name} · ${formatMyr(chosen.fit.totalSen)}`
            : null
        }
        priceOf={(trip) => {
          const quote = quoteOf(priced, trip);
          if (!quote) return <span className="text-slate-400">…</span>;
          if (!chosen) return null;
          const price = classOnTrip(quote, chosen.card.id)?.totalSen;
          return price === undefined || price === null
            ? null
            : formatMyr(price);
        }}
        noteOf={(trip) => {
          const view = quoteOf(priced, trip)?.view;
          return view && !view.ok ? { tone: "red", text: view.error } : null;
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
          <PassengersStepper
            value={passengers}
            onChange={(next) =>
              updatePlan((now) => ({ ...now, passengers: next }))
            }
          />
        </div>

        {error ? (
          <div role="alert" className={alertBox}>
            {error}{" "}
            <button type="button" onClick={retry} className={noteLink}>
              Try again
            </button>
          </div>
        ) : failed.length > 0 ? (
          <div role="alert" className={alertBox}>
            {failed.map(({ index, error: why }) => (
              <p key={index}>
                {several ? `Trip ${index + 1}: ` : ""}
                {why}
              </p>
            ))}
            <p className="mt-1.5">
              Change or remove{" "}
              {failed.length === 1 ? "that trip" : "those trips"} above to
              choose your vehicle.
            </p>
          </div>
        ) : !complete || (pricing && choices.length === 0) ? (
          <p className={`${panel} flex items-center text-slate-600`}>
            <Pending>
              Finding prices for{" "}
              {several ? `your ${trips.length} trips` : "your trip"}…
            </Pending>
          </p>
        ) : choices.length === 0 ? (
          <p className={alertBox}>
            We have no vehicle to offer for{" "}
            {several ? "these trips" : "this trip"} right now. Message us on
            WhatsApp and we will help.
          </p>
        ) : (
          <>
            {passengers > largest ? (
              <p role="alert" className={alertBox}>
                No {isCar ? "car" : "coach"} seats {passengers}.{" "}
                {isCar ? (
                  <>
                    A coach does:{" "}
                    <button
                      type="button"
                      onClick={toCoaches}
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
            {notShown.length > 0 ? (
              <p className="mx-1 -mt-2 mb-4 text-[0.9rem] text-slate-500">
                Not shown: {notShown.join("; ")}.
              </p>
            ) : null}
            {shown.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {shown.map(({ card, fit }) => {
                  const total = fit.ok ? fit.totalSen : 0;
                  const oddHoursSen = quotes.reduce(
                    (sum, quote) =>
                      sum + (classOnTrip(quote, card.id)?.oddHoursSen ?? 0),
                    0,
                  );
                  return (
                    <ClassCard
                      key={card.id}
                      vehicleClass={card}
                      pictured={pictured}
                      badge={
                        chosen?.card.id === card.id ? (
                          <span className="mt-1 shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-[0.75rem] font-semibold text-brand">
                            Your choice
                          </span>
                        ) : null
                      }
                    >
                      {oddHoursSen > 0 ? (
                        <p className="mt-1 text-[0.85rem] text-[#7a5a00]">
                          Includes {formatMyr(oddHoursSen)} for{" "}
                          {several ? "pick-ups" : "a pick-up"} in odd hours
                        </p>
                      ) : null}
                      <div className="mt-auto pt-5">
                        <button
                          type="button"
                          onClick={() => choose(card.id)}
                          className={`${primaryButton} w-full`}
                        >
                          Continue · {formatMyr(total)}
                        </button>
                      </div>
                    </ClassCard>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}

        <p className="mx-1 mt-5 text-[0.92rem] text-slate-500">
          {several ? "Every trip is done in the vehicle you choose. " : ""}A
          second vehicle, or a different one on some trips, is a booking of its
          own.
          {isCar && largest > 0 ? (
            <>
              {" "}
              Up to {largest} in one car; a larger group?{" "}
              {coachLink("See coach charter")}
            </>
          ) : null}
        </p>
      </section>
      {newBooking.dialog}
    </>
  );
}

/** The plan sold in another category: the same trips, its vehicle chosen again from that category's classes. */
function switchCategory(category: TripCategory) {
  updatePlan((now) => ({
    ...now,
    category,
    classId: null,
    modelId: null,
    priced: null,
  }));
}
