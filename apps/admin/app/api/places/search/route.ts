import { handlePlaceSearch } from "@repo/places/server";

// Autocomplete proxy for the home's "Test an address" field and the zone maker. The
// handler is shared with the customer site; see packages/places/src/route.ts.
export const GET = handlePlaceSearch;
