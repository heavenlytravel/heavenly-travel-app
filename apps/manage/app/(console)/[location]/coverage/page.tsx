import Link from "next/link";
import {
  andList,
  isZoneShape,
  plural,
  pricedFromByZone,
  pricedRoutesByZone,
} from "@repo/db";
import {
  listCoverage,
  listRatesFromElsewhere,
  listZoneRates,
  listZones,
  type LocationName,
} from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { Button } from "@repo/ui/button";
import { PlusIcon } from "@repo/ui/icons";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import { locationDetails } from "../../../_lib/location-data";
import { stateOutlines } from "../../../_lib/outlines";
import {
  RATES_PAGE_LABELS,
  coverageHref,
  newZoneHref,
  ratesHref,
  zoneHref,
} from "../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../_lib/scope";
import { TestAddress } from "./AddressTester";
import { CoverageZones, type CoverageGroup } from "./CoverageZones";
import { drawnAs, pricedFromSentence } from "./zone-lines";
import { zoneColor } from "./zones/zone-colors";

/** Beside the list's name: how a zone is made and the rule every zone keeps. */
const ZONES_TIP =
  "A zone starts as a whole district or some of its mukims, a circle around a place or a circle or square on the map, and can be reshaped from there. Zones never overlap, this location's or another's. A zone may lie outside the states, for an outstation destination.";

/**
 * Route: /[location]/coverage. Where pickups are served: the zones are
 * the coverage, a pickup being served when it falls in one, and the same
 * zones are the rows of the rate grid. The zones on a map of the states,
 * each in its colour, and the list of them beside it; pointing at a zone
 * in either lights it in both. Under a location, step 3 of its setup:
 * Operation adds, edits and removes its zones (`coverage.manage`);
 * Reservation and Sales read them (`coverage.view`). Under `~`, every
 * location's zones on one map, read only, by location; a zone opens its
 * editor for Operation and its location's Coverage for the teams that
 * read. "Test an address" places any address as a booking would, in
 * either. See docs/261015-locations-as-operation-areas.md, "Coverage is
 * the zones".
 */
export default async function CoveragePage({
  params,
}: PageProps<"/[location]/coverage">) {
  await requireAdmin("coverage.view");
  const { location } = await scopeOf(params);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader
        title="Coverage"
        action={
          <>
            <TestAddress hasGoogle={hasGooglePlaces} />
            {location && manages ? (
              <Button asChild>
                <Link href={newZoneHref(location.slug)}>
                  <PlusIcon />
                  Add zone
                </Link>
              </Button>
            ) : null}
          </>
        }
      />
      <Streamed
        fallback={
          <DetailColumns
            main={<CardSkeleton rows={10} />}
            side={<CardSkeleton rows={6} />}
          />
        }
      >
        {() =>
          location
            ? locationCoverage({ location, manages })
            : everyCoverage({ manages })
        }
      </Streamed>
    </>
  );
}

const mapKeyOf = () => process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null;

/** One location's zones, each in its own colour, for Operation to change. */
async function locationCoverage({
  location,
  manages,
}: {
  location: LocationName;
  manages: boolean;
}) {
  const [details, zones, rates, ratesFromElsewhere] = await Promise.all([
    locationDetails(location.id),
    listZones(location.id),
    listZoneRates(location.id),
    listRatesFromElsewhere(location.id),
  ]);
  if (!details) notFound();
  const stateNames = andList(details.states.map((state) => state.name));
  // The priced routes each zone is an end of, this location's and other
  // locations' routes out to it, so a removal can be weighed.
  const routesOf = pricedRoutesByZone(rates);
  const pricedFromOf = pricedFromByZone(ratesFromElsewhere);
  const group: CoverageGroup = {
    id: location.id,
    zones: zones.flatMap((zone, index) => {
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
          href: manages ? zoneHref(location.slug, zone.id) : null,
          editable: manages,
        },
      ];
    }),
  };

  return (
    <CoverageZones
      mapKey={mapKeyOf()}
      districts={stateOutlines(details.states.map((s) => s.code))}
      mapTitle={details.name}
      mapMeta={
        zones.length === 0
          ? `No zone yet within ${stateNames || "its states"}`
          : `${plural(zones.length, "zone")} within ${stateNames || "its states"}`
      }
      listTitle={<ZonesTitle />}
      groups={[group]}
      emptyMessage={
        manages
          ? `Nothing is served yet. Add the first zone: a whole district of ${stateNames || "the state"}, a circle around the airport or the jetty, or an area you shape on the map.`
          : "Nothing is served yet. Operation draws the zones."
      }
      foot={
        zones.length > 1 ? (
          <>
            Price the routes between them on the{" "}
            <Link
              href={ratesHref(location.slug, "grid")}
              className="font-semibold text-brand underline-offset-4 hover:underline"
            >
              {RATES_PAGE_LABELS.grid}
            </Link>
            .
          </>
        ) : undefined
      }
    />
  );
}

/**
 * Every location's zones on one map, each location in its colour, listed
 * by location; with one location, each zone in its own, as its own
 * Coverage draws them.
 */
async function everyCoverage({ manages }: { manages: boolean }) {
  const [all, visible] = await Promise.all([
    listCoverage(),
    locationsVisible(),
  ]);
  const shown = new Set(visible.map((location) => location.id));
  const lists = all.filter((list) => shown.has(list.id));
  const one = lists.length === 1;
  const groups: CoverageGroup[] = lists.map((list, index) => {
    const routesOf = pricedRoutesByZone(list.zoneRates);
    const home = coverageHref(list.slug);
    return {
      id: list.id,
      location: { name: list.name, state: list.state, href: home },
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
            pricedFrom: [],
            href: manages ? zoneHref(list.slug, zone.id) : home,
            editable: false,
          },
        ];
      }),
    };
  });
  const zoneCount = groups.reduce((sum, group) => sum + group.zones.length, 0);
  const stateCodes = [
    ...new Set(lists.flatMap((list) => list.states.map((s) => s.code))),
  ];

  return (
    <CoverageZones
      mapKey={mapKeyOf()}
      districts={stateOutlines(stateCodes)}
      mapTitle="Every location"
      mapMeta={
        lists.length === 0
          ? "No location yet"
          : `${plural(zoneCount, "zone")} across ${plural(lists.length, "location")}`
      }
      listTitle={<ZonesTitle />}
      groups={groups}
      emptyMessage="No location yet."
    />
  );
}

/** The list's name, with how a zone is made and the rule every zone keeps in its tip. */
function ZonesTitle() {
  return (
    <span className="inline-flex items-center gap-1.5">
      Zones
      <InfoTip text={ZONES_TIP} />
    </span>
  );
}
