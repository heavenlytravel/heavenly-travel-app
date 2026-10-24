import Link from "next/link";
import {
  TRIP_CATEGORY_LABELS,
  isTripCategory,
  isZoneShape,
  tryTripExamplesAt,
  tripRulesOf,
} from "@repo/db";
import { listZoneRates, listZones, listZonesElsewhere } from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../_components/Card";
import { SectionHeader } from "../../../../_components/SectionHeader";
import { CardSkeleton, Streamed } from "../../../../_components/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  RATES_PARTS,
  locationOfferingHref,
  locationTabHref,
} from "../../../../_lib/routes";
import {
  locationDetails,
  locationKey,
  locationOfferings,
  locationZoneNames,
} from "../../_lib/location-data";
import { ClassRates } from "./ClassRates";
import { RateGrid } from "./RateGrid";
import { TripRulesForm } from "./TripRulesForm";
import { TripRulesList } from "./TripRulesList";
import { TryTrip } from "./try-trip/TryTrip";

/** The tab's four parts, in their order, for the jumps under its header. */
const PARTS: readonly { part: keyof typeof RATES_PARTS; label: string }[] = [
  { part: "classes", label: "Rates and rules" },
  { part: "grid", label: "Rate grid" },
  { part: "rules", label: "Trip rules" },
  { part: "tryTrip", label: "Try a trip" },
];

/**
 * Route: /locations/[slug]/rates. Operation's tab, beside the setup: what
 * the location charges, in one column. The classes it sells at their
 * rates and under their rules, each opening its editor; the rate grid
 * between its zones, one row per route and one column per class on sale;
 * both run to their cards' edges. Under them, the trip rules (the extra
 * road, cross-location and the two surcharges), then Try a trip, which prices a
 * trip as a customer would be charged and shows how. Under the header, a
 * jump to each part, the grid being long. The zones themselves
 * are drawn on the Coverage tab, the classes put on sale on the Vehicle
 * classes tab. Operation changes them (`coverage.manage`); Reservation
 * and Sales read the rates, the grid and the rules, and try trips, for
 * quoting a customer (`coverage.view`). See
 * docs/261023-nearest-zone-pricing.md.
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
        description="Every one-way trip is a cell of the grid. An address outside every zone takes its nearest zone by road, and adds the road past the zone's edge at the class's rate per extra km when the trip runs past it."
      />
      <nav
        aria-label="Parts of the rates"
        className="mt-4 flex flex-wrap gap-2"
      >
        {PARTS.map(({ part, label }) => (
          <a
            key={part}
            href={`#${RATES_PARTS[part]}`}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="mt-6 grid gap-6">
        <Streamed
          fallback={
            <div className="grid gap-6">
              <CardSkeleton rows={3} />
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
  const [location, zones, cells, offerings, elsewhere, shapes] =
    await Promise.all([
      locationDetails(id),
      locationZoneNames(id),
      listZoneRates(id),
      locationOfferings(id),
      listZonesElsewhere(id),
      listZones(id),
    ]);
  if (!location) notFound();
  const onSale = offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  const rules = tripRulesOf(location);
  const classes = onSale.map((offering) => ({
    id: offering.vehicleClassId,
    name: offering.vehicleClass.name,
    category: isTripCategory(offering.vehicleClass.category)
      ? TRIP_CATEGORY_LABELS[offering.vehicleClass.category]
      : offering.vehicleClass.category,
  }));

  return (
    <>
      <Card id={RATES_PARTS.classes} flush>
        <CardTitle
          inset
          description="The rate per extra km and per hour each class is sold at, and the rules every booking of it keeps to."
          action={
            manages ? (
              <Link
                href={locationTabHref(slug, "vehicle-classes")}
                className="text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline"
              >
                Edit classes on sale
              </Link>
            ) : null
          }
        >
          Rates and rules
        </CardTitle>
        <ClassRates
          offerings={offerings}
          editHref={
            manages
              ? (offeringId) => locationOfferingHref(slug, offeringId, "rates")
              : undefined
          }
        />
      </Card>

      <Card id={RATES_PARTS.grid} flush>
        <CardTitle
          inset
          description="Prices in RM for the whole vehicle, one row per pair of zones and one per zone for a trip within it."
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
            <InfoTip text="The rows are the routes between the zones drawn on the Coverage tab, and within each; the columns are the classes on sale on the Vehicle classes tab. A route is read both ways: Airport to Town prices Town to Airport too." />
          </span>
        </CardTitle>
        <RateGrid
          locationId={id}
          locationSlug={slug}
          zones={zones}
          elsewhere={elsewhere.map((zone) => ({
            id: zone.id,
            name: zone.name,
            location: zone.location.name,
          }))}
          classes={classes}
          cells={cells.map((cell) => ({
            fromZoneId: cell.fromZoneId,
            toZoneId: cell.toZoneId,
            vehicleClassId: cell.vehicleClassId,
            priceSen: cell.priceSen,
          }))}
          crossLocation={location.crossLocation}
          readOnly={!manages}
        />
      </Card>

      <Card id={RATES_PARTS.rules}>
        <CardTitle
          description={`How far past a zone ${location.name} serves an address, and what is added to a trip's price.`}
        >
          Trip rules
        </CardTitle>
        {manages ? (
          <TripRulesForm
            locationId={id}
            locationName={location.name}
            reach={rules.reach}
            oddHours={rules.oddHours}
            weekend={rules.weekend}
          />
        ) : (
          <TripRulesList rules={rules} locationName={location.name} />
        )}
      </Card>

      <Card id={RATES_PARTS.tryTrip} flush>
        <CardTitle
          inset
          description="Price a trip as a customer would be charged, and see how: each end's zone, the distances, and every call to Google. Nothing is booked or saved."
        >
          Try a trip
        </CardTitle>
        <TryTrip
          locationId={id}
          locationName={location.name}
          mapKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null}
          zones={shapes.flatMap((zone) =>
            isZoneShape(zone.shape)
              ? [{ id: zone.id, name: zone.name, shape: zone.shape }]
              : [],
          )}
          classes={onSale.map((offering) => ({
            id: offering.vehicleClassId,
            name: offering.vehicleClass.name,
            slug: offering.vehicleClass.slug,
          }))}
          examples={tryTripExamplesAt(slug)}
        />
      </Card>
    </>
  );
}
