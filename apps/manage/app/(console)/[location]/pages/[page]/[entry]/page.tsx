import { isLocationPageRef } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../../_lib/access";
import { scopeOf } from "../../../../../_lib/scope";
import { LocationPageEditorScreen } from "../../_components/LocationPageEditorScreen";

/**
 * Route: /[location]/pages/[page]/[entry]. The editor of a page under a
 * section of a location: a vehicle class's, or one Marketing added, such
 * as a popular place or a post. One location's alone: under `~` it is not
 * found.
 */
export default async function LocationEntryEditorPage({
  params,
}: PageProps<"/[location]/pages/[page]/[entry]">) {
  await requireAdmin("pages.manage");
  const { location } = await scopeOf(params);
  const { page, entry } = await params;
  const ref = { page, slug: entry };
  if (!location || entry === "" || !isLocationPageRef(ref)) notFound();
  return <LocationPageEditorScreen id={location.id} pageRef={ref} />;
}
