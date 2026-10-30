"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clashesOf,
  formatMyr,
  modelsLine,
  isAirportPlace,
  plural,
  tripItemField,
  type TripCategory,
  type TripOptions,
  type TripSearch,
} from "@repo/db";
import { Button } from "@repo/ui/button";
import { FormError } from "@repo/ui/form-error";
import { Bone, Loading } from "@repo/ui/skeleton";
import { toast } from "@repo/ui/toast";
import { ClassPicture } from "../../../../../_components/ClassPicture";
import { ModelPhotosButton } from "../../../../../_components/ModelGallery";
import { TripsFold } from "../../../../../_components/trips/TripsBar";
import {
  TripTimeline,
  type TripNote,
} from "../../../../../_components/trips/TripTimeline";
import { useLinkSeed } from "../../../../../_components/trips/useLinkSeed";
import { useNewBooking } from "../../../../../_components/trips/useNewBooking";
import {
  classOnTrip,
  planPrices,
  quoteOf,
  shortDayOf,
  tripItemEntries,
  tripOfSearch,
  whenOf,
  type PlannedTrip,
} from "../../../../../_lib/trip-plan";
import {
  clearPlan,
  updatePlan,
  useTripPlan,
} from "../../../../../_lib/trip-plan-store";
import {
  tripBookingPath,
  tripConfirmPath,
} from "../../../../../_lib/transportation-booking";
import {
  panel,
  panelFromLarge,
  Pending,
  Stop,
  surface,
} from "../../../../_components/Page";
import { BookingStepTitle, FoldedTripsBones } from "../StepParts";
import { usePlanPricing } from "../usePlanPricing";
import { ConfirmForm } from "./ConfirmForm";
import { CONFIRM_FIELDS } from "./fields";

/** What a link brought: today's one-trip confirm address, read as a plan of one. */
export type ConfirmSeed = { search: TripSearch; options: TripOptions };

/** The two sides from `lg`: the trips and the vehicle, then "Your details". */
const columns =
  "grid grid-cols-[minmax(0,1fr)] gap-7 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start";

/** The trips' side held in view from `lg`, clear of the site header. */
const pinnedSide = "lg:sticky lg:top-[calc(var(--header-height)+1.25rem)]";

/** "Langkawi International Airport on Tue, 3 Nov", and how many more. */
function placesLine(trips: PlannedTrip[], at: (trip: PlannedTrip) => string) {
  const first = trips[0]!;
  return `${at(first)} on ${shortDayOf(first)}${
    trips.length > 1 ? `, and ${trips.length - 1} more` : ""
  }`;
}

/**
 * The confirm step, laid out as B: the trips and the vehicle on the left,
 * which stay in view while "Your details" on the right scroll with the
 * page. On a phone the trips and the vehicle fold into one line above the
 * details, which come first; it pins under the header as the page
 * scrolls, and unfolds by itself when a trip turns red. The trips are
 * shown, priced with today's rates, not changed: "Edit trips", or on a
 * phone the fold's one "Edit trips or vehicle", goes back to the vehicle
 * page, where they are changed or added and the vehicle chosen again. A
 * trip that cannot be booked as it is says so under it: it starts with
 * another or during a hire, the vehicle needs more notice or hours for
 * it, or it cannot be priced; so does a price changed since the trip was
 * added. "Your vehicle" has the class for all the trips, pictured and
 * with its models as on the vehicle page (any of them is sent, whichever
 * is free on the day: choosing a model is not offered for now), and the
 * group. The details ask the contact, the flights for the trips at an
 * airport, and one note for the drivers, and end in the one button, with
 * the total and the cancellation terms; it says which trip to fix while
 * any is red. A link with today's one-trip confirm address still opens
 * it, as a plan of one. See
 * docs/261027-multi-trip-booking.md, "The confirm page".
 */
export function ConfirmStep({
  category,
  seed,
  defaultName,
  defaultPhone,
  accountEmail,
  signInHref,
}: {
  category: TripCategory;
  seed: ConfirmSeed | null;
  defaultName: string;
  defaultPhone: string;
  accountEmail: string | null;
  signInHref: string | null;
}) {
  const plan = useTripPlan();
  const router = useRouter();
  const newBooking = useNewBooking();
  // A link's trip and choices start the plan; the trips are priced once
  // they are in.
  const seeded = useLinkSeed(
    seed !== null,
    plan !== null,
    async () => {
      if (!seed) return;
      const { search, options } = seed;
      const started = await newBooking.start(
        category,
        [tripOfSearch(search)],
        options.passengers,
      );
      if (!started) return;
      updatePlan((now) => ({
        ...now,
        classId: options.vehicleClassId,
        forDriver: {
          // The flight goes on the trip it is for once its places are known.
          arrivingFlight: options.flightNumber ?? "",
          departingFlight: options.flightNumber ?? "",
          notes: options.notes ?? "",
        },
      }));
    },
    tripConfirmPath(category),
  );
  const { pricing, error, retry } = usePlanPricing(
    seeded && plan?.category === category ? plan : null,
  );
  // The booking is made: the page waits for the next while the plan empties.
  const [booked, setBooked] = useState(false);

  if (booked) {
    // The page's one heading while the next opens, in the line's own look.
    return (
      <div className={`${panel} max-w-[560px]`}>
        <h1 className="flex items-center text-muted">
          <Pending>Booked. Opening your booking…</Pending>
        </h1>
      </div>
    );
  }
  if (!plan || !seeded) {
    return (
      <>
        <ConfirmStepSkeleton category={category} />
        {newBooking.dialog}
      </>
    );
  }
  if (plan.category !== category || plan.trips.length === 0) {
    return (
      <Stop
        level={1}
        title="Nothing to confirm yet"
        message="Search for a trip. Add as many as your stay needs: one vehicle does them all, and you book them together."
        linkLabel="Search for a trip"
      />
    );
  }

  const { trips, priced, passengers, classId, forDriver } = plan;
  const vehiclePage = tripBookingPath(category);
  const { quotes, failed, complete, choices } = planPrices(
    trips,
    priced,
    passengers,
  );
  const chosen = choices.find((c) => c.card.id === classId) ?? null;
  if (complete && failed.length === 0 && !chosen) {
    return (
      <Stop
        level={1}
        title="Choose a vehicle first"
        message="One vehicle does every trip. Choose it, and your trips show here, priced."
        href={vehiclePage}
        linkLabel="Choose a vehicle"
      />
    );
  }
  if (chosen && !chosen.fit.ok && chosen.fit.reason === "seats") {
    return (
      <Stop
        level={1}
        title="Choose a larger vehicle"
        message={`The ${chosen.card.name} seats up to ${chosen.card.maxPassengers}, and your group is ${passengers}.`}
        href={vehiclePage}
        linkLabel="Choose a vehicle"
      />
    );
  }

  const several = trips.length > 1;
  const card = chosen?.card ?? null;
  const onTrip = trips.map((_, index) =>
    card ? classOnTrip(quotes[index] ?? null, card.id) : null,
  );
  /** A trip's price in the chosen vehicle, any of its models. */
  const priceOn = (index: number) => {
    const here = onTrip[index];
    if (!here || here.totalSen === null || !here.availability.ok) {
      return null;
    }
    return here.totalSen;
  };
  const totalSen = trips.reduce(
    (sum, _, index) => sum + (priceOn(index) ?? 0),
    0,
  );
  const cutoffs = new Set(onTrip.map((p) => p?.cancellationCutoffHours));
  const cutoff = cutoffs.size === 1 ? [...cutoffs][0] : undefined;
  const cancellation = !card
    ? null
    : cutoff !== undefined
      ? `Free cancellation until ${cutoff} hours before ${several ? "each trip, each on its own" : "the trip"}.`
      : "Free cancellation until each trip's own cutoff, each on its own.";
  /** What a trip says for itself in the list; the list says a clash itself. */
  function noteOf(trip: PlannedTrip): TripNote | null {
    const index = trips.findIndex((t) => t.id === trip.id);
    const view = quoteOf(priced, trip)?.view;
    if (!view) return null;
    if (!view.ok) return { tone: "red", text: view.error };
    if (!card) return null;
    const here = onTrip[index];
    if (!here || here.totalSen === null) {
      return {
        tone: "red",
        text: `${card.name} is not offered for this trip. Choose another vehicle, or change the trip.`,
      };
    }
    if (!here.availability.ok) {
      switch (here.availability.reason) {
        case "too-soon":
          return {
            tone: "red",
            text: `Too soon to book online: ${card.name} needs ${here.availability.minLeadHours} hours notice. Choose a later time, or WhatsApp us.`,
          };
        case "too-few-hours":
          return {
            tone: "red",
            text: `${card.name} is hired for at least ${here.availability.minHourlyHours} hours. Make this hire longer.`,
          };
        case "not-on-route":
          return {
            tone: "red",
            text: `${card.name} is not offered for this trip. Choose another vehicle, or change the trip.`,
          };
      }
    }
    const was = quotes[index]?.was[card.id];
    if (was !== undefined && here.totalSen !== was) {
      return {
        tone: "blue",
        text: `Now ${formatMyr(here.totalSen)}, ${
          here.totalSen > was ? "up" : "down"
        } from ${formatMyr(was)} when you added it.`,
      };
    }
    return null;
  }

  const clashes = clashesOf(trips);
  const red = trips.flatMap((trip, index) =>
    clashes.has(trip.id) || noteOf(trip)?.tone === "red"
      ? [several ? `trip ${index + 1} (${whenOf(trip)})` : "your trip"]
      : [],
  );
  const blocked = !complete
    ? "Your trips are being priced. One moment."
    : red.length > 0
      ? `Change or remove ${red.join(", ")} first: ${
          red.length === 1 ? "it is" : "they are"
        } marked in red.`
      : null;

  const arrivingAt = trips.filter((t) => isAirportPlace(t.pickup));
  const departingAt = trips.filter(
    (t) => t.dropoff !== null && isAirportPlace(t.dropoff),
  );
  const entries: [string, string][] = [
    ...tripItemEntries(trips),
    ...trips.map((_, index): [string, string] => [
      tripItemField(index + 1, CONFIRM_FIELDS.shownSen),
      String(priceOn(index) ?? 0),
    ]),
    ...(card
      ? [[CONFIRM_FIELDS.vehicleClass, card.id] as [string, string]]
      : []),
    [CONFIRM_FIELDS.passengers, String(passengers)],
  ];

  const timeline = (
    <TripTimeline
      trips={trips}
      fullRoutes
      className=""
      action={
        <Link
          href={vehiclePage}
          className="hidden text-copy text-link lg:inline"
        >
          Edit trips
        </Link>
      }
      priceOf={(trip) => {
        const index = trips.findIndex((t) => t.id === trip.id);
        if (!quotes[index]) {
          return <span className="text-muted">…</span>;
        }
        const price = priceOn(index);
        return price === null ? null : formatMyr(price);
      }}
      noteOf={noteOf}
    />
  );

  const tripsPanel = (
    <section aria-label="Your trips" className={panelFromLarge}>
      {timeline}
      {error ? (
        <div className="mx-1 mt-3 flex flex-wrap items-baseline gap-x-1 text-copy">
          <FormError size="copy" error={error} />
          <button type="button" onClick={retry} className="text-link">
            Try again
          </button>
        </div>
      ) : pricing && complete ? (
        <p
          role="status"
          className="mx-1 mt-3 flex items-center text-copy text-muted"
        >
          <Pending>Checking today&apos;s prices…</Pending>
        </p>
      ) : null}
    </section>
  );

  const vehiclePanel = card ? (
    <section className={`${panelFromLarge} grid gap-5`}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-serif text-2xl leading-tight">Your vehicle</h2>
        <Link
          href={vehiclePage}
          className="hidden text-copy text-link lg:inline"
        >
          Change
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-[minmax(0,300px)_minmax(0,1fr)] sm:items-center sm:gap-6">
        {card.imageUrl ? (
          <ClassPicture
            src={card.imageUrl}
            sizes="(min-width: 40rem) 300px, 100vw"
          />
        ) : null}
        <div className="min-w-0">
          <p className="font-serif text-2xl leading-tight text-ink">
            {card.name}
          </p>
          <p className="mt-1.5 text-body">{card.description}</p>
          {card.models.length > 0 ? (
            // A div, not a p: the gallery's dialog is not phrasing content.
            <div className="mt-2 text-copy text-body">
              {modelsLine(card.models.map((m) => m.name))}, or similar.{" "}
              <ModelPhotosButton title={card.name} models={card.models} />
            </div>
          ) : null}
          <p className="mt-3 text-copy text-muted">
            For{" "}
            {trips.length === 2
              ? "both trips"
              : several
                ? `all ${trips.length} trips`
                : "the trip"}{" "}
            · {plural(passengers, "passenger")}
          </p>
        </div>
      </div>
    </section>
  ) : null;

  return (
    <>
      <StepTitle category={category} count={trips.length} />

      <div className={columns}>
        {/* In view while the details scroll, unless it is the taller side.
            On a phone its parts are the page's own, so the fold pins all the way down. */}
        <div className={`contents lg:block ${pinnedSide}`}>
          <TripsFold
            trips={trips}
            summary={
              card ? `${card.name} · ${plural(passengers, "passenger")}` : null
            }
            attention={red.length > 0 || error !== null}
            label="Your trips and vehicle"
            className={`${surface} lg:rounded-none lg:bg-transparent lg:shadow-none`}
          >
            <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:gap-7">
              {tripsPanel}
              {vehiclePanel}
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full lg:hidden"
              >
                <Link href={vehiclePage}>Edit trips or vehicle</Link>
              </Button>
            </div>
          </TripsFold>
        </div>
        <div>
          <section aria-labelledby="details" className={panel}>
            <h2 id="details" className="mb-4 font-serif text-2xl">
              Your details
            </h2>
            <ConfirmForm
              category={category}
              entries={entries}
              totalSen={totalSen}
              cancellation={cancellation}
              blocked={blocked}
              forDriver={forDriver}
              arriving={
                arrivingAt.length > 0
                  ? placesLine(arrivingAt, (t) => t.pickup.label)
                  : null
              }
              departing={
                departingAt.length > 0
                  ? placesLine(departingAt, (t) => t.dropoff?.label ?? "")
                  : null
              }
              onForDriver={(change) =>
                updatePlan((now) => ({
                  ...now,
                  forDriver: { ...now.forDriver, ...change },
                }))
              }
              onDone={(href) => {
                toast.success("Booking received");
                setBooked(true);
                router.replace(href);
                clearPlan();
              }}
              onRepriced={retry}
              defaultName={defaultName}
              defaultPhone={defaultPhone}
              accountEmail={accountEmail}
              signInHref={signInHref}
            />
          </section>
        </div>
      </div>

      {newBooking.dialog}
    </>
  );
}

/** The page's title: the category, how many trips when several, and that nothing is paid yet. */
function StepTitle({
  category,
  count,
}: {
  category: TripCategory;
  count: number;
}) {
  return (
    <BookingStepTitle
      category={category}
      count={count}
      title="Confirm your booking."
    >
      {count > 1 ? "Every trip is priced" : "Your trip is priced"} with
      today&apos;s rates. Nothing is booked until you confirm, and you pay
      nothing now.
    </BookingStepTitle>
  );
}

/**
 * The page while the browser's trips are read: its title as it reads for
 * one trip, then bones about the height of its two sides (on a phone the
 * folded line, then the details), so the page and the footer do not jump
 * when they come.
 */
function ConfirmStepSkeleton({ category }: { category: TripCategory }) {
  return (
    <>
      <StepTitle category={category} count={1} />
      <Loading className={columns}>
        <div className="grid gap-6 lg:gap-7">
          <FoldedTripsBones className={surface} />
          <div className={`hidden lg:block ${panelFromLarge}`}>
            <Bone className="h-24 w-full" />
          </div>
          <div className={`hidden lg:grid lg:gap-5 ${panelFromLarge}`}>
            <Bone className="h-8 w-40" />
            <div className="grid grid-cols-[minmax(0,300px)_minmax(0,1fr)] items-center gap-6">
              <Bone className="aspect-[3/2] w-full" />
              <div className="grid gap-2">
                <Bone className="h-7 w-32" />
                <Bone className="h-4 w-full" />
                <Bone className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        </div>
        <div className={`${panel} grid gap-4`}>
          <Bone className="mb-1 h-8 w-36" />
          {[0, 1, 2, 3].map((field) => (
            <div key={field}>
              <Bone className="mb-1.5 h-5 w-32" />
              <Bone className={field === 3 ? "h-24 w-full" : "h-12 w-full"} />
              <Bone className="mt-1.5 h-4 w-3/4" />
            </div>
          ))}
          <Bone className="mt-2 h-13 w-full" />
          <Bone className="h-4 w-2/3" />
        </div>
      </Loading>
    </>
  );
}
