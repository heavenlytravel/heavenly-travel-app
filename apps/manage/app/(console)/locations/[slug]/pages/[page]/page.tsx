import { pageKeyOfSegment } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../_lib/access";
import { LocationPageEditorScreen } from "../../../_components/LocationPageEditorScreen";
import { locationKey } from "../../../_lib/location-data";

/**
 * Route: /locations/[slug]/pages/[page]. The editor of the main page, at
 * `main`, or of a section's own page, at its key: the page's address on
 * the site under the location's Pages (`pageEditorPath`). The pages under
 * a section are edited under this address; the section's list of them is
 * the Pages tab narrowed to it.
 */
export default async function LocationPageEditorPage({
  params,
}: PageProps<"/locations/[slug]/pages/[page]">) {
  await requireAdmin("locations.manage");
  const { slug, page } = await params;
  const key = pageKeyOfSegment(page);
  if (!key) notFound();
  const { id } = await locationKey(slug);
  return <LocationPageEditorScreen id={id} pageRef={{ page: key, slug: "" }} />;
}
