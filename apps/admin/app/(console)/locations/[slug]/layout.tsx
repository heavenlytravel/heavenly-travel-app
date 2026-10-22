import { locationStateOf, type Permission } from "@repo/db";
import { notFound } from "next/navigation";
import { PageHeader } from "../../../_components/PageHeader";
import { HeaderSkeleton, Streamed } from "../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { locationTabsFor } from "../../../_lib/routes";
import { locationDetails, locationKey } from "../_lib/location-data";
import { LocationTabs } from "./LocationTabs";

/**
 * Route: /locations/[slug] and its tabs. The header every tab shares: the
 * location's name. The location's sections are the sidebar's while the
 * picker in the console header is on it, with where each stands, its
 * state on the picker, and the move the state allows on the Status tab.
 * Preview is on the Pages tab and in each page's editor. On a phone,
 * where the sidebar is a sheet, a strip of the tabs under the header, in
 * the sidebar's order, keeps the sections in reach. Every admin may open
 * a location; each tab is its own route behind its own permission. See
 * docs/261022-console-scope.md,
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
  const permissions = await getPermissions();

  return (
    <>
      <Streamed fallback={<HeaderSkeleton />}>
        {() => locationHeader({ id, permissions })}
      </Streamed>
      <div className="mt-6">{children}</div>
    </>
  );
}

/** The header: the name; under it, on a phone, the strip of tabs. */
async function locationHeader({
  id,
  permissions,
}: {
  id: string;
  permissions: readonly Permission[];
}) {
  const location = await locationDetails(id);
  if (!location) notFound();

  return (
    <>
      <PageHeader title={location.name} />
      <LocationTabs
        slug={location.slug}
        tabs={locationTabsFor(locationStateOf(location.state))
          .filter((tab) => permissions.includes(tab.permission))
          .map((tab) => ({ key: tab.key, label: tab.label }))}
      />
    </>
  );
}
