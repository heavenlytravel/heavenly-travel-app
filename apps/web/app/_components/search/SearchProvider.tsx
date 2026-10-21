"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  dropoffBox,
  offersDropoffAddress,
  pickupBox,
  type BBox,
  type LocationSearch,
  type PlaceCheck,
} from "@repo/db";
import type { PlacePresets } from "@repo/ui/place-input";
import { checkPlaceAction } from "../../_location/actions";
import type { FieldKey, ProductKey, SearchValues } from "../../_lib/search";
import type { TripSearchIssue } from "../../_lib/transportation-booking";
import { useSearch } from "../../_lib/useSearch";

/**
 * Holds the search card's state above the card, so something else on the
 * page can fill a place into it: the home page's airport card fills the
 * pick-up, a highlight's "Take me here" fills the drop-off. Filling brings
 * the card into view. On a location's pages the provider sits in the
 * layout, so what was typed stays while the customer moves between them,
 * and with `location` the card keeps to the location: the pick-up
 * suggests places in the districts its zones lie in, the drop-off follows
 * its rule, and a place picked is checked at once, the field saying when
 * the location cannot take it. See @repo/db's location-search.
 */

/** The id of the element that holds the card; filling scrolls to it. */
export const SEARCH_CARD_ID = "booking";

/** The fields a location checks a pick in. */
type CheckedKey = "from" | "to";
const isChecked = (key: FieldKey): key is CheckedKey =>
  key === "from" || key === "to";

/** The check on the place a field holds: asked, or answered. */
type FieldCheck = { placeId: string; answer: PlaceCheck | null };

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
  /** Why a place picked cannot be booked here, one per field. */
  placeIssues: TripSearchIssue[];
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
  const { values, set: setValue, setProduct } = search;
  // A product page opens the card on its tab. A page with no product of its
  // own leaves the tab where the customer put it.
  const [opened, setOpened] = useState(product);
  if (product !== opened) {
    setOpened(product);
    if (product) setProduct(product);
  }

  const [checks, setChecks] = useState<Partial<Record<CheckedKey, FieldCheck>>>(
    {},
  );
  // An answer arrives after the render that asked; it reads the values as
  // they are then.
  const now = useRef({ values });
  useEffect(() => {
    now.current = { values };
  });

  /** The zone of the pick-up the card holds, once its check has answered. */
  function pickupZoneOf(
    held: SearchValues,
    known: Partial<Record<CheckedKey, FieldCheck>>,
  ) {
    const check = known.from;
    return check &&
      check.placeId === held.placeIds.from &&
      check.answer?.ok === true
      ? check.answer.zoneId
      : null;
  }

  function check(
    key: CheckedKey,
    placeId: string,
    sessionToken: string | undefined,
    pickupZoneId: string | null,
  ) {
    if (!location) return;
    setChecks((was) => ({ ...was, [key]: { placeId, answer: null } }));
    checkPlaceAction({
      slug: location.slug,
      preview: location.preview,
      placeId,
      sessionToken,
      check:
        key === "from" ? { role: "pickup" } : { role: "dropoff", pickupZoneId },
    })
      .then((answer) => {
        setChecks((was) =>
          was[key]?.placeId === placeId
            ? { ...was, [key]: { placeId, answer } }
            : was,
        );
        // A new pick-up zone changes where a trip may end: the drop-off
        // held is checked again against it.
        const dropoff = now.current.values.placeIds.to;
        if (key === "from" && answer?.ok && dropoff) {
          check("to", dropoff, undefined, answer.zoneId);
        }
      })
      .catch(() => {
        // The network failed: no verdict, and the quote still checks.
        setChecks((was) =>
          was[key]?.placeId === placeId ? { ...was, [key]: undefined } : was,
        );
      });
  }

  function set(
    key: FieldKey,
    value: string,
    placeId?: string,
    sessionToken?: string,
  ) {
    setValue(key, value, placeId);
    if (!location || !isChecked(key)) return;
    if (!placeId) {
      setChecks((was) => ({ ...was, [key]: undefined }));
      return;
    }
    check(
      key,
      placeId,
      sessionToken,
      key === "to" ? pickupZoneOf(values, checks) : null,
    );
  }

  const pickupZoneId = pickupZoneOf(values, checks);

  function withinOf(key: FieldKey): BBox | undefined {
    if (!location) return undefined;
    if (key === "from") return pickupBox(location.search) ?? undefined;
    if (key === "to") {
      return dropoffBox(location.search, pickupZoneId) ?? undefined;
    }
    return undefined;
  }

  const placeIssues: TripSearchIssue[] = (["from", "to"] as const).flatMap(
    (key) => {
      const held = checks[key];
      return held &&
        held.placeId === values.placeIds[key] &&
        held.answer?.ok === false
        ? [{ field: key, message: held.answer.message }]
        : [];
    },
  );

  const offered = location
    ? dropoffs && {
        ...dropoffs,
        options: dropoffs.options.filter((option) =>
          offersDropoffAddress(location.search, option.placeId, pickupZoneId),
        ),
      }
    : dropoffs;

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
    <SearchCardContext
      value={{
        ...search,
        set,
        dropoffs: offered,
        withinOf,
        placeIssues,
        fillPickup,
        fillDropoff,
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
