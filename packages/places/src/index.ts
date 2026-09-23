// Browser-safe exports only: the types the autocomplete field and the route
// handler share. Providers and the Google key live in ./server.
export type { Place } from "@repo/db";
export type {
  PlaceSuggestion,
  PlaceSearchResponse,
  RoadDistance,
} from "./types";
export { PLACE_QUERY_MIN_LENGTH, PLACE_QUERY_MAX_LENGTH } from "./types";
