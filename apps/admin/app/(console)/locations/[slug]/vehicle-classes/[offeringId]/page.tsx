import Link from "next/link";
import {
  getOffering,
  listClassesNotOffered,
  listVehicles,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../../_components/Card";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import { FormSkeleton, Streamed } from "../../../../../_components/Skeleton";
import { VehiclesTable } from "../../../../../_components/VehiclesTable";
import { getPermissions, requireAdmin } from "../../../../../_lib/access";
import {
  locationTabHref,
  newLocationVehicleHref,
  vehicleClassHref,
} from "../../../../../_lib/routes";
import { OfferingForm } from "../OfferingForm";
import { locationKey } from "../../../_lib/location-data";

/**
 * Route: /locations/[slug]/vehicle-classes/[offeringId], and
 * /locations/[slug]/vehicle-classes/new for a class the location does not
 * offer yet. The form for one offering: the class, the rates and the rules;
 * under it, for an admin who manages the fleet, our vehicles of the class
 * based here.
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
        description="Pick a class from the catalogue, or add a new one to it, and set the rates and the rules this location sells it under."
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

/** The form for an offering the location has, over the class's vehicles here. */
async function existingOffering({
  id,
  slug,
  offeringId,
}: {
  id: string;
  slug: string;
  offeringId: string;
}) {
  const [offering, permissions] = await Promise.all([
    getOffering(offeringId),
    getPermissions(),
  ]);
  if (!offering || offering.locationId !== id) notFound();
  const vehicles = permissions.includes("fleet.manage")
    ? await listVehicles({
        locationId: id,
        vehicleClassId: offering.vehicleClassId,
      })
    : null;
  return (
    <>
      <SectionHeader
        title={offering.vehicleClass.name}
        description="A change to the rates or the rules applies to new quotes at once; a booking keeps its receipt and its cancellation cutoff."
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
      {vehicles ? (
        <Card flush className="mt-6">
          <CardTitle
            inset
            description={`Our ${offering.vehicleClass.name} vehicles based here. Customers here see the models of those in service, in their photos.`}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link
                  href={newLocationVehicleHref(slug, offering.vehicleClassId)}
                >
                  Add vehicle
                </Link>
              </Button>
            }
          >
            Vehicles
          </CardTitle>
          <VehiclesTable
            vehicles={vehicles}
            showClass={false}
            bare
            emptyMessage={`No ${offering.vehicleClass.name} based here yet.`}
          />
        </Card>
      ) : null}
    </>
  );
}
