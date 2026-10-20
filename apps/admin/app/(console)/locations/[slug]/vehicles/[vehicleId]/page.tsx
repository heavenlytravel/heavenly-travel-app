import Link from "next/link";
import { modelName } from "@repo/db";
import {
  getVehicle,
  listLocationNames,
  listModelSuggestions,
  listVehicleClasses,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { DeleteRecord } from "../../../../../_components/DeleteRecord";
import { DetailColumns } from "../../../../../_components/PageColumn";
import { HistoryLink } from "../../../../../_components/RecordHistory";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import { FormSkeleton, Streamed } from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { fleetClassOptions } from "../../../../../_lib/fleet-form";
import {
  locationTabHref,
  locationVehicleHref,
  recordHistoryHref,
  VEHICLE_CLASS_PARAM,
} from "../../../../../_lib/routes";
import { locationKey } from "../../../_lib/location-data";
import { deleteVehicleAction } from "../actions";
import { VehicleForm } from "../VehicleForm";

/**
 * Route: /locations/[slug]/vehicles/[vehicleId], and
 * /locations/[slug]/vehicles/new?class=… for a vehicle not entered yet,
 * starting in the class a class's page added it from. The vehicle's form
 * across the page, and level with an existing one's plate the way to its
 * history and the delete for one entered by mistake. A vehicle based
 * elsewhere is not found here.
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
          <DetailColumns main={<FormSkeleton sections={3} fields={4} />} />
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
  const [vehicle, classes, suggestions, locations] = await Promise.all([
    isNew ? null : getVehicle(vehicleId),
    listVehicleClasses(),
    listModelSuggestions(),
    listLocationNames(),
  ]);
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
        action={
          vehicle ? (
            <>
              <HistoryLink
                href={recordHistoryHref(locationVehicleHref(slug, vehicle.id))}
              />
              <DeleteRecord
                label="Delete vehicle"
                title={`Delete ${vehicle.plate}?`}
                description="For a vehicle entered by mistake: one that has served is taken out of service instead. Its history stays in the log. This cannot be undone."
                action={deleteVehicleAction.bind(null, vehicle.id)}
                doneHref={locationTabHref(slug, "vehicles")}
                doneMessage={`Deleted ${vehicle.plate}.`}
              />
            </>
          ) : null
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
      />
    </>
  );
}
