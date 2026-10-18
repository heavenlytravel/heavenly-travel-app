import Link from "next/link";
import {
  andList,
  isZoneCircle,
  isZoneDistrict,
  isZoneReshaped,
  isZoneShape,
  plural,
  ringsOf,
} from "@repo/db";
import { listZoneRates, listZones } from "@repo/db/server";
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
import { locationDetails, locationKey } from "../../_lib/location-data";
import { stateOutlines } from "../../_lib/outlines";
import { CoverageZones, type CoverageZone } from "./CoverageZones";
import { zoneColor } from "./zones/zone-colors";

/**
 * Route: /locations/[slug]/coverage. Operation's tab, step 3 of the setup:
 * what the location serves. The zones are the coverage: a pickup is
 * served when it falls in one, and the same zones are the rows of the
 * price list on the Rates tab. The zones on a map of the location's
 * states, each in its own colour, and the list of them beside it; pointing
 * at a zone in either lights it in both. See
 * docs/261015-locations-as-operation-areas.md, "Coverage is the zones".
 */
export default async function LocationCoveragePage({
  params,
}: PageProps<"/locations/[slug]/coverage">) {
  await requireAdmin("coverage.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <SectionHeader
        title="Coverage"
        description="Where this location serves pickups: a pickup is served when it falls in one of the zones. The same zones are the rows of the rate grid."
      />
      <div className="mt-6 grid gap-6">
        <Streamed fallback={<CardSkeleton rows={6} />}>
          {() => coverage({ id, slug })}
        </Streamed>
      </div>
    </>
  );
}

/** "km" with one decimal at most: 1.5, 25. */
const kmOf = (metres: number) => {
  const km = metres / 1000;
  return km % 1 === 0 ? String(km) : km.toFixed(1);
};

/** How a zone was made, in a line: where it started, and its corners when drawn. */
function drawnAs(zone: { shape: unknown; drawnFrom: unknown }) {
  if (isZoneDistrict(zone.drawnFrom)) {
    return `The district ${zone.drawnFrom.label}, as it is`;
  }
  if (isZoneReshaped(zone.drawnFrom)) {
    return `Reshaped from the district ${zone.drawnFrom.label}`;
  }
  if (isZoneCircle(zone.drawnFrom)) {
    return `Started as a ${kmOf(zone.drawnFrom.radiusM)} km circle around ${zone.drawnFrom.label}`;
  }
  const corners = isZoneShape(zone.shape)
    ? ringsOf(zone.shape).reduce((sum, ring) => sum + ring.length - 1, 0)
    : 0;
  return corners > 0 ? `Drawn, ${plural(corners, "corner")}` : "Drawn";
}

async function coverage({ id, slug }: { id: string; slug: string }) {
  const [location, zones, rates] = await Promise.all([
    locationDetails(id),
    listZones(id),
    listZoneRates(id),
  ]);
  if (!location) notFound();
  const stateNames = andList(location.states.map((state) => state.name));
  // The priced routes each zone is an end of, so a removal can be weighed.
  const routesOf = new Map<string, Set<string>>();
  for (const rate of rates) {
    const route = `${rate.fromZoneId}|${rate.toZoneId}`;
    for (const zoneId of [rate.fromZoneId, rate.toZoneId]) {
      const routes = routesOf.get(zoneId) ?? new Set<string>();
      routes.add(route);
      routesOf.set(zoneId, routes);
    }
  }
  const listed: CoverageZone[] = zones.flatMap((zone, index) => {
    if (!isZoneShape(zone.shape)) return [];
    const routes = routesOf.get(zone.id)?.size ?? 0;
    const made = drawnAs(zone);
    return [
      {
        id: zone.id,
        name: zone.name,
        shape: zone.shape,
        color: zoneColor(index),
        note:
          routes === 0 ? made : `${made} · ${plural(routes, "priced route")}`,
        drawnAs: made,
        routes,
        href: locationZoneHref(slug, zone.id),
      },
    ];
  });
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null;

  return (
    <Card>
      <CardTitle
        description={
          zones.length === 0
            ? `Nothing is served yet. Add the first zone: a whole district of ${stateNames || "the state"}, a circle around the airport or the jetty, or an area you shape on the map.`
            : `${plural(zones.length, "zone")} within ${stateNames || "its states"}, each in its colour. Point at one, on the map or in the list, to find it in the other; click it to edit.`
        }
        action={
          <Button asChild size="sm">
            <Link href={newLocationZoneHref(slug)}>Add zone</Link>
          </Button>
        }
      >
        <span className="inline-flex items-center gap-1.5">
          Zones
          <InfoTip text="A zone starts as a whole district, a circle around a place or a circle or square on the map, and can be reshaped from there. Where zones overlap, the smallest wins. A zone may lie outside the states, for an outstation destination." />
        </span>
      </CardTitle>
      <CoverageZones
        locationId={id}
        mapKey={mapKey}
        districts={stateOutlines(location.states.map((s) => s.code))}
        zones={listed}
      />
      {zones.length > 1 ? (
        <p className="mt-4 text-sm text-neutral-600">
          Price the routes between them on the{" "}
          <Link
            href={locationTabHref(slug, "rates")}
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
