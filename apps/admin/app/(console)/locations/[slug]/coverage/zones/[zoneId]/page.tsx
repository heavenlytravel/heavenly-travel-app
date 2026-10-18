import Link from "next/link";
import { isZoneOrigin, isZoneShape } from "@repo/db";
import { listZones } from "@repo/db/server";
import { hasGooglePlaces } from "@repo/places/server";
import { notFound } from "next/navigation";
import { SectionHeader } from "../../../../../../_components/SectionHeader";
import { FormSkeleton, Streamed } from "../../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../../_lib/access";
import { locationTabHref } from "../../../../../../_lib/routes";
import { locationDetails, locationKey } from "../../../../_lib/location-data";
import { districtChoices, stateOutlines } from "../../../../_lib/outlines";
import { ZoneEditor } from "../ZoneEditor";
import type { OtherZone } from "../ZoneMap";

/**
 * Route: /locations/[slug]/coverage/zones/[zoneId], and
 * /locations/[slug]/coverage/zones/new for a zone that does not exist yet.
 * The zone maker, with the districts of the location's states and its
 * other zones on the map for context.
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

async function zoneEditor({
  id,
  slug,
  zoneId,
}: {
  id: string;
  slug: string;
  zoneId: string;
}) {
  const [location, zones] = await Promise.all([
    locationDetails(id),
    listZones(id),
  ]);
  if (!location) notFound();
  const existing = zoneId === "new" ? null : zones.find((z) => z.id === zoneId);
  if (zoneId !== "new" && (!existing || !isZoneShape(existing.shape))) {
    notFound();
  }

  const others: OtherZone[] = zones.flatMap((z) =>
    z.id !== zoneId && isZoneShape(z.shape)
      ? [{ name: z.name, shape: z.shape }]
      : [],
  );
  const mapKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null;
  const stateCodes = location.states.map((s) => s.code);

  return (
    <>
      <SectionHeader
        title={existing ? existing.name : "Add zone"}
        description={
          existing
            ? "Rename it or remake it. Its rates on the grid stay."
            : "An area the location serves and prices: a whole district, the airport, a beach strip, a town. It may lie outside the location's states, for an outstation destination."
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
                  drawnFrom: isZoneOrigin(existing.drawnFrom)
                    ? existing.drawnFrom
                    : null,
                }
              : null
          }
          districts={stateOutlines(stateCodes)}
          choices={districtChoices(stateCodes)}
          others={others}
          mapKey={mapKey}
          hasGoogle={hasGooglePlaces}
        />
      </div>
    </>
  );
}
