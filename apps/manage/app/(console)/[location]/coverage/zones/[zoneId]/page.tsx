import {
  isZoneDistrict,
  isZoneOrigin,
  isZoneReshaped,
  isZoneShape,
  pricedFromByZone,
  type ZoneOrigin,
} from "@repo/db";
import {
  MUKIM_KIND_LABELS,
  listRatesFromElsewhere,
  listZoneOutlines,
  mukimsOf,
  type LocationName,
} from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@repo/console/PageHeader";
import { FormSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationDetails } from "../../../../../_lib/location-data";
import { districtChoices, stateOutlines } from "../../../../../_lib/outlines";
import { scopeOf } from "../../../../../_lib/scope";
import { drawnAs } from "../../zone-lines";
import { ZoneEditor } from "../ZoneEditor";
import type { MukimChoice, OtherZone } from "../ZoneMap";

/**
 * Route: /[location]/coverage/zones/[zoneId], and
 * /[location]/coverage/zones/new for a zone that does not exist yet. The
 * zone maker, with the districts of the location's states, its other
 * zones and every other location's on the map for context: a zone may
 * overlap none of them. A zone is one location's, so under `~` there is
 * none, and a zone of another location is not found here. For Operation
 * (`coverage.manage`).
 */
export default async function ZonePage({
  params,
}: PageProps<"/[location]/coverage/zones/[zoneId]">) {
  await requireAdmin("coverage.manage");
  const { location } = await scopeOf(params);
  if (!location) notFound();
  const { zoneId } = await params;

  return (
    <>
      <Streamed
        fallback={
          <>
            <HeaderSkeleton />
            <FormSkeleton sections={1} fields={2} />
          </>
        }
      >
        {() => zoneEditor({ location, zoneId })}
      </Streamed>
    </>
  );
}

/** The district a zone was made from, as it is or reshaped since; null for any other zone. */
function districtCodeOf(origin: ZoneOrigin | null) {
  if (isZoneDistrict(origin)) return origin.districtCode;
  if (isZoneReshaped(origin)) return origin.reshapedFrom;
  return null;
}

async function zoneEditor({
  location,
  zoneId,
}: {
  location: LocationName;
  zoneId: string;
}) {
  const { id } = location;
  const [details, zones, ratesFromElsewhere] = await Promise.all([
    locationDetails(id),
    listZoneOutlines(),
    zoneId === "new" ? [] : listRatesFromElsewhere(id, zoneId),
  ]);
  if (!details) notFound();
  const existing =
    zoneId === "new"
      ? null
      : zones.find((z) => z.id === zoneId && z.locationId === id);
  if (zoneId !== "new" && (!existing || !isZoneShape(existing.shape))) {
    notFound();
  }

  const others: OtherZone[] = zones.flatMap((z) =>
    z.id !== zoneId && isZoneShape(z.shape)
      ? [
          z.locationId === id
            ? { id: z.id, name: z.name, shape: z.shape }
            : {
                id: z.id,
                name: z.name,
                shape: z.shape,
                location: z.location.name,
              },
        ]
      : [],
  );
  const drawnFrom =
    existing && isZoneOrigin(existing.drawnFrom) ? existing.drawnFrom : null;
  const districtCode = districtCodeOf(drawnFrom);
  const mukims: MukimChoice[] = districtCode
    ? (await mukimsOf(districtCode)).map((mukim) => ({
        code: mukim.code,
        name: mukim.name,
        kind: MUKIM_KIND_LABELS[mukim.kind],
        polygons: mukim.polygons,
      }))
    : [];
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null;
  const stateCodes = details.states.map((s) => s.code);

  return (
    <>
      <PageHeader
        title={existing ? existing.name : "Add zone"}
        meta={
          existing
            ? `${drawnAs(existing)} · ${details.name}`
            : `A zone of ${details.name}`
        }
      />
      <ZoneEditor
        locationId={id}
        locationSlug={location.slug}
        zone={
          existing && isZoneShape(existing.shape)
            ? {
                id: existing.id,
                name: existing.name,
                shape: existing.shape,
                drawnFrom,
              }
            : null
        }
        mukims={mukims}
        districts={stateOutlines(stateCodes)}
        choices={districtChoices(stateCodes)}
        others={others}
        mapKey={mapKey}
        hasGoogle={hasGooglePlaces}
        pricedFrom={pricedFromByZone(ratesFromElsewhere).get(zoneId) ?? []}
      />
    </>
  );
}
