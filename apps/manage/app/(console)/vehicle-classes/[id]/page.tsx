import Link from "next/link";
import {
  getVehicleClass,
  listVehicles,
  type VehicleClass,
  type ListedVehicle,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { DetailColumns } from "../../../_components/PageColumn";
import { PageHeader } from "../../../_components/PageHeader";
import { HistoryLink } from "../../../_components/RecordHistory";
import { Card, CardTitle } from "../../../_components/Card";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../_lib/access";
import {
  recordHistoryHref,
  VEHICLE_CLASSES_PATH,
  vehicleClassHref,
} from "../../../_lib/routes";
import { ClassVehicles } from "../ClassVehicles";
import { VehicleClassForm } from "../VehicleClassForm";

/**
 * Route: /vehicle-classes/[id], and /vehicle-classes/new for a class that
 * does not exist yet. The form and, for an existing class, the way to its
 * history in its header and, for an admin who manages the fleet, its
 * vehicles by location beside it.
 */
export default async function VehicleClassPage({
  params,
}: PageProps<"/vehicle-classes/[id]">) {
  await requireAdmin("coverage.manage");
  const { id } = await params;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={VEHICLE_CLASSES_PATH}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All vehicle classes
        </Link>
      </p>
      {id === "new" ? (
        <VehicleClassScreen />
      ) : (
        <Streamed
          fallback={
            <>
              <HeaderSkeleton />
              <DetailSkeleton
                main={<FormSkeleton sections={3} fields={4} />}
                side={<CardSkeleton rows={2} />}
              />
            </>
          }
        >
          {() => existingVehicleClass({ id })}
        </Streamed>
      )}
    </>
  );
}

/** A class that exists, read with its vehicles for an admin who manages the fleet. */
async function existingVehicleClass({ id }: { id: string }) {
  const [vehicleClass, permissions] = await Promise.all([
    getVehicleClass(id),
    getPermissions(),
  ]);
  if (!vehicleClass) notFound();
  const vehicles = permissions.includes("fleet.manage")
    ? await listVehicles({ vehicleClassId: id })
    : null;
  return <VehicleClassScreen vehicleClass={vehicleClass} vehicles={vehicles} />;
}

/** The form under its header, beside the vehicles when the class exists and they are shown. */
function VehicleClassScreen({
  vehicleClass,
  vehicles = null,
}: {
  /** Left out for a class that does not exist yet. */
  vehicleClass?: VehicleClass;
  /** Null for an admin who does not manage the fleet. */
  vehicles?: ListedVehicle[] | null;
}) {
  return (
    <>
      <PageHeader
        title={vehicleClass ? vehicleClass.name : "Add class"}
        description={
          vehicleClass
            ? "The class as every location sells it. Its rates and rules are each location's own, on the location's Vehicle classes tab."
            : "The slug is derived from the name and never changes after. A location sells the class once it offers it, at its own rates and under its own rules."
        }
        action={
          vehicleClass ? (
            <HistoryLink
              href={recordHistoryHref(vehicleClassHref(vehicleClass.id))}
            />
          ) : null
        }
      />

      <DetailColumns
        main={
          <VehicleClassForm
            key={vehicleClass?.id ?? "new"}
            vehicleClass={vehicleClass}
          />
        }
        side={
          vehicleClass && vehicles ? (
            <Card>
              <CardTitle description="Our vehicles of this class, by where they are based. A location's customers see the models of its vehicles in service, in their photos.">
                Vehicles
              </CardTitle>
              <ClassVehicles vehicles={vehicles} />
            </Card>
          ) : null
        }
      />
    </>
  );
}
