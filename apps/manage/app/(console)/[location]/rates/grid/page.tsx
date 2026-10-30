import {
  CROSS_LOCATION_NAME,
  TRIP_CATEGORIES,
  TRIP_CATEGORY_LABELS,
  formatClock,
  isTripCategory,
  surchargeLabel,
  tripRulesOf,
  type TripCategory,
  type TripRules,
} from "@repo/db";
import {
  listZoneRates,
  listZonesElsewhere,
  type LocationName,
  type Offering,
  type ZoneElsewhere,
} from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { FigureStrip, type Figure } from "@repo/console/FigureTiles";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { Bone } from "@repo/ui/skeleton";
import { FilterLinks } from "../../../../_components/FilterLinks";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  locationDetails,
  locationOfferings,
  locationZoneNames,
} from "../../../../_lib/location-data";
import {
  CATEGORY_PARAM,
  RATES_PAGE_LABELS,
  rateGridHref,
  ratesHref,
  type ScopeSlug,
} from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { RateGrid } from "../_components/RateGrid";
import { RatesByLocation } from "../_components/RatesByLocation";
import { visiblePriceLists } from "../_components/price-lists";

/** Beside the grid's name: what its rows and columns are. */
const GRID_TIP =
  "The rows are the routes between the zones drawn on Coverage, and within each; the columns are the classes on sale, from Fleet's Classes. A route is read both ways: Airport to Town prices Town to Airport too.";

/**
 * Route: /[location]/rates/grid?category=…. Rates' second page: the price
 * of every one-way trip, one row per route between a location's zones and
 * one column per class on sale, narrowed to Car with driver or Coach
 * charter by the category in the address. Under a location, the trip
 * rules over it, each opening Trip rules, and the grid Operation edits
 * (`coverage.manage`) and Reservation and Sales read (`coverage.view`).
 * Under `~`, every location's grid, read only, by location. See
 * docs/261023-nearest-zone-pricing.md.
 */
export default async function RateGridPage({
  params,
  searchParams,
}: PageProps<"/[location]/rates/grid">) {
  await requireAdmin("coverage.view");
  const { slug, location } = await scopeOf(params);
  const manages = (await getPermissions()).includes("coverage.manage");
  const given = (await searchParams)[CATEGORY_PARAM];
  const category = isTripCategory(given) ? given : undefined;

  return (
    <>
      <PageHeader title={RATES_PAGE_LABELS.grid} />
      {location ? null : (
        <div className="mb-5">
          <CategoryFilter scope={slug} category={category} />
        </div>
      )}
      <Streamed
        fallback={
          <>
            {location ? (
              <Bone className="mb-5 h-24 w-full rounded-card" />
            ) : null}
            <CardSkeleton rows={6} />
          </>
        }
      >
        {() =>
          location
            ? locationGrid({ location, manages, category })
            : everyLocationGrid({ manages, category })
        }
      </Streamed>
    </>
  );
}

/** Car with driver or Coach charter, chips in the address, "All" first for every class on sale. */
function CategoryFilter({
  scope,
  category,
}: {
  scope: ScopeSlug;
  category: TripCategory | undefined;
}) {
  return (
    <FilterLinks
      label="Classes by category"
      options={TRIP_CATEGORIES.map((value) => ({
        value,
        label: TRIP_CATEGORY_LABELS[value],
      }))}
      active={category}
      hrefOf={(value) => rateGridHref(scope, value)}
    />
  );
}

/** The trip rules as figures over the grid, each opening Trip rules. */
function ruleFigures(rules: TripRules, href: string): Figure[] {
  const { reach, oddHours, weekend } = rules;
  return [
    {
      key: "reach",
      label:
        reach.freeExtraKm > 0
          ? `Extra road served, first ${reach.freeExtraKm} km free`
          : "Extra road served",
      value: `${reach.maxExtraKm} km`,
      href,
    },
    {
      key: "cross",
      label: CROSS_LOCATION_NAME,
      value: reach.crossLocation ? "On" : "Off",
      href,
    },
    {
      key: "odd",
      label: oddHours
        ? `Odd hours, ${formatClock(oddHours.fromMinute)} to ${formatClock(oddHours.toMinute)}`
        : "Odd hours",
      value: oddHours ? surchargeLabel(oddHours) : "Off",
      href,
    },
    {
      key: "weekend",
      label: "Weekends and holidays",
      value: weekend ? surchargeLabel(weekend) : "Off",
      href,
    },
  ];
}

/**
 * The grid's columns and cells, narrowed to a category: the classes on
 * sale in it, and the prices of every class in it, those off sale
 * included, so a route keeps its row. Without a category, every class on
 * sale and every price, as stored.
 */
function gridOf(
  offerings: readonly Offering[],
  cells: readonly {
    fromZoneId: string;
    toZoneId: string;
    vehicleClassId: string;
    priceSen: number;
  }[],
  category: TripCategory | undefined,
) {
  const categoryOf = new Map(
    offerings.map((offering) => [
      offering.vehicleClassId,
      offering.vehicleClass.category,
    ]),
  );
  const inCategory = (classId: string) =>
    !category || categoryOf.get(classId) === category;
  return {
    classes: offerings
      .filter(
        (offering) =>
          offering.isActive &&
          offering.vehicleClass.isActive &&
          inCategory(offering.vehicleClassId),
      )
      .map((offering) => ({
        id: offering.vehicleClassId,
        name: offering.vehicleClass.name,
        category: isTripCategory(offering.vehicleClass.category)
          ? TRIP_CATEGORY_LABELS[offering.vehicleClass.category]
          : offering.vehicleClass.category,
      })),
    cells: cells
      .filter((cell) => inCategory(cell.vehicleClassId))
      .map((cell) => ({
        fromZoneId: cell.fromZoneId,
        toZoneId: cell.toZoneId,
        vehicleClassId: cell.vehicleClassId,
        priceSen: cell.priceSen,
      })),
  };
}

/** Other locations' zones by name, as the grid names the ends of the routes out. */
const zonesAway = (zones: readonly ZoneElsewhere[]) =>
  zones.map((zone) => ({
    id: zone.id,
    name: zone.name,
    location: zone.location.name,
  }));

async function locationGrid({
  location,
  manages,
  category,
}: {
  location: LocationName;
  manages: boolean;
  category: TripCategory | undefined;
}) {
  const { id, slug } = location;
  const [details, zones, cells, offerings, elsewhere] = await Promise.all([
    locationDetails(id),
    locationZoneNames(id),
    listZoneRates(id),
    locationOfferings(id),
    listZonesElsewhere(id),
  ]);
  if (!details) notFound();
  const grid = gridOf(offerings, cells, category);

  return (
    <>
      <FigureStrip
        label={RATES_PAGE_LABELS.rules}
        figures={ruleFigures(tripRulesOf(details), ratesHref(slug, "rules"))}
      />
      <Card flush>
        <CardTitle
          inset
          meta="RM for the whole vehicle"
          action={<CategoryFilter scope={slug} category={category} />}
        >
          <span className="inline-flex items-center gap-1.5">
            Routes
            <InfoTip text={GRID_TIP} />
          </span>
        </CardTitle>
        <RateGrid
          key={category ?? "all"}
          locationId={id}
          locationSlug={slug}
          zones={zones}
          elsewhere={zonesAway(elsewhere)}
          classes={grid.classes}
          cells={grid.cells}
          crossLocation={details.crossLocation}
          category={category && TRIP_CATEGORY_LABELS[category]}
          readOnly={!manages}
        />
      </Card>
    </>
  );
}

async function everyLocationGrid({
  manages,
  category,
}: {
  manages: boolean;
  category: TripCategory | undefined;
}) {
  // Every zone by name, for the routes out of a location to another's.
  const [lists, zones] = await Promise.all([
    visiblePriceLists(),
    listZonesElsewhere(),
  ]);
  return (
    <RatesByLocation
      locations={lists}
      hrefOf={(slug) => rateGridHref(slug, category)}
      manages={manages}
    >
      {(list) => {
        const grid = gridOf(list.offerings, list.zoneRates, category);
        return (
          <Card flush>
            <CardTitle inset meta="RM for the whole vehicle">
              Routes
            </CardTitle>
            <RateGrid
              key={category ?? "all"}
              locationId={list.id}
              locationSlug={list.slug}
              zones={list.zones.map((zone) => ({
                id: zone.id,
                name: zone.name,
              }))}
              elsewhere={zonesAway(
                zones.filter((zone) => zone.locationId !== list.id),
              )}
              classes={grid.classes}
              cells={grid.cells}
              crossLocation={list.crossLocation}
              category={category && TRIP_CATEGORY_LABELS[category]}
              readOnly
            />
          </Card>
        );
      }}
    </RatesByLocation>
  );
}
