import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  formatMyr,
  type TripCategory,
} from "@repo/db";
import { listVehicleClasses, type VehicleClass } from "@repo/db/server";
import { PageHeader } from "../../_components/PageHeader";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../../_components/Table";
import { requireAdmin } from "../../_lib/access";
import { AddVehicleClassButton } from "./AddVehicleClassButton";
import {
  EditVehicleClassButton,
  VehicleClassActiveSwitch,
} from "./VehicleClassControls";

/** "Notice 4 h · Cancel up to 24 h · Minimum 3 h" */
function rulesText(vehicleClass: VehicleClass) {
  return [
    `Notice ${vehicleClass.minLeadHours} h`,
    `Cancel up to ${vehicleClass.cancellationCutoffHours} h`,
    `Minimum ${vehicleClass.minHourlyHours} h`,
  ].join(" · ");
}

function CategoryTable({
  category,
  classes,
}: {
  category: TripCategory;
  classes: VehicleClass[];
}) {
  const activeCount = classes.filter((c) => c.isActive).length;
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold tracking-tight">
        {TRIP_CATEGORY_LABELS[category]}
      </h2>
      <Table>
        <THead>
          <Th>Class</Th>
          <Th>Active</Th>
          <Th>Seats</Th>
          <Th>Luggage</Th>
          <Th>Rates</Th>
          <Th>Rules</Th>
          <Th />
        </THead>
        <TBody>
          {classes.length === 0 ? (
            <EmptyRow colSpan={7}>
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
                  <span className="block font-medium">{vehicleClass.name}</span>
                  <span className="block max-w-64 text-xs text-neutral-500">
                    {vehicleClass.description}
                  </span>
                </Td>
                <Td>
                  <VehicleClassActiveSwitch
                    vehicleClass={vehicleClass}
                    lastActiveInCategory={
                      vehicleClass.isActive && activeCount === 1
                    }
                  />
                </Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {vehicleClass.minPassengers === vehicleClass.maxPassengers
                    ? vehicleClass.maxPassengers
                    : `${vehicleClass.minPassengers} to ${vehicleClass.maxPassengers}`}
                </Td>
                <Td>{vehicleClass.luggage}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  <span className="block">
                    Base {formatMyr(vehicleClass.baseFareSen)} ·{" "}
                    {formatMyr(vehicleClass.perKmSen)}/km
                  </span>
                  <span className="block text-xs text-neutral-500">
                    {formatMyr(vehicleClass.hourlyRateSen)}/h · Min{" "}
                    {formatMyr(vehicleClass.minimumFareSen)}
                  </span>
                </Td>
                <Td className="text-xs whitespace-nowrap text-neutral-600">
                  {rulesText(vehicleClass)}
                </Td>
                <Td className="text-right">
                  <EditVehicleClassButton vehicleClass={vehicleClass} />
                </Td>
              </tr>
            ))
          )}
        </TBody>
      </Table>
    </section>
  );
}

/**
 * Route: /vehicle-classes. What the site sells, by category. Operation's
 * screen behind `coverage.manage`. Classes are never deleted, only turned
 * off; a booking keeps its snapshot of the class.
 */
export default async function VehicleClassesPage() {
  await requireAdmin("coverage.manage");
  const classes = await listVehicleClasses();

  return (
    <>
      <PageHeader
        title="Vehicle classes"
        description="Each class carries its seats, its rates and its three rules. A rate change applies to new quotes at once; a booking keeps its receipt."
        action={<AddVehicleClassButton />}
      />

      <div className="mt-6 grid gap-8">
        {TRIP_CATEGORIES.map((category) => (
          <CategoryTable
            key={category}
            category={category}
            classes={classes.filter((c) => c.category === category)}
          />
        ))}
      </div>
    </>
  );
}
