import Link from "next/link";
import {
  getVehicleClass,
  listActivityFor,
  listVehicles,
  type ActivityEntry,
  type VehicleClass,
  type VehicleWithModel,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { DetailColumns } from "../../../_components/PageColumn";
import { PageHeader } from "../../../_components/PageHeader";
import { Card, CardTitle } from "../../../_components/Card";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "../../../_components/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { VEHICLE_CLASSES_PATH } from "../../../_lib/routes";
import { ClassVehicles } from "../ClassVehicles";
import { VehicleClassForm } from "../VehicleClassForm";

/**
 * Route: /vehicle-classes/[id], and /vehicle-classes/new for a class that
 * does not exist yet. The form and, for an existing class, its vehicles by
 * location and its history.
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
                side={
                  <>
                    <CardSkeleton rows={2} />
                    <CardSkeleton rows={4} />
                  </>
                }
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

/** A class that exists, read with its vehicles and its history. */
async function existingVehicleClass({ id }: { id: string }) {
  const [vehicleClass, vehicles, history] = await Promise.all([
    getVehicleClass(id),
    listVehicles({ vehicleClassId: id }),
    listActivityFor("vehicle-class", id),
  ]);
  if (!vehicleClass) notFound();
  return (
    <VehicleClassScreen
      vehicleClass={vehicleClass}
      vehicles={vehicles}
      history={history}
    />
  );
}

/** The form under its header, beside the vehicles and the history when the class exists. */
function VehicleClassScreen({
  vehicleClass,
  vehicles = [],
  history = [],
}: {
  /** Left out for a class that does not exist yet. */
  vehicleClass?: VehicleClass;
  vehicles?: VehicleWithModel[];
  history?: ActivityEntry[];
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
            <>
              <Card>
                <CardTitle description="Our vehicles of this class, by where they are based. A location's customers see the models of its vehicles in service, in their photos.">
                  Vehicles
                </CardTitle>
                <ClassVehicles vehicles={vehicles} />
              </Card>
              <Card>
                <CardTitle>History</CardTitle>
                <ActivityHistory
                  entries={history}
                  emptyMessage="No activity recorded. This class was seeded before the log."
                />
              </Card>
            </>
          ) : null
        }
      />
    </>
  );
}
