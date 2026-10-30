import { isWebsitePageKey } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";
import { SitePageEditorScreen } from "../../_components/SitePageEditorScreen";

/**
 * Route: /~/pages/website/[page]. The editor of one of the customer site's
 * own pages (SitePageEditorScreen). A site page is public as soon as it is
 * published; the home page stays published once it is, and has its top
 * choices under it, the location cards it shows, which are saved at once.
 * Console-wide: under a slug it is not found, as is Connect's page, which
 * has its own address. Marketing's and SEO's (`website.manage`).
 */
export default async function SitePageEditorPage({
  params,
}: PageProps<"/[location]/pages/website/[page]">) {
  await requireAdmin("website.manage");
  const scope = await scopeOf(params);
  const { page } = await params;
  if (scope.slug !== null || !isWebsitePageKey(page)) notFound();
  return <SitePageEditorScreen page={page} />;
}
