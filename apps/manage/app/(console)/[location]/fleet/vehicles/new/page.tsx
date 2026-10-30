import { listClassOptions, listModelSuggestions } from "@repo/db/server";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { VEHICLE_CLASS_PARAM } from "../../../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../../../_lib/scope";
import { VehicleForm } from "../_components/VehicleForm";

/**
 * Route: /[location]/fleet/vehicles/new?class=…. A vehicle not entered
 * yet: the vehicle form, based at the location under a slug, or where it
 * is based to choose under `~`; starting in the class a class's page
 * added it from. Saved, it goes back to the vehicles of the scope.
 */
export default async function NewVehiclePage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/vehicles/new">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const classParam = (await searchParams)[VEHICLE_CLASS_PARAM];
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
          const [classes, suggestions, locations] = await Promise.all([
            listClassOptions(),
            listModelSuggestions(),
            locationsVisible(),
          ]);
          return (
            <VehicleForm
              scope={scope.slug}
              locationId={scope.location?.id}
              vehicleClassId={
                classes.some((c) => c.id === startClassId)
                  ? startClassId
                  : undefined
              }
              classes={classes}
              suggestions={suggestions}
              locations={locations}
            />
          );
        }}
      </Streamed>
    </>
  );
}
