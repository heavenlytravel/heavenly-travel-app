import {
  LOCATION_STATE_MOVE,
  locationStateOf,
  setupSteps,
  stateMoveBlockers,
  type LocationState,
  type Permission,
} from "@repo/db";
import { listOfferings, listZones } from "@repo/db/server";
import { notFound } from "next/navigation";
import { PageColumn } from "../../../_components/PageColumn";
import { PageHeader } from "../../../_components/PageHeader";
import {
  HeaderSkeleton,
  PanelSkeleton,
  Streamed,
} from "../../../_components/Skeleton";
import { LocationStateBadge } from "../../../_components/StatusBadges";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { LOCATION_TABS } from "../../../_lib/routes";
import {
  locationDetails,
  locationKey,
  locationOverview,
} from "../_lib/location-data";
import { LocationPanel, PANEL_PLACEMENT, PANEL_TITLE } from "./LocationPanel";
import { LocationTabs } from "./LocationTabs";
import { StateMove } from "./StateMove";

/** What the state means for the public, under the name. */
function stateNote(state: LocationState, slug: string) {
  switch (state) {
    case "draft":
      return `Not public yet. Its address will be /${slug}.`;
    case "live":
      return `Public at /${slug}.`;
    case "paused":
      return `Public at /${slug}, with a notice in place of the search card.`;
  }
}

/**
 * Route: /locations/[slug] and its tabs. The page in its column, with the
 * location's panel beside it. The header every tab shares: the location's
 * name, and level with it its state and, for SUPER, the one move the state
 * allows. Preview is on the Pages tab and in each page's editor. The panel lists the location's sections with where
 * each stands, its setup and the facts about it; on screens too narrow for
 * it, the button at the right end of the console header opens the same
 * panel as a sheet, and a strip of the tabs under the header keeps the
 * sections in reach. Every admin may open a location; each tab is its own
 * route behind its own permission. See
 * docs/261015-locations-as-operation-areas.md, "Setting a location up".
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
        <LocationTabs
          slug={slug}
          tabs={LOCATION_TABS.filter((tab) =>
            permissions.includes(tab.permission),
          ).map((tab) => ({ key: tab.key, label: tab.label }))}
        />
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

/** The header: the name, what the state means under it, the state and its move at the right. */
async function locationHeader({
  id,
  permissions,
}: {
  id: string;
  permissions: readonly Permission[];
}) {
  const { location, overview, state } = await locationStanding(id);
  const blocked =
    stateMoveBlockers(
      state,
      LOCATION_STATE_MOVE[state],
      location.pages,
      overview,
    ).length > 0;

  return (
    <PageHeader
      title={location.name}
      description={stateNote(state, location.slug)}
      action={
        <>
          <LocationStateBadge state={state} />
          {permissions.includes("locations.activate") ? (
            <StateMove
              locationId={location.id}
              name={location.name}
              state={state}
              blocked={blocked}
            />
          ) : null}
        </>
      }
    />
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
    listsThem ? listZones(id) : [],
    listsThem ? listOfferings(id) : [],
  ]);
  return (
    <LocationPanel
      {...standing}
      permissions={permissions}
      zones={zones.map((zone) => ({ id: zone.id, name: zone.name }))}
      offerings={offerings.map((offering) => ({
        id: offering.id,
        name: offering.vehicleClass.name,
        onSale: offering.isActive && offering.vehicleClass.isActive,
      }))}
    />
  );
}
