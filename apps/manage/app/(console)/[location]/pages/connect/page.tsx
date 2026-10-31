import { isPageFilter, searchTermOf } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../_lib/access";
import { SEARCH_PARAM } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { SitePagesScreen } from "../_components/SitePageList";

/**
 * Route: /~/pages/connect?status=…&q=…. Connect's pages, each opening its
 * editor under /~/pages/connect: today its home, the landing page a
 * visitor signed out reads. Console-wide: under a slug it is not found.
 * Marketing's and SEO's (`website.manage`).
 */
export default async function ConnectPagesPage({
  params,
  searchParams,
}: PageProps<"/[location]/pages/connect">) {
  await requireAdmin("website.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  return (
    <SitePagesScreen
      app="connect"
      status={isPageFilter(query.status) ? query.status : undefined}
      q={searchTermOf(query[SEARCH_PARAM]) ?? undefined}
    />
  );
}
