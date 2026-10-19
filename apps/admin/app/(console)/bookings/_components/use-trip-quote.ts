"use client";

import { useRef, useTransition } from "react";
import { quoteTripAction } from "../_lib/quote-action";
import {
  tripInput,
  tripIssue,
  type ItemDraft,
  type TripValues,
} from "../_lib/trip-form";

/**
 * The prices of an item's trip, kept in step with the trip: every change
 * that leaves the trip complete asks the server again, with no button to
 * press, and only the answer for the trip as it last stood is kept. A
 * changed trip clears the prices at once, since they no longer apply; the
 * class chosen stays chosen when the new prices still offer it, so moving
 * a pick-up by half an hour does not lose the vehicle, and so does the
 * model when the class still shows it.
 */
export function useTripQuote(
  draft: ItemDraft,
  onChange: (patch: Partial<ItemDraft>) => void,
) {
  const [quoting, startQuote] = useTransition();
  // The trip each request was for, by number; an older answer is dropped.
  const latest = useRef(0);

  function quote(
    trip: TripValues,
    keepClassId: string | null,
    keepModelId: string | null,
  ) {
    const ticket = ++latest.current;
    if (tripIssue(trip)) return;
    startQuote(async () => {
      const result = await quoteTripAction(tripInput(trip));
      if (ticket !== latest.current) return;
      if (!result.ok) {
        onChange({ quote: null, quoteError: result.error });
        return;
      }
      const kept = result.classes.find(
        (c) => c.id === keepClassId && c.unavailable === null,
      );
      const keptModel = kept?.models.some((m) => m.id === keepModelId);
      onChange({
        quote: result,
        quoteError: null,
        vehicleClassId: kept ? keepClassId : null,
        vehicleModelId: keptModel ? keepModelId : null,
      });
    });
  }

  /** Changes the trip and prices it again once it is complete. */
  function changeTrip(patch: Partial<TripValues>) {
    const trip = { ...draft.trip, ...patch };
    onChange({ trip, quote: null, quoteError: null });
    quote(trip, draft.vehicleClassId, draft.vehicleModelId);
  }

  /** Asks again for the trip as it stands, after a failure. */
  function retry() {
    quote(draft.trip, draft.vehicleClassId, draft.vehicleModelId);
  }

  return { quoting, changeTrip, retry };
}
