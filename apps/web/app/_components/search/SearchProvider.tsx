"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  offersDropoffAddress,
  offersPickupAddress,
  type BBox,
  type LocationSearch,
} from "@repo/db";
import { scrollBehavior } from "@repo/ui/motion";
import type { PlacePresets } from "@repo/ui/place-input";
import {
  PRODUCTS,
  SEARCH_CARD_ID,
  type FieldKey,
  type Product,
  type ProductKey,
} from "../../_lib/search";
import { useTripRows, type TripRows } from "./useTripRows";

/**
 * Holds the search card's state above the card, so something else on the
 * page can fill a place into it: a place's "Take Me Here" fills the
 * drop-off of the last trip. Filling brings the card into view.
 * The card's trips and the group's size live here:
 * on a location's pages the provider sits in the layout, so what was
 * typed stays while the customer moves between them. With `location` the
 * card starts at the location: the place fields search all of Malaysia
 * with the location's area first, and each empty field offers the saved
 * addresses its end of a trip from there may be at. "Search" sends
 * the trips to the vehicle page as the home page's card does, and that
 * page prices each at the location that picks up there, or says why none
 * can. See @repo/db's location-search and docs/261027-multi-trip-booking.md.
 */

type SearchCard = {
  product: Product;
  setProduct: (key: ProductKey) => void;
  /** The trips being typed, a row of the form each. */
  trips: TripRows;
  /** The most travelling on any trip. */
  passengers: number;
  setPassengers: (passengers: number) => void;
  /** What a place field offers when it is opened empty; none to offer nothing. */
  presetsOf: (key: FieldKey) => PlacePresets | undefined;
  /** The box whose places the place fields suggest first; none to suggest all of Malaysia alike. */
  near?: BBox;
  /** Fills the drop-off of the trip being typed with an exact place, as a one-way trip. */
  fillDropoff: (place: { label: string; placeId: string }) => void;
  /** Whether a trip may end at a saved address: on a location's pages, by its rule. */
  offersDropoff: (placeId: string) => boolean;
};

const SearchCardContext = createContext<SearchCard | null>(null);

function bringIntoView() {
  document
    .getElementById(SEARCH_CARD_ID)
    ?.scrollIntoView({ behavior: scrollBehavior(), block: "center" });
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
  const [key, setProduct] = useState<ProductKey>(product ?? "car-with-driver");
  const [passengers, setPassengers] = useState(0);
  const trips = useTripRows();
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
  function presetsOf(field: FieldKey): PlacePresets | undefined {
    const offers =
      field === "from" ? offersPickup : field === "to" ? offersDropoff : null;
    if (!saved || !offers) return undefined;
    return {
      ...saved,
      options: saved.options.filter((option) => offers(option.placeId)),
    };
  }

  function fillDropoff(place: { label: string; placeId: string }) {
    // As a one-way trip: a hire asks its drop-off only when ticked.
    trips.fill({
      mode: "oneway",
      to: place.label,
      placeIds: { to: place.placeId },
    });
    bringIntoView();
  }

  return (
    <SearchCardContext
      value={{
        product: PRODUCTS[key],
        setProduct,
        trips,
        passengers,
        setPassengers,
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
