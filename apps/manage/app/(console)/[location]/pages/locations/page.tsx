import { redirect } from "next/navigation";
import { requireAdmin } from "../../../../_lib/access";
import { pagesHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import {
  LocationPagesScreen,
  locationPagesFilterOf,
} from "../_components/LocationPagesScreen";

/**
 * Route: /~/pages/locations?section=…&status=…&q=…. Every location's
 * pages in one place, each location under its heading
 * (LocationPagesScreen). Under a slug the location's own are at
 * /[slug]/pages, where this address leads. Behind `pages.manage`.
 */
export default async function AllLocationPagesPage({
  params,
  searchParams,
}: PageProps<"/[location]/pages/locations">) {
  await requireAdmin("pages.manage");
  const scope = await scopeOf(params);
  const filter = locationPagesFilterOf(await searchParams);
  if (scope.slug !== null) redirect(pagesHref(scope.slug, filter));
  return <LocationPagesScreen scope={scope} filter={filter} />;
}
