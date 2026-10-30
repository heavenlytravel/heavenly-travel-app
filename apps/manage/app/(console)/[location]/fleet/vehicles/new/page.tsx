import {
  listClassOptions,
  listModelSuggestions,
  listVendorOptions,
} from "@repo/db/server";
import { VehicleForm } from "@repo/console/VehicleForm";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import {
  ALL,
  VEHICLE_CLASS_PARAM,
  VEHICLE_IMAGE_UPLOAD_PATH,
  VENDOR_PARAM,
  vehiclesHref,
} from "../../../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../../../_lib/scope";
import { createVehicleAction } from "../actions";

/**
 * Route: /[location]/fleet/vehicles/new?class=…. A vehicle not entered
 * yet, ours or another vendor's (`?vendor=`, from the vendor's page):
 * the vehicle form, based at the location under a slug, or where it is
 * based to choose under `~`; starting in the class a class's page added
 * it from. Saved, it goes back to the vehicles of the scope.
 */
export default async function NewVehiclePage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/vehicles/new">) {
  await requireAdmin("fleet.manage");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  const classParam = query[VEHICLE_CLASS_PARAM];
  const vendor = query[VENDOR_PARAM];
  const startClassId = typeof classParam === "string" ? classParam : undefined;

  return (
    <>
      <PageHeader title="Add Vehicle" />
      <Streamed
        fallback={
          <DetailSkeleton
            main={<FormSkeleton sections={2} fields={6} />}
            side={<CardSkeleton rows={4} />}
          />
        }
      >
        {async () => {
          const [classes, suggestions, locations, vendors] = await Promise.all([
            listClassOptions(),
            listModelSuggestions(),
            locationsVisible(),
            listVendorOptions(),
          ]);
          return (
            <VehicleForm
              scope={scope.slug ?? ALL}
              locationId={scope.location?.id}
              vehicleClassId={
                classes.some((c) => c.id === startClassId)
                  ? startClassId
                  : undefined
              }
              classes={classes}
              suggestions={suggestions}
              locations={locations}
              vendorId={vendors.find((v) => v.id === vendor)?.id}
              vendors={vendors}
              action={createVehicleAction}
              cancelHref={vehiclesHref(scope.slug)}
              uploadPath={VEHICLE_IMAGE_UPLOAD_PATH}
            />
          );
        }}
      </Streamed>
    </>
  );
}
