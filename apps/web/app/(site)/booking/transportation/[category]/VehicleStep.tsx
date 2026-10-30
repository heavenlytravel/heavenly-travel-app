"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  clashesOf,
  classFitNote,
  CONTACT,
  formatMyr,
  largestGroup,
  TRIP_CATEGORY_LABELS,
  type TripCategory,
  type TripSearch,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { toast } from "@repo/ui/toast";
import { ClassCard } from "../../../../_components/ClassCard";
import { PassengersStepper } from "../../../../_components/trips/PassengersStepper";
import { clearOfHeader } from "../../../../_components/trips/TripsBar";
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
import { useNavigate } from "../../../../_lib/useNavigate";
import {
  Bone,
  Loading,
  surface,
  PageTitle,
  panel,
  Pending,
  Stop,
  textLink,
} from "../../../_components/Page";
import { usePlanPricing } from "./usePlanPricing";

const listFormat = new Intl.ListFormat("en-GB", { type: "conjunction" });
const alertBox =
  "mb-4 rounded-xl bg-danger-tint px-4 py-3 text-copy text-danger-strong";
/** A link inside a coloured message: in the message's colour, so underlined. */
const noteLink =
  "font-semibold underline underline-offset-4 hover:no-underline focus-ring";

/** What a link brought: today's one-trip search, read as a list of one. */
export type VehicleSeed = { search: TripSearch; passengers: number | null };

/**
 * The vehicle step: every class of the category priced for all the trips
 * at once. "Your trips" sits at the top with the group's size, each trip
 * priced in the vehicle chosen before, if any, and changed or added in
 * place as on the search card, priced again with a toast; removing one
 * offers Undo. On a phone they are folded into one line, so the vehicles
 * come first, which pins under the header as the page scrolls; on a
 * large screen a thin bar keeps them in view once the list scrolls away. One vehicle does
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
  // Continue opens the confirm page; until it is on screen the button says so.
  const { pending: continuing, go } = useNavigate();
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
    openWhenEmpty: false,
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
    return (
      <>
        <VehicleStepSkeleton category={category} />
        {newBooking.dialog}
      </>
    );
  }
  const { trips, passengers, priced, classId } = plan;
  if (trips.length === 0) {
    return (
      <>
        <Stop
          level={1}
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
    if (continuing) return;
    updatePlan((now) => ({ ...now, classId: id }));
    go(tripConfirmPath(category));
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
      <StepTitle category={category} count={trips.length} />

      <TripsPanel
        planner={planner}
        category={category}
        foldOnSmall
        attention={failed.length > 0 || clashesOf(trips).size > 0}
        className={`${surface} mb-8 ${clearOfHeader} lg:p-7`}
        summary={[
          passengers === 1 ? "1 passenger" : `${passengers} passengers`,
          ...(chosen?.fit.ok
            ? [`${chosen.card.name} · ${formatMyr(chosen.fit.totalSen)}`]
            : []),
        ].join(" · ")}
        passengers={
          <PassengersStepper
            value={passengers}
            onChange={(next) =>
              updatePlan((now) => ({ ...now, passengers: next }))
            }
            className="w-full @3xl:w-[250px]"
          />
        }
        priceOf={(trip) => {
          const quote = quoteOf(priced, trip);
          if (!quote) return <span className="text-muted">…</span>;
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
        <h2
          id="vehicles"
          className="mx-1 mb-4 font-serif text-figure leading-tight text-ink"
        >
          {several
            ? "Choose one vehicle for every trip"
            : "Choose your vehicle"}
        </h2>

        {error ? (
          <div role="alert" className={alertBox}>
            {error}{" "}
            <button type="button" onClick={retry} className={noteLink}>
              Try again
            </button>
          </div>
        ) : failed.length > 0 ? (
          <p role="alert" className={alertBox}>
            Change or remove the {failed.length === 1 ? "trip" : "trips"} marked
            in red above to choose your vehicle.
          </p>
        ) : !complete || (pricing && choices.length === 0) ? (
          <>
            <p
              role="status"
              className={`${panel} mb-4 flex items-center text-muted`}
            >
              <Pending>
                Finding prices for{" "}
                {several ? `your ${trips.length} trips` : "your trip"}…
              </Pending>
            </p>
            {/* The cards' room kept while their prices come, so the page
                below does not jump when they do. */}
            <VehicleCardsSkeleton className="motion-safe:animate-pulse" />
          </>
        ) : choices.length === 0 ? (
          <p className={alertBox}>
            We have no vehicle to offer for{" "}
            {several ? "these trips" : "this trip"} right now.{" "}
            <a
              href={CONTACT.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={noteLink}
            >
              Message us on WhatsApp
            </a>{" "}
            and we will help.
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
              <p className="mx-1 -mt-2 mb-4 text-copy text-muted">
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
                  const isChosen = chosen?.card.id === card.id;
                  // The chosen one turns while the confirm page opens; the
                  // rest wait, and keep the focus where it is.
                  const opening = continuing && isChosen;
                  return (
                    <ClassCard
                      key={card.id}
                      vehicleClass={card}
                      pictured={pictured}
                      badge={
                        isChosen ? (
                          <span className="mt-1 shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand">
                            Your choice
                          </span>
                        ) : null
                      }
                    >
                      {oddHoursSen > 0 ? (
                        <p className="mt-1 text-caption text-warning">
                          Includes {formatMyr(oddHoursSen)} for{" "}
                          {several ? "pick-ups" : "a pick-up"} in odd hours
                        </p>
                      ) : null}
                      <div className="mt-auto pt-5">
                        <Button
                          size="lg"
                          onClick={() => choose(card.id)}
                          pending={opening}
                          aria-disabled={continuing || undefined}
                          className="w-full aria-disabled:cursor-wait"
                        >
                          Continue · {formatMyr(total)}
                        </Button>
                      </div>
                    </ClassCard>
                  );
                })}
              </ul>
            ) : null}
          </>
        )}

        <p className="mx-1 mt-5 text-copy text-muted">
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

/** The page's title: the category, how many trips when several, and what the prices hold. */
function StepTitle({
  category,
  count,
}: {
  category: TripCategory;
  count: number;
}) {
  const several = count > 1;
  return (
    <PageTitle
      eyebrow={`${TRIP_CATEGORY_LABELS[category]}${several ? ` · ${count} trips` : ""}`}
      title={several ? "Your trips, priced." : "Your trip, priced."}
    >
      {several ? "One vehicle does every trip, so you choose it once. " : ""}
      Prices include the driver and fuel. Pay nothing now: we confirm your
      booking first.
    </PageTitle>
  );
}

/**
 * The page while the browser's trips are read: its title as it reads for
 * one trip, then bones about the height of the trips and the vehicles
 * (on a phone the folded line, from `lg` the list and its foot), so the
 * page and the footer do not jump when they come.
 */
function VehicleStepSkeleton({ category }: { category: TripCategory }) {
  return (
    <>
      <StepTitle category={category} count={1} />
      <Loading>
        <div className={`${surface} mb-8 lg:p-7`}>
          <div className="grid gap-1.5 px-4 py-2.5 sm:px-5 lg:hidden">
            <Bone className="h-5 w-40" />
            <Bone className="h-5 w-56 max-w-full" />
          </div>
          <div className="hidden lg:block">
            <Bone className="mb-3 h-24 w-full" />
            <div className="flex items-center justify-between gap-3">
              <Bone className="h-11 w-44" />
              <Bone className="h-14 w-[250px]" />
            </div>
          </div>
        </div>
        <Bone className="mx-1 mb-4 h-9 w-64 max-w-full" />
        <VehicleCardsSkeleton />
      </Loading>
    </>
  );
}

/** Bones in the shape of the vehicle cards: a picture, a name, a few lines and Continue. */
function VehicleCardsSkeleton({ className = "" }: { className?: string }) {
  return (
    <ul
      aria-hidden
      className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}
    >
      {[0, 1, 2].map((card) => (
        <li key={card} className={`${panel} flex flex-col`}>
          <Bone className="mb-4 aspect-[3/2] w-full" />
          <Bone className="h-7 w-36" />
          <Bone className="mt-3 h-4 w-full" />
          <Bone className="mt-2 h-4 w-4/5" />
          <Bone className="mt-4 h-4 w-28" />
          <Bone className="mt-6 h-13 w-full" />
        </li>
      ))}
    </ul>
  );
}

/** The plan sold in another category: the same trips, its vehicle chosen again from that category's classes. */
function switchCategory(category: TripCategory) {
  updatePlan((now) => ({
    ...now,
    category,
    classId: null,
    priced: null,
  }));
}
