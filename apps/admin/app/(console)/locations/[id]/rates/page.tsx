import Link from "next/link";
import { dropoffRuleOf, oddHoursLabel, oddHoursOf } from "@repo/db";
import { listOfferings, listZoneRates, listZones } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { requireAdmin } from "../../../../_lib/access";
import { locationTabHref } from "../../../../_lib/routes";
import { locationDetails } from "../../_lib/location-data";
import { DropoffRuleForm } from "./DropoffRuleForm";
import { OddHoursForm } from "./OddHoursForm";
import { RateGrid } from "./RateGrid";

/**
 * Route: /locations/[id]/rates. Operation's tab, beside the setup: what
 * the location charges. The rate grid between its zones, one row per
 * route and one column per class on sale, takes the whole width; under
 * it, the odd-hours surcharge and whether a drop-off may leave the zones.
 * The zones themselves are drawn on the Coverage tab. See
 * docs/261015-locations-as-operation-areas.md, "Zones and zone-to-zone
 * rates".
 */
export default async function LocationRatesPage({
  params,
}: PageProps<"/locations/[id]/rates">) {
  await requireAdmin("coverage.manage");
  const { id } = await params;

  return (
    <>
      <SectionHeader
        title="Rates"
        description="What this location charges. A trip between two zones with a price on the grid costs that price; any other trip is metered at the class's rates. The surcharge and the drop-off rule apply to both."
      />
      <div className="mt-6 grid gap-6">
        <Streamed
          fallback={
            <>
              <CardSkeleton rows={4} />
              <div className="grid gap-6 lg:grid-cols-2">
                <CardSkeleton rows={3} />
                <CardSkeleton rows={2} />
              </div>
            </>
          }
        >
          {() => rates({ id })}
        </Streamed>
      </div>
    </>
  );
}

async function rates({ id }: { id: string }) {
  const [location, zones, cells, offerings] = await Promise.all([
    locationDetails(id),
    listZones(id),
    listZoneRates(id),
    listOfferings(id),
  ]);
  if (!location) notFound();
  const onSale = offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  const window = oddHoursOf(location);
  const rule = dropoffRuleOf(location);

  return (
    <>
      <Card>
        <CardTitle
          description={`Between the ${zones.length === 1 ? "zone" : `${zones.length} zones`} drawn on the Coverage tab, for the ${onSale.length === 1 ? "class" : `${onSale.length} classes`} on sale.`}
          action={
            <Link
              href={locationTabHref(id, "coverage")}
              className="text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline"
            >
              Coverage
            </Link>
          }
        >
          <span className="inline-flex items-center gap-1.5">
            Rate grid
            <InfoTip text="One row per route, one column per class on sale, the price in each cell. A route is read both ways: Airport to Town prices Town to Airport too. An empty cell means the trip is metered. Prices are in RM." />
          </span>
        </CardTitle>
        <RateGrid
          locationId={id}
          zones={zones.map((zone) => ({ id: zone.id, name: zone.name }))}
          classes={onSale.map((offering) => ({
            id: offering.vehicleClassId,
            name: offering.vehicleClass.name,
          }))}
          cells={cells.map((cell) => ({
            fromZoneId: cell.fromZoneId,
            toZoneId: cell.toZoneId,
            vehicleClassId: cell.vehicleClassId,
            priceSen: cell.priceSen,
          }))}
          rule={rule}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardTitle
            description={
              window
                ? `Trips starting between ${oddHoursLabel(window).replace(", +", " cost +")}.`
                : "None. Set a window and a percentage for trips that start at night."
            }
          >
            <span className="inline-flex items-center gap-1.5">
              Odd-hours surcharge
              <InfoTip text="Added to every trip whose pickup time is in the window, on the grid price or the metered price. A window that ends before it starts spans midnight: 23:00 to 07:00." />
            </span>
          </CardTitle>
          <OddHoursForm
            key={oddHoursLabel(
              window ?? { fromMinute: 0, toMinute: 0, percent: 0 },
            )}
            locationId={id}
            window={window}
          />
        </Card>

        <Card>
          <CardTitle>
            <span className="inline-flex items-center gap-1.5">
              Drop-offs
              <InfoTip text="Where a one-way trip from this location may end: anywhere, inside one of its zones, or only on a route the grid prices. An island whose fleet never leaves it chooses the second; a location that runs fixed transfers only, the third." />
            </span>
          </CardTitle>
          <DropoffRuleForm
            locationId={id}
            locationName={location.name}
            rule={rule}
          />
        </Card>
      </div>
    </>
  );
}
