import Link from "next/link";
import { TRIP_CATEGORY_LABELS, isTripCategory, tripRulesOf } from "@repo/db";
import {
  listPriceLists,
  listZonesElsewhere,
  type LocationPriceList,
  type ZoneElsewhere,
} from "@repo/db/server";
import { Card, CardTitle } from "@repo/console/Card";
import { FilterSelect } from "../../_components/FilterSelect";
import { LocationMark } from "../../_components/LocationMark";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { LocationStateBadge } from "../../_components/StatusBadges";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/filter-options";
import {
  RATES_PART_LABELS,
  locationRatesPartHref,
  locationTabHref,
  ratesHref,
} from "../../_lib/routes";
import { ClassRates } from "../locations/[slug]/rates/ClassRates";
import { RateGrid } from "../locations/[slug]/rates/RateGrid";
import { TripRulesList } from "../locations/[slug]/rates/TripRulesList";
import { locationNames } from "../../_lib/location-names";

/**
 * Route: /rates?location=…. What every location charges, or one
 * location, narrowed by the filter: each location's classes at their
 * rates and under their rules, the prices on its rate grid and its trip
 * rules. Read here, changed
 * inside the location, on its Rates tab, which each section links to. Behind `coverage.view`, as those tabs are. See
 * docs/261018-location-work-and-class-catalogue.md.
 */
export default async function RatesPage({ searchParams }: PageProps<"/rates">) {
  await requireAdmin("coverage.view");
  const { location } = await searchParams;
  const locationId =
    typeof location === "string" && location ? location : undefined;
  const locations = await locationNames();

  return (
    <>
      <PageHeader
        title="Rates"
        description="What each location charges. Every one-way trip is a cell of its grid, plus the road past a zone's edge for an address outside every zone. Each is changed inside its location."
        action={
          <FilterSelect
            label="Location"
            value={locationId ?? ""}
            options={locationFilterOptions(locations, ratesHref)}
          />
        }
      />
      <Streamed
        key={locationId ?? "all"}
        fallback={
          <div className="mt-6 grid gap-6">
            <CardSkeleton rows={4} />
            <CardSkeleton rows={4} />
          </div>
        }
      >
        {() => priceLists({ locationId })}
      </Streamed>
    </>
  );
}

async function priceLists({ locationId }: { locationId: string | undefined }) {
  // Every zone by name, for the routes out of a location to another's.
  const [lists, zones, permissions] = await Promise.all([
    listPriceLists(locationId),
    listZonesElsewhere(),
    getPermissions(),
  ]);
  if (lists.length === 0) {
    return <p className="mt-6 text-sm text-slate-500">No location yet.</p>;
  }
  const manages = permissions.includes("coverage.manage");
  return (
    <div className="mt-6 grid gap-12">
      {lists.map((list) => (
        <LocationRates
          key={list.id}
          list={list}
          elsewhere={zones.filter((zone) => zone.locationId !== list.id)}
          manages={manages}
        />
      ))}
    </div>
  );
}

/** One location's price list: its classes, its grid, then its trip rules. */
function LocationRates({
  list,
  elsewhere,
  manages,
}: {
  list: LocationPriceList;
  /** The other locations' zones, for the routes out of this one. */
  elsewhere: ZoneElsewhere[];
  manages: boolean;
}) {
  const ratesTab = locationTabHref(list.slug, "rates");
  const onSale = list.offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  const editLink = (href: string) =>
    manages ? (
      <Link
        href={href}
        className="text-sm font-medium whitespace-nowrap underline-offset-4 hover:underline"
      >
        Edit
      </Link>
    ) : null;

  return (
    <section aria-label={list.name} className="grid gap-4">
      <h2 className="flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
        <LocationMark name={list.name} state={list.state} size="lg" />
        <Link href={ratesTab} className="underline-offset-4 hover:underline">
          {list.name}
        </Link>
        <LocationStateBadge state={list.state} />
      </h2>

      <Card flush>
        <CardTitle
          inset
          description="The rate per extra km and per hour each class is sold at, and the rules every booking of it keeps to."
          action={editLink(locationRatesPartHref(list.slug, "classes"))}
        >
          {RATES_PART_LABELS.classes}
        </CardTitle>
        <ClassRates offerings={list.offerings} />
      </Card>

      <Card flush>
        <CardTitle
          inset
          description="Prices in RM for the whole vehicle, one row per pair of zones and one per zone for a trip within it, read both ways."
          action={editLink(locationRatesPartHref(list.slug, "grid"))}
        >
          {RATES_PART_LABELS.grid}
        </CardTitle>
        <RateGrid
          locationId={list.id}
          locationSlug={list.slug}
          zones={list.zones.map((zone) => ({ id: zone.id, name: zone.name }))}
          elsewhere={elsewhere.map((zone) => ({
            id: zone.id,
            name: zone.name,
            location: zone.location.name,
          }))}
          classes={onSale.map((offering) => ({
            id: offering.vehicleClassId,
            name: offering.vehicleClass.name,
            category: isTripCategory(offering.vehicleClass.category)
              ? TRIP_CATEGORY_LABELS[offering.vehicleClass.category]
              : offering.vehicleClass.category,
          }))}
          cells={list.zoneRates.map((cell) => ({
            fromZoneId: cell.fromZoneId,
            toZoneId: cell.toZoneId,
            vehicleClassId: cell.vehicleClassId,
            priceSen: cell.priceSen,
          }))}
          crossLocation={list.crossLocation}
          readOnly
        />
      </Card>

      <Card>
        <CardTitle action={editLink(locationRatesPartHref(list.slug, "rules"))}>
          {RATES_PART_LABELS.rules}
        </CardTitle>
        <TripRulesList rules={tripRulesOf(list)} locationName={list.name} />
      </Card>
    </section>
  );
}
