import Link from "next/link";
import { getOffering, listClassesNotOffered } from "@repo/db/server";
import { notFound } from "next/navigation";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import { FormSkeleton, Streamed } from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationTabHref, vehicleClassHref } from "../../../../../_lib/routes";
import { OfferingForm } from "../OfferingForm";
import { locationKey } from "../../../_lib/location-data";

/**
 * Route: /locations/[slug]/vehicle-classes/[offeringId], and
 * /locations/[slug]/vehicle-classes/new for a class the location does not
 * offer yet. The form for one offering: the class and the rates.
 */
export default async function LocationOfferingPage({
  params,
}: PageProps<"/locations/[slug]/vehicle-classes/[offeringId]">) {
  await requireAdmin("coverage.manage");
  const { slug, offeringId } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationTabHref(slug, "vehicle-classes")}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All classes here
        </Link>
      </p>
      <Streamed fallback={<FormSkeleton sections={2} fields={4} />}>
        {() =>
          offeringId === "new"
            ? newOffering({ id, slug })
            : existingOffering({ id, slug, offeringId })
        }
      </Streamed>
    </>
  );
}

/** The form for a class the location does not offer yet, with the catalogue to pick from. */
async function newOffering({ id, slug }: { id: string; slug: string }) {
  const candidates = await listClassesNotOffered(id);
  return (
    <>
      <SectionHeader
        title="Add class"
        description="Pick a class from the catalogue, or add a new one to it, and set the rates this location sells it at."
      />
      <div className="mt-6">
        <OfferingForm
          locationId={id}
          locationSlug={slug}
          candidates={candidates}
        />
      </div>
    </>
  );
}

/** The form for an offering the location has. */
async function existingOffering({
  id,
  slug,
  offeringId,
}: {
  id: string;
  slug: string;
  offeringId: string;
}) {
  const offering = await getOffering(offeringId);
  if (!offering || offering.locationId !== id) notFound();
  return (
    <>
      <SectionHeader
        title={offering.vehicleClass.name}
        description="A rate change applies to new quotes at once; a booking keeps its receipt."
        action={
          <Link
            href={vehicleClassHref(offering.vehicleClassId)}
            className="text-sm text-neutral-600 underline-offset-4 hover:underline"
          >
            The class in the catalogue
          </Link>
        }
      />
      <div className="mt-6">
        <OfferingForm
          key={offering.id}
          locationId={id}
          locationSlug={slug}
          offering={offering}
        />
      </div>
    </>
  );
}
