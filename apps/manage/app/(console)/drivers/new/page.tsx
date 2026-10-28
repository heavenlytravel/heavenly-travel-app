import Link from "next/link";
import { listClassOptions, listVendorOptions } from "@repo/db/server";
import { DetailColumns } from "@repo/console/PageColumn";
import { PageHeader } from "@repo/console/PageHeader";
import { FormSkeleton, Streamed } from "@repo/console/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { DRIVERS_PATH, driversHref } from "../../../_lib/routes";
import { DriverForm } from "../_components/DriverForm";
import { locationNames } from "../../../_lib/location-names";

/**
 * Route: /drivers/new?location=…. A driver added from the list across
 * locations: the driver form, where they are based to choose, starting at
 * the location the list was narrowed to. Saved, they go back to the list,
 * narrowed as it was.
 */
export default async function NewDriverPage({
  searchParams,
}: PageProps<"/drivers/new">) {
  await requireAdmin("fleet.manage");
  const { location, vendor } = await searchParams;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={DRIVERS_PATH}
          className="text-slate-600 underline-offset-4 hover:underline"
        >
          All drivers
        </Link>
      </p>
      <PageHeader
        title="Add driver"
        description="A driver of ours or of another vendor, based at the location you choose, with the classes they may drive."
      />
      <Streamed
        fallback={
          <DetailColumns main={<FormSkeleton sections={3} fields={4} />} />
        }
      >
        {() =>
          newDriverForm(
            typeof location === "string" ? location : undefined,
            typeof vendor === "string" ? vendor : undefined,
          )
        }
      </Streamed>
    </>
  );
}

async function newDriverForm(
  location: string | undefined,
  vendor: string | undefined,
) {
  const [classes, locations, vendors] = await Promise.all([
    listClassOptions(),
    locationNames(),
    listVendorOptions(),
  ]);
  const locationId = locations.find((l) => l.id === location)?.id;
  return (
    <DetailColumns
      main={
        <DriverForm
          locationId={locationId}
          classes={classes}
          locations={locations}
          vendors={vendors}
          vendorId={vendors.find((v) => v.id === vendor)?.id}
          backHref={driversHref({ location: locationId })}
          backToList
        />
      }
    />
  );
}
