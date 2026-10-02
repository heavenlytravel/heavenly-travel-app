import Link from "next/link";
import { LOCATION_PAGE_LABELS, formatLocalDateTime } from "@repo/db";
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
 * the districts it lies in, its state, the pages it has on and its place
 * among the home page's top choices. Marketing's screen behind
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
                Districts
                <InfoTip text="The districts Marketing ticked for the location. Whether pickups there are served is Operation's switch on the Coverage screen; it does not show or hide a page." />
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1.5">
                State
                <InfoTip text="Draft and Preview are not public. Live shows the pages. Paused shows them with a notice in place of the search card." />
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1.5">
                Pages on
                <InfoTip text="The pages that are switched on. The public sees them once the location is Live or Paused." />
              </span>
            </Th>
            <Th>
              <span className="inline-flex items-center gap-1.5">
                Top choice
                <InfoTip text="Its place among the location cards on the home page. A paused top choice keeps its place and is left off the home page." />
              </span>
            </Th>
            <Th>Changed</Th>
          </THead>
          <TBody>
            {locations.length === 0 ? (
              <EmptyRow colSpan={6}>
                No locations yet. Add the first one.
              </EmptyRow>
            ) : (
              locations.map((location) => {
                const { districts } = location;
                const stateNames = [
                  ...new Set(districts.map((d) => d.state.name)),
                ];
                const on = districts.filter((d) => d.isActive).length;
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
                      <span className="block">
                        {districts.map((d) => d.name).join(", ") || "—"}
                      </span>
                      <span className="block text-xs text-neutral-500">
                        {stateNames.join(", ")}
                        {on === districts.length
                          ? ""
                          : ` · pickups on in ${on} of ${districts.length}`}
                      </span>
                    </Td>
                    <Td>
                      <LocationStateBadge state={location.state} />
                    </Td>
                    <Td>
                      {location.pagesOn.length === 0 ? (
                        <span className="text-neutral-500">None</span>
                      ) : (
                        location.pagesOn
                          .map((page) => LOCATION_PAGE_LABELS[page])
                          .join(", ")
                      )}
                    </Td>
                    <Td className="tabular-nums">
                      {location.topChoiceOrder ?? (
                        <span className="text-neutral-500">—</span>
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
      </div>
    </>
  );
}
