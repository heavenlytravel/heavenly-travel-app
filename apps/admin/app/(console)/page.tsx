import Link from "next/link";
import {
  ADMIN_TEAM_LABELS,
  adminTeamsOf,
  andList,
  formatLocalDateTime,
  setupProgress,
  setupSteps,
} from "@repo/db";
import { listLocationOverviews } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { AddressTester } from "../_components/AddressTester";
import { Card, CardTitle } from "../_components/Card";
import { PageHeader } from "../_components/PageHeader";
import { Streamed, TableSkeleton } from "../_components/Skeleton";
import { LocationStateBadge } from "../_components/StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../_components/Table";
import { getPermissions, requireAdmin } from "../_lib/access";
import { NEW_LOCATION_PATH, locationHref } from "../_lib/routes";

function whoAmI(admin: Awaited<ReturnType<typeof requireAdmin>>) {
  const { level, teams } = admin.adminProfile;
  const names = adminTeamsOf(teams).map((team) => ADMIN_TEAM_LABELS[team]);
  const role = names.length > 0 ? `${level}, ${names.join(" and ")}` : level;
  return `Signed in as ${admin.email}, ${role}.`;
}

/**
 * Route: /. The console's home for every admin: the locations, each with
 * its numbers, and a field that places an address as a booking would.
 * Every team works inside a location; this is where they pick one. See
 * docs/261015-locations-as-operation-areas.md.
 */
export default async function LocationsPage() {
  const admin = await requireAdmin("dashboard.view");
  const permissions = await getPermissions();

  return (
    <>
      <PageHeader
        title="Locations"
        description={whoAmI(admin)}
        action={
          permissions.includes("locations.manage") ? (
            <Button asChild>
              <Link href={NEW_LOCATION_PATH}>Add location</Link>
            </Button>
          ) : null
        }
      />

      <div className="mt-6">
        <Streamed fallback={<TableSkeleton columns={8} rows={4} />}>
          {() => locationsTable()}
        </Streamed>
      </div>

      <Card className="mt-6">
        <CardTitle description="Pick a real place to see the zone its coordinates fall in and the location that serves it, as a booking would.">
          Test an address
        </CardTitle>
        <AddressTester hasGoogle={hasGooglePlaces} />
      </Card>
    </>
  );
}

/** Every location with its numbers. */
async function locationsTable() {
  const locations = await listLocationOverviews();

  return (
    <Table>
      <THead>
        <Th>Location</Th>
        <Th>
          <span className="inline-flex items-center gap-1.5">
            State
            <InfoTip text="Draft is not public. Live shows the pages. Paused shows them with a notice in place of the search card." />
          </span>
        </Th>
        <Th>State</Th>
        <Th>
          <span className="inline-flex items-center gap-1.5">
            Zones
            <InfoTip text="The areas the location serves and prices. A pickup outside every zone is not served." />
          </span>
        </Th>
        <Th>Classes on sale</Th>
        <Th>
          <span className="inline-flex items-center gap-1.5">
            Awaiting confirmation
            <InfoTip text="Bookings with a pickup here that Reservation has not confirmed." />
          </span>
        </Th>
        <Th>Pick-ups today</Th>
        <Th>
          <span className="inline-flex items-center gap-1.5">
            Set up
            <InfoTip text="The four steps that set a location up, done of all: details, vehicle classes, coverage and rates, pages. A draft goes live once every step is done; the Overview tab lists them." />
          </span>
        </Th>
        <Th>Changed</Th>
      </THead>
      <TBody>
        {locations.length === 0 ? (
          <EmptyRow colSpan={9}>No locations yet. Add the first one.</EmptyRow>
        ) : (
          locations.map((location) => {
            const progress = setupProgress(
              setupSteps(location.pages, location),
            );
            return (
              <tr key={location.id}>
                <Td>
                  <Link
                    href={locationHref(location.id)}
                    className="block font-medium underline-offset-4 hover:underline"
                  >
                    {location.name}
                  </Link>
                  <span className="block text-xs text-neutral-500">
                    /{location.slug}
                  </span>
                </Td>
                <Td>
                  <LocationStateBadge state={location.state} />
                </Td>
                <Td className="text-neutral-600">
                  {andList(location.stateNames) || "—"}
                </Td>
                <Td className="tabular-nums">{location.zones}</Td>
                <Td className="tabular-nums">{location.classesOnSale}</Td>
                <Td className="tabular-nums">
                  {location.awaitingConfirmation}
                </Td>
                <Td className="tabular-nums">{location.pickupsToday}</Td>
                <Td className="tabular-nums">
                  {progress.next ? (
                    <>
                      {progress.done} of {progress.total}
                      <span className="block text-xs text-neutral-500">
                        Next: {progress.next.title}
                      </span>
                    </>
                  ) : (
                    "Done"
                  )}
                </Td>
                <Td className="text-neutral-600 tabular-nums">
                  {location.changedAt
                    ? formatLocalDateTime(location.changedAt)
                    : "—"}
                </Td>
              </tr>
            );
          })
        )}
      </TBody>
    </Table>
  );
}
