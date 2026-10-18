import { handlePlaceSearch } from "@repo/places/server";
import { getAdmin } from "../../../_lib/access";
import { FORBIDDEN_MESSAGE } from "../../../_lib/action-state";

/**
 * GET /api/places/search: the autocomplete behind the console's place
 * fields, the home's "Test an address", the zone maker and the saved
 * addresses. The handler is shared with the customer site, where it is
 * open to everyone (see packages/places/src/route.ts); here it answers a
 * signed-in admin only, whatever their team, so the console's copy of the
 * Google key serves nobody else.
 */
export async function GET(request: Request) {
  if (!(await getAdmin("locations.view"))) {
    return Response.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
  }
  return handlePlaceSearch(request);
}
