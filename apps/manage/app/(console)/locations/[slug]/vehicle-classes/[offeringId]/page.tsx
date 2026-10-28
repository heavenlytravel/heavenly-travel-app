import Link from "next/link";
import {
  getOffering,
  listClassesNotOffered,
  listVehicles,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { SectionHeader } from "@repo/console/SectionHeader";
import { FormSkeleton, Streamed } from "@repo/console/Skeleton";
import { VehiclesTable } from "../../../../../_components/VehiclesTable";
import { getPermissions, requireAdmin } from "../../../../../_lib/access";
import {
  newLocationVehicleHref,
  offeringBackHref,
  offeringFromOf,
  vehicleClassHref,
  type OfferingFrom,
} from "../../../../../_lib/routes";
import { OfferingForm } from "../OfferingForm";
import { locationKey } from "../../../_lib/location-data";

/**
 * Route: /locations/[slug]/vehicle-classes/[offeringId], and
 * /locations/[slug]/vehicle-classes/new for a class the location does not
 * offer yet. The form for one offering: the class, the rates and the rules;
 * under it, for an admin who manages the fleet, our vehicles of the class
 * based here. Opened from the Rates tab (`?from=rates`), it goes back
 * there.
 */
export default async function LocationOfferingPage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/vehicle-classes/[offeringId]">) {
  await requireAdmin("coverage.manage");
  const { slug, offeringId } = await params;
  const from = offeringFromOf((await searchParams).from);
  const { id } = await locationKey(slug);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={offeringBackHref(slug, from)}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          {from === "rates" ? "All rates here" : "All classes here"}
        </Link>
      </p>
      <Streamed fallback={<FormSkeleton sections={2} fields={4} />}>
        {() =>
          offeringId === "new"
            ? newOffering({ id, slug, from })
            : existingOffering({ id, slug, offeringId, from })
        }
      </Streamed>
    </>
  );
}

/** The form for a class the location does not offer yet, with the catalogue to pick from. */
async function newOffering({
  id,
  slug,
  from,
}: {
  id: string;
  slug: string;
  from: OfferingFrom;
}) {
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
          from={from}
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
  from,
}: {
  id: string;
  slug: string;
  offeringId: string;
  from: OfferingFrom;
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
            className="text-sm text-slate-600 underline-offset-4 hover:underline"
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
          from={from}
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
