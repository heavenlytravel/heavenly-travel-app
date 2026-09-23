"use client";

import { useState } from "react";
import {
  EMPTY_SEARCH,
  PRODUCTS,
  isPlaceKey,
  searchHref,
  type FieldKey,
  type ProductKey,
  type SearchValues,
} from "./search";

/**
 * State for the search boxes. The products and everything computed from them
 * live in ./search, which has no React in it so server pages can read it too.
 */

/**
 * Values shared by every product, so a date or a destination typed for a hotel
 * is still there when the guest switches to attractions.
 */
export function useSearchValues(preset: Partial<SearchValues> = {}) {
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
  initial: ProductKey = "car",
  preset: Partial<SearchValues> = {},
) {
  const [key, setProduct] = useState<ProductKey>(initial);
  const { values, set } = useSearchValues(preset);
  const product = PRODUCTS[key];
  return {
    product,
    setProduct,
    values,
    set,
    href: searchHref([product], product.fields, values),
  };
}
