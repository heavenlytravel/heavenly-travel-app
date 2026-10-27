"use client";

import type { TripCategory } from "@repo/db";
import { useConfirm } from "@repo/ui/alert-dialog";
import { sameTrips, type PlannedTrip } from "../../_lib/trip-plan";
import { currentPlan, startPlan, updatePlan } from "../../_lib/trip-plan-store";

/**
 * A new search in place of the trips the customer already has: it asks
 * first, saying the flight numbers and the note go too. The same trips
 * again, or none before, need no question. Render `dialog` once.
 */
export function useNewBooking() {
  const [dialog, confirm] = useConfirm();

  /** Starts the plan on these trips and this group, once the customer agrees; false when they keep theirs. */
  async function start(
    category: TripCategory,
    trips: PlannedTrip[],
    passengers: number,
  ) {
    const plan = currentPlan();
    if (plan.trips.length > 0 && !sameTrips(plan.trips, trips)) {
      const one = plan.trips.length === 1;
      const yes = await confirm({
        title: "Start a new booking?",
        description: `This search takes the place of the ${
          one ? "trip" : `${plan.trips.length} trips`
        } you have, with the flight numbers and notes for the driver. You cannot undo this.`,
        action: "Start a new booking",
        cancel: one ? "Keep my trip" : "Keep my trips",
        danger: true,
      });
      if (!yes) return false;
    }
    if (sameTrips(plan.trips, trips) && plan.category === category) {
      // The same trips: keep what was chosen for them.
      updatePlan((now) => ({ ...now, passengers }));
    } else {
      startPlan(category, trips, passengers);
    }
    return true;
  }

  return { dialog, start };
}
