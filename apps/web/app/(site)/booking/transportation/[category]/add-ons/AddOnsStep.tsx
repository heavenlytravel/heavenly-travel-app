"use client";

import Link from "next/link";
import type { TripCategory } from "@repo/db";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Bone, Loading } from "@repo/ui/skeleton";
import type { AddOn } from "../../../../../_lib/booking-add-ons";
import { useTripPlan } from "../../../../../_lib/trip-plan-store";
import {
  tripBookingPath,
  tripConfirmPath,
} from "../../../../../_lib/transportation-booking";
import { panel, Stop } from "../../../../_components/Page";
import { BookingStepTitle } from "../StepParts";

/**
 * The Add-ons step: each add-on of the category, what it is and for which
 * trips, then Continue to Confirm, at the form's end on a phone too. An
 * included one is shown, with nothing to choose: a coach's tour guide.
 * The trips and the vehicle are the plan's, chosen on the vehicle page,
 * which "Back to vehicles" returns to.
 */
export function AddOnsStep({
  category,
  addOns,
}: {
  category: TripCategory;
  addOns: AddOn[];
}) {
  const plan = useTripPlan();
  if (!plan) return <AddOnsSkeleton category={category} />;
  const vehiclePage = tripBookingPath(category);
  if (plan.category !== category || plan.trips.length === 0) {
    return (
      <Stop
        level={1}
        title="Nothing to add to yet"
        message="Search for a trip. Add as many as your stay needs: one vehicle does them all, and you book them together."
        linkLabel="Search for a trip"
      />
    );
  }
  if (!plan.classId) {
    return (
      <Stop
        level={1}
        title="Choose a vehicle first"
        message="One vehicle does every trip. Choose it, then see what comes with it."
        href={vehiclePage}
        linkLabel="Choose a vehicle"
      />
    );
  }
  const count = plan.trips.length;
  const forWhich =
    count === 1
      ? "For the trip"
      : count === 2
        ? "For both trips"
        : `For all ${count} trips`;

  return (
    <>
      <StepTitle category={category} count={count} />
      <section aria-labelledby="add-ons" className={`${panel} max-w-[720px]`}>
        <h2 id="add-ons" className="mb-4 font-serif text-2xl">
          Add-ons
        </h2>
        <ul className="grid gap-4">
          {addOns.map((addOn) => (
            <li
              key={addOn.key}
              className="grid gap-1.5 border-t border-hairline pt-4 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-center gap-3">
                <p className="font-serif text-xl leading-tight text-ink">
                  {addOn.name}
                </p>
                {addOn.included ? <Badge tone="green">Included</Badge> : null}
              </div>
              <p className="text-body">{addOn.description}</p>
              <p className="text-copy text-muted">{forWhich}</p>
            </li>
          ))}
        </ul>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <Link href={tripConfirmPath(category)}>Continue</Link>
          </Button>
          <Link
            href={vehiclePage}
            className="text-center text-copy text-link sm:text-left"
          >
            Back to vehicles
          </Link>
        </div>
      </section>
    </>
  );
}

/** The page's title: the category, how many trips when several, and what the step is. */
function StepTitle({
  category,
  count,
}: {
  category: TripCategory;
  count: number;
}) {
  return (
    <BookingStepTitle category={category} count={count} title="Add-ons.">
      What comes with your vehicle. Nothing is booked until you confirm.
    </BookingStepTitle>
  );
}

/** The page while the browser's trips are read: its title, then bones in the card's shape. */
function AddOnsSkeleton({ category }: { category: TripCategory }) {
  return (
    <>
      <StepTitle category={category} count={1} />
      <Loading className={`${panel} grid max-w-[720px] gap-3`}>
        <Bone className="mb-1 h-8 w-32" />
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-full" />
        <Bone className="h-4 w-28" />
        <Bone className="mt-4 h-13 w-full sm:w-36" />
      </Loading>
    </>
  );
}
