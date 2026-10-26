// Browser-safe exports only: the types the autocomplete field and the route
// handler share, and the state a suggestion names. Providers and the Google
// key live in ./server.
export type { Place } from "@repo/db";
export type { Bounds, PlaceSuggestion, PlaceSearchResponse } from "./types";
export { PLACE_QUERY_MIN_LENGTH, PLACE_QUERY_MAX_LENGTH } from "./types";
export { suggestionStateOf } from "./states";
