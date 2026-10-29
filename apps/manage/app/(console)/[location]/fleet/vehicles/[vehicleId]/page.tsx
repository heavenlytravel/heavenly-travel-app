import { modelName, vehicleDocumentsDue } from "@repo/db";
import {
  getVehicle,
  listClassOptions,
  listModelSuggestions,
  vehicleDeleteImpactOf,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@repo/console/PageHeader";
import {
  DetailSkeleton,
  CardSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { DeleteButton } from "../../../../../_components/DeleteButton";
import { DocumentBanner } from "../../../../../_components/DocumentBanner";
import { HistoryLink } from "../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../_lib/access";
import { sectionLabelOf } from "../../../../../_lib/console-map";
import { DATES_CARDS } from "../../../../../_lib/fleet-form";
import {
  recordHistoryHref,
  vehicleHref,
  vehiclesHref,
} from "../../../../../_lib/routes";
import {
  locationsVisible,
  scopeOf,
  type ConsoleScope,
} from "../../../../../_lib/scope";
import { deleteVehicleAction } from "../actions";
import { VehicleForm } from "../_components/VehicleForm";

/**
 * Route: /[location]/fleet/vehicles/[vehicleId]. One of our vehicles: its
 * plate, whether it is in service and its model, class and location over
 * a banner while a document is due or expired, then its form (photos,
 * details, the dates of its documents), the way to its history and the
 * delete for one entered by mistake. Under `~` any vehicle opens; under a
 * location, one based elsewhere is not found.
 */
export default async function VehiclePage({
  params,
}: PageProps<"/[location]/fleet/vehicles/[vehicleId]">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const { vehicleId } = await params;

  return (
    <>
      <BackLink href={vehiclesHref(scope.slug)}>Vehicles</BackLink>
      <Streamed
        fallback={
          <>
            <HeaderSkeleton />
            <DetailSkeleton
              main={<FormSkeleton sections={2} fields={6} />}
              side={<CardSkeleton rows={4} />}
            />
          </>
        }
      >
        {() => vehicleScreen(scope, vehicleId)}
      </Streamed>
    </>
  );
}

async function vehicleScreen(scope: ConsoleScope, vehicleId: string) {
  const [vehicle, impact, classes, suggestions, locations] = await Promise.all([
    getVehicle(vehicleId),
    vehicleDeleteImpactOf(vehicleId),
    listClassOptions(),
    listModelSuggestions(),
    locationsVisible(),
  ]);
  if (!vehicle || !impact) notFound();
  if (scope.location && vehicle.locationId !== scope.location.id) notFound();
  const model = vehicle.vehicleModel;
  const href = vehicleHref(scope.slug, vehicle.id);

  return (
    <>
      <PageHeader
        section={sectionLabelOf("vehicles")}
        title={vehicle.plate}
        badge={<ServiceBadge active={vehicle.isActive} />}
        meta={`${modelName(model)} · ${model.vehicleClass.name} · ${vehicle.location.name}`}
        action={
          <>
            <HistoryLink href={recordHistoryHref(href)} />
            <DeleteButton
              look="header"
              label="Delete vehicle"
              title={`Delete ${vehicle.plate}?`}
              impact={impact}
              note="For a vehicle entered by mistake: one that has served is taken out of service instead. Its history stays in the log. This cannot be undone."
              action={deleteVehicleAction.bind(null, vehicle.id)}
              doneHref={vehiclesHref(scope.slug)}
              doneMessage={`Deleted ${vehicle.plate}.`}
            />
          </>
        }
      />
      {vehicle.isActive ? (
        <DocumentBanner
          due={vehicleDocumentsDue(vehicle)}
          card={DATES_CARDS.vehicles}
        />
      ) : null}
      <VehicleForm
        key={vehicle.id}
        scope={scope.slug}
        vehicle={vehicle}
        classes={classes}
        suggestions={suggestions}
        locations={locations}
      />
    </>
  );
}
