import Link from "next/link";
import { DRIVER_DELETE_IMPACT } from "@repo/db";
import {
  getDriver,
  listClassOptions,
  listVendorOptions,
} from "@repo/db/server";
import { notFound, redirect } from "next/navigation";
import { DeleteButton } from "../../../../../_components/DeleteButton";
import { DetailColumns } from "../../../../../_components/PageColumn";
import { HistoryLink } from "../../../../../_components/RecordHistory";
import { SectionHeader } from "../../../../../_components/SectionHeader";
import { FormSkeleton, Streamed } from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import {
  locationDriverHref,
  locationTabHref,
  recordHistoryHref,
} from "../../../../../_lib/routes";
import { locationKey } from "../../../_lib/location-data";
import { deleteDriverAction } from "../../../../drivers/actions";
import { DriverForm } from "../../../../drivers/_components/DriverForm";
import { locationNames } from "../../../../../_lib/location-names";

/**
 * Route: /locations/[slug]/drivers/[driverId], and
 * /locations/[slug]/drivers/new for a driver not entered yet. The driver's
 * form across the page, and level with an existing one's name the way to
 * their history and the delete for one entered by mistake. A driver based
 * elsewhere opens at their own location.
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
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All drivers here
        </Link>
      </p>
      <Streamed
        fallback={
          <DetailColumns main={<FormSkeleton sections={3} fields={4} />} />
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
  const [driver, classes, locations, vendors] = await Promise.all([
    isNew ? null : getDriver(driverId),
    listClassOptions(),
    locationNames(),
    listVendorOptions(),
  ]);
  if (!isNew && !driver) notFound();
  // Based at another location now: its page is there.
  if (driver && driver.locationId !== id) {
    redirect(locationDriverHref(driver.location.slug, driver.id));
  }

  return (
    <>
      <SectionHeader
        title={driver ? driver.name : "Add driver"}
        description={
          driver
            ? driver.vehicleClasses.map((c) => c.name).join(", ")
            : "A driver of ours or of another vendor, based here, with the classes they may drive."
        }
        action={
          driver ? (
            <>
              <HistoryLink
                href={recordHistoryHref(locationDriverHref(slug, driver.id))}
              />
              <DeleteButton
                look="header"
                label="Delete driver"
                title={`Delete ${driver.name}?`}
                impact={DRIVER_DELETE_IMPACT}
                note="For a driver entered by mistake: one who has driven for us is made inactive instead. Their history stays in the log. This cannot be undone."
                action={deleteDriverAction.bind(null, driver.id)}
                doneHref={locationTabHref(slug, "drivers")}
                doneMessage={`Deleted ${driver.name}.`}
              />
            </>
          ) : null
        }
      />
      <DetailColumns
        main={
          <DriverForm
            key={driver?.id ?? "new"}
            locationId={id}
            driver={driver ?? undefined}
            classes={classes}
            locations={locations}
            vendors={vendors}
            backHref={locationTabHref(slug, "drivers")}
          />
        }
      />
    </>
  );
}
