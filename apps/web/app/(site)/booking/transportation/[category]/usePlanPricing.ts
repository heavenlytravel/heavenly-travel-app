"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { tripSearchParams } from "@repo/db";
import { answerOf } from "@repo/ui/action-answer";
import {
  keepQuotes,
  needsPricing,
  searchOfTrip,
  tripKey,
  type PlannedTrip,
} from "../../../../_lib/trip-plan";
import {
  currentPlan,
  updatePlan,
  type TripPlan,
} from "../../../../_lib/trip-plan-store";
import { quoteTripsAction } from "./actions";

const listKey = (trips: readonly PlannedTrip[]) => trips.map(tripKey).join("|");

/**
 * Keeps the plan's quotes in step with its trips, on the vehicle and
 * confirm pages: a trip added or changed, or quotes older than
 * `QUOTE_TTL_MS`, price the whole list again in one request, with no
 * button to press; a trip removed sends nothing. Only the answer for the
 * trips as they last stood is kept. A trip that came in a link is named
 * by the answer. A request that fails is not repeated until `retry`.
 */
export function usePlanPricing(plan: TripPlan | null) {
  const [pricing, startPricing] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // The list asked for, while it is in flight or after it failed.
  const asked = useRef<string | null>(null);
  const latest = useRef(0);

  function price() {
    const { category, trips } = currentPlan();
    if (trips.length === 0) return;
    asked.current = listKey(trips);
    const ticket = ++latest.current;
    startPricing(async () => {
      const answer = await answerOf(
        quoteTripsAction(
          category,
          trips.map((trip) => tripSearchParams(searchOfTrip(trip)).toString()),
        ),
      );
      if (ticket !== latest.current) return;
      if (!("ok" in answer) || !answer.ok) {
        setError(answer.error);
        return;
      }
      setError(null);
      asked.current = null;
      updatePlan((now) => ({
        ...now,
        trips: now.trips.map((trip) => {
          const index = trips.findIndex((t) => t.id === trip.id);
          const view = answer.trips[index];
          if (!view?.ok || tripKey(trip) !== tripKey(trips[index]!)) {
            return trip;
          }
          return {
            ...trip,
            pickup: {
              ...trip.pickup,
              label: trip.pickup.label || view.pickup,
            },
            dropoff:
              trip.dropoff && view.dropoff
                ? {
                    ...trip.dropoff,
                    label: trip.dropoff.label || view.dropoff,
                  }
                : trip.dropoff,
          };
        }),
        priced: keepQuotes(now.priced, trips, answer, Date.now()),
      }));
    });
  }

  useEffect(() => {
    if (!plan || asked.current === listKey(plan.trips)) return;
    if (!needsPricing(plan.priced, plan.trips, Date.now())) return;
    price();
  });

  function retry() {
    setError(null);
    price();
  }

  return { pricing, error, retry };
}
