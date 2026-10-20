import Link from "next/link";
import { modelName } from "@repo/db";
import {
  getVehicle,
  listActivityFor,
  listLocationNames,
  listModelSuggestions,
  listVehicleClasses,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../../../_components/Card";
import { DeleteRecord } from "../../../../../_components/DeleteRecord";
import { DetailColumns } from "../../../../../_components/PageColumn";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { fleetClassOptions } from "../../../../../_lib/fleet-form";
import {
  locationTabHref,
  VEHICLE_CLASS_PARAM,
} from "../../../../../_lib/routes";
import { locationKey } from "../../../_lib/location-data";
import { deleteVehicleAction } from "../actions";
import { VehicleForm } from "../VehicleForm";

/**
 * Route: /locations/[slug]/vehicles/[vehicleId], and
 * /locations/[slug]/vehicles/new?class=… for a vehicle not entered yet,
 * starting in the class a class's page added it from. The
 * vehicle's form, and beside an existing one its history and the delete
 * for one entered by mistake. A vehicle based elsewhere is not found here.
 */
export default async function LocationVehiclePage({
  params,
  searchParams,
}: PageProps<"/locations/[slug]/vehicles/[vehicleId]">) {
  await requireAdmin("fleet.manage");
  const { slug, vehicleId } = await params;
  const { id } = await locationKey(slug);
  const classParam = (await searchParams)[VEHICLE_CLASS_PARAM];
  const startClassId = typeof classParam === "string" ? classParam : undefined;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationTabHref(slug, "vehicles")}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All vehicles here
        </Link>
      </p>
      <Streamed
        fallback={
          <DetailSkeleton
            main={<FormSkeleton sections={3} fields={4} />}
            side={<CardSkeleton rows={4} />}
          />
        }
      >
        {() => vehicleScreen({ id, slug, vehicleId, startClassId })}
      </Streamed>
    </>
  );
}

async function vehicleScreen({
  id,
  slug,
  vehicleId,
  startClassId,
}: {
  id: string;
  slug: string;
  vehicleId: string;
  /** The class a new vehicle starts in, from the address. */
  startClassId: string | undefined;
}) {
  const isNew = vehicleId === "new";
  const [vehicle, classes, suggestions, locations, history] = await Promise.all(
    [
      isNew ? null : getVehicle(vehicleId),
      listVehicleClasses(),
      listModelSuggestions(),
      listLocationNames(),
      isNew ? [] : listActivityFor("vehicle", vehicleId),
    ],
  );
  if (!isNew && vehicle?.locationId !== id) notFound();
  const model = vehicle?.vehicleModel;

  return (
    <>
      <SectionHeader
        title={vehicle ? vehicle.plate : "Add vehicle"}
        description={
          model
            ? `${modelName(model)}, ${model.vehicleClass.name}.`
            : "One of our vehicles, based here. Its class is what customers book, and its model what they may choose."
        }
      />
      <DetailColumns
        main={
          <VehicleForm
            key={vehicle?.id ?? "new"}
            locationId={id}
            vehicleClassId={
              classes.some((c) => c.id === startClassId)
                ? startClassId
                : undefined
            }
            vehicle={vehicle ?? undefined}
            classes={fleetClassOptions(classes)}
            suggestions={suggestions}
            locations={locations}
            backHref={locationTabHref(slug, "vehicles")}
          />
        }
        side={
          vehicle ? (
            <>
              <Card>
                <CardTitle>History</CardTitle>
                <ActivityHistory
                  entries={history}
                  emptyMessage="No activity recorded."
                />
              </Card>
              <Card>
                <CardTitle description="For a vehicle entered by mistake. One that has served is taken out of service instead.">
                  Delete
                </CardTitle>
                <DeleteRecord
                  label="Delete vehicle"
                  title={`Delete ${vehicle.plate}?`}
                  description="Its history stays in the log. This cannot be undone."
                  action={deleteVehicleAction.bind(null, vehicle.id)}
                  doneHref={locationTabHref(slug, "vehicles")}
                  doneMessage={`Deleted ${vehicle.plate}.`}
                />
              </Card>
            </>
          ) : null
        }
      />
    </>
  );
}
