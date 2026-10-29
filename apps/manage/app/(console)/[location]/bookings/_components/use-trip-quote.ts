"use client";

import { answerOf } from "@repo/ui/action-answer";
import { useRef, useTransition } from "react";
import { quoteTripAction } from "../_lib/quote-action";
import {
  tripInput,
  tripIssue,
  type TripDraft,
  type TripValues,
} from "../_lib/trip-form";

/**
 * The prices of one trip, kept in step with the trip: every change that
 * leaves the trip complete asks the server again, with no button to
 * press, and only the answer for the trip as it last stood is kept. A
 * changed trip clears its prices at once, since they no longer apply. The
 * vehicle chosen is the form's: it stays chosen while the new prices still
 * let it do every trip, so moving a pick-up by half an hour does not lose
 * it.
 */
export function useTripQuote(
  draft: TripDraft,
  onChange: (patch: Partial<TripDraft>) => void,
) {
  const [quoting, startQuote] = useTransition();
  // The trip each request was for, by number; an older answer is dropped.
  const latest = useRef(0);

  function quote(trip: TripValues) {
    const ticket = ++latest.current;
    if (tripIssue(trip)) return;
    startQuote(async () => {
      const result = await answerOf(quoteTripAction(tripInput(trip)));
      if (ticket !== latest.current) return;
      onChange(
        "error" in result
          ? { quote: null, quoteError: result.error }
          : { quote: result, quoteError: null },
      );
    });
  }

  /** Changes the trip and prices it again once it is complete. */
  function changeTrip(patch: Partial<TripValues>) {
    const trip = { ...draft.trip, ...patch };
    onChange({ trip, quote: null, quoteError: null });
    quote(trip);
  }

  /** Asks again for the trip as it stands, after a failure. */
  function retry() {
    quote(draft.trip);
  }

  return { quoting, changeTrip, retry };
}
