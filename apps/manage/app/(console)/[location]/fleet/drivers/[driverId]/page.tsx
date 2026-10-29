import { DRIVER_DELETE_IMPACT, driverDocumentsDue } from "@repo/db";
import { getDriver, listClassOptions } from "@repo/db/server";
import { notFound } from "next/navigation";
import { BackLink, PageHeader } from "@repo/console/PageHeader";
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
import { sectionLabelOf } from "../../../../../_lib/console-map";
import { DATES_CARDS } from "../../../../../_lib/fleet-form";
import {
  driverHref,
  driversHref,
  recordHistoryHref,
} from "../../../../../_lib/routes";
import {
  locationsVisible,
  scopeOf,
  type ConsoleScope,
} from "../../../../../_lib/scope";
import { deleteDriverAction } from "../actions";
import { DriverForm } from "../_components/DriverForm";

/**
 * Route: /[location]/fleet/drivers/[driverId]. One of our drivers: their
 * name, whether they are active, the classes they may drive and their
 * location over a banner while a licence is due or expired, then their
 * form (details, classes, the dates of their licences), the way to their
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
      <BackLink href={driversHref(scope.slug)}>Drivers</BackLink>
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
  const [driver, classes, locations] = await Promise.all([
    getDriver(driverId),
    listClassOptions(),
    locationsVisible(),
  ]);
  if (!driver) notFound();
  if (scope.location && driver.locationId !== scope.location.id) notFound();
  const href = driverHref(scope.slug, driver.id);

  return (
    <>
      <PageHeader
        section={sectionLabelOf("drivers")}
        title={driver.name}
        badge={
          <ServiceBadge active={driver.isActive} on="Active" off="Inactive" />
        }
        meta={[
          driver.vehicleClasses.map((c) => c.name).join(", "),
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
        scope={scope.slug}
        driver={driver}
        classes={classes}
        locations={locations}
      />
    </>
  );
}
