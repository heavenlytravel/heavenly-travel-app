import { TRIP_CATEGORY_LABELS, isTripCategory } from "@repo/db";
import {
  getHourlyList,
  listHourlyLists,
  type LocationName,
  type Offering,
} from "@repo/db/server";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { getPermissions, requireAdmin } from "../../../../_lib/access";
import {
  locationOfferings,
  locationZoneNames,
} from "../../../../_lib/location-data";
import { RATES_PAGE_LABELS, ratesHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";
import { HourlyRates } from "../_components/HourlyRates";
import { RatesByLocation } from "../_components/RatesByLocation";
import { visiblePriceLists } from "../_components/price-lists";

const HOURLY_TIP =
  "Each area is a group of the zones drawn on Coverage. A pickup pays its area's package in the class, plus the extra hours at the rate for that package size.";

const NO_HOURLY = { areas: [], extras: [] };

/** The classes on sale, as the columns. */
const columnsOf = (offerings: readonly Offering[]) =>
  offerings
    .filter((o) => o.isActive && o.vehicleClass.isActive)
    .map((o) => ({
      id: o.vehicleClassId,
      name: o.vehicleClass.name,
      category: isTripCategory(o.vehicleClass.category)
        ? TRIP_CATEGORY_LABELS[o.vehicleClass.category]
        : o.vehicleClass.category,
    }));

/**
 * Route: /[location]/rates/hourly. Rates' hourly price list: a location's
 * hourly areas, the 4, 8 and 12-hour packages each sells with the hours
 * they cover and their price per class, and the rate per extra hour.
 * Under a location, Operation (`coverage.manage`) edits it and
 * Reservation and Sales read it (`coverage.view`). Under `~`, every
 * location's, read only. See docs/261102-booking-ops.md, "Hourly rate
 * grid".
 */
export default async function HourlyRatesPage({
  params,
}: PageProps<"/[location]/rates/hourly">) {
  await requireAdmin("coverage.view");
  const { location } = await scopeOf(params);
  const manages = (await getPermissions()).includes("coverage.manage");

  return (
    <>
      <PageHeader title={RATES_PAGE_LABELS.hourly} />
      <Streamed fallback={<CardSkeleton rows={6} />}>
        {() =>
          location
            ? locationHourly({ location, manages })
            : everyLocationHourly({ manages })
        }
      </Streamed>
    </>
  );
}

async function locationHourly({
  location,
  manages,
}: {
  location: LocationName;
  manages: boolean;
}) {
  const [list, zones, offerings] = await Promise.all([
    getHourlyList(location.id),
    locationZoneNames(location.id),
    locationOfferings(location.id),
  ]);
  if (!list) notFound();
  return (
    <Card flush>
      <CardTitle inset meta="RM for the whole vehicle">
        <span className="inline-flex items-center gap-1.5">
          Areas and packages
          <InfoTip text={HOURLY_TIP} />
        </span>
      </CardTitle>
      <HourlyRates
        locationId={location.id}
        zones={zones}
        classes={columnsOf(offerings)}
        list={list}
        readOnly={!manages}
      />
    </Card>
  );
}

async function everyLocationHourly({ manages }: { manages: boolean }) {
  const lists = await visiblePriceLists();
  const hourly = await listHourlyLists(lists.map((list) => list.id));
  return (
    <RatesByLocation
      locations={lists}
      hrefOf={(slug) => ratesHref(slug, "hourly")}
      manages={manages}
    >
      {(list) => (
        <Card flush>
          <CardTitle inset meta="RM for the whole vehicle">
            Areas and packages
          </CardTitle>
          <HourlyRates
            locationId={list.id}
            zones={list.zones.map((zone) => ({ id: zone.id, name: zone.name }))}
            classes={columnsOf(list.offerings)}
            list={hourly.get(list.id) ?? NO_HOURLY}
            readOnly
          />
        </Card>
      )}
    </RatesByLocation>
  );
}
