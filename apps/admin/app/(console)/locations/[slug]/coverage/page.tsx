import Link from "next/link";
import { andList, isZoneShape, plural } from "@repo/db";
import {
  listRatesFromElsewhere,
  listZoneRates,
  listZones,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  locationTabHref,
  locationZoneHref,
  newLocationZoneHref,
} from "../../../../_lib/routes";
import { locationDetails, locationKey } from "../../_lib/location-data";
import { stateOutlines } from "../../_lib/outlines";
import { CoverageZones, type CoverageZone } from "./CoverageZones";
import {
  drawnAs,
  pricedFromByZone,
  pricedFromSentence,
  pricedRoutesByZone,
} from "./zone-lines";
import { zoneColor } from "./zones/zone-colors";

/**
 * Route: /locations/[slug]/coverage. Operation's tab, step 3 of the setup:
 * what the location serves. The zones are the coverage: a pickup is
 * served when it falls in one, and the same zones are the rows of the
 * price list on the Rates tab. The zones on a map of the location's
 * states, each in its own colour, and the list of them beside it; pointing
 * at a zone in either lights it in both. Operation adds, edits and removes
 * zones (`coverage.manage`); Reservation and Sales read the map and the list
 * (`coverage.view`). See docs/261015-locations-as-operation-areas.md,
 * "Coverage is the zones".
 */
export default async function LocationCoveragePage({
  params,
}: PageProps<"/locations/[slug]/coverage">) {
  await requireAdmin("coverage.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <SectionHeader
        title="Coverage"
        description="Where this location serves pickups: a pickup is served when it falls in one of the zones. The same zones are the rows of the rate grid."
      />
      <div className="mt-6 grid gap-6">
        <Streamed fallback={<CardSkeleton rows={6} />}>
          {() => coverage({ id, slug, manages })}
        </Streamed>
      </div>
    </>
  );
}

async function coverage({
  id,
  slug,
  manages,
}: {
  id: string;
  slug: string;
  manages: boolean;
}) {
  const [location, zones, rates, ratesFromElsewhere] = await Promise.all([
    locationDetails(id),
    listZones(id),
    listZoneRates(id),
    listRatesFromElsewhere(id),
  ]);
  if (!location) notFound();
  const stateNames = andList(location.states.map((state) => state.name));
  // The priced routes each zone is an end of, this location's and other
  // locations' routes out to it, so a removal can be weighed.
  const routesOf = pricedRoutesByZone(rates);
  const pricedFromOf = pricedFromByZone(ratesFromElsewhere);
  const listed: CoverageZone[] = zones.flatMap((zone, index) => {
    if (!isZoneShape(zone.shape)) return [];
    const routes = routesOf.get(zone.id) ?? 0;
    const pricedFrom = pricedFromOf.get(zone.id) ?? [];
    const made = drawnAs(zone);
    return [
      {
        id: zone.id,
        name: zone.name,
        shape: zone.shape,
        color: zoneColor(index),
        note: [
          made,
          routes > 0 ? plural(routes, "priced route") : null,
          pricedFrom.length > 0 ? pricedFromSentence(pricedFrom) : null,
        ]
          .filter(Boolean)
          .join(" · "),
        drawnAs: made,
        routes,
        pricedFrom,
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
            ? manages
              ? `Nothing is served yet. Add the first zone: a whole district of ${stateNames || "the state"}, a circle around the airport or the jetty, or an area you shape on the map.`
              : "Nothing is served yet. Operation draws the zones."
            : `${plural(zones.length, "zone")} within ${stateNames || "its states"}, each in its colour. Point at one, on the map or in the list, to find it in the other${manages ? "; click it to edit" : ""}.`
        }
        action={
          manages ? (
            <Button asChild size="sm">
              <Link href={newLocationZoneHref(slug)}>Add zone</Link>
            </Button>
          ) : null
        }
      >
        <span className="inline-flex items-center gap-1.5">
          Zones
          <InfoTip text="A zone starts as a whole district or some of its mukims, a circle around a place or a circle or square on the map, and can be reshaped from there. Zones never overlap, this location's or another's. A zone may lie outside the states, for an outstation destination." />
        </span>
      </CardTitle>
      <CoverageZones
        mapKey={mapKey}
        districts={stateOutlines(location.states.map((s) => s.code))}
        zones={listed}
        editable={manages}
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
