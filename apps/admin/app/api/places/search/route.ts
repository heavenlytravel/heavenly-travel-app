import { handleStaffPlaceSearch } from "@repo/places/server";

// Autocomplete proxy for the console's place fields: "Test an address" on
// Coverage, and the Locations screens, which ask for areas too. The handler
// is shared with the customer site; see packages/places/src/route.ts.
export const GET = handleStaffPlaceSearch;
