import Link from "next/link";
import { modelName, plural } from "@repo/db";
import { getVehicleClass, getVehicleModel } from "@repo/db/server";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../../_components/Card";
import { DeleteRecord } from "../../../../../_components/DeleteRecord";
import { DetailColumns } from "../../../../../_components/PageColumn";
import { PageHeader } from "../../../../../_components/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { vehicleClassHref } from "../../../../../_lib/routes";
import { deleteVehicleModelAction } from "../../../actions";
import { ModelForm } from "../../../ModelForm";

/**
 * Route: /vehicle-classes/[id]/models/[modelId]. The model's form: its
 * brand and name, order, switch and photos. The vehicle form adds models;
 * here they are named and pictured. A model no vehicle is of can be
 * deleted; the class's page keeps the history.
 */
export default async function VehicleModelPage({
  params,
}: PageProps<"/vehicle-classes/[id]/models/[modelId]">) {
  await requireAdmin("coverage.manage");
  const { id, modelId } = await params;

  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<FormSkeleton sections={2} fields={3} />}
            side={<CardSkeleton rows={2} />}
          />
        </>
      }
    >
      {() => modelScreen({ id, modelId })}
    </Streamed>
  );
}

async function modelScreen({ id, modelId }: { id: string; modelId: string }) {
  const [vehicleClass, model] = await Promise.all([
    getVehicleClass(id),
    getVehicleModel(modelId),
  ]);
  if (!vehicleClass || model?.vehicleClassId !== id) notFound();
  const name = modelName(model);
  const vehicles = model._count.vehicles;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={vehicleClassHref(id)}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          Back to {vehicleClass.name}
        </Link>
      </p>
      <PageHeader
        title={name}
        description={`A model of ${vehicleClass.name}, as the customer sees it wherever a vehicle of it is in service. Where the location sets a charge, the customer may choose it.`}
      />
      <DetailColumns
        main={<ModelForm key={model.id} classId={id} model={model} />}
        side={
          <Card>
            <CardTitle
              description={
                vehicles > 0
                  ? `${plural(vehicles, "vehicle is", "vehicles are")} of this model, so it stays. Switch it off to hide it from customers.`
                  : "No vehicle is of it. A booking that chose it keeps the name."
              }
            >
              Delete
            </CardTitle>
            {vehicles === 0 ? (
              <DeleteRecord
                label="Delete model"
                title={`Delete the ${name}?`}
                description="Its photos go with it. This cannot be undone."
                action={deleteVehicleModelAction.bind(null, model.id)}
                doneHref={vehicleClassHref(id)}
                doneMessage={`Deleted the ${name}.`}
              />
            ) : null}
          </Card>
        }
      />
    </>
  );
}
