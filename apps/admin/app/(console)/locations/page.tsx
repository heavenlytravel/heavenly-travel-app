import Link from "next/link";
import { formatLocalDateTime } from "@repo/db";
import { listLocations } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { PageHeader } from "../../_components/PageHeader";
import { LocationStateBadge } from "../../_components/StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../../_components/Table";
import { requireAdmin } from "../../_lib/access";
import { NEW_LOCATION_PATH, locationHref } from "../../_lib/routes";

/**
 * Route: /locations. The places the site sells as destinations, each with
 * the district its pin falls in and its state. Marketing's screen behind
 * `locations.manage`.
 */
export default async function LocationsPage() {
  await requireAdmin("locations.manage");
  const locations = await listLocations();

  return (
    <>
      <PageHeader
        title="Locations"
        description="A town, an island or an area of a city, each with a landing page and one page per product."
        action={
          <Button asChild>
            <Link href={NEW_LOCATION_PATH}>Add location</Link>
          </Button>
        }
      />

      <div className="mt-6">
        <Table>
          <THead>
            <Th>Location</Th>
            <Th>
              <span className="inline-flex items-center gap-1.5">
                District
                <InfoTip text="Where the location's pin falls. Whether pickups there are served is Operation's switch on the Coverage screen; it does not show or hide a page." />
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1.5">
                State
                <InfoTip text="Draft and Preview are not public. Live shows the pages. Paused shows them with a notice in place of the search card." />
              </span>
            </Th>
            <Th>Changed</Th>
          </THead>
          <TBody>
            {locations.length === 0 ? (
              <EmptyRow colSpan={4}>
                No locations yet. Add the first one.
              </EmptyRow>
            ) : (
              locations.map((location) => (
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
                    <span className="block">{location.district.name}</span>
                    <span className="block text-xs text-neutral-500">
                      {location.district.state.name}
                      {location.district.isActive ? "" : " · pickups off"}
                    </span>
                  </Td>
                  <Td>
                    <LocationStateBadge state={location.state} />
                  </Td>
                  <Td className="text-neutral-600 tabular-nums">
                    {location.changedAt
                      ? formatLocalDateTime(location.changedAt)
                      : "—"}
                  </Td>
                </tr>
              ))
            )}
          </TBody>
        </Table>
      </div>
    </>
  );
}
