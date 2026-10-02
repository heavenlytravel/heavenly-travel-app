"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { PlacePresets } from "@repo/ui/place-input";
import type { ProductKey } from "../../_lib/search";
import { useSearch } from "../../_lib/useSearch";

/**
 * Holds the search card's state above the card, so something else on the
 * page can fill a place into it: the home page's airport card fills the
 * pick-up, a highlight's "Take me here" fills the drop-off. Filling brings
 * the card into view. On a location's pages the provider sits in the
 * layout, so what was typed stays while the customer moves between them.
 */

/** The id of the element that holds the card; filling scrolls to it. */
export const SEARCH_CARD_ID = "booking";

type SearchCard = ReturnType<typeof useSearch> & {
  /** What the empty drop-off offers when it is opened. */
  dropoffs?: PlacePresets;
  /** Fills the pick-up with a name. It is text, not a place: the customer picks from the list. */
  fillPickup: (name: string) => void;
  /** Fills the drop-off with an exact place, ready to send, on a one-way trip. */
  fillDropoff: (place: { label: string; placeId: string }) => void;
};

const SearchCardContext = createContext<SearchCard | null>(null);

function bringIntoView() {
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(SEARCH_CARD_ID)
    ?.scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "center" });
}

export function SearchProvider({
  product,
  dropoffs,
  children,
}: {
  /** The tab the card opens on, and moves to when this changes. */
  product?: ProductKey;
  dropoffs?: PlacePresets;
  children: ReactNode;
}) {
  const search = useSearch(product);
  const { set, setProduct } = search;
  // A product page opens the card on its tab. A page with no product of its
  // own leaves the tab where the customer put it.
  const [opened, setOpened] = useState(product);
  if (product !== opened) {
    setOpened(product);
    if (product) setProduct(product);
  }

  function fillPickup(name: string) {
    set("from", name);
    set("place", name);
    bringIntoView();
  }

  function fillDropoff(place: { label: string; placeId: string }) {
    // An hourly trip has no drop-off.
    set("mode", "oneway");
    set("to", place.label, place.placeId);
    bringIntoView();
  }

  return (
    <SearchCardContext value={{ ...search, dropoffs, fillPickup, fillDropoff }}>
      {children}
    </SearchCardContext>
  );
}

export function useSearchCard(): SearchCard {
  const card = useContext(SearchCardContext);
  if (!card) throw new Error("useSearchCard needs a SearchProvider above it.");
  return card;
}
