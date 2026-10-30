import { DRIVER_DELETE_IMPACT, driverDocumentsDue } from "@repo/db";
import {
  getDriver,
  heldBookingsOf,
  listClassOptions,
  listVendorOptions,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  HeaderSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { ServiceBadge } from "@repo/console/StatusBadges";
import { DeleteButton } from "../../../../../_components/DeleteButton";
import { DocumentBanner } from "../../../../../_components/DocumentBanner";
import { HistoryLink } from "../../../../../_components/RecordHistory";
import { requireAdmin } from "../../../../../_lib/access";
import { DATES_CARDS } from "@repo/console/fleet-form";
import {
  ALL,
  driverHref,
  driversHref,
  recordHistoryHref,
} from "../../../../../_lib/routes";
import {
  locationsVisible,
  scopeOf,
  type ConsoleScope,
} from "../../../../../_lib/scope";
import { deleteDriverAction, updateDriverAction } from "../actions";
import { DriverForm } from "@repo/console/DriverForm";

/**
 * Route: /[location]/fleet/drivers/[driverId]. A driver, ours or
 * another vendor's: their name, whether they are active, the classes
 * they may drive, their vendor when not ours and their location over a
 * banner while a licence is due or expired, then their form (vendor,
 * details, classes, the dates of their licences), the way to their
 * history and the delete for one entered by mistake. Under `~` any
 * driver opens; under a location, one based elsewhere is not found.
 */
export default async function DriverPage({
  params,
}: PageProps<"/[location]/fleet/drivers/[driverId]">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);
  const { driverId } = await params;

  return (
    <>
      <Streamed
        fallback={
          <>
            <HeaderSkeleton />
            <DetailSkeleton
              main={<FormSkeleton sections={2} fields={4} />}
              side={<CardSkeleton rows={2} />}
            />
          </>
        }
      >
        {() => driverScreen(scope, driverId)}
      </Streamed>
    </>
  );
}

async function driverScreen(scope: ConsoleScope, driverId: string) {
  const [driver, held, classes, locations, vendors] = await Promise.all([
    getDriver(driverId),
    heldBookingsOf({ driverId }),
    listClassOptions(),
    locationsVisible(),
    listVendorOptions(),
  ]);
  if (!driver) notFound();
  if (scope.location && driver.locationId !== scope.location.id) notFound();
  const href = driverHref(scope.slug, driver.id);

  return (
    <>
      <PageHeader
        title={driver.name}
        badge={
          <ServiceBadge active={driver.isActive} on="Active" off="Inactive" />
        }
        meta={[
          driver.vehicleClasses.map((c) => c.name).join(", "),
          driver.vendor.isOurs ? null : driver.vendor.name,
          driver.location.name,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <>
            <HistoryLink href={recordHistoryHref(href)} />
            <DeleteButton
              look="header"
              label="Delete driver"
              title={`Delete ${driver.name}?`}
              impact={DRIVER_DELETE_IMPACT}
              note="For a driver entered by mistake: one who has driven for us is made inactive instead. Their history stays in the log. This cannot be undone."
              action={deleteDriverAction.bind(null, driver.id)}
              doneHref={driversHref(scope.slug)}
              doneMessage={`Deleted ${driver.name}.`}
            />
          </>
        }
      />
      {driver.isActive ? (
        <DocumentBanner
          due={driverDocumentsDue(driver)}
          card={DATES_CARDS.drivers}
        />
      ) : null}
      <DriverForm
        key={driver.id}
        scope={scope.slug ?? ALL}
        driver={driver}
        vendors={vendors}
        classes={classes}
        locations={locations}
        action={updateDriverAction}
        cancelHref={driversHref(scope.slug)}
        held={held}
      />
    </>
  );
}
