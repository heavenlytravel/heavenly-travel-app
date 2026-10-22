import Link from "next/link";
import {
  DROPOFF_RULE_LABELS,
  TRIP_CATEGORY_LABELS,
  dropoffRuleOf,
  formatMyr,
  isTripCategory,
  modelChoiceOf,
  oddHoursLabel,
  oddHoursOf,
  surchargeLabel,
} from "@repo/db";
import {
  listPriceLists,
  listZonesElsewhere,
  type LocationPriceList,
  type ZoneElsewhere,
} from "@repo/db/server";
import { Badge } from "@repo/ui/badge";
import { Card, CardTitle } from "../../_components/Card";
import { LocationFilter } from "../../_components/LocationFilter";
import { LocationMark } from "../../_components/LocationMark";
import { PageHeader } from "../../_components/PageHeader";
import { CardSkeleton, Streamed } from "../../_components/Skeleton";
import { LocationStateBadge } from "../../_components/StatusBadges";
import { EmptyRow, Table, TBody, Td, Th, THead } from "../../_components/Table";
import { getPermissions, requireAdmin } from "../../_lib/access";
import { locationFilterOptions } from "../../_lib/location-filter";
import { locationTabHref, ratesHref } from "../../_lib/routes";
import { dropoffRuleNote } from "../locations/[slug]/rates/dropoff-note";
import { RateGrid } from "../locations/[slug]/rates/RateGrid";
import { rulesText } from "../vehicle-classes/_lib/class-text";
import { locationNames } from "../../_lib/location-names";

/**
 * Route: /rates?location=…. What every location charges, or one
 * location, narrowed by the filter: each location's classes at their
 * metered rates and under their rules, the fixed prices on its rate grid,
 * where a drop-off may be and the odd-hours surcharge. Read here, changed
 * inside the location, on its Vehicle classes and Rates tabs, which each
 * section links to. Behind `coverage.view`, as those tabs are. See
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
        description="What each location charges. A trip between two zones with a price on the grid costs that price; any other is metered at the class's rates there. Each is changed inside its location."
        action={
          <LocationFilter
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

/** One location's price list: its classes, its grid, then its two rules in a line each. */
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
  const classesHref = locationTabHref(list.slug, "vehicle-classes");
  const ratesTab = locationTabHref(list.slug, "rates");
  const onSale = list.offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  const window = oddHoursOf(list);
  const rule = dropoffRuleOf(list);
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
          description="Every trip not on the grid is metered at these rates; choosing a model adds its charge to any trip. The rules are the location's own, per class."
          action={editLink(classesHref)}
        >
          Vehicle classes
        </CardTitle>
        <Table bare>
          <THead>
            <Th>Class</Th>
            <Th align="right">Base fare</Th>
            <Th align="right">Per km</Th>
            <Th align="right">Per hour</Th>
            <Th align="right">Minimum</Th>
            <Th align="right">To choose a model</Th>
            <Th>Rules</Th>
          </THead>
          <TBody>
            {list.offerings.length === 0 ? (
              <EmptyRow colSpan={7}>Nothing is sold here yet.</EmptyRow>
            ) : (
              list.offerings.map((offering) => {
                const { vehicleClass } = offering;
                const selling = offering.isActive && vehicleClass.isActive;
                const modelChoice = modelChoiceOf(offering);
                return (
                  <tr
                    key={offering.id}
                    className={selling ? undefined : "text-slate-500"}
                  >
                    <Td>
                      <span className="flex items-center gap-2 font-medium whitespace-nowrap">
                        {vehicleClass.name}
                        {selling ? null : <Badge>Off sale</Badge>}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {isTripCategory(vehicleClass.category)
                          ? TRIP_CATEGORY_LABELS[vehicleClass.category]
                          : vehicleClass.category}
                      </span>
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMyr(offering.baseFareSen)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMyr(offering.perKmSen)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMyr(offering.hourlyRateSen)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {formatMyr(offering.minimumFareSen)}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {modelChoice ? (
                        surchargeLabel(modelChoice)
                      ) : (
                        <span className="text-slate-500">Not offered</span>
                      )}
                    </Td>
                    <Td className="text-xs whitespace-nowrap text-slate-600">
                      {rulesText(offering)}
                    </Td>
                  </tr>
                );
              })
            )}
          </TBody>
        </Table>
      </Card>

      <Card flush>
        <CardTitle
          inset
          description="Fixed prices in RM for the whole vehicle, one row per pair of zones, read both ways."
          action={editLink(ratesTab)}
        >
          Rate grid
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
          rule={rule}
          readOnly
        />
      </Card>

      <dl className="grid gap-2 text-sm sm:grid-cols-[8rem_1fr]">
        <dt className="text-slate-500">Drop-offs</dt>
        <dd>
          <span className="font-medium text-slate-900">
            {DROPOFF_RULE_LABELS[rule]}.
          </span>{" "}
          <span className="text-slate-600">
            {dropoffRuleNote(rule, list.name)}
          </span>
        </dd>
        <dt className="text-slate-500">Odd hours</dt>
        <dd className="text-slate-600">
          {window
            ? `Trips that start from ${oddHoursLabel(window)}.`
            : "No surcharge."}
        </dd>
      </dl>
    </section>
  );
}
