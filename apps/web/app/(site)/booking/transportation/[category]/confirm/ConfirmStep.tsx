"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  bookingModelChoices,
  choosableModel,
  formatMyr,
  isAirportPlace,
  TRIP_CATEGORY_LABELS,
  tripItemField,
  type TripCategory,
  type TripOptions,
  type TripSearch,
} from "@repo/db";
import { BedIcon, FileTextIcon } from "@repo/ui/icons";
import { toast } from "@repo/ui/toast";
import { ClassPicture } from "../../../../../_components/ClassPicture";
import { ProductIcon } from "../../../../../_components/Brand";
import {
  ModelGallery,
  type GalleryModel,
} from "../../../../../_components/ModelGallery";
import {
  TripTimeline,
  type TripNote,
} from "../../../../../_components/trips/TripTimeline";
import { useLinkSeed } from "../../../../../_components/trips/useLinkSeed";
import { useNewBooking } from "../../../../../_components/trips/useNewBooking";
import {
  classOnTrip,
  clashesOf,
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
  PageTitle,
  panel,
  Pending,
  primaryButton,
  Stop,
  textLink,
} from "../../../../_components/Page";
import { ModelChoice } from "../ModelChoice";
import { usePlanPricing } from "../usePlanPricing";
import { ConfirmForm } from "./ConfirmForm";
import { CONFIRM_FIELDS } from "./fields";

/** What a link brought: today's one-trip confirm address, read as a plan of one. */
export type ConfirmSeed = { search: TripSearch; options: TripOptions };

/** "Langkawi International Airport on Tue, 3 Nov", and how many more. */
function placesLine(trips: PlannedTrip[], at: (trip: PlannedTrip) => string) {
  const first = trips[0]!;
  return `${at(first)} on ${shortDayOf(first)}${
    trips.length > 1 ? `, and ${trips.length - 1} more` : ""
  }`;
}

/**
 * The confirm step, laid out as B: the trips and the vehicle on the left,
 * "Your details" on the right, which stay in view while the left side
 * scrolls. The trips are shown, priced with today's rates, not changed:
 * "Edit trips" goes back to the vehicle page, where they are changed or
 * added and the vehicle chosen again. A trip that cannot be booked as it
 * is says so under it: it starts with another or during a hire, the
 * vehicle needs more notice or hours for it, or it cannot be priced; so
 * does a price changed since the trip was added. "Your vehicle" has the
 * class for all the trips, the group, the model chosen once for them all
 * where every trip's location lets the customer choose, the total, and
 * the products coming later. The details ask the contact, the flights for
 * the trips at an airport, and one note for the drivers; the button says
 * which trip to fix while any is red. A link with today's one-trip
 * confirm address still opens it, as a plan of one. See
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
        modelId: options.vehicleModelId,
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
  const [gallery, setGallery] = useState<GalleryModel | null>(null);

  if (booked) {
    return (
      <p className={`${panel} flex max-w-[560px] items-center text-slate-600`}>
        <Pending>Booked. Opening your booking…</Pending>
      </p>
    );
  }
  if (!plan || !seeded) return newBooking.dialog;
  if (plan.category !== category || plan.trips.length === 0) {
    return (
      <Stop
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
  const models = card
    ? bookingModelChoices(
        card.models,
        onTrip.map((here) => ({
          modelChoiceSen: here?.modelChoiceSen ?? null,
          modelIds: here?.modelIds ?? [],
        })),
      )
    : [];
  const model = choosableModel(
    models.map((m) => m.model),
    models.length > 0,
    plan.modelId,
  );
  const percents = new Set(onTrip.map((here) => here?.modelChoicePercent));
  const chargePercent = percents.size === 1 ? ([...percents][0] ?? null) : null;
  /** A trip's price in the chosen vehicle, with the model's charge on it. */
  const priceOn = (index: number) => {
    const here = onTrip[index];
    if (!here || here.totalSen === null || !here.availability.ok) {
      return null;
    }
    return here.totalSen + (model ? (here.modelChoiceSen ?? 0) : 0);
  };
  const totalSen = trips.reduce(
    (sum, _, index) => sum + (priceOn(index) ?? 0),
    0,
  );
  const cutoffs = new Set(onTrip.map((p) => p?.cancellationCutoffHours));
  const cutoff = cutoffs.size === 1 ? [...cutoffs][0] : undefined;

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
    ...(model
      ? [[CONFIRM_FIELDS.vehicleModel, model.id] as [string, string]]
      : []),
    [CONFIRM_FIELDS.passengers, String(passengers)],
  ];

  const tripsPanel = (
    <section className={panel}>
      <TripTimeline
        trips={trips}
        className=""
        action={
          <Link href={vehiclePage} className={`text-[0.92rem] ${textLink}`}>
            Edit trips
          </Link>
        }
        priceOf={(trip) => {
          const index = trips.findIndex((t) => t.id === trip.id);
          if (!quotes[index]) {
            return <span className="text-slate-400">…</span>;
          }
          const price = priceOn(index);
          return price === null ? null : formatMyr(price);
        }}
        noteOf={noteOf}
      />
      {error ? (
        <p role="alert" className="mx-1 mt-3 text-[0.92rem] text-[#b3261e]">
          {error}{" "}
          <button type="button" onClick={retry} className={textLink}>
            Try again
          </button>
        </p>
      ) : pricing && complete ? (
        <p className="mx-1 mt-3 flex items-center text-[0.9rem] text-slate-500">
          <Pending>Checking today&apos;s prices…</Pending>
        </p>
      ) : null}
    </section>
  );

  const vehiclePanel = card ? (
    <section className={`${panel} grid gap-5`}>
      <h2 className="font-(family-name:--font-display) text-[1.5rem] leading-tight">
        Your vehicle
      </h2>
      <div className="flex items-center gap-4">
        <ClassPicture
          src={card.imageUrl}
          sizes="96px"
          className="w-[72px] shrink-0 sm:w-24"
        />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-ink">
            {card.name}{" "}
            <span className="font-semibold text-slate-500">
              for{" "}
              {trips.length === 2
                ? "both trips"
                : several
                  ? `all ${trips.length} trips`
                  : "the trip"}
            </span>
          </p>
          <p className="text-[0.9rem] text-slate-600">
            {model ? model.name : "Any model"} · {passengers}{" "}
            {passengers === 1 ? "passenger" : "passengers"}
          </p>
        </div>
        <Link href={vehiclePage} className={`text-[0.92rem] ${textLink}`}>
          Change
        </Link>
      </div>
      {models.length > 0 ? (
        <div className="-mx-5 -mb-1 sm:-mx-6">
          <ModelChoice
            vehicleClassName={card.name}
            models={models.map((m) => m.model)}
            chargeSen={models[0]!.chargeSen}
            chargePercent={several ? null : chargePercent}
            modelId={model?.id ?? null}
            onChoose={(modelId) => updatePlan((now) => ({ ...now, modelId }))}
            onPhotos={setGallery}
          />
        </div>
      ) : null}
      <div className="border-t border-slate-200 pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-semibold text-slate-700">
            {several ? `${trips.length} trips` : "1 trip"} in the {card.name}
          </span>
          <span className="text-[1.7rem] font-bold text-brand">
            {formatMyr(totalSen)}
          </span>
        </div>
        <p className="mt-2 text-[0.88rem] text-emerald-800">
          {cutoff !== undefined
            ? `Free cancellation until ${cutoff} hours before ${several ? "each trip, each on its own" : "the trip"}.`
            : "Free cancellation until each trip's own cutoff, each on its own."}
        </p>
        <p className="mt-1 text-[0.85rem] text-slate-500">
          Pay nothing now. We confirm your booking by email.
        </p>
      </div>
      <div className="grid gap-2 border-t border-slate-200 pt-4">
        <p className="text-[0.85rem] font-semibold text-slate-500">
          Coming soon to your booking
        </p>
        <Soon icon={<BedIcon className="size-5" />}>A hotel for your stay</Soon>
        <Soon icon={<ProductIcon service="attraction" className="size-5" />}>
          Attraction tickets, on the days you are there
        </Soon>
        <Soon icon={<FileTextIcon className="size-5" />}>
          Paste your itinerary, and we find the trips in it
        </Soon>
      </div>
    </section>
  ) : null;

  return (
    <>
      <PageTitle
        eyebrow={`${TRIP_CATEGORY_LABELS[category]}${several ? ` · ${trips.length} trips` : ""}`}
        title="Confirm your booking."
      >
        {several ? "Every trip is priced" : "Your trip is priced"} with
        today&apos;s rates. Nothing is booked until you confirm, and you pay
        nothing now.
      </PageTitle>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-7 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start lg:pb-0">
        <div className="grid grid-cols-[minmax(0,1fr)] gap-7">
          {tripsPanel}
          {vehiclePanel}
        </div>
        {/* In view while the left side scrolls; scrolls itself when taller than the screen. */}
        <div className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:overflow-y-auto lg:rounded-[18px]">
          <section id="details" className={`${panel} scroll-mt-28`}>
            <h2 className="mb-4 font-(family-name:--font-display) text-[1.5rem]">
              Your details
            </h2>
            <ConfirmForm
              category={category}
              entries={entries}
              totalSen={totalSen}
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

      {/* A phone keeps the total and the way to the details at its foot. */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,38,75,0.12)] lg:hidden">
        <span className="min-w-0 flex-1">
          <b className="block text-[1.2rem] leading-tight text-brand">
            {formatMyr(totalSen)}
          </b>
          <span className="text-[0.8rem] text-slate-500">
            {card ? `${card.name} · ` : ""}
            {several ? `${trips.length} trips` : "1 trip"}
          </span>
        </span>
        <a href="#details" className={`${primaryButton} min-h-[48px] px-4`}>
          Continue
        </a>
      </div>
      {gallery ? (
        <ModelGallery
          title={gallery.name}
          description={`One of the ${card?.name ?? ""} models.`}
          models={[gallery]}
          open
          onOpenChange={(open) => {
            if (!open) setGallery(null);
          }}
        />
      ) : null}
      {newBooking.dialog}
    </>
  );
}

/** Something the booking will hold later, where it will sit. */
function Soon({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border-[1.5px] border-dashed border-[#c5d3e2] px-3 py-2.5 text-[0.9rem] text-slate-500">
      <span className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-slate-100 text-slate-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      <span className="text-[0.6rem] font-bold tracking-[0.12em] text-azure uppercase">
        Soon
      </span>
    </div>
  );
}
