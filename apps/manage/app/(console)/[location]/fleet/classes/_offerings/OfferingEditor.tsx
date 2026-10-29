import Link from "next/link";
import {
  getOffering,
  listClassesNotOffered,
  listVehicles,
  type LocationName,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { FormSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { VehiclesTable } from "../../../../../_components/VehiclesTable";
import { getPermissions } from "../../../../../_lib/access";
import { sectionLabelOf } from "../../../../../_lib/console-map";
import {
  classHref,
  newVehicleHref,
  type OfferingFrom,
} from "../../../../../_lib/routes";
import { OfferingForm } from "./OfferingForm";

/**
 * A class a location sells, the class editor under its slug, by the
 * offering's id, or "new" for a class it does not sell yet: the form for
 * the class, the rates and the rules; under it, for an admin who manages
 * the fleet, our vehicles of the class based there. `from` is where it
 * was opened: the classes, or Rates' class rates, which it goes back to.
 */
export function OfferingEditor({
  location,
  id,
  from,
}: {
  location: LocationName;
  id: string;
  from: OfferingFrom;
}) {
  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <FormSkeleton sections={2} fields={4} />
        </>
      }
    >
      {() =>
        id === "new"
          ? newOffering(location, from)
          : existingOffering(location, id, from)
      }
    </Streamed>
  );
}

/** The form for a class the location does not offer yet, with the catalogue to pick from. */
async function newOffering(location: LocationName, from: OfferingFrom) {
  const candidates = await listClassesNotOffered(location.id);
  return (
    <>
      <PageHeader section={sectionLabelOf("classes")} title="Add class" />
      <OfferingForm
        locationId={location.id}
        locationSlug={location.slug}
        candidates={candidates}
        from={from}
      />
    </>
  );
}

/** The form for an offering the location has, over the class's vehicles here. */
async function existingOffering(
  location: LocationName,
  offeringId: string,
  from: OfferingFrom,
) {
  const [offering, permissions] = await Promise.all([
    getOffering(offeringId),
    getPermissions(),
  ]);
  if (!offering || offering.locationId !== location.id) notFound();
  const vehicles = permissions.includes("fleet.manage")
    ? await listVehicles({
        locationId: location.id,
        vehicleClassId: offering.vehicleClassId,
      })
    : null;
  const { vehicleClass } = offering;
  return (
    <>
      <PageHeader
        section={sectionLabelOf("classes")}
        title={vehicleClass.name}
        badge={
          <ServiceBadge
            active={offering.isActive}
            on="On sale"
            off="Off sale"
          />
        }
        action={
          <Button asChild variant="secondary">
            <Link href={classHref(null, offering.vehicleClassId)}>
              The class in the catalogue
            </Link>
          </Button>
        }
      />
      <OfferingForm
        key={offering.id}
        locationId={location.id}
        locationSlug={location.slug}
        offering={offering}
        from={from}
      />
      {vehicles ? (
        <Card flush className="mt-6">
          <CardTitle
            inset
            meta={`Based at ${location.name}`}
            action={
              <Button asChild variant="secondary" size="sm">
                <Link
                  href={newVehicleHref(location.slug, offering.vehicleClassId)}
                >
                  Add vehicle
                </Link>
              </Button>
            }
          >
            <span className="inline-flex items-center gap-1.5">
              Vehicles
              <InfoTip text="Customers here see the models of those in service, in their photos." />
            </span>
          </CardTitle>
          <VehiclesTable
            vehicles={vehicles}
            scope={location.slug}
            showClass={false}
            bare
            emptyMessage={`No ${vehicleClass.name} based here yet.`}
          />
        </Card>
      ) : null}
    </>
  );
}
