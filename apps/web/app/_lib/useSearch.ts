"use client";

import { useState } from "react";
import type { TripCategory } from "@repo/db";
import {
  tripBookingHref,
  tripSearchFromCard,
  type TripSearchIssue,
} from "./transportation-booking";
import {
  EMPTY_SEARCH,
  PRODUCTS,
  isPlaceKey,
  type FieldKey,
  type ProductKey,
  type SearchValues,
} from "./search";
import { useNavigate } from "./useNavigate";

/**
 * State for the search card. The products and everything computed from them
 * live in ./search, which has no React in it so server pages can read it too.
 */

/**
 * Values shared by every product, so a date or a destination typed for a hotel
 * is still there when the guest switches to attractions.
 */
function useSearchValues(preset: Partial<SearchValues> = {}) {
  const [values, setValues] = useState<SearchValues>({
    ...EMPTY_SEARCH,
    ...preset,
  });
  /**
   * Change one field. A place picked from the autocomplete list comes with
   * its id; typing into the field afterwards drops the id again.
   */
  const set = (key: FieldKey, value: string, placeId?: string) =>
    setValues((v) => {
      const next = { ...v, [key]: value };
      if (isPlaceKey(key)) {
        next.placeIds = { ...v.placeIds, [key]: placeId };
      }
      // An end date can never come before the start date.
      if (next.date && next.endDate && next.endDate < next.date)
        next.endDate = "";
      return next;
    });
  return { values, set };
}

/** State for a search box that asks about one product at a time. */
export function useSearch(
  initial: ProductKey = "car-with-driver",
  preset: Partial<SearchValues> = {},
) {
  const [key, setProduct] = useState<ProductKey>(initial);
  const { values, set } = useSearchValues(preset);
  return { product: PRODUCTS[key], setProduct, values, set };
}

/**
 * Sends a trip to the options page of its category, or keeps the reasons it
 * cannot be sent. The home card and the trip editor both send through here.
 */
export function useTripSubmit() {
  const [issues, setIssues] = useState<TripSearchIssue[]>([]);
  // Pending until the options page has priced the trip and is on screen.
  const { pending, go } = useNavigate();
  /** True when the trip was sent. `passengers` is carried over, if given. */
  function submit(
    category: TripCategory,
    values: SearchValues,
    passengers?: number,
  ) {
    const result = tripSearchFromCard(values);
    setIssues(result.ok ? [] : result.issues);
    if (!result.ok) return false;
    go(tripBookingHref(category, result.params, passengers));
    return true;
  }
  return { issues, pending, submit };
}
