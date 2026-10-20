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
import { requireAdmin } from "../../../_lib/access";
import {
  recordHistoryHref,
  VEHICLE_CLASSES_PATH,
  vehicleClassHref,
} from "../../../_lib/routes";
import { ClassVehicles } from "../ClassVehicles";
import { VehicleClassForm } from "../VehicleClassForm";

/**
 * Route: /vehicle-classes/[id], and /vehicle-classes/new for a class that
 * does not exist yet. The form and, for an existing class, its vehicles by
 * location beside it and the way to its history in its header.
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
          className="text-neutral-600 underline-offset-4 hover:underline"
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

/** A class that exists, read with its vehicles. */
async function existingVehicleClass({ id }: { id: string }) {
  const [vehicleClass, vehicles] = await Promise.all([
    getVehicleClass(id),
    listVehicles({ vehicleClassId: id }),
  ]);
  if (!vehicleClass) notFound();
  return <VehicleClassScreen vehicleClass={vehicleClass} vehicles={vehicles} />;
}

/** The form under its header, beside the vehicles when the class exists. */
function VehicleClassScreen({
  vehicleClass,
  vehicles = [],
}: {
  /** Left out for a class that does not exist yet. */
  vehicleClass?: VehicleClass;
  vehicles?: ListedVehicle[];
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
          vehicleClass ? (
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
