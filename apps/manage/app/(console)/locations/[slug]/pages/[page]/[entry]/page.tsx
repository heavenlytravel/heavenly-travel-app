import { isLocationPageRef } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../../_lib/access";
import { LocationPageEditorScreen } from "../../../../_components/LocationPageEditorScreen";
import { locationKey } from "../../../../_lib/location-data";

/**
 * Route: /locations/[slug]/pages/[page]/[entry]. The editor of a page under
 * a section: a vehicle class's, or one Marketing added, such as a popular
 * place or a post.
 */
export default async function LocationEntryEditorPage({
  params,
}: PageProps<"/locations/[slug]/pages/[page]/[entry]">) {
  await requireAdmin("locations.manage");
  const { slug, page, entry } = await params;
  const { id } = await locationKey(slug);
  const ref = { page, slug: entry };
  if (entry === "" || !isLocationPageRef(ref)) notFound();
  return <LocationPageEditorScreen id={id} pageRef={ref} />;
}
