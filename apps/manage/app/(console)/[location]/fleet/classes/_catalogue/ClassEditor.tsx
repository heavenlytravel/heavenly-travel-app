import Link from "next/link";
import {
  getVehicleClass,
  listVehicles,
  type ListedVehicle,
  type VehicleClass,
} from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { HistoryLink } from "../../../../../_components/RecordHistory";
import { getPermissions } from "../../../../../_lib/access";
import { sectionLabelOf } from "../../../../../_lib/console-map";
import {
  classHref,
  newVehicleHref,
  recordHistoryHref,
} from "../../../../../_lib/routes";
import { ClassVehicles } from "./ClassVehicles";
import { VehicleClassForm } from "./VehicleClassForm";

/**
 * A class of the catalogue, the class editor under `~`, by the class's id,
 * or "new" for one that does not exist yet: the form and, for an existing
 * class, the way to its history in its header and, for an admin who
 * manages the fleet, its vehicles by location beside it.
 */
export function ClassEditor({ id }: { id: string }) {
  return id === "new" ? (
    <VehicleClassScreen />
  ) : (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <DetailSkeleton
            main={<FormSkeleton sections={3} fields={4} />}
            side={<CardSkeleton rows={2} />}
          />
        </>
      }
    >
      {async () => {
        const [vehicleClass, permissions] = await Promise.all([
          getVehicleClass(id),
          getPermissions(),
        ]);
        if (!vehicleClass) notFound();
        const vehicles = permissions.includes("fleet.manage")
          ? await listVehicles({ vehicleClassId: id })
          : null;
        return (
          <VehicleClassScreen vehicleClass={vehicleClass} vehicles={vehicles} />
        );
      }}
    </Streamed>
  );
}

/** The form under its header, beside the vehicles when the class exists and they are shown. */
function VehicleClassScreen({
  vehicleClass,
  vehicles = null,
}: {
  /** Left out for a class that does not exist yet. */
  vehicleClass?: VehicleClass;
  /** Null for an admin who does not manage the fleet. */
  vehicles?: ListedVehicle[] | null;
}) {
  return (
    <>
      <PageHeader
        section={sectionLabelOf("classes")}
        title={vehicleClass ? vehicleClass.name : "Add class"}
        badge={
          vehicleClass ? (
            <ServiceBadge
              active={vehicleClass.isActive}
              on="Active"
              off="Off"
            />
          ) : null
        }
        action={
          vehicleClass ? (
            <HistoryLink
              href={recordHistoryHref(classHref(null, vehicleClass.id))}
            />
          ) : null
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
          vehicleClass && vehicles ? (
            <Card flush>
              <CardTitle
                inset
                action={
                  <Button asChild variant="secondary" size="sm">
                    <Link href={newVehicleHref(null, vehicleClass.id)}>
                      Add vehicle
                    </Link>
                  </Button>
                }
              >
                <span className="inline-flex items-center gap-1.5">
                  Vehicles
                  <InfoTip text="Our vehicles of this class, by where they are based. A location's customers see the models of its vehicles in service, in their photos." />
                </span>
              </CardTitle>
              <ClassVehicles vehicles={vehicles} />
            </Card>
          ) : null
        }
      />
    </>
  );
}
