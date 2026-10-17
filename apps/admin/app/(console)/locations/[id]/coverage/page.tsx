import Link from "next/link";
import {
  andList,
  isRing,
  isZoneCircle,
  isZoneDistrict,
  isZoneShape,
} from "@repo/db";
import { listZones } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import {
  locationTabHref,
  locationZoneHref,
  newLocationZoneHref,
} from "../../../../_lib/routes";
import { locationDetails } from "../../_lib/location-data";
import { stateOutlines } from "../../_lib/outlines";
import { ZoneList } from "./ZoneList";
import { ZoneMap, type OtherZone } from "./zones/ZoneMap";

/**
 * Route: /locations/[id]/coverage. Operation's tab, step 3 of the setup:
 * what the location serves. The zones are the coverage: a pickup is
 * served when it falls in one, and the same zones are the rows of the
 * price list on the Rates tab. The zones on a map of the location's
 * states, so how much of them is covered can be seen, then the list of
 * them. See docs/261015-locations-as-operation-areas.md, "Coverage is the
 * zones".
 */
export default async function LocationCoveragePage({
  params,
}: PageProps<"/locations/[id]/coverage">) {
  await requireAdmin("coverage.manage");
  const { id } = await params;

  return (
    <>
      <SectionHeader
        title="Coverage"
        description="Where this location serves pickups. A pickup is served when it falls in one of the zones; what a trip between two zones costs is set on the Rates tab."
      />
      <div className="mt-6 grid gap-6">
        <Streamed fallback={<CardSkeleton rows={6} />}>
          {() => coverage({ id })}
        </Streamed>
      </div>
    </>
  );
}

/** "The district Langkawi", "A circle of 1.5 km around Langkawi Airport" or "Drawn, 12 corners" */
function drawnAs(zone: { shape: unknown; drawnFrom: unknown }) {
  if (isZoneDistrict(zone.drawnFrom)) {
    return `The district ${zone.drawnFrom.label}, as it is`;
  }
  if (isZoneCircle(zone.drawnFrom)) {
    const km = zone.drawnFrom.radiusM / 1000;
    return `A circle of ${km % 1 === 0 ? km : km.toFixed(1)} km around ${zone.drawnFrom.label}`;
  }
  const corners = isRing(zone.shape) ? zone.shape.length - 1 : 0;
  return `Drawn, ${corners} corners`;
}

async function coverage({ id }: { id: string }) {
  const [location, zones] = await Promise.all([
    locationDetails(id),
    listZones(id),
  ]);
  if (!location) notFound();
  const stateNames = andList(location.states.map((state) => state.name));
  const drawn: OtherZone[] = zones.flatMap((zone) =>
    isZoneShape(zone.shape) ? [{ name: zone.name, shape: zone.shape }] : [],
  );
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null;

  return (
    <Card>
      <CardTitle
        description={
          zones.length === 0
            ? `Nothing is served yet. Add the first zone: a whole district of ${stateNames || "the state"} as it is, or the airport, the jetty and the areas the price list names.`
            : `The green areas are what ${location.name} serves, within ${stateNames || "its states"}. A pickup outside them is told the area is not served.`
        }
        action={
          <Button asChild size="sm">
            <Link href={newLocationZoneHref(id)}>Add zone</Link>
          </Button>
        }
      >
        <span className="inline-flex items-center gap-1.5">
          Zones
          <InfoTip text="A zone is a whole district as it is, a circle around a place such as the airport, or an area drawn on the map. The zones are the coverage and the rows of the price list at once. Where zones overlap, the smallest wins. A zone may lie outside the states, for an outstation destination." />
        </span>
      </CardTitle>
      {mapKey ? (
        <ZoneMap
          mapKey={mapKey}
          districts={stateOutlines(location.states.map((s) => s.code))}
          others={drawn}
          tone="coverage"
          shape={null}
          editable={false}
        />
      ) : (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          The map needs the browser key for Google Maps,
          NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY. Zones that are a district or a
          circle still work without it.
        </p>
      )}
      {zones.length > 0 ? (
        <ul className="mt-4 divide-y divide-neutral-100 border-t border-neutral-100">
          {zones.map((zone) => (
            <li
              key={zone.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 py-2.5"
            >
              <div className="min-w-40 flex-1">
                <Link
                  href={locationZoneHref(id, zone.id)}
                  className="text-sm font-medium underline-offset-4 hover:underline"
                >
                  {zone.name}
                </Link>
                <span className="block text-xs text-neutral-500">
                  {drawnAs(zone)}
                </span>
              </div>
              <ZoneList locationId={id} zoneId={zone.id} name={zone.name} />
            </li>
          ))}
        </ul>
      ) : null}
      {zones.length > 1 ? (
        <p className="mt-4 text-sm text-neutral-600">
          Price the routes between them on the{" "}
          <Link
            href={locationTabHref(id, "rates")}
            className="font-medium underline-offset-4 hover:underline"
          >
            Rates
          </Link>{" "}
          tab.
        </p>
      ) : null}
    </Card>
  );
}
