import { listClassOptions } from "@repo/db/server";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationsVisible, scopeOf } from "../../../../../_lib/scope";
import { DriverForm } from "../_components/DriverForm";

/**
 * Route: /[location]/fleet/drivers/new. A driver not entered yet: the
 * driver form, based at the location under a slug, or where they are
 * based to choose under `~`. Saved, they go back to the drivers of the
 * scope.
 */
export default async function NewDriverPage({
  params,
}: PageProps<"/[location]/fleet/drivers/new">) {
  await requireAdmin("fleet.manage");
  const scope = await scopeOf(params);

  return (
    <>
      <PageHeader title="Add driver" />
      <Streamed
        fallback={
          <DetailSkeleton
            main={<FormSkeleton sections={2} fields={4} />}
            side={<CardSkeleton rows={2} />}
          />
        }
      >
        {async () => {
          const [classes, locations] = await Promise.all([
            listClassOptions(),
            locationsVisible(),
          ]);
          return (
            <DriverForm
              scope={scope.slug}
              locationId={scope.location?.id}
              classes={classes}
              locations={locations}
            />
          );
        }}
      </Streamed>
    </>
  );
}
