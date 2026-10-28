import {
  LOCATION_STATE_LABELS,
  LOCATION_STATE_MOVE,
  hasBeenLive,
  isSlugLocked,
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
import { stateOptions } from "../../_lib/state-options";
import { DeleteLocation } from "../DeleteLocation";
import { LocationDetailsForm } from "../LocationDetailsForm";
import { SafetyBufferForm } from "../SafetyBufferForm";
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
 * Route: /locations/[slug]/settings. The location's own settings, the
 * first page of Settings in its sidebar, the history being the second.
 * For Marketing its details, step 1 of the setup: the name, the slug and
 * the states it lies in. For every admin where it stands with the public,
 * with what still stands in the way of going live, and for SUPER the one
 * move its state allows, "Go live", "Pause" or "Resume"; for Operation
 * the safety buffer its jobs keep between them; then, for SUPER, its
 * deletion. Its saved addresses are with its pages. See
 * docs/261023-console-sidebar.md.
 */
export default async function LocationSettingsPage({
  params,
}: PageProps<"/locations/[slug]/settings">) {
  await requireAdmin("locations.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <SectionHeader
        title="General"
        description="The location's details, where it stands with the public, the time its jobs keep between them, and its deletion. Marketing sets the details, Operation the time between jobs; a SUPER admin takes it live, pauses it, resumes it and deletes it."
      />
      <div className="mt-6 grid gap-6">
        <Streamed
          fallback={
            <>
              <CardSkeleton rows={5} />
              <CardSkeleton rows={3} />
            </>
          }
        >
          {() => settings({ id })}
        </Streamed>
      </div>
    </>
  );
}

async function settings({ id }: { id: string }) {
  const asked = getPermissions();
  const [location, overview, permissions, states, routesIn] = await Promise.all(
    [
      locationDetails(id),
      locationOverview(id),
      asked,
      // The states to tick, read for Marketing alone.
      asked.then((held) =>
        held.includes("locations.manage") ? stateOptions() : null,
      ),
      // What a delete takes from other locations, read for SUPER alone.
      asked.then((held) =>
        held.includes("locations.activate") ? routesIntoLocation(id) : [],
      ),
    ],
  );
  if (!location || !overview) notFound();
  const moves = permissions.includes("locations.activate");
  const state = locationStateOf(location.state);
  const blockers = stateMoveBlockers(
    state,
    LOCATION_STATE_MOVE[state],
    location.pages,
    overview,
  );

  return (
    <>
      {states ? (
        <Card>
          <CardTitle>Details</CardTitle>
          <LocationDetailsForm
            location={{
              id: location.id,
              name: location.name,
              slug: location.slug,
              stateCodes: location.states.map((entry) => entry.code).sort(),
              slugLocked: isSlugLocked(location),
            }}
            states={states}
          />
        </Card>
      ) : null}
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
          <p className="text-sm text-slate-500">
            Only a SUPER admin takes a location live, pauses it or resumes it.
          </p>
        )}
      </Card>
      {permissions.includes("coverage.manage") ? (
        <Card>
          <CardTitle description="The time a vehicle or a driver is kept free after a job here, on top of the drive to the next pickup. Roads differ by place; drivers arrive early too.">
            Between jobs
          </CardTitle>
          <SafetyBufferForm
            locationId={location.id}
            minutes={location.safetyBufferMinutes}
          />
        </Card>
      ) : null}
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
