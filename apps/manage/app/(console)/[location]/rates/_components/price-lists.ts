import "server-only";
import { listPriceLists } from "@repo/db/server";
import { locationsVisible } from "../../../../_lib/scope";

/**
 * What each location the person may see charges, by name, for Rates'
 * pages under `~`: its zones, its grid, the classes it sells and its trip
 * rules. One query, whatever the number of locations.
 */
export async function visiblePriceLists() {
  const [lists, visible] = await Promise.all([
    listPriceLists(),
    locationsVisible(),
  ]);
  const shown = new Set(visible.map((location) => location.id));
  return lists.filter((list) => shown.has(list.id));
}
