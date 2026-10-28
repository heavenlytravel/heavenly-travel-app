import { isZoneShape, plural, pricedRoutesByZone } from "@repo/db";
import { listCoverage } from "@repo/db/server";
import { FilterSelect } from "../../_components/FilterSelect";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/filter-options";
import {
  coverageHref,
  locationTabHref,
  locationZoneHref,
} from "../../_lib/routes";
import { stateOutlines } from "../locations/_lib/outlines";
import { drawnAs } from "../locations/[slug]/coverage/zone-lines";
import { zoneColor } from "../locations/[slug]/coverage/zones/zone-colors";
import { CoverageAcross, type AcrossLocation } from "./CoverageAcross";
import { locationNames } from "../../_lib/location-names";

/**
 * Route: /coverage?location=…. Where every location serves pickups, on
 * one map, or one location's, narrowed by the filter: the zones, which
 * are the coverage, listed by location with how each was made and the
 * priced routes it is an end of. Zones are drawn and changed on each
 * location's Coverage tab; a zone here opens its editor for Operation
 * (`coverage.manage`) and its location's tab for Reservation and Sales
 * (`coverage.view`). See docs/261018-location-work-and-class-catalogue.md.
 */
export default async function CoveragePage({
  searchParams,
}: PageProps<"/coverage">) {
  await requireAdmin("coverage.view");
  const { location } = await searchParams;
  const locationId =
    typeof location === "string" && location ? location : undefined;
  const locations = await locationNames();

  return (
    <>
      <PageHeader
        title="Coverage"
        description="Where each location serves pickups: a pickup is served when it falls in one of its zones. Zones are drawn on each location's Coverage tab."
        action={
          <FilterSelect
            label="Location"
            value={locationId ?? ""}
            options={locationFilterOptions(locations, coverageHref)}
          />
        }
      />
      <div className="mt-6">
        <Streamed
          key={locationId ?? "all"}
          fallback={<CardSkeleton rows={8} />}
        >
          {() => coverage({ locationId })}
        </Streamed>
      </div>
    </>
  );
}

async function coverage({ locationId }: { locationId: string | undefined }) {
  const [lists, permissions] = await Promise.all([
    listCoverage(locationId),
    getPermissions(),
  ]);
  const manages = permissions.includes("coverage.manage");
  // Across locations each location has its colour; narrowed to one, each
  // zone has its own, as the location's tab draws them.
  const one = lists.length === 1;
  const locations: AcrossLocation[] = lists.map((list, index) => {
    const routesOf = pricedRoutesByZone(list.zoneRates);
    const tab = locationTabHref(list.slug, "coverage");
    return {
      id: list.id,
      name: list.name,
      state: list.state,
      href: tab,
      zones: list.zones.flatMap((zone, zoneIndex) => {
        if (!isZoneShape(zone.shape)) return [];
        const made = drawnAs(zone);
        const routes = routesOf.get(zone.id) ?? 0;
        return [
          {
            id: zone.id,
            name: zone.name,
            shape: zone.shape,
            color: zoneColor(one ? zoneIndex : index),
            note: [
              one ? null : list.name,
              made,
              routes > 0 ? plural(routes, "priced route") : null,
            ]
              .filter(Boolean)
              .join(" · "),
            drawnAs: made,
            routes,
            href: manages ? locationZoneHref(list.slug, zone.id) : tab,
          },
        ];
      }),
    };
  });
  const zoneCount = locations.reduce((sum, l) => sum + l.zones.length, 0);
  const stateCodes = [
    ...new Set(lists.flatMap((list) => list.states.map((s) => s.code))),
  ];

  return (
    <Card>
      <CardTitle
        description={
          lists.length === 0
            ? "No location yet."
            : `${plural(zoneCount, "zone")} across ${plural(lists.length, "location")}. Point at a zone, on the map or in the list, to find it in the other; click it to open it.`
        }
      >
        Zones
      </CardTitle>
      {lists.length > 0 ? (
        <CoverageAcross
          mapKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null}
          districts={stateOutlines(stateCodes)}
          locations={locations}
        />
      ) : null}
    </Card>
  );
}
