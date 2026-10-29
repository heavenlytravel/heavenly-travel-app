import { pageKeyOfSegment } from "@repo/db";
import { notFound } from "next/navigation";
import { requireAdmin } from "../../../../_lib/access";
import { scopeOf } from "../../../../_lib/scope";
import { LocationPageEditorScreen } from "../_components/LocationPageEditorScreen";

/**
 * Route: /[location]/pages/[page]. The editor of a location's main page,
 * at `main`, or of a section's own page, at its key: the page's address
 * on the site under the location's Pages (`pageEditorPath`). One
 * location's alone: under `~` it is not found. The pages under a section
 * are edited under this address; the section's list of them is Pages
 * narrowed to it.
 */
export default async function LocationPageEditorPage({
  params,
}: PageProps<"/[location]/pages/[page]">) {
  await requireAdmin("locations.manage");
  const { location } = await scopeOf(params);
  const key = pageKeyOfSegment((await params).page);
  if (!location || !key) notFound();
  return (
    <LocationPageEditorScreen
      id={location.id}
      pageRef={{ page: key, slug: "" }}
    />
  );
}
