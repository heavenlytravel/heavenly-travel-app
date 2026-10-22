import { locationStateOf, setupSteps, type Permission } from "@repo/db";
import { notFound } from "next/navigation";
import { PageColumn } from "../../../_components/PageColumn";
import { PageHeader } from "../../../_components/PageHeader";
import {
  HeaderSkeleton,
  PanelSkeleton,
  Streamed,
} from "../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { locationTabsFor } from "../../../_lib/routes";
import {
  locationDetails,
  locationKey,
  locationOfferings,
  locationOverview,
  locationZoneNames,
} from "../_lib/location-data";
import { LocationPanel, PANEL_PLACEMENT, PANEL_TITLE } from "./LocationPanel";
import { LocationTabs } from "./LocationTabs";

/**
 * Route: /locations/[slug] and its tabs. The page in its column, with the
 * location's panel beside it. The header every tab shares: the location's
 * name. Its state is in the panel, and the move the state allows on the
 * Status tab. Preview is on the Pages tab and in each page's editor. The panel
 * lists the location's sections with where each stands: a draft's setup
 * first, a live location's day's work first. On screens too narrow for it,
 * the button at the right end of the console header opens the same panel
 * as a sheet, and a strip of the tabs under the header, in the panel's
 * order, keeps the sections in reach. Every admin may open a location;
 * each tab is its own route behind its own permission. See
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
      <PageColumn>
        <Streamed fallback={<HeaderSkeleton />}>
          {() => locationHeader({ id, permissions })}
        </Streamed>
        <div className="mt-6">{children}</div>
      </PageColumn>
      <Streamed
        fallback={
          <PanelSkeleton title={PANEL_TITLE} placement={PANEL_PLACEMENT} />
        }
      >
        {() => locationPanel({ id, permissions })}
      </Streamed>
    </>
  );
}

/** The location and its numbers, as the header and the panel both read them. */
async function locationStanding(id: string) {
  const [location, overview] = await Promise.all([
    locationDetails(id),
    locationOverview(id),
  ]);
  if (!location || !overview) notFound();
  return {
    location,
    overview,
    state: locationStateOf(location.state),
    steps: setupSteps(location.pages, overview),
  };
}

/** The header: the name; under it, on narrow screens, the strip of tabs. */
async function locationHeader({
  id,
  permissions,
}: {
  id: string;
  permissions: readonly Permission[];
}) {
  const { location, state } = await locationStanding(id);

  return (
    <>
      <PageHeader title={location.name} />
      <LocationTabs
        slug={location.slug}
        tabs={locationTabsFor(state)
          .filter((tab) => permissions.includes(tab.permission))
          .map((tab) => ({ key: tab.key, label: tab.label }))}
      />
    </>
  );
}

/** The panel beside the page, from the same reads as the header. */
async function locationPanel({
  id,
  permissions,
}: {
  id: string;
  permissions: readonly Permission[];
}) {
  // The zones and classes fill the submenus of tabs Operation opens.
  const listsThem = permissions.includes("coverage.manage");
  const [standing, zones, offerings] = await Promise.all([
    locationStanding(id),
    listsThem ? locationZoneNames(id) : [],
    listsThem ? locationOfferings(id) : [],
  ]);
  return (
    <LocationPanel
      {...standing}
      permissions={permissions}
      zones={zones}
      offerings={offerings.map((offering) => ({
        id: offering.id,
        name: offering.vehicleClass.name,
        onSale: offering.isActive && offering.vehicleClass.isActive,
      }))}
    />
  );
}
