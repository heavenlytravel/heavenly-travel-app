import {
  LOCATION_STATE_LABELS,
  LOCATION_STATE_MOVE,
  hasBeenLive,
  locationDeleteImpact,
  locationStateOf,
  stateMoveBlockers,
  type LocationState,
} from "@repo/db";
import { routesIntoLocation } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  locationDetails,
  locationKey,
  locationOverview,
} from "../../_lib/location-data";
import { DeleteLocation } from "../DeleteLocation";
import { StateMove } from "../StateMove";

/** What the state means for the public. */
function stateNote(state: LocationState, slug: string) {
  switch (state) {
    case "draft":
      return `Not public yet. Its pages will be at /${slug} once it goes live, and its slug is locked from then on.`;
    case "live":
      return `Public at /${slug}, taking bookings.`;
    case "paused":
      return `Public at /${slug}, with a notice in place of the search card, so no one can book a trip here. Bookings already made stand.`;
  }
}

/**
 * Route: /locations/[slug]/status. The last tab of the setup: where the
 * location stands with the public, and for SUPER the one move its state
 * allows, "Go live", "Pause" or "Resume", with what still stands in the
 * way of going live; then, for SUPER, its deletion. Every admin reads it.
 */
export default async function LocationStatusPage({
  params,
}: PageProps<"/locations/[slug]/status">) {
  await requireAdmin("locations.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <SectionHeader
        title="Status"
        description="Where the location stands with the public. A SUPER admin takes it live, pauses it and resumes it here."
      />
      <div className="mt-6 grid gap-6">
        <Streamed fallback={<CardSkeleton rows={3} />}>
          {() => status({ id })}
        </Streamed>
      </div>
    </>
  );
}

async function status({ id }: { id: string }) {
  const asked = getPermissions();
  const [location, overview, permissions, routesIn] = await Promise.all([
    locationDetails(id),
    locationOverview(id),
    asked,
    // What a delete takes from other locations, read for SUPER alone.
    asked.then((held) =>
      held.includes("locations.activate") ? routesIntoLocation(id) : [],
    ),
  ]);
  const moves = permissions.includes("locations.activate");
  if (!location || !overview) notFound();
  const state = locationStateOf(location.state);
  const blockers = stateMoveBlockers(
    state,
    LOCATION_STATE_MOVE[state],
    location.pages,
    overview,
  );

  return (
    <>
      <Card>
        <CardTitle description={stateNote(state, location.slug)}>
          {LOCATION_STATE_LABELS[state]}
        </CardTitle>
        {blockers.length > 0 ? (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Before it can go live:</p>
            <ul className="mt-1 list-disc pl-5">
              {blockers.map((blocker) => (
                <li key={blocker}>{blocker}.</li>
              ))}
            </ul>
          </div>
        ) : null}
        {moves ? (
          <StateMove
            locationId={location.id}
            name={location.name}
            state={state}
            blocked={blockers.length > 0}
          />
        ) : (
          <p className="text-sm text-neutral-500">
            Only a SUPER admin takes a location live, pauses it or resumes it.
          </p>
        )}
      </Card>
      {moves ? (
        <Card>
          <CardTitle description="Removes the location for good.">
            Delete location
          </CardTitle>
          <DeleteLocation
            locationId={location.id}
            name={location.name}
            slug={location.slug}
            hasBeenLive={hasBeenLive(location)}
            impact={locationDeleteImpact(location, routesIn)}
          />
        </Card>
      ) : null}
    </>
  );
}
