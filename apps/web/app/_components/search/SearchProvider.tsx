"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  offersDropoffAddress,
  offersPickupAddress,
  type BBox,
  type LocationSearch,
} from "@repo/db";
import type { PlacePresets } from "@repo/ui/place-input";
import {
  SEARCH_CARD_ID,
  type FieldKey,
  type ProductKey,
} from "../../_lib/search";
import { useSearch } from "../../_lib/useSearch";

/**
 * Holds the search card's state above the card, so something else on the
 * page can fill a place into it: a place's "Take me here" fills the
 * drop-off. Filling brings
 * the card into view. On a location's pages the provider sits in the
 * layout, so what was typed stays while the customer moves between them,
 * and with `location` the card starts at the location: the place fields
 * search all of Malaysia with the location's area first, and each empty
 * field offers the saved addresses its end of a trip from there may be
 * at. Whatever the trip, "Get my price" sends it to the options page as
 * the home page's card does, and that page prices it at the location
 * that picks up there, or says why none can. See @repo/db's
 * location-search.
 */

type SearchCard = ReturnType<typeof useSearch> & {
  /** What a place field offers when it is opened empty; none to offer nothing. */
  presetsOf: (key: FieldKey) => PlacePresets | undefined;
  /** The box whose places the place fields suggest first; none to suggest all of Malaysia alike. */
  near?: BBox;
  /** Fills the drop-off with an exact place, ready to send, on a one-way trip. */
  fillDropoff: (place: { label: string; placeId: string }) => void;
  /** Whether a trip may end at a saved address: on a location's pages, by its rule. */
  offersDropoff: (placeId: string) => boolean;
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
  saved,
  location,
  children,
}: {
  /** The tab the card opens on, and moves to when this changes. */
  product?: ProductKey;
  /**
   * The saved addresses the empty place fields offer, under their heading.
   * With `location`, each field offers those its end of a trip may be at.
   */
  saved?: PlacePresets;
  /** Where the card starts on the location's pages that hold it. */
  location?: LocationSearch;
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

  const offersDropoff = (placeId: string) =>
    !location || offersDropoffAddress(location, placeId);
  const offersPickup = (placeId: string) =>
    !location || offersPickupAddress(location, placeId);

  /** The saved addresses the field offers: those its end of a trip may be at. */
  function presetsOf(key: FieldKey): PlacePresets | undefined {
    const offers =
      key === "from" ? offersPickup : key === "to" ? offersDropoff : null;
    if (!saved || !offers) return undefined;
    return {
      ...saved,
      options: saved.options.filter((option) => offers(option.placeId)),
    };
  }

  function fillDropoff(place: { label: string; placeId: string }) {
    // An hourly trip has no drop-off.
    set("mode", "oneway");
    set("to", place.label, place.placeId);
    bringIntoView();
  }

  return (
    <SearchCardContext
      value={{
        ...search,
        presetsOf,
        near: location?.near ?? undefined,
        fillDropoff,
        offersDropoff,
      }}
    >
      {children}
    </SearchCardContext>
  );
}

export function useSearchCard(): SearchCard {
  const card = useContext(SearchCardContext);
  if (!card) throw new Error("useSearchCard needs a SearchProvider above it.");
  return card;
}
