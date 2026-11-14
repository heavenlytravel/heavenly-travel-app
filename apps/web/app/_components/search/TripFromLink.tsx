"use client";

import { useEffect, useEffectEvent } from "react";
import { SEARCH_TRIP_PARAM, searchTripOf } from "@repo/db";
import { useSearchCard } from "./SearchProvider";

/**
 * Sets the search card's first trip to the kind a link asked for, such as
 * a service card's "/car-with-driver?trip=hourly#booking", once the page
 * is in the browser, then takes the ask out of the address with the
 * browser's own history, which the router follows, so a reload or a
 * shared link does not ask again (as `useLinkSeed` does). An unknown kind
 * is dropped too. Renders nothing.
 */
export function TripFromLink() {
  const { trips } = useSearchCard();
  const take = useEffectEvent(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(SEARCH_TRIP_PARAM)) return;
    const mode = searchTripOf(url.searchParams.get(SEARCH_TRIP_PARAM));
    const first = trips.rows[0];
    if (mode && first) trips.set(first.id, "mode", mode);
    url.searchParams.delete(SEARCH_TRIP_PARAM);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  });
  useEffect(() => take(), []);
  return null;
}
