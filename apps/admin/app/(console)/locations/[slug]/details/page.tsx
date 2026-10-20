import { isSlugLocked } from "@repo/db";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { locationDetails, locationKey } from "../../_lib/location-data";
import { stateOptions } from "../../_lib/state-options";
import { LocationDetailsForm } from "../LocationDetailsForm";

/**
 * Route: /locations/[slug]/details. Marketing's tab, step 1 of the setup:
 * the name, the slug and the states the location lies in. Its saved
 * addresses are on the Pages tab, its deletion on the Status tab.
 */
export default async function LocationDetailsPage({
  params,
}: PageProps<"/locations/[slug]/details">) {
  await requireAdmin("locations.manage");
  const { slug } = await params;
  const { id } = await locationKey(slug);

  return (
    <Streamed fallback={<CardSkeleton rows={5} />}>
      {() => details({ id })}
    </Streamed>
  );
}

async function details({ id }: { id: string }) {
  const [location, states] = await Promise.all([
    locationDetails(id),
    stateOptions(),
  ]);
  if (!location) notFound();

  return (
    <Card>
      <CardTitle>Details</CardTitle>
      <LocationDetailsForm
        location={{
          id: location.id,
          name: location.name,
          slug: location.slug,
          stateCodes: location.states.map((state) => state.code).sort(),
          slugLocked: isSlugLocked(location),
        }}
        states={states}
      />
    </Card>
  );
}
