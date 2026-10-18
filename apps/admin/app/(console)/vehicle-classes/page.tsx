import Link from "next/link";
import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  type TripCategory,
} from "@repo/db";
import { listVehicleClasses, type VehicleClass } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { PageHeader } from "../../_components/PageHeader";
import { Bone, Streamed, TableSkeleton } from "../../_components/Skeleton";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../../_components/Table";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { NEW_VEHICLE_CLASS_PATH, vehicleClassHref } from "../../_lib/routes";
import { rulesText, seatsText } from "./_lib/class-text";
import { VehicleClassActiveSwitch } from "./VehicleClassControls";

function CategoryTable({
  category,
  classes,
  manages,
}: {
  category: TripCategory;
  classes: VehicleClass[];
  /** Operation: the switch and the editor. The other teams read. */
  manages: boolean;
}) {
  const activeCount = classes.filter((c) => c.isActive).length;
  return (
    <section className="min-w-0">
      <h2 className="mb-3 text-base font-semibold tracking-tight">
        {TRIP_CATEGORY_LABELS[category]}
      </h2>
      <Table>
        <THead>
          <Th>Class</Th>
          <Th>
            <span className="inline-flex items-center gap-1.5">
              Active
              <InfoTip text="Off hides the class from every location's options page and search card. Bookings already made are not changed." />
            </span>
          </Th>
          <Th>Seats</Th>
          <Th>Luggage</Th>
          <Th>
            <span className="inline-flex items-center gap-1.5">
              Rules
              <InfoTip text="Notice: hours before pickup a booking must be made. Cancel up to: hours before pickup a customer may still cancel. Minimum: the shortest hourly hire." />
            </span>
          </Th>
          <Th />
        </THead>
        <TBody>
          {classes.length === 0 ? (
            <EmptyRow colSpan={6}>
              No classes in this category. The tab has nothing to sell.
            </EmptyRow>
          ) : (
            classes.map((vehicleClass) => (
              <tr
                key={vehicleClass.id}
                className={
                  vehicleClass.isActive ? undefined : "text-neutral-500"
                }
              >
                <Td>
                  {manages ? (
                    <Link
                      href={vehicleClassHref(vehicleClass.id)}
                      className="block font-medium underline-offset-4 hover:underline"
                    >
                      {vehicleClass.name}
                    </Link>
                  ) : (
                    <span className="block font-medium">
                      {vehicleClass.name}
                    </span>
                  )}
                  <span className="block max-w-64 text-xs text-neutral-500">
                    {vehicleClass.description}
                  </span>
                </Td>
                <Td>
                  {manages ? (
                    <VehicleClassActiveSwitch
                      vehicleClass={vehicleClass}
                      lastActiveInCategory={
                        vehicleClass.isActive && activeCount === 1
                      }
                    />
                  ) : (
                    <Badge tone={vehicleClass.isActive ? "green" : "neutral"}>
                      {vehicleClass.isActive ? "Active" : "Off"}
                    </Badge>
                  )}
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {seatsText(vehicleClass)}
                </Td>
                <Td>{vehicleClass.luggage}</Td>
                <Td className="text-xs whitespace-nowrap text-neutral-600">
                  {rulesText(vehicleClass)}
                </Td>
                <Td className="text-right">
                  {manages ? (
                    <Link
                      href={vehicleClassHref(vehicleClass.id)}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Edit
                    </Link>
                  ) : null}
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
    </section>
  );
}

/** Every class, in a table per category. */
async function categoryTables({ manages }: { manages: boolean }) {
  const classes = await listVehicleClasses();
  return (
    <div className="mt-6 grid gap-8">
      {TRIP_CATEGORIES.map((category) => (
        <CategoryTable
          key={category}
          category={category}
          classes={classes.filter((c) => c.category === category)}
          manages={manages}
        />
      ))}
    </div>
  );
}

/**
 * Route: /vehicle-classes. The catalogue: every class, by category, with
 * its seats, luggage and rules. What a location sells, and at what rates,
 * is on the location's Vehicle classes tab. Operation's screen, behind
 * `coverage.manage` for adding, editing and the switch; Reservation and
 * Sales read it behind `coverage.view`. Classes are never deleted, only
 * turned off; a booking keeps its snapshot of the class.
 */
export default async function VehicleClassesPage() {
  await requireAdmin("coverage.view");
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader
        title="Vehicle classes"
        description="The catalogue. Each class carries its seats, its luggage and its three rules; each location sells the classes it offers at its own rates."
        action={
          manages ? (
            <Button asChild>
              <Link href={NEW_VEHICLE_CLASS_PATH}>Add class</Link>
            </Button>
          ) : null
        }
      />

      <Streamed
        fallback={
          <div className="mt-6 grid gap-8">
            {TRIP_CATEGORIES.map((category) => (
              <div key={category}>
                <Bone className="mb-3 h-6 w-40" />
                <TableSkeleton columns={6} rows={3} />
              </div>
            ))}
          </div>
        }
      >
        {() => categoryTables({ manages })}
      </Streamed>
    </>
  );
}
