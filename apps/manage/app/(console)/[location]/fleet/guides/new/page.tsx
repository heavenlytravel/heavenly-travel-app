import { listVendorOptions } from "@repo/db/server";
import { GuideForm } from "@repo/console/GuideForm";
import { PageHeader } from "@repo/console/PageHeader";
import {
  CardSkeleton,
  DetailSkeleton,
  FormSkeleton,
  Streamed,
} from "@repo/console/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { ALL, guidesHref, VENDOR_PARAM } from "../../../../../_lib/routes";
import { locationsVisible, scopeOf } from "../../../../../_lib/scope";
import { createGuideAction } from "../actions";

/**
 * Route: /[location]/fleet/guides/new. A tour guide not entered yet, ours
 * or another vendor's (`?vendor=`, from the vendor's page): the guide
 * form, based at the location under a slug, or where they are based to
 * choose under `~`. Saved, they go back to the guides of the scope.
 */
export default async function NewGuidePage({
  params,
  searchParams,
}: PageProps<"/[location]/fleet/guides/new">) {
  await requireAdmin("fleet.manage");
  const [scope, query] = await Promise.all([scopeOf(params), searchParams]);
  const vendor = query[VENDOR_PARAM];

  return (
    <>
      <PageHeader title="Add Tour Guide" />
      <Streamed
        fallback={
          <DetailSkeleton
            main={<FormSkeleton sections={1} fields={4} />}
            side={<CardSkeleton rows={1} />}
          />
        }
      >
        {async () => {
          const [locations, vendors] = await Promise.all([
            locationsVisible(),
            listVendorOptions(),
          ]);
          return (
            <GuideForm
              scope={scope.slug ?? ALL}
              locationId={scope.location?.id}
              vendorId={vendors.find((v) => v.id === vendor)?.id}
              vendors={vendors}
              locations={locations}
              action={createGuideAction}
              cancelHref={guidesHref(scope.slug)}
            />
          );
        }}
      </Streamed>
    </>
  );
}
