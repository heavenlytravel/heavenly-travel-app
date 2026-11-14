import { SEARCH_CARD_ID } from "../_lib/search";
import { SearchCard } from "../_components/search/SearchCard";

/** The booking card, resting on the floor of the hero. */
export function Booking() {
  return (
    // The hero is a full-height column; mt-auto rests the card on its floor.
    <div
      id={SEARCH_CARD_ID}
      role="search"
      aria-label="Travel booking search"
      className="relative z-(--layer-overlap) mx-auto mt-auto mb-8 w-[calc(100%-24px)] max-w-[1400px] sm:mb-14 sm:w-[88%]"
    >
      <SearchCard />
    </div>
  );
}
