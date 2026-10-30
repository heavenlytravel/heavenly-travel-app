import Link from "next/link";
import {
  activityPermissionOf,
  describeActivity,
  formatLocalDateTime,
} from "@repo/db";
import { getPagePublish, type LocationName } from "@repo/db/server";
import { Button } from "@repo/ui/button";
import { InfoTip } from "@repo/ui/info-tip";
import { notFound } from "next/navigation";
import { Card, CardTitle } from "@repo/console/Card";
import { PageHeader } from "@repo/console/PageHeader";
import { CardSkeleton, HeaderSkeleton, Streamed } from "@repo/console/Skeleton";
import { PageContentView } from "../../../../_components/page-editor/PageContentView";
import { requireAdmin } from "../../../../_lib/access";
import { locationDetails } from "../../../../_lib/location-data";
import { locationPageHref } from "../../../../_lib/routes";
import { scopeOf } from "../../../../_lib/scope";

/** The page as it was and as it was published, side by side where the column has room. */
const COLUMNS = "grid gap-5 @4xl:grid-cols-2 @4xl:items-start";

/**
 * Route: /[location]/activity/[entryId]. One publish from a location's
 * activity: the page as it was before and as it was published, with the
 * parts that differ marked. For an admin who holds the publishes' area,
 * Pages (`pages.manage`): Marketing and SEO; `getPagePublish` reads a
 * publish alone, so no other entry opens here. Under a location only.
 * There is no restore button: to roll back, they copy the old text into
 * the editor and publish again.
 */
export default async function LocationPublishPage({
  params,
}: PageProps<"/[location]/activity/[entryId]">) {
  await requireAdmin(activityPermissionOf("location.page.published"));
  const { location } = await scopeOf(params);
  if (!location) notFound();
  const { entryId } = await params;

  return (
    <Streamed
      fallback={
        <>
          <HeaderSkeleton />
          <div className="@container">
            <div className={COLUMNS}>
              <CardSkeleton rows={7} />
              <CardSkeleton rows={7} />
            </div>
          </div>
        </>
      }
    >
      {() => publishDetails({ location, entryId })}
    </Streamed>
  );
}

/** The publish under its sentence: the page before and after. */
async function publishDetails({
  location,
  entryId,
}: {
  location: LocationName;
  entryId: string;
}) {
  const [details, publish] = await Promise.all([
    locationDetails(location.id),
    getPagePublish(location.id, entryId),
  ]);
  if (!details || !publish) notFound();

  const { entry, ref, kind, before, after } = publish;
  const addressNames = new Map(
    details.addresses.map((address) => [address.id, address.name]),
  );

  return (
    <>
      <PageHeader
        title={describeActivity(entry)}
        meta={
          <span className="inline-flex items-center gap-1.5">
            {entry.actorName}, {formatLocalDateTime(entry.createdAt)}
            <InfoTip text="To roll back, copy the old text into the editor and publish again." />
          </span>
        }
        action={
          <Button asChild variant="secondary">
            <Link href={locationPageHref(location.slug, ref)}>
              Edit this page
            </Link>
          </Button>
        }
      />

      <div className="@container">
        <div className={COLUMNS}>
          <Card>
            <CardTitle>Before</CardTitle>
            {before ? (
              <PageContentView
                kind={kind}
                content={before}
                comparedTo={after}
                addressNames={addressNames}
              />
            ) : (
              <p className="text-sm text-muted">
                Nothing: this was the page&apos;s first publish.
              </p>
            )}
          </Card>
          <Card>
            <CardTitle>Published</CardTitle>
            <PageContentView
              kind={kind}
              content={after}
              comparedTo={before ?? undefined}
              addressNames={addressNames}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
