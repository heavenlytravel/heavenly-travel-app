import { handlePlaceSearch } from "@repo/places/server";

// Autocomplete proxy for the place fields. The handler is shared with the
// admin app; see packages/places/src/route.ts.
export const GET = handlePlaceSearch;
