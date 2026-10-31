import { isPageFilter, searchTermOf } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../_lib/access";
import { SEARCH_PARAM } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { SitePagesScreen } from "../_components/SitePageList";

/**
 * Route: /~/pages/website?status=…&q=…. The customer site's own pages,
 * each opening its editor at /~/pages/website/[page]: the home page, the
 * services' hubs, about us, contact us, the legal pages, and the footer
 * on every one of them. Console-wide: under a slug it is not found.
 * Marketing's and SEO's (`website.manage`).
 */
export default async function WebsitePagesPage({
  params,
  searchParams,
}: PageProps<"/[location]/pages/website">) {
  await requireAdmin("website.manage");
  if ((await scopeOf(params)).slug !== null) notFound();
  const query = await searchParams;
  return (
    <SitePagesScreen
      app="website"
      status={isPageFilter(query.status) ? query.status : undefined}
      q={searchTermOf(query[SEARCH_PARAM]) ?? undefined}
    />
  );
}
