"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  clashesOf,
  classFitNote,
  CONTACT,
  formatMyr,
  largestGroup,
  plural,
  type TripCategory,
  type TripSearch,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { Notice } from "@repo/ui/notice";
import { Bone, Loading } from "@repo/ui/skeleton";
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
  tripAddOnsPath,
  tripBookingPath,
  tripConfirmPath,
} from "../../../../_lib/transportation-booking";
import { useNavigate } from "../../../../_lib/useNavigate";
import { surface, panel, Pending, Stop } from "../../../_components/Page";
import { guideAddOnOf } from "./plan-add-ons";
import { BookingStepTitle, FoldedTripsBones } from "./StepParts";
import { usePlanPricing } from "./usePlanPricing";

const listFormat = new Intl.ListFormat("en-GB", { type: "conjunction" });
/** The site's reading size in a `Notice`, and its room below. */
const alertBox = "mb-4 text-copy";
/** A link inside a coloured message: in the message's colour, so underlined. */
const noteLink =
  "font-semibold underline underline-offset-4 hover:no-underline focus-ring";

/** What a link brought: today's one-trip search, read as a list of one. */
export type VehicleSeed = { search: TripSearch; passengers: number | null };

/**
 * The vehicle step: every class of the category priced for all the trips
 * at once. "Your Trips" sits at the top with the group's size, each trip
 * priced in the vehicle chosen before, if any, and changed or added in
 * place as on the search card, priced again with a toast; removing one
 * offers Undo. On a phone they are folded into one line, so the vehicles
 * come first, which pins under the header as the page scrolls; on a
 * large screen a thin bar keeps them in view once the list scrolls away. One vehicle does
 * every trip, so it is chosen once, from cards like a location's class
 * cards, each with the total for all the trips and its own Book now,
 * narrowed by a chip per type (Sedan, MPV) when there are several. Book
 * now goes to the add-ons step, or to the details when the trips can take
 * no add-on. A class too small for the group, or
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
  // The type the cards are narrowed to; null for every type.
  const [typeShown, setTypeShown] = useState<string | null>(null);
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
          linkLabel="Search for a Trip"
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
  // One chip per type, in the order the cards come; none for one type.
  const types = [...new Set(shown.map(({ card }) => typeOf(card)))];
  const chips = types.length > 1 ? types : [];
  const filtered =
    typeShown && chips.includes(typeShown)
      ? shown.filter(({ card }) => typeOf(card) === typeShown)
      : shown;
  const hasAddOns =
    guideAddOnOf({
      category,
      trips,
      priced,
      complete,
      guide: plan.guide,
    }).offers.length > 0;

  function choose(id: string) {
    if (continuing) return;
    updatePlan((now) => ({ ...now, classId: id }));
    go(hasAddOns ? tripAddOnsPath(category) : tripConfirmPath(category));
  }

  function toCoaches() {
    switchCategory("coach-charter");
    router.push(tripBookingPath("coach-charter"));
  }

  const coachLink = (label: string) => (
    <button type="button" onClick={toCoaches} className="text-link">
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
          plural(passengers, "passenger"),
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
            ? "Choose One Vehicle for Every Trip"
            : "Choose Your Vehicle"}
        </h2>

        {error ? (
          <div role="alert">
            <Notice tone="danger" className={alertBox}>
              {error}{" "}
              <button type="button" onClick={retry} className={noteLink}>
                Try Again
              </button>
            </Notice>
          </div>
        ) : failed.length > 0 ? (
          <div role="alert">
            <Notice tone="danger" className={alertBox}>
              Change or remove the {failed.length === 1 ? "trip" : "trips"}{" "}
              marked in red above to choose your vehicle.
            </Notice>
          </div>
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
          <Notice tone="danger" className={alertBox}>
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
          </Notice>
        ) : (
          <>
            {passengers > largest ? (
              <div role="alert">
                <Notice tone="danger" className={alertBox}>
                  No {isCar ? "car" : "coach"} seats {passengers}.{" "}
                  {isCar ? (
                    <>
                      A coach does:{" "}
                      <button
                        type="button"
                        onClick={toCoaches}
                        className={noteLink}
                      >
                        see Coach Charter
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
                </Notice>
              </div>
            ) : null}
            {notShown.length > 0 ? (
              <p className="mx-1 -mt-2 mb-4 text-copy text-muted">
                Not shown: {notShown.join("; ")}.
              </p>
            ) : null}
            {chips.length > 0 ? (
              <TypeChips
                types={chips}
                shown={
                  typeShown && chips.includes(typeShown) ? typeShown : null
                }
                onShow={setTypeShown}
              />
            ) : null}
            {filtered.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map(({ card, fit }) => {
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
                      badge={
                        isChosen ? (
                          <span className="mt-1 shrink-0 rounded-full bg-brand-tint px-2 py-0.5 text-xs font-semibold text-brand">
                            Your Choice
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
                      <div className="mt-auto grid gap-3 pt-5">
                        <p className="flex items-baseline justify-between gap-3">
                          <span className="text-copy text-muted">
                            {several
                              ? `For all ${trips.length} trips`
                              : "For the trip"}
                          </span>
                          <span className="font-serif text-2xl leading-none text-ink tabular-nums">
                            {formatMyr(total)}
                          </span>
                        </p>
                        <Button
                          size="lg"
                          onClick={() => choose(card.id)}
                          pending={opening}
                          aria-disabled={continuing || undefined}
                          aria-label={`Book Now, ${card.name}, ${formatMyr(total)}`}
                          className="w-full aria-disabled:cursor-wait"
                        >
                          Book Now
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
    <BookingStepTitle
      category={category}
      count={count}
      title={several ? "Your trips, priced." : "Your trip, priced."}
    >
      {several ? "One vehicle does every trip, so you choose it once. " : ""}
      Prices include the driver and fuel. Pay nothing now: we confirm your
      booking first.
    </BookingStepTitle>
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
          <FoldedTripsBones />
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

/** A card's type, the chip it is under: its name on a class from before types, or a plan priced before them. */
function typeOf(card: { type?: string; name: string }) {
  return card.type || card.name;
}

/**
 * The chips over the vehicle cards, "All" then one per type, which narrow
 * the cards to that type's tiers: "Sedan" shows Standard and Deluxe.
 */
function TypeChips({
  types,
  shown,
  onShow,
}: {
  types: readonly string[];
  /** The type the cards are narrowed to; null for all. */
  shown: string | null;
  onShow: (type: string | null) => void;
}) {
  const chip = (label: string, type: string | null) => {
    const on = shown === type;
    return (
      <button
        key={label}
        type="button"
        aria-pressed={on}
        onClick={() => onShow(type)}
        className={`rounded-full border px-4 py-1.5 text-copy font-medium transition-colors focus-ring ${
          on
            ? "border-brand bg-brand-tint text-brand"
            : "border-hairline bg-white text-ink hover:border-brand hover:text-brand"
        }`}
      >
        {label}
      </button>
    );
  };
  return (
    <div
      role="group"
      aria-label="Filter by type"
      className="mx-1 mb-4 flex flex-wrap gap-2"
    >
      {chip("All", null)}
      {types.map((type) => chip(type, type))}
    </div>
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
