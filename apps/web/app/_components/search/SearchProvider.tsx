"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isTripMode,
  offersDropoffAddress,
  type BBox,
  type LocationSearch,
} from "@repo/db";
import type { PlacePresets } from "@repo/ui/place-input";
import { checkTripAction } from "../../_location/actions";
import type { FieldKey, ProductKey, SearchValues } from "../../_lib/search";
import type { TripSearchIssue } from "../../_lib/transportation-booking";
import { useSearch } from "../../_lib/useSearch";

/**
 * Holds the search card's state above the card, so something else on the
 * page can fill a place into it: a highlight's "Take me here" fills the
 * drop-off. Filling brings
 * the card into view. On a location's pages the provider sits in the
 * layout, so what was typed stays while the customer moves between them,
 * and with `location` the card keeps to the location: the pick-up
 * suggests places in the districts its zones lie in, the drop-off follows
 * its rule, and the places are checked when the customer asks for prices.
 * See @repo/db's location-search.
 */

/** The id of the element that holds the card; filling scrolls to it. */
export const SEARCH_CARD_ID = "booking";

type SearchCard = ReturnType<typeof useSearch> & {
  /** What the empty drop-off offers when it is opened. */
  dropoffs?: PlacePresets;
  /** Changes a field; a pick reports its autocomplete session too. */
  set: (
    key: FieldKey,
    value: string,
    placeId?: string,
    sessionToken?: string,
  ) => void;
  /** The box a place field suggests places in; none to search all of Malaysia. */
  withinOf: (key: FieldKey) => BBox | undefined;
  /**
   * On a location's pages, why the places picked cannot be booked there,
   * one per field; asked once the card has a trip to send. None elsewhere.
   */
  checkPlaces?: (values: SearchValues) => Promise<TripSearchIssue[]>;
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
  dropoffs,
  location,
  children,
}: {
  /** The tab the card opens on, and moves to when this changes. */
  product?: ProductKey;
  dropoffs?: PlacePresets;
  /** The location whose pages hold the card, and what its search keeps to. */
  location?: { slug: string; preview: boolean; search: LocationSearch };
  children: ReactNode;
}) {
  const search = useSearch(product);
  const { set: setValue, setProduct } = search;
  // A product page opens the card on its tab. A page with no product of its
  // own leaves the tab where the customer put it.
  const [opened, setOpened] = useState(product);
  if (product !== opened) {
    setOpened(product);
    if (product) setProduct(product);
  }

  // The autocomplete session each place field's pick came from, for the
  // check's details call; a preset or a filled place has none.
  const sessions = useRef<Partial<Record<FieldKey, string>>>({});

  function set(
    key: FieldKey,
    value: string,
    placeId?: string,
    sessionToken?: string,
  ) {
    setValue(key, value, placeId);
    sessions.current[key] = placeId ? sessionToken : undefined;
  }

  function withinOf(key: FieldKey): BBox | undefined {
    if (!location) return undefined;
    if (key === "from") return location.search.pickup ?? undefined;
    if (key === "to") return location.search.dropoff ?? undefined;
    return undefined;
  }

  const checkPlaces = location
    ? (values: SearchValues) => {
        const pickupId = values.placeIds.from;
        const dropoffId = values.placeIds.to;
        if (!pickupId) return Promise.resolve([]);
        const oneway = !isTripMode(values.mode) || values.mode === "oneway";
        const pickup = {
          placeId: pickupId,
          sessionToken: sessions.current.from,
        };
        const dropoff =
          oneway && dropoffId
            ? { placeId: dropoffId, sessionToken: sessions.current.to }
            : null;
        // The check's details calls end these sessions: a second check, after
        // a place refused, sends none for the place kept.
        sessions.current.from = undefined;
        if (dropoff) sessions.current.to = undefined;
        return checkTripAction({
          slug: location.slug,
          preview: location.preview,
          pickup,
          dropoff,
        });
      }
    : undefined;

  const offersDropoff = (placeId: string) =>
    !location || offersDropoffAddress(location.search, placeId);

  const offered = location
    ? dropoffs && {
        ...dropoffs,
        options: dropoffs.options.filter((option) =>
          offersDropoff(option.placeId),
        ),
      }
    : dropoffs;

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
        set,
        dropoffs: offered,
        withinOf,
        checkPlaces,
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
