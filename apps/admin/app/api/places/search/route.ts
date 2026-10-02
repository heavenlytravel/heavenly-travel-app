import { handlePlaceSearch } from "@repo/places/server";

// Autocomplete proxy for the Zones screen's "Test an address" field. The
// handler is shared with the customer site; see packages/places/src/route.ts.
export const GET = handlePlaceSearch;
