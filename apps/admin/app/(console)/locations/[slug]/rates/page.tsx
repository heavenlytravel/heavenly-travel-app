import Link from "next/link";
import {
  DROPOFF_RULE_LABELS,
  TRIP_CATEGORY_LABELS,
  dropoffRuleOf,
  isTripCategory,
  oddHoursLabel,
  oddHoursOf,
} from "@repo/db";
import { listZoneRates, listZonesElsewhere } from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import { RATES_PARTS, locationTabHref } from "../../../../_lib/routes";
import {
  locationDetails,
  locationKey,
  locationOfferings,
  locationZoneNames,
} from "../../_lib/location-data";
import { DropoffRuleForm } from "./DropoffRuleForm";
import { dropoffRuleNote } from "./dropoff-note";
import { OddHoursForm } from "./OddHoursForm";
import { RateGrid } from "./RateGrid";

/**
 * Route: /locations/[slug]/rates. Operation's tab, beside the setup: what
 * the location charges, in one column. The rate grid between its zones,
 * one row per route and one column per class on sale, runs to its card's
 * edges; under it, where a drop-off may be, which decides what an empty
 * cell means, then the odd-hours surcharge. The zones themselves are drawn
 * on the Coverage tab. Operation changes them (`coverage.manage`);
 * Reservation and Sales read the grid and the two rules, for quoting a
 * customer (`coverage.view`). See
 * docs/261015-locations-as-operation-areas.md, "Zones and zone-to-zone
 * rates".
 */
export default async function LocationRatesPage({
  params,
}: PageProps<"/locations/[slug]/rates">) {
  await requireAdmin("coverage.view");
  const { slug } = await params;
  const { id } = await locationKey(slug);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <SectionHeader
        title="Rates"
        description="A trip between two zones with a price on the grid costs that price. Any other trip is metered at the class's rates, where the drop-off rule allows it."
      />
      <div className="mt-6 grid gap-6">
        <Streamed
          fallback={
            <div className="grid gap-6">
              <CardSkeleton rows={4} />
              <CardSkeleton rows={3} />
              <CardSkeleton rows={2} />
            </div>
          }
        >
          {() => rates({ id, slug, manages })}
        </Streamed>
      </div>
    </>
  );
}

async function rates({
  id,
  slug,
  manages,
}: {
  id: string;
  slug: string;
  manages: boolean;
}) {
  const [location, zones, cells, offerings, zonesElsewhere] = await Promise.all(
    [
      locationDetails(id),
      locationZoneNames(id),
      listZoneRates(id),
      locationOfferings(id),
      manages ? listZonesElsewhere(id) : [],
    ],
  );
  if (!location) notFound();
  const onSale = offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  const window = oddHoursOf(location);
  const rule = dropoffRuleOf(location);
  // A route may end at another location's zone only where a trip may leave this one.
  const elsewhere =
    rule === "zones"
      ? []
      : zonesElsewhere.map((zone) => ({
          id: zone.id,
          name: zone.name,
          location: zone.location.name,
        }));

  return (
    <>
      <Card id={RATES_PARTS.grid} flush>
        <CardTitle
          inset
          description="Prices in RM for the whole vehicle, one row per pair of zones."
          action={
            manages ? (
              <Link
                href={locationTabHref(slug, "coverage")}
                className="text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline"
              >
                Edit zones
              </Link>
            ) : null
          }
        >
          <span className="inline-flex items-center gap-1.5">
            Rate grid
            <InfoTip text="The rows are the routes between the zones drawn on the Coverage tab; the columns are the classes on sale on the Vehicle classes tab. A route is read both ways: Airport to Town prices Town to Airport too." />
          </span>
        </CardTitle>
        <RateGrid
          locationId={id}
          locationSlug={slug}
          zones={zones}
          elsewhere={elsewhere}
          classes={onSale.map((offering) => ({
            id: offering.vehicleClassId,
            name: offering.vehicleClass.name,
            category: isTripCategory(offering.vehicleClass.category)
              ? TRIP_CATEGORY_LABELS[offering.vehicleClass.category]
              : offering.vehicleClass.category,
          }))}
          cells={cells.map((cell) => ({
            fromZoneId: cell.fromZoneId,
            toZoneId: cell.toZoneId,
            vehicleClassId: cell.vehicleClassId,
            priceSen: cell.priceSen,
          }))}
          rule={rule}
          readOnly={!manages}
        />
      </Card>

      <Card id={RATES_PARTS.dropoffs}>
        <CardTitle
          description={`Where a one-way trip from a pickup in ${location.name} may end. Hourly hire has no drop-off and is not affected.`}
        >
          Drop-offs
        </CardTitle>
        {manages ? (
          <DropoffRuleForm
            locationId={id}
            locationName={location.name}
            rule={rule}
          />
        ) : (
          <p className="text-sm">
            <span className="font-medium text-neutral-900">
              {DROPOFF_RULE_LABELS[rule]}.
            </span>{" "}
            <span className="text-neutral-600">
              {dropoffRuleNote(rule, location.name)}
            </span>
          </p>
        )}
      </Card>

      <Card id={RATES_PARTS.oddHours}>
        <CardTitle description="Added to every trip whose pickup time is in the window, on the grid price or the metered price.">
          <span className="inline-flex items-center gap-2">
            Odd-hours surcharge
            {window ? (
              <Badge tone="amber">{oddHoursLabel(window)}</Badge>
            ) : (
              <Badge>Off</Badge>
            )}
          </span>
        </CardTitle>
        {manages ? (
          <OddHoursForm locationId={id} window={window} />
        ) : (
          <p className="text-sm text-neutral-600">
            {window
              ? `Trips that start from ${oddHoursLabel(window)}.`
              : "No surcharge: a trip costs its grid or metered price at any hour."}
          </p>
        )}
      </Card>
    </>
  );
}
