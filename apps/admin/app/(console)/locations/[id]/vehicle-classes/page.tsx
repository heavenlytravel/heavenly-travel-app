import Link from "next/link";
import {
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  formatMyr,
  type TripCategory,
} from "@repo/db";
import { listOfferings, type Offering } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { SectionHeader } from "../../../../_components/SectionHeader";
import {
  Bone,
  Streamed,
  TableSkeleton,
} from "../../../../_components/Skeleton";
import {
  EmptyRow,
  Table,
  TBody,
  Td,
  Th,
  THead,
} from "../../../../_components/Table";
import { requireAdmin } from "../../../../_lib/access";
import {
  VEHICLE_CLASSES_PATH,
  locationOfferingHref,
  newLocationOfferingHref,
} from "../../../../_lib/routes";
import { rulesText, seatsText } from "../../../vehicle-classes/_lib/class-text";
import { OfferingActiveSwitch } from "./OfferingControls";

function CategoryTable({
  locationId,
  category,
  offerings,
}: {
  locationId: string;
  category: TripCategory;
  offerings: Offering[];
}) {
  const onSale = offerings.filter((o) => o.isActive).length;
  return (
    <section>
      <h3 className="mb-3 text-base font-semibold tracking-tight">
        {TRIP_CATEGORY_LABELS[category]}
      </h3>
      <Table>
        <THead>
          <Th>Class</Th>
          <Th>
            <span className="inline-flex items-center gap-1.5">
              On sale
              <InfoTip text="Off hides the class from this location's options page and search card. Bookings already made are not changed." />
            </span>
          </Th>
          <Th>Seats</Th>
          <Th>Luggage</Th>
          <Th>
            <span className="inline-flex items-center gap-1.5">
              Rates
              <InfoTip text="This location's metered rates: the base fare and per km of a one-way trip, the hourly rate, and the least a one-way trip costs. A route on the rate grid has a fixed price instead." />
            </span>
          </Th>
          <Th>Rules</Th>
          <Th />
        </THead>
        <TBody>
          {offerings.length === 0 ? (
            <EmptyRow colSpan={7}>
              No classes of this category here. The tab has nothing to sell at
              this location.
            </EmptyRow>
          ) : (
            offerings.map((offering) => {
              const { vehicleClass } = offering;
              const dim = !offering.isActive || !vehicleClass.isActive;
              return (
                <tr key={offering.id} className={dim ? "text-neutral-500" : ""}>
                  <Td>
                    <Link
                      href={locationOfferingHref(locationId, offering.id)}
                      className="block font-medium underline-offset-4 hover:underline"
                    >
                      {vehicleClass.name}
                    </Link>
                    <span className="block max-w-64 text-xs text-neutral-500">
                      {vehicleClass.description}
                      {!vehicleClass.isActive
                        ? " Off in the catalogue, so not sold anywhere."
                        : ""}
                    </span>
                  </Td>
                  <Td>
                    <OfferingActiveSwitch
                      offering={offering}
                      lastOnSaleInCategory={offering.isActive && onSale === 1}
                    />
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    {seatsText(vehicleClass)}
                  </Td>
                  <Td>{vehicleClass.luggage}</Td>
                  <Td className="whitespace-nowrap tabular-nums">
                    <span className="block">
                      Base {formatMyr(offering.baseFareSen)} ·{" "}
                      {formatMyr(offering.perKmSen)}/km
                    </span>
                    <span className="block text-xs text-neutral-500">
                      {formatMyr(offering.hourlyRateSen)}/h · Min{" "}
                      {formatMyr(offering.minimumFareSen)}
                    </span>
                  </Td>
                  <Td className="text-xs whitespace-nowrap text-neutral-600">
                    {rulesText(vehicleClass)}
                  </Td>
                  <Td className="text-right">
                    <Link
                      href={locationOfferingHref(locationId, offering.id)}
                      className="text-sm font-medium underline-offset-4 hover:underline"
                    >
                      Edit
                    </Link>
                  </Td>
                </tr>
              );
            })
          )}
        </TBody>
      </Table>
    </section>
  );
}

/**
 * Route: /locations/[id]/vehicle-classes. Operation's tab, step 2 of the
 * setup: the classes the location sells, by category, each at the
 * location's own rates. The class's seats, luggage and rules are the
 * catalogue's.
 */
export default async function LocationVehicleClassesPage({
  params,
}: PageProps<"/locations/[id]/vehicle-classes">) {
  await requireAdmin("coverage.manage");
  const { id } = await params;

  return (
    <>
      <SectionHeader
        title="Vehicle classes"
        description="What this location sells and its metered rates for each class. Seats, luggage and rules come from the catalogue and are the same everywhere."
        action={
          <Button asChild>
            <Link href={newLocationOfferingHref(id)}>Add class</Link>
          </Button>
        }
      />
      <Streamed
        fallback={
          <div className="mt-6 grid gap-8">
            {TRIP_CATEGORIES.map((category) => (
              <div key={category}>
                <Bone className="mb-3 h-6 w-40" />
                <TableSkeleton columns={7} rows={3} />
              </div>
            ))}
          </div>
        }
      >
        {() => categoryTables({ id })}
      </Streamed>
      <p className="mt-6 text-sm text-neutral-600">
        The catalogue itself, with every class's seats, luggage and rules, is on
        the{" "}
        <Link
          href={VEHICLE_CLASSES_PATH}
          className="underline-offset-4 hover:underline"
        >
          Vehicle classes screen
        </Link>
        .
      </p>
    </>
  );
}

async function categoryTables({ id }: { id: string }) {
  const offerings = await listOfferings(id);
  return (
    <div className="mt-6 grid gap-8">
      {TRIP_CATEGORIES.map((category) => (
        <CategoryTable
          key={category}
          locationId={id}
          category={category}
          offerings={offerings.filter(
            (o) => o.vehicleClass.category === category,
          )}
        />
      ))}
    </div>
  );
}
