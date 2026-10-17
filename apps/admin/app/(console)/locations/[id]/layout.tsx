import {
  LOCATION_STATE_MOVE,
  locationStateOf,
  setupSteps,
  stateMoveBlockers,
  type LocationState,
  type Permission,
} from "@repo/db";
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
import { PreviewLink } from "../_components/PreviewLink";
import { locationDetails, locationOverview } from "../_lib/location-data";
import { LocationPanel, PANEL_PLACEMENT, PANEL_TITLE } from "./LocationPanel";
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
 * Route: /locations/[id] and its tabs. The page in its column, with the
 * location's panel beside it. The header every tab shares: the location's
 * name and state, "Preview" for Marketing, and the one move the state
 * allows for SUPER. The panel lists the location's sections with where
 * each stands, its queue, its setup and its pages; on screens too narrow
 * for it, the button at the right end of the console header opens the same
 * panel as a sheet. Every admin may open a location; each tab is its own
 * route behind its own permission. See
 * docs/261015-locations-as-operation-areas.md, "Setting a location up".
 */
export default async function LocationLayout({
  params,
  children,
}: LayoutProps<"/locations/[id]">) {
  await requireAdmin("locations.view");
  const { id } = await params;
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

/** The header: name, state, what the state means, and the actions. */
async function locationHeader({
  id,
  permissions,
}: {
  id: string;
  permissions: readonly Permission[];
}) {
  const { location, overview, state } = await locationStanding(id);
  const may = (permission: Permission) => permissions.includes(permission);
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
      badge={<LocationStateBadge state={state} />}
      description={stateNote(state, location.slug)}
      action={
        <div className="flex flex-wrap items-start gap-2">
          {may("locations.manage") ? (
            <PreviewLink slug={location.slug} />
          ) : null}
          {may("locations.activate") ? (
            <StateMove
              locationId={location.id}
              name={location.name}
              state={state}
              blocked={blocked}
            />
          ) : null}
        </div>
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
  const standing = await locationStanding(id);
  return <LocationPanel {...standing} permissions={permissions} />;
}
