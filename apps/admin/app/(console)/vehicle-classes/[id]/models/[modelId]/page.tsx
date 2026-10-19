import Link from "next/link";
import { plural } from "@repo/db";
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
 * Route: /vehicle-classes/[id]/models/[modelId], and
 * /vehicle-classes/[id]/models/new for a model the class does not have
 * yet. The model's form: its name, order, switch and photos. A model no
 * vehicle is of can be deleted; the class's page keeps the history.
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
    modelId === "new" ? null : getVehicleModel(modelId),
  ]);
  if (!vehicleClass) notFound();
  if (modelId !== "new" && model?.vehicleClassId !== id) notFound();
  const vehicles = model?._count.vehicles ?? 0;

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
        title={model ? model.name : `Add a model to ${vehicleClass.name}`}
        description={`A model of ${vehicleClass.name}, as the customer sees it at every location. A customer may prefer it; the price is the class's.`}
      />
      <DetailColumns
        main={
          <ModelForm
            key={model?.id ?? "new"}
            classId={id}
            model={model ?? undefined}
          />
        }
        side={
          model ? (
            <Card>
              <CardTitle
                description={
                  vehicles > 0
                    ? `${plural(vehicles, "vehicle is", "vehicles are")} of this model, so it stays. Switch it off to hide it from customers.`
                    : "No vehicle is of it. A booking that preferred it keeps the name."
                }
              >
                Delete
              </CardTitle>
              {vehicles === 0 ? (
                <DeleteRecord
                  label="Delete model"
                  title={`Delete ${model.name}?`}
                  description="Its photos go with it. This cannot be undone."
                  action={deleteVehicleModelAction.bind(null, model.id)}
                  doneHref={vehicleClassHref(id)}
                  doneMessage={`Deleted ${model.name}.`}
                />
              ) : null}
            </Card>
          ) : null
        }
      />
    </>
  );
}
