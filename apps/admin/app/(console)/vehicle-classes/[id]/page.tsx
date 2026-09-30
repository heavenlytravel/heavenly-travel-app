import Link from "next/link";
import { getVehicleClass, listActivityFor } from "@repo/db/server";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../_components/Card";
import { PageHeader } from "../../../_components/PageHeader";
import { requireAdmin } from "../../../_lib/access";
import { VEHICLE_CLASSES_PATH } from "../../../_lib/routes";
import { VehicleClassForm } from "../VehicleClassForm";

/**
 * Route: /vehicle-classes/[id], and /vehicle-classes/new for a class that
 * does not exist yet. The form and, for an existing class, its history.
 */
export default async function VehicleClassPage({
  params,
}: PageProps<"/vehicle-classes/[id]">) {
  await requireAdmin("coverage.manage");
  const { id } = await params;
  const isNew = id === "new";
  const [vehicleClass, history] = isNew
    ? [null, []]
    : await Promise.all([
        getVehicleClass(id),
        listActivityFor("vehicle-class", id),
      ]);
  if (!isNew && !vehicleClass) notFound();

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
      <PageHeader
        title={vehicleClass ? vehicleClass.name : "Add class"}
        description={
          vehicleClass
            ? "A rate change applies to new quotes at once; a booking keeps its receipt."
            : "The slug is derived from the name and never changes after."
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
        <VehicleClassForm
          key={vehicleClass?.id ?? "new"}
          vehicleClass={vehicleClass ?? undefined}
        />
        {vehicleClass ? (
          <Card>
            <CardTitle>History</CardTitle>
            <ActivityHistory
              entries={history}
              emptyMessage="No activity recorded. This class was seeded before the log."
            />
          </Card>
        ) : null}
      </div>
    </>
  );
}
