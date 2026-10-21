import Link from "next/link";
import {
  isZoneDistrict,
  isZoneOrigin,
  isZoneReshaped,
  isZoneShape,
  type ZoneOrigin,
} from "@repo/db";
import {
  MUKIM_KIND_LABELS,
  listRatesFromElsewhere,
  listZoneOutlines,
  mukimsOf,
} from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { notFound } from "next/navigation";
import { SectionHeader } from "../../../../../../_components/SectionHeader";
import { FormSkeleton, Streamed } from "../../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../../_lib/access";
import { locationTabHref } from "../../../../../../_lib/routes";
import { locationDetails, locationKey } from "../../../../_lib/location-data";
import { districtChoices, stateOutlines } from "../../../../_lib/outlines";
import { pricedFromByZone } from "../../zone-lines";
import { ZoneEditor } from "../ZoneEditor";
import type { MukimChoice, OtherZone } from "../ZoneMap";

/**
 * Route: /locations/[slug]/coverage/zones/[zoneId], and
 * /locations/[slug]/coverage/zones/new for a zone that does not exist yet.
 * The zone maker, with the districts of the location's states, its other
 * zones and every other location's on the map for context: a zone may
 * overlap none of them.
 */
export default async function LocationZonePage({
  params,
}: PageProps<"/locations/[slug]/coverage/zones/[zoneId]">) {
  await requireAdmin("coverage.manage");
  const { slug, zoneId } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationTabHref(slug, "coverage")}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          Coverage
        </Link>
      </p>
      <Streamed fallback={<FormSkeleton sections={1} fields={2} />}>
        {() => zoneEditor({ id, slug, zoneId })}
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
  id,
  slug,
  zoneId,
}: {
  id: string;
  slug: string;
  zoneId: string;
}) {
  const [location, zones, ratesFromElsewhere] = await Promise.all([
    locationDetails(id),
    listZoneOutlines(),
    zoneId === "new" ? [] : listRatesFromElsewhere(id, zoneId),
  ]);
  if (!location) notFound();
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
            ? { name: z.name, shape: z.shape }
            : { name: z.name, shape: z.shape, location: z.location.name },
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
  const stateCodes = location.states.map((s) => s.code);

  return (
    <>
      <SectionHeader
        title={existing ? existing.name : "Add zone"}
        description={
          existing
            ? "Rename it or remake it. Its rates on the grid stay."
            : "An area the location serves and prices: a whole district or some of its mukims, the airport, a beach strip, a town. It may lie outside the location's states, for an outstation destination, but never over another zone."
        }
      />
      <div className="mt-6">
        <ZoneEditor
          locationId={id}
          locationSlug={slug}
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
      </div>
    </>
  );
}
