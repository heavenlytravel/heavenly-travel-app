import Link from "next/link";
import { modelName } from "@repo/db";
import {
  getVehicle,
  heldBookingsOf,
  listModelSuggestions,
  listVendorOptions,
  listClassOptions,
  vehicleDeleteImpactOf,
} from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { DeleteButton } from "../../../../../_components/DeleteButton";
import { DetailColumns } from "@repo/console/PageColumn";
import { HistoryLink } from "../../../../../_components/RecordHistory";
import { SectionHeader } from "@repo/console/SectionHeader";
import { FormSkeleton, Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import {
  locationTabHref,
  locationVehicleHref,
  recordHistoryHref,
  VEHICLE_CLASS_PARAM,
  VEHICLE_IMAGE_UPLOAD_PATH,
} from "../../../../../_lib/routes";
import {
  createVehicleAction,
  updateVehicleAction,
} from "../../../../vehicles/actions";
import { locationKey } from "../../../_lib/location-data";
import { deleteVehicleAction } from "../../../../vehicles/actions";
import { VehicleForm } from "@repo/console/VehicleForm";
import { locationNames } from "../../../../../_lib/location-names";

/**
 * Route: /locations/[slug]/vehicles/[vehicleId], and
 * /locations/[slug]/vehicles/new?class=… for a vehicle not entered yet,
 * starting in the class a class's page added it from. The vehicle's form
 * across the page, and level with an existing one's plate the way to its
 * history and the delete for one entered by mistake. A vehicle based
 * elsewhere opens at its own location.
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
          className="text-slate-600 underline-offset-4 hover:underline"
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
  const [vehicle, impact, held, classes, suggestions, locations, vendors] =
    await Promise.all([
      isNew ? null : getVehicle(vehicleId),
      isNew ? null : vehicleDeleteImpactOf(vehicleId),
      isNew ? [] : heldBookingsOf({ vehicleId }),
      listClassOptions(),
      listModelSuggestions(),
      locationNames(),
      listVendorOptions(),
    ]);
  if (!isNew && !vehicle) notFound();
  // Based at another location now: its page is there.
  if (vehicle && vehicle.locationId !== id) {
    redirect(locationVehicleHref(vehicle.location.slug, vehicle.id));
  }
  const model = vehicle?.vehicleModel;

  return (
    <>
      <SectionHeader
        title={vehicle ? vehicle.plate : "Add vehicle"}
        description={
          model
            ? `${modelName(model)}, ${model.vehicleClass.name}.`
            : "A vehicle of ours or of another vendor, based here. Its class is what customers book."
        }
        action={
          vehicle && impact ? (
            <>
              <HistoryLink
                href={recordHistoryHref(locationVehicleHref(slug, vehicle.id))}
              />
              <DeleteButton
                look="header"
                label="Delete vehicle"
                title={`Delete ${vehicle.plate}?`}
                impact={impact}
                note="For a vehicle entered by mistake: one that has served is taken out of service instead. Its history stays in the log. This cannot be undone."
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
            classes={classes}
            suggestions={suggestions}
            vendors={vendors}
            action={vehicle ? updateVehicleAction : createVehicleAction}
            uploadPath={VEHICLE_IMAGE_UPLOAD_PATH}
            held={held}
            locations={locations}
            backHref={locationTabHref(slug, "vehicles")}
          />
        }
      />
    </>
  );
}
