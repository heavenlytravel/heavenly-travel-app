import { redirect } from "next/navigation";
import { requireAdmin } from "../../../_lib/access";
import { pagesHref } from "../../../_lib/routes";
import { scopeOf } from "../../../_lib/scope";
import {
  LocationPagesScreen,
  locationPagesFilterOf,
} from "./_components/LocationPagesScreen";

/**
 * Route: /[slug]/pages?section=…&status=…&q=…. One location's pages
 * (LocationPagesScreen). Under `~` every location's are at
 * /~/pages/locations, where this address leads. Behind `pages.manage`.
 */
export default async function PagesPage({
  params,
  searchParams,
}: PageProps<"/[location]/pages">) {
  await requireAdmin("pages.manage");
  const scope = await scopeOf(params);
  const filter = locationPagesFilterOf(await searchParams);
  if (!scope.location) redirect(pagesHref(null, filter));
  return <LocationPagesScreen scope={scope} filter={filter} />;
}
