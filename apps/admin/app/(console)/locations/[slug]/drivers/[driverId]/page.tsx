import Link from "next/link";
import {
  getDriver,
  listActivityFor,
  listLocationNames,
  listVehicleClasses,
} from "@repo/db/server";
import { notFound } from "next/navigation";
import { ActivityHistory } from "../../../../../_components/ActivityHistory";
import { Card, CardTitle } from "../../../../../_components/Card";
import { DeleteRecord } from "../../../../../_components/DeleteRecord";
import { DetailColumns } from "../../../../../_components/PageColumn";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationTabHref } from "../../../../../_lib/routes";
import { locationKey } from "../../../_lib/location-data";
import { deleteDriverAction } from "../actions";
import { DriverForm } from "../DriverForm";

/**
 * Route: /locations/[slug]/drivers/[driverId], and
 * /locations/[slug]/drivers/new for a driver not entered yet. The driver's
 * form, and beside an existing one their history and the delete for one
 * entered by mistake. A driver based elsewhere is not found here.
 */
export default async function LocationDriverPage({
  params,
}: PageProps<"/locations/[slug]/drivers/[driverId]">) {
  await requireAdmin("fleet.manage");
  const { slug, driverId } = await params;
  const { id } = await locationKey(slug);

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationTabHref(slug, "drivers")}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All drivers here
        </Link>
      </p>
      <Streamed
        fallback={
          <DetailSkeleton
            main={<FormSkeleton sections={3} fields={4} />}
            side={<CardSkeleton rows={4} />}
          />
        }
      >
        {() => driverScreen({ id, slug, driverId })}
      </Streamed>
    </>
  );
}

async function driverScreen({
  id,
  slug,
  driverId,
}: {
  id: string;
  slug: string;
  driverId: string;
}) {
  const isNew = driverId === "new";
  const [driver, classes, locations, history] = await Promise.all([
    isNew ? null : getDriver(driverId),
    listVehicleClasses(),
    listLocationNames(),
    isNew ? [] : listActivityFor("driver", driverId),
  ]);
  if (!isNew && driver?.locationId !== id) notFound();

  return (
    <>
      <SectionHeader
        title={driver ? driver.name : "Add driver"}
        description={
          driver
            ? driver.vehicleClasses.map((c) => c.name).join(", ")
            : "One of our drivers, based here, with the classes they may drive."
        }
      />
      <DetailColumns
        main={
          <DriverForm
            key={driver?.id ?? "new"}
            slug={slug}
            locationId={id}
            driver={driver ?? undefined}
            classes={classes.map((c) => ({
              id: c.id,
              name: c.name,
              category: c.category,
            }))}
            locations={locations}
          />
        }
        side={
          driver ? (
            <>
              <Card>
                <CardTitle>History</CardTitle>
                <ActivityHistory
                  entries={history}
                  emptyMessage="No activity recorded."
                />
              </Card>
              <Card>
                <CardTitle description="For a driver entered by mistake. One who has driven for us is made inactive instead.">
                  Delete
                </CardTitle>
                <DeleteRecord
                  label="Delete driver"
                  title={`Delete ${driver.name}?`}
                  description="Their history stays in the log. This cannot be undone."
                  action={deleteDriverAction.bind(null, driver.id)}
                  doneHref={locationTabHref(slug, "drivers")}
                  doneMessage={`Deleted ${driver.name}.`}
                />
              </Card>
            </>
          ) : null
        }
      />
    </>
  );
}
