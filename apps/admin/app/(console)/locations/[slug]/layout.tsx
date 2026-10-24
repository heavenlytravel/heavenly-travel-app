import { notFound } from "next/navigation";
import { PageHeader } from "../../../_components/PageHeader";
import { HeaderSkeleton, Streamed } from "../../../_components/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { locationDetails, locationKey } from "../_lib/location-data";

/**
 * Route: /locations/[slug] and its tabs. The header every tab shares: the
 * location's name. The location's sections are the sidebar's while the
 * picker in the console header is on it, with where each stands, its
 * state on the picker, and the move the state allows in its settings.
 * Preview is on the Pages tab and in each page's editor. On a phone the
 * sections are in the menu the floating dock opens. Every admin may open
 * a location; each tab is its own route behind its own permission. See
 * docs/261023-console-sidebar.md,
 * docs/261015-locations-as-operation-areas.md, "Setting a location up",
 * and docs/261018-location-work-and-class-catalogue.md.
 */
export default async function LocationLayout({
  params,
  children,
}: LayoutProps<"/locations/[slug]">) {
  await requireAdmin("locations.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <Streamed fallback={<HeaderSkeleton />}>
        {() => locationHeader(id)}
      </Streamed>
      <div className="mt-6">{children}</div>
    </>
  );
}

/** The header: the location's name. */
async function locationHeader(id: string) {
  const location = await locationDetails(id);
  if (!location) notFound();
  return <PageHeader title={location.name} />;
}
