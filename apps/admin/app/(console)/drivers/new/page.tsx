import Link from "next/link";
import { listClassOptions, listLocationNames } from "@repo/db/server";
import { DetailColumns } from "../../../_components/PageColumn";
import { PageHeader } from "../../../_components/PageHeader";
import { FormSkeleton, Streamed } from "../../../_components/Skeleton";
import { requireAdmin } from "../../../_lib/access";
import { DRIVERS_PATH, driversHref } from "../../../_lib/routes";
import { DriverForm } from "../_components/DriverForm";

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
  const { location } = await searchParams;

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={DRIVERS_PATH}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          All drivers
        </Link>
      </p>
      <PageHeader
        title="Add driver"
        description="One of our drivers, based at the location you choose, with the classes they may drive."
      />
      <Streamed
        fallback={
          <DetailColumns main={<FormSkeleton sections={3} fields={4} />} />
        }
      >
        {() =>
          newDriverForm(typeof location === "string" ? location : undefined)
        }
      </Streamed>
    </>
  );
}

async function newDriverForm(location: string | undefined) {
  const [classes, locations] = await Promise.all([
    listClassOptions(),
    listLocationNames(),
  ]);
  const locationId = locations.find((l) => l.id === location)?.id;
  return (
    <DetailColumns
      main={
        <DriverForm
          locationId={locationId}
          classes={classes}
          locations={locations}
          backHref={driversHref({ location: locationId })}
          backToList
        />
      }
    />
  );
}
