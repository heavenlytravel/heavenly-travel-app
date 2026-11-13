"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { plural, type TripCategory } from "@repo/db";
import { Button } from "@repo/ui/button";
import { FormError } from "@repo/ui/form-error";
import { Bone, Loading } from "@repo/ui/skeleton";
import { ClassPicture } from "../../../../../_components/ClassPicture";
import { planPrices } from "../../../../../_lib/trip-plan";
import { updatePlan, useTripPlan } from "../../../../../_lib/trip-plan-store";
import {
  tripBookingPath,
  tripConfirmPath,
} from "../../../../../_lib/transportation-booking";
import { useNavigate } from "../../../../../_lib/useNavigate";
import { panel, Pending, Stop } from "../../../../_components/Page";
import { forWhichOf, guideAddOnOf } from "../plan-add-ons";
import { BookingStepTitle } from "../StepParts";
import { usePlanPricing } from "../usePlanPricing";
import { AddOns } from "./AddOns";

/**
 * The add-ons step, after the vehicle and before the details: the vehicle
 * chosen, with "Change", then what the trips can take with it, the tour
 * guide in a language on sale for every trip (./AddOns), and Book now to
 * the details. With nothing to offer once every trip is priced, it goes
 * on to the details by itself, so the step is skipped. The choice is the
 * plan's, which the confirm step prices and posts.
 */
export function AddOnsStep({ category }: { category: TripCategory }) {
  const plan = useTripPlan();
  const router = useRouter();
  const { pending: continuing, go } = useNavigate();
  const { error, retry } = usePlanPricing(
    plan?.category === category ? plan : null,
  );
  const ready = plan !== null && plan.category === category;
  const prices = ready
    ? planPrices(plan.trips, plan.priced, plan.passengers)
    : null;
  const addOn =
    ready && prices
      ? guideAddOnOf({
          category,
          trips: plan.trips,
          priced: plan.priced,
          complete: prices.complete,
          guide: plan.guide,
        })
      : null;
  const nothingToOffer =
    prices !== null &&
    prices.complete &&
    prices.failed.length === 0 &&
    addOn !== null &&
    addOn.offers.length === 0;

  // Nothing to add: the details come next, in this step's place.
  useEffect(() => {
    if (nothingToOffer) router.replace(tripConfirmPath(category));
  }, [nothingToOffer, router, category]);

  if (!ready || !prices || !addOn)
    return <AddOnsSkeleton category={category} />;
  if (plan.trips.length === 0) {
    return (
      <Stop
        level={1}
        title="Start with a search"
        message="Tell us where and when you need a driver, and we will show you prices."
        linkLabel="Search for a Trip"
      />
    );
  }
  const chosen = prices.choices.find((c) => c.card.id === plan.classId);
  if (prices.complete && !chosen) {
    return (
      <Stop
        level={1}
        title="Choose a vehicle first"
        message="One vehicle does every trip. Choose it, then add what you need."
        href={tripBookingPath(category)}
        linkLabel="Choose a Vehicle"
      />
    );
  }
  if (nothingToOffer || !prices.complete || !chosen) {
    return (
      <>
        <StepTitle category={category} count={plan.trips.length} />
        <p role="status" className={`${panel} flex items-center text-muted`}>
          {error ? (
            <span className="flex flex-wrap items-baseline gap-x-1">
              <FormError size="copy" error={error} />
              <button type="button" onClick={retry} className="text-link">
                Try Again
              </button>
            </span>
          ) : (
            <Pending>Finding what you can add…</Pending>
          )}
        </p>
      </>
    );
  }

  const { card } = chosen;
  const forWhich = forWhichOf(plan.trips.length);
  return (
    <>
      <StepTitle category={category} count={plan.trips.length} />
      <div className="grid max-w-[760px] gap-6">
        <section className={`${panel} grid gap-4`}>
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-serif text-2xl leading-tight">Your Vehicle</h2>
            <Link
              href={tripBookingPath(category)}
              className="text-copy text-link"
            >
              Change
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-[minmax(0,200px)_minmax(0,1fr)] sm:items-center sm:gap-6">
            <ClassPicture
              pictures={card.imageUrls}
              category={card.category}
              sizes="(min-width: 40rem) 200px, 100vw"
              className="rounded-xl"
            />
            <div className="min-w-0">
              <p className="font-serif text-xl leading-tight text-ink">
                {card.name}
              </p>
              <p className="mt-1.5 text-copy text-muted">
                For {forWhich} · {plural(plan.passengers, "passenger")}
              </p>
            </div>
          </div>
        </section>
        <section aria-labelledby="add-ons" className={`${panel} grid gap-4`}>
          <h2 id="add-ons" className="font-serif text-2xl leading-tight">
            Add-ons
          </h2>
          <AddOns
            offers={addOn.offers}
            guide={addOn.guide}
            required={addOn.required}
            forWhich={`for ${forWhich}`}
            onGuide={(change) =>
              updatePlan((now) => ({
                ...now,
                guide: { ...now.guide, ...change },
              }))
            }
          />
        </section>
        <div className="grid gap-2">
          <Button
            size="lg"
            pending={continuing}
            disabled={addOn.issue !== null}
            onClick={() => {
              // A coach's guide is the first language until one is chosen:
              // kept, so the details price what was shown here.
              updatePlan((now) => ({ ...now, guide: addOn.guide }));
              go(tripConfirmPath(category));
            }}
            className="w-full sm:w-auto sm:justify-self-end sm:px-10"
          >
            Book Now
          </Button>
          {addOn.issue ? <FormError size="copy" error={addOn.issue} /> : null}
        </div>
      </div>
    </>
  );
}

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
      title="Anything to add?"
    >
      Add what your {count > 1 ? "trips need" : "trip needs"}, or go straight
      on. You pay nothing now.
    </BookingStepTitle>
  );
}

/** The page while the browser's trips are read: its title and bones in the shape of its two panels. */
function AddOnsSkeleton({ category }: { category: TripCategory }) {
  return (
    <>
      <StepTitle category={category} count={1} />
      <Loading className="grid max-w-[760px] gap-6">
        <div className={`${panel} grid gap-4`}>
          <Bone className="h-8 w-40" />
          <Bone className="h-28 w-full" />
        </div>
        <div className={`${panel} grid gap-3`}>
          <Bone className="h-8 w-32" />
          <Bone className="h-5 w-3/4" />
          <Bone className="h-5 w-2/3" />
        </div>
      </Loading>
    </>
  );
}
