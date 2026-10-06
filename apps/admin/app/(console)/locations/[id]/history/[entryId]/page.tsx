import Link from "next/link";
import { describeActivity, formatLocalDateTime } from "@repo/db";
import { getLocation, getPagePublish } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "../../../../../_components/Card";
import { PageHeader } from "../../../../../_components/PageHeader";
import {
  BackLinkSkeleton,
  CardSkeleton,
  HeaderSkeleton,
  Streamed,
} from "../../../../../_components/Skeleton";
import { requireAdmin } from "../../../../../_lib/access";
import { locationHref, locationPageHref } from "../../../../../_lib/routes";
import { PageContentView } from "../../../_components/PageContentView";

/**
 * Route: /locations/[id]/history/[entryId]. One publish from a location's
 * history: the page as it was before and as it was published, with the
 * parts that differ marked. There is no restore button: to roll back,
 * Marketing copies the old text into the editor and publishes again.
 */
export default async function LocationPublishPage({
  params,
}: PageProps<"/locations/[id]/history/[entryId]">) {
  await requireAdmin("locations.manage");
  const { id, entryId } = await params;

  return (
    <Streamed
      fallback={
        <>
          <BackLinkSkeleton />
          <HeaderSkeleton />
          <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
            <CardSkeleton rows={7} />
            <CardSkeleton rows={7} />
          </div>
        </>
      }
    >
      {() => publishDetails({ id, entryId })}
    </Streamed>
  );
}

/** The publish under its sentence: the page before and after. */
async function publishDetails({
  id,
  entryId,
}: {
  id: string;
  entryId: string;
}) {
  const [location, publish] = await Promise.all([
    getLocation(id),
    getPagePublish(id, entryId),
  ]);
  if (!location || !publish) notFound();

  const { entry, page, before, after } = publish;
  const addressNames = new Map(
    location.addresses.map((address) => [address.id, address.name]),
  );

  return (
    <>
      <p className="mb-4 text-sm">
        <Link
          href={locationHref(location.id)}
          className="text-neutral-600 underline-offset-4 hover:underline"
        >
          {location.name}
        </Link>
      </p>
      <PageHeader
        title={describeActivity(entry)}
        description={`${entry.actorName}, ${formatLocalDateTime(entry.createdAt)}. To roll back, copy the old text into the editor and publish again.`}
        action={
          <Button asChild variant="secondary">
            <Link href={locationPageHref(location.id, page)}>
              Edit this page
            </Link>
          </Button>
        }
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card>
          <CardTitle>Before</CardTitle>
          {before ? (
            <PageContentView
              page={page}
              content={before}
              comparedTo={after}
              addressNames={addressNames}
            />
          ) : (
            <p className="text-sm text-neutral-500">
              Nothing: this was the page&apos;s first publish.
            </p>
          )}
        </Card>
        <Card>
          <CardTitle>Published</CardTitle>
          <PageContentView
            page={page}
            content={after}
            comparedTo={before ?? undefined}
            addressNames={addressNames}
          />
        </Card>
      </div>
    </>
  );
}
