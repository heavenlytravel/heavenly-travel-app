import { listClassOptions, listVendorOptions } from "@repo/db/server";
import { DriverForm } from "@repo/console/DriverForm";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { ALL, driversHref, VENDOR_PARAM } from "../../../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../../../_lib/scope";
import { createDriverAction } from "../actions";

/**
 * Route: /[location]/fleet/drivers/new. A driver not entered yet, ours or
 * another vendor's (`?vendor=`, from the vendor's page): the driver form,
 * based at the location under a slug, or where they are based to choose
 * under `~`. Saved, they go back to the drivers of the scope.
 */
export default async function NewDriverPage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/drivers/new">) {
  await requireAdmin("fleet.manage");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  const vendor = query[VENDOR_PARAM];

  return (
    <>
      <PageHeader title="Add Driver" />
      <Streamed
        fallback={
          <DetailSkeleton
            main={<FormSkeleton sections={2} fields={4} />}
            side={<CardSkeleton rows={2} />}
          />
        }
      >
        {async () => {
          const [classes, locations, vendors] = await Promise.all([
            listClassOptions(),
            locationsVisible(),
            listVendorOptions(),
          ]);
          return (
            <DriverForm
              scope={scope.slug ?? ALL}
              locationId={scope.location?.id}
              vendorId={vendors.find((v) => v.id === vendor)?.id}
              vendors={vendors}
              classes={classes}
              locations={locations}
              action={createDriverAction}
              cancelHref={driversHref(scope.slug)}
            />
          );
        }}
      </Streamed>
    </>
  );
}
