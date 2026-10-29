import Link from "next/link";
import { isZoneShape, tryTripExamplesAt } from "@repo/db";
import { listZones, type LocationName } from "@repo/db/server";
import { cx } from "@repo/ui/cx";
import { ArrowRightIcon } from "@repo/ui/icons";
import { notFound } from "next/navigation";
import {
  CARD_LINK,
  Card,
  CardRow,
  CardRows,
  CardTitle,
} from "@repo/console/Card";
import { EmptyState } from "@repo/console/EmptyState";
import { LocationMark } from "@repo/console/LocationMark";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, Streamed } from "@repo/console/Skeleton";
import { LocationStateBadge } from "@repo/console/StatusBadges";
import { requireAdmin } from "../../../../_lib/access";
import { sectionLabelOf } from "../../../../_lib/console-map";
import {
  locationDetails,
  locationOfferings,
} from "../../../../_lib/location-data";
import { RATES_PAGE_LABELS, ratesHref } from "../../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../../_lib/scope";
import { RatesPager } from "../_components/RatesPager";
import { TryTrip } from "./TryTrip";

/**
 * Route: /[location]/rates/try. Rates' last page: prices a trip as a
 * customer would be charged, and shows how: each end's zone, the
 * distances, and every call to Google. Nothing is booked or saved. A trip
 * starts in one location, so under `~` the page lists the locations to
 * try one in. For every team that reads the rates (`coverage.view`), for
 * quoting a customer. See docs/261023-nearest-zone-pricing.md, "Try a
 * trip".
 */
export default async function TryTripPage({
  params,
}: PageProps<"/[location]/rates/try">) {
  await requireAdmin("coverage.view");
  const { slug, location } = await scopeOf(params);

  return (
    <>
      <PageHeader
        section={sectionLabelOf("rates-try")}
        title={RATES_PAGE_LABELS.try}
      />
      <Streamed fallback={<CardSkeleton rows={location ? 8 : 3} />}>
        {() => (location ? locationTry(location) : chooseLocation())}
      </Streamed>
      <RatesPager scope={slug} page="try" />
    </>
  );
}

async function locationTry(location: LocationName) {
  const [details, zones, offerings] = await Promise.all([
    locationDetails(location.id),
    listZones(location.id),
    locationOfferings(location.id),
  ]);
  if (!details) notFound();
  const onSale = offerings.filter(
    (offering) => offering.isActive && offering.vehicleClass.isActive,
  );
  return (
    <TryTrip
      locationId={details.id}
      locationName={details.name}
      mapKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY || null}
      zones={zones.flatMap((zone) =>
        isZoneShape(zone.shape)
          ? [{ id: zone.id, name: zone.name, shape: zone.shape }]
          : [],
      )}
      classes={onSale.map((offering) => ({
        id: offering.vehicleClassId,
        name: offering.vehicleClass.name,
        slug: offering.vehicleClass.slug,
      }))}
      examples={tryTripExamplesAt(location.slug)}
    />
  );
}

/** Under `~`: the locations the person may see, each opening its Try a trip. */
async function chooseLocation() {
  const locations = await locationsVisible();
  return (
    <Card flush>
      <CardTitle inset>Pick a location</CardTitle>
      {locations.length === 0 ? (
        <EmptyState>No location yet.</EmptyState>
      ) : (
        <CardRows>
          {locations.map((location) => (
            <CardRow key={location.id}>
              <LocationMark name={location.name} state={location.state} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
                {location.name}
              </span>
              <LocationStateBadge state={location.state} />
              <Link
                href={ratesHref(location.slug, "try")}
                aria-label={`Try a trip in ${location.name}`}
                className={cx(CARD_LINK, "inline-flex items-center gap-1")}
              >
                Try a trip
                <ArrowRightIcon className="size-3.5" />
              </Link>
            </CardRow>
          ))}
        </CardRows>
      )}
    </Card>
  );
}
